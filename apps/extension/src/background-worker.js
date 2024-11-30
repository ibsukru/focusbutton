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
    if (!timer.isRunning) {
      console.log("Timer not running, skipping tick");
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
      // Only update state if timer is still running
      updateTimerState().catch(console.error);
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
    timer.isRunning = false;
    timer.timeLeft = 0;
    timer.lastTick = 0;

    // Clear the alarm
    await browserAPI.alarms.clear("timerTick");

    // Update state one last time to ensure UI reflects stopped state
    await updateTimerState();

    // Send final state update to mark as finished
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

  // Handle alarm ticks
  browserAPI.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm fired:", alarm.name, "at:", Date.now());

    if (alarm.name === "timerTick") {
      tick();
    } else if (alarm.name === "timerBackup") {
      // Backup alarm ensures we haven't lost too much time
      const now = Date.now();
      if (timer.isRunning && now - lastTickTime > 2000) {
        console.log("Backup alarm: correcting missed ticks");
        const missedSeconds = Math.floor((now - lastTickTime) / 1000);
        timer.timeLeft = Math.max(0, timer.timeLeft - missedSeconds);
        lastTickTime = now;
        updateTimerState().catch(console.error);
      }
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
          isRunning: timer.isRunning,
        },
      });
    }

    // Return true to indicate we'll send a response asynchronously
    return true;
  });

  // Add state tracking
  let lastStateUpdate = 0;
  const updateThrottleMs = 100;

  // Update timer state in storage and notify all tabs
  async function updateTimerState() {
    const now = Date.now();

    // Skip if we just updated recently
    if (now - lastStateUpdate < updateThrottleMs) {
      return;
    }

    const state = {
      type: "TIMER_UPDATE",
      time: timer.timeLeft,
      isCountingDown: timer.isRunning,
      isPaused: false,
      isFinished: timer.timeLeft === 0,
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
