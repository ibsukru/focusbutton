// Initialize browser API first
const browserAPI = (function () {
  try {
    if (typeof chrome !== "undefined") {
      return {
        runtime: chrome.runtime,
        action: chrome.action,
        scripting: chrome.scripting,
        tabs: chrome.tabs,
        windows: chrome.windows,
        storage: chrome.storage,
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
    try {
      const result = await browserAPI.storage.local.get([
        "focusbutton_timer_state",
      ]);
      console.log("Restoring timer state:", result);
      const state = result.focusbutton_timer_state;

      if (state?.isCountingDown && !state.isPaused && state.time > 0) {
        console.log("Resuming timer with time:", state.time);
        await startTimer(state.time);
      }
    } catch (error) {
      console.error("Error initializing timer state:", error);
    }
  }

  function tick() {
    if (!timer.isRunning || timer.isPaused) {
      console.log("Timer not running or is paused, skipping tick");
      return;
    }

    const now = Date.now();

    // Ensure we don't tick too frequently
    if (now - lastTickTime < 900) {
      // Allow for some timing variation
      return;
    }

    console.log("Tick: current time:", timer.timeLeft);
    lastTickTime = now;

    const newTime = Math.max(0, timer.timeLeft - 1);
    timer.timeLeft = newTime;
    timer.lastTick = now;

    // Update state and check for timer completion
    if (newTime === 0) {
      console.log("Timer completed");
      stopTimer().catch(console.error);
      playNotificationSound().catch(console.error);
    } else {
      // Only update state if timer is still running and not paused
      if (!timer.isPaused) {
        updateTimerState().catch(console.error);
      }
    }
  }

  async function startTimer(duration) {
    console.log("Starting timer with duration:", duration);

    // Stop any existing timer
    await stopTimer();

    // Initialize timer state
    timer = {
      timeLeft: duration,
      isRunning: true,
      lastTick: Date.now(),
      isPaused: false,
    };
    lastTickTime = Date.now();

    // Create alarms for redundancy
    await browserAPI.alarms.clear("timerTick");
    await browserAPI.alarms.clear("timerBackup");

    await browserAPI.alarms.create("timerTick", {
      periodInMinutes: 1 / 60, // Every second
      when: Date.now() + 1000, // Start in 1 second
    });

    // Create a backup alarm that fires every minute
    await browserAPI.alarms.create("timerBackup", {
      periodInMinutes: 1,
      when: Date.now() + 60000,
    });

    // Update state immediately
    await updateTimerState();

    console.log("Timer started:", timer);
  }

  async function stopTimer() {
    console.log("Stopping timer");
    const wasRunning = timer.isRunning;
    timer.isRunning = false;
    timer.timeLeft = 0;
    timer.lastTick = 0;
    timer.isPaused = false;

    // Clear the alarm
    await browserAPI.alarms.clear("timerTick");

    // Only send updates if we were actually running
    if (wasRunning) {
      // Update state one last time to ensure UI reflects stopped state
      await browserAPI.storage.local.set({
        focusbutton_timer_state: {
          type: "TIMER_UPDATE",
          isCountingDown: false,
          time: 0,
          isPaused: false,
          isFinished: true,
        },
      });
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
    await browserAPI.alarms.clear("timerBackup");

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

    await browserAPI.alarms.create("timerBackup", {
      periodInMinutes: 1,
      when: Date.now() + 60000,
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

  // Handle alarm ticks
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm fired:", alarm.name, "at:", Date.now());

    if (alarm.name === "timerTick") {
      if (timer.isPaused) {
        console.log("Timer is paused, skipping tick");
        return;
      }

      tick();
    } else if (alarm.name === "timerBackup") {
      // Handle backup ticks for redundancy
      if (timer.isRunning && !timer.isPaused) {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - timer.lastTick) / 1000);

        if (elapsedSeconds > 0) {
          console.log("Backup tick - elapsed seconds:", elapsedSeconds);
          timer.timeLeft = Math.max(0, timer.timeLeft - elapsedSeconds);
          lastTickTime = now;
          updateTimerState().catch(console.error);
        }
      }
    }
  });

  // Update timer state in storage and notify all tabs
  async function updateTimerState() {
    const now = Date.now();

    // Skip if we just updated recently or timer is paused
    if (now - lastStateUpdate < updateThrottleMs || timer.isPaused) {
      return;
    }

    // Check if we've reached 0
    if (timer.timeLeft === 0 && lastKnownTime > 0) {
      console.log("Timer reached zero, stopping timer");
      await stopTimer();
      return;
    }

    lastKnownTime = timer.timeLeft;

    const state = {
      type: "TIMER_UPDATE",
      time: timer.timeLeft,
      isCountingDown: timer.isRunning && !timer.isPaused,
      isPaused: timer.isPaused,
      isFinished: timer.timeLeft === 0,
      startTime: timer.lastTick,
    };

    console.log("Updating timer state:", state);
    lastStateUpdate = now;

    try {
      await browserAPI.storage.local.set({
        focusbutton_timer_state: state,
      });
    } catch (error) {
      console.error("Error updating timer state:", error);
    }
  }

  // Handle messages from the popup
  browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message:", request);

    if (request.type === "START_TIMER") {
      startTimer(request.duration).catch(console.error);
      sendResponse({ success: true });
    } else if (request.type === "STOP_TIMER") {
      stopTimer().catch(console.error);
      sendResponse({ success: true });
    } else if (request.type === "PAUSE_TIMER") {
      console.log("Pausing timer...");
      pauseTimer().catch(console.error);
      sendResponse({
        success: true,
        state: {
          timeLeft: timer.timeLeft,
          isRunning: false,
          isPaused: true,
        },
      });
    } else if (request.type === "RESUME_TIMER") {
      console.log("Resuming timer...");
      resumeTimer().catch(console.error);
      sendResponse({
        success: true,
        state: {
          timeLeft: timer.timeLeft,
          isRunning: true,
          isPaused: false,
        },
      });
    } else if (request.type === "GET_TIMER_STATE") {
      sendResponse({
        success: true,
        state: {
          timeLeft: timer.timeLeft,
          isRunning: timer.isRunning && !timer.isPaused,
          isPaused: timer.isPaused,
        },
      });
    }

    // Return true to indicate we'll send a response asynchronously
    return true;
  });

  // Add state tracking
  let lastStateUpdate = 0;
  const updateThrottleMs = 100;
  let lastKnownTime = 0;

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
