// Initialize browser API first
const browserAPI = (function () {
  try {
    if (typeof chrome !== "undefined") {
      // Wrap Chrome storage API in promises
      const chromeStorage = {
        get: (keys) =>
          new Promise((resolve, reject) => {
            chrome.storage.local.get(keys, (result) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(result);
              }
            });
          }),
        set: (items) =>
          new Promise((resolve, reject) => {
            chrome.storage.local.set(items, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          }),
      };

      return {
        runtime: chrome.runtime,
        action: chrome.action,
        scripting: chrome.scripting,
        tabs: chrome.tabs,
        windows: chrome.windows,
        storage: { local: chromeStorage },
        alarms: chrome.alarms,
        offscreen: chrome.offscreen,
        notifications: chrome.notifications,
      };
    } else if (typeof browser !== "undefined") {
      return {
        runtime: browser.runtime,
        action: browser.action,
        scripting: browser.scripting,
        tabs: browser.tabs,
        windows: browser.windows,
        storage: browser.storage,
        alarms: browser.alarms,
        offscreen: browser.offscreen,
        notifications: browser.notifications,
      };
    }
    throw new Error("No browser API found");
  } catch (e) {
    console.error("Failed to initialize browser API:", e);
    return null;
  }
})();

if (!browserAPI) {
  console.error("Browser API not available");
} else {
  console.log("Background worker starting...");

  // Keep service worker alive
  browserAPI.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed");
    try {
      await browserAPI.alarms.clearAll();
    } catch (e) {
      console.error("Error clearing alarms:", e);
    }
  });

  // Handle extension icon click
  browserAPI.action.onClicked.addListener(async (tab) => {
    console.log("Extension icon clicked");

    // Check if we can inject into this tab
    const url = tab.url || "";
    if (
      !url.startsWith("chrome://") &&
      !url.startsWith("edge://") &&
      !url.startsWith("about:")
    ) {
      // Inject content script into active tab
      try {
        await browserAPI.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content-script.js"],
        });
        console.log("Content script injected successfully");
      } catch (error) {
        console.error("Failed to inject content script:", error);
      }
    } else {
      console.log("Skipping content script injection for restricted URL:", url);
    }

    const extensionUrl = browserAPI.runtime.getURL("index.html");
    console.log("Opening extension at:", extensionUrl);

    // Check if we already have a tab open
    const tabs = await browserAPI.tabs.query({
      url: extensionUrl,
    });

    if (tabs.length > 0) {
      // Focus existing tab
      await browserAPI.tabs.update(tabs[0].id, { active: true });
      await browserAPI.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Create new tab
      await browserAPI.tabs.create({
        url: extensionUrl,
        active: true,
      });
    }
  });

  // Background timer state
  let timer = {
    timeLeft: 0,
    isRunning: false,
    lastTick: 0,
    isPaused: false,
  };

  // Keep track of when the last tick occurred
  let lastTickTime = 0;

  // Initialize timer state
  browserAPI.runtime.onStartup.addListener(async () => {
    console.log("Extension starting up");
    await initializeTimerState();
  });

  // Also initialize on install
  browserAPI.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed");
    await initializeTimerState();
  });

  async function initializeTimerState() {
    console.log("Initializing timer state");
    try {
      const result = await browserAPI.storage.local.get([
        "focusbutton_timer_state",
      ]);
      const state = result.focusbutton_timer_state;

      if (state) {
        // Initialize timer object
        timer = {
          timeLeft: state.time || 0,
          isRunning: state.isCountingDown && !state.isPaused,
          lastTick: Date.now(),
          isPaused: state.isPaused || false,
        };

        // If timer was running, restart it
        if (state.isCountingDown && !state.isPaused && state.time > 0) {
          await startTimer(state.time);
        } else {
          // Update storage with current state
          await browserAPI.storage.local.set({
            focusbutton_timer_state: {
              type: "TIMER_UPDATE",
              isCountingDown: state.isCountingDown || false,
              time: state.time || 0,
              isPaused: state.isPaused || false,
              isFinished: state.isFinished || false,
              source: "background",
              timestamp: Date.now(),
            },
          });
        }
      } else {
        // Set initial state
        timer = {
          timeLeft: 0,
          isRunning: false,
          lastTick: 0,
          isPaused: false,
        };

        await browserAPI.storage.local.set({
          focusbutton_timer_state: {
            type: "TIMER_UPDATE",
            isCountingDown: false,
            time: 0,
            isPaused: false,
            isFinished: false,
            source: "background",
            timestamp: Date.now(),
          },
        });
      }
    } catch (error) {
      console.error("Error initializing timer state:", error);
    }
  }

  async function startTimer(duration) {
    console.log("Starting timer with duration:", duration);

    // Validate duration
    if (!duration || duration <= 0) {
      console.error("Invalid duration:", duration);
      return;
    }

    // Stop any existing timer
    await stopTimer();

    // Initialize timer state with exact duration
    timer = {
      timeLeft: Math.floor(duration), // Ensure integer value
      isRunning: true,
      lastTick: Date.now(),
      isPaused: false,
    };
    lastTickTime = Date.now();

    // Create alarm for countdown (every second)
    await browserAPI.alarms.clear("timerTick");
    await browserAPI.alarms.create("timerTick", {
      periodInMinutes: 1 / 60, // Every second
      when: Date.now() + 1000, // Start in 1 second
    });

    // Send initial state with exact duration
    const state = {
      type: "TIMER_UPDATE",
      isCountingDown: true,
      time: Math.floor(duration), // Ensure integer value
      isPaused: false,
      isFinished: false,
      source: "background",
      timestamp: Date.now(),
    };

    await browserAPI.storage.local.set({
      focusbutton_timer_state: state,
    });

    console.log("Timer started:", timer);
  }

  async function stopTimer() {
    console.log("Stopping timer");
    timer.isRunning = false;
    timer.timeLeft = 0;
    timer.lastTick = 0;
    timer.isPaused = false;

    // Clear the alarm
    await browserAPI.alarms.clear("timerTick");

    // Reset UI update tracking
    let lastUiUpdate = null;

    // Send final state only if timer was running
    if (timer.isRunning) {
      const state = {
        type: "TIMER_UPDATE",
        isCountingDown: false,
        time: 0,
        isPaused: false,
        isFinished: true,
        source: "background",
        timestamp: Date.now(),
        isFinalState: true, // Mark as final state
      };
      await browserAPI.storage.local.set({
        focusbutton_timer_state: state,
      });
    }
  }

  async function updateState(state) {
    const now = Date.now();
    if (now - lastStateUpdate < STATE_UPDATE_THROTTLE) {
      return;
    }
    lastStateUpdate = now;

    try {
      await browserAPI.storage.local.set({
        focusbutton_timer_state: state,
      });
      console.log("State updated:", state);
    } catch (error) {
      console.error("Error updating state:", error);
    }
  }

  function tick() {
    if (!timer.isRunning || timer.isPaused) {
      return;
    }

    const now = Date.now();
    const elapsed = now - timer.lastTick;

    // Update time if at least 1 second has passed
    if (elapsed >= 1000) {
      timer.lastTick = now;
      const newTime = Math.max(0, timer.timeLeft - 1);

      // Only update if time has actually changed
      if (newTime !== timer.timeLeft) {
        timer.timeLeft = newTime;
        console.log("Timer tick:", newTime);

        if (newTime === 0) {
          console.log("Timer completed");
          timer.isRunning = false; // Stop timer first

          // Send final state
          updateState({
            type: "TIMER_UPDATE",
            isCountingDown: false,
            time: 0,
            isPaused: false,
            isFinished: true,
            source: "background",
            timestamp: now,
            isFinalState: true,
          })
            .then(() => {
              stopTimer().catch(console.error);
              playNotificationSound().catch(console.error);
            })
            .catch(console.error);
        } else {
          // Always send updates during countdown
          updateState({
            type: "TIMER_UPDATE",
            isCountingDown: true,
            time: newTime,
            isPaused: false,
            isFinished: false,
            source: "background",
            timestamp: now,
          }).catch(console.error);
        }
      }
    }
  }

  async function pauseTimer() {
    console.log("Pausing timer");
    timer.isPaused = true;
    timer.isRunning = false;
    timer.lastTick = Date.now();
    lastTickTime = Date.now();

    // Clear the alarms while paused
    await browserAPI.alarms.clear("timerTick");

    // Update state to reflect pause
    const state = {
      type: "TIMER_UPDATE",
      isCountingDown: true, // Keep this true to match UI state
      time: timer.timeLeft,
      isPaused: true,
      isFinished: false,
      startTime: Date.now(),
    };

    console.log("Setting paused state:", state);
    await browserAPI.storage.local.set({
      focusbutton_timer_state: state,
    });
  }

  async function resumeTimer() {
    console.log("Resuming timer with time:", timer.timeLeft);
    timer.isPaused = false;
    timer.isRunning = true;
    timer.lastTick = Date.now();
    lastTickTime = Date.now();

    // Recreate alarms - start immediately
    await browserAPI.alarms.create("timerTick", {
      periodInMinutes: 1 / 60,
      when: Date.now(), // Start immediately
    });

    // Update state
    const state = {
      type: "TIMER_UPDATE",
      isCountingDown: true,
      time: timer.timeLeft,
      isPaused: false,
      isFinished: false,
      startTime: Date.now(),
    };

    console.log("Setting resumed state:", state);
    await browserAPI.storage.local.set({
      focusbutton_timer_state: state,
    });
  }

  // Track last state update
  let lastStateUpdate = 0;
  const STATE_UPDATE_THROTTLE = 100;

  // Update timer state in storage and notify all tabs
  async function updateTimerState() {
    const now = Date.now();

    // Don't update if timer is stopped
    if (timer.timeLeft === 0 && !timer.isRunning) {
      return;
    }

    const state = {
      type: "TIMER_UPDATE",
      isCountingDown: timer.isRunning && !timer.isPaused,
      time: timer.timeLeft,
      isPaused: timer.isPaused,
      isFinished: timer.timeLeft === 0 && !timer.isRunning,
      source: "background",
      timestamp: now,
    };

    try {
      const currentState = await browserAPI.storage.local.get([
        "focusbutton_timer_state",
      ]);
      const oldState = currentState.focusbutton_timer_state;

      // Skip if this is a reflection of our own update
      if (oldState?.source === "ui") {
        if (!lastUiUpdate || oldState.timestamp !== lastUiUpdate.timestamp) {
          lastUiUpdate = oldState;
          return;
        }
      }

      // Skip if state hasn't changed or if we have a final state
      if (
        oldState &&
        (oldState.isFinalState ||
          (oldState.time === state.time &&
            oldState.isCountingDown === state.isCountingDown &&
            oldState.isPaused === state.isPaused &&
            oldState.isFinished === state.isFinished))
      ) {
        return;
      }

      await browserAPI.storage.local.set({
        focusbutton_timer_state: state,
      });
    } catch (error) {
      console.error("Error updating timer state:", error);
    }
  }

  // Handle alarm ticks
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "timerTick") {
      tick();
    }
  });

  // Handle messages from the popup
  browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message:", request);

    if (request.type === "START_TIMER") {
      startTimer(request.duration).catch(console.error);
      sendResponse({ success: true });
    } else if (request.type === "STOP_TIMER") {
      stopTimer().catch(console.error);
      sendResponse({ success: true });
    } else if (request.type === "GET_TIMER_STATE") {
      sendResponse({
        success: true,
        state: {
          timeLeft: timer.timeLeft,
          isRunning: timer.isRunning && !timer.isPaused,
          isPaused: timer.isPaused,
          isFinished: timer.timeLeft === 0 && !timer.isRunning,
        },
      });
    }
  });

  // Add state tracking
  let lastUiUpdate = null;

  // Play notification sound
  async function playNotificationSound() {
    try {
      console.log("Attempting to play sound...");

      // Check if offscreen document exists
      const existing = await browserAPI.offscreen.hasDocument();
      if (!existing) {
        // Create offscreen document for audio
        await browserAPI.offscreen.createDocument({
          url: "offscreen.html",
          reasons: ["AUDIO_PLAYBACK"],
          justification: "Playing timer completion sound",
        });
      }

      // Send message to play sound
      browserAPI.runtime.sendMessage({
        type: "PLAY_SOUND",
        target: "offscreen",
      });

      // Show notification
      await browserAPI.notifications.create("timer-complete", {
        type: "basic",
        iconUrl: browserAPI.runtime.getURL("icons/icon-128.png"),
        title: "Timer Complete",
        message: "Your focus session has ended. Click to open FocusButton.",
        priority: 2,
        requireInteraction: true,
      });
    } catch (error) {
      console.error("Error in playNotificationSound:", error);

      // Show notification as fallback
      try {
        await browserAPI.notifications.create("timer-complete", {
          type: "basic",
          iconUrl: browserAPI.runtime.getURL("icons/icon-128.png"),
          title: "Timer Complete",
          message: "Your focus session has ended. Click to open FocusButton.",
          priority: 2,
          requireInteraction: true,
        });
      } catch (notifError) {
        console.error("Failed to show notification:", notifError);
      }
    }
  }

  // Listen for notification clicks
  browserAPI.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === "timer-complete") {
      // Get the extension's URL
      const extensionURL = browserAPI.runtime.getURL("index.html");

      // Create a new tab with the extension page
      browserAPI.tabs.create({
        url: extensionURL,
        active: true,
      });

      // Close the notification
      browserAPI.notifications.clear(notificationId);
    }
  });

  // Listen for close sound tab message
  browserAPI.runtime.onMessage.addListener((message) => {
    if (message.type === "CLOSE_SOUND_TAB") {
      // Find and close the sound tab
      browserAPI.tabs.query(
        { url: browserAPI.runtime.getURL("sound.html") },
        (tabs) => {
          tabs.forEach((tab) => browserAPI.tabs.remove(tab.id));
        }
      );
    }
  });

  // Cleanup timer on extension unload
  browserAPI.runtime.onSuspend.addListener(() => {
    if (timer.isRunning) {
      browserAPI.alarms.clearAll();
    }
  });
}
