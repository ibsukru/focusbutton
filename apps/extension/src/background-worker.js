// Background timer state
let timer = {
  timeLeft: 0,
  isRunning: false,
  lastTick: Date.now(),
  isPaused: false,
};

// Keep track of when the last tick occurred
let lastTickTime = 0;
let lastStateUpdate = 0;
const STATE_UPDATE_THROTTLE = 100;
let lastUiUpdate = null;

// Initialize timer state on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log("Extension starting up");
  await initializeTimerState();
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed");
  await initializeTimerState();
});

// Handle suspension/resume
chrome.runtime.onSuspend.addListener(() => {
  console.log("Extension suspending, saving state");
  // Save state synchronously before suspension
  if (timer.isRunning) {
    chrome.storage.local.set({
      focusbutton_timer_state: {
        type: "TIMER_UPDATE",
        isCountingDown: true,
        time: timer.timeLeft,
        isPaused: timer.isPaused,
        isFinished: false,
        source: "background",
        timestamp: Date.now(),
        persistOnReload: true,
      },
    });
  }
});

// Handle extension updates
chrome.runtime.onUpdateAvailable.addListener(async (details) => {
  console.log("Update available, saving state before update");
  if (timer.isRunning) {
    await chrome.storage.local.set({
      focusbutton_timer_state: {
        type: "TIMER_UPDATE",
        isCountingDown: true,
        time: timer.timeLeft,
        isPaused: timer.isPaused,
        isFinished: false,
        source: "background",
        timestamp: Date.now(),
      },
    });
  }
});

async function initializeTimerState() {
  console.log("Initializing timer state");
  try {
    // Always start with a clean state
    timer = {
      timeLeft: 0,
      isRunning: false,
      lastTick: Date.now(),
      isPaused: false,
    };

    // Clear any existing storage
    await chrome.storage.local.remove("focusbutton_timer_state");

    // Set initial state
    await chrome.storage.local.set({
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

  const now = Date.now();

  // Initialize timer state with exact duration
  timer = {
    timeLeft: Math.floor(duration), // Ensure integer value
    isRunning: true,
    lastTick: now,
    isPaused: false,
  };
  lastTickTime = now;

  // Create alarm for countdown (every second)
  await chrome.alarms.clear("timerTick");
  await chrome.alarms.create("timerTick", {
    periodInMinutes: 1 / 60, // Every second
  });

  // Send initial state with exact duration
  const state = {
    type: "TIMER_UPDATE",
    isCountingDown: true,
    time: Math.floor(duration), // Ensure integer value
    isPaused: false,
    isFinished: false,
    source: "background",
    timestamp: now,
    persistOnReload: true,
  };

  await chrome.storage.local.set({
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
  await chrome.alarms.clear("timerTick");

  const state = {
    type: "TIMER_UPDATE",
    isCountingDown: false,
    time: 0,
    isPaused: false,
    isFinished: true,
    source: "background",
    timestamp: Date.now(),
    isFinalState: true,
  };

  await chrome.storage.local.set({
    focusbutton_timer_state: state,
  });
}

async function updateState(state) {
  const now = Date.now();
  if (now - lastStateUpdate < STATE_UPDATE_THROTTLE) {
    return;
  }
  lastStateUpdate = now;

  try {
    await chrome.storage.local.set({
      focusbutton_timer_state: state,
    });
    console.log("State updated:", state);
  } catch (error) {
    console.error("Error updating state:", error);
  }
}

async function tick() {
  // Don't tick if timer is not running or is paused
  if (!timer.isRunning || timer.isPaused) {
    return;
  }

  const now = Date.now();
  const elapsed = now - timer.lastTick;

  // Throttle updates to prevent flickering
  if (elapsed < 900) {
    return;
  }

  console.log(
    "Tick: elapsed time:",
    elapsed,
    "current timeLeft:",
    timer.timeLeft,
    "lastTick:",
    timer.lastTick,
    "isPaused:",
    timer.isPaused
  );

  // Ensure timeLeft is a valid number
  if (typeof timer.timeLeft !== "number" || isNaN(timer.timeLeft)) {
    console.error("Invalid timer.timeLeft:", timer.timeLeft);
    timer.timeLeft = 0;
    timer.isRunning = false;
    await updateState({
      type: "TIMER_UPDATE",
      isCountingDown: false,
      time: 0,
      isPaused: false,
      isFinished: true,
      source: "background",
      timestamp: now,
      persistOnReload: false,
    });
    return;
  }

  // Calculate new time and update last tick
  const newTime = Math.max(0, timer.timeLeft - 1);
  timer.lastTick = now;

  // Only update if time has actually changed
  if (newTime !== timer.timeLeft) {
    timer.timeLeft = newTime;
    console.log("Timer tick, new time:", newTime);

    const state = {
      type: "TIMER_UPDATE",
      isCountingDown: newTime > 0,
      time: newTime,
      isPaused: timer.isPaused,
      isFinished: newTime === 0,
      source: "background",
      timestamp: now,
      persistOnReload: timer.isRunning && !timer.isPaused,
    };

    if (newTime === 0) {
      console.log("Timer completed");
      timer.isRunning = false;
      timer.lastTick = 0;
      state.isFinalState = true;

      await updateState(state);
      await stopTimer();
      await playNotificationSound();
    } else {
      await updateState(state);
    }
  }
}

async function pauseTimer() {
  console.log("Pausing timer");

  // Clear the alarm first to prevent any more ticks
  await chrome.alarms.clear("timerTick");

  // Update timer state
  timer.isPaused = true;
  timer.isRunning = false;
  timer.lastTick = Date.now();

  // Update state to reflect pause
  const state = {
    type: "TIMER_UPDATE",
    isCountingDown: false,
    time: timer.timeLeft,
    isPaused: true,
    isFinished: false,
    source: "background",
    timestamp: Date.now(),
    persistOnReload: true,
    isFinalState: false,
  };

  // Update storage state
  await chrome.storage.local.set({
    focusbutton_timer_state: state,
  });

  return { success: true };
}

async function resumeTimer() {
  console.log("Resuming timer with time:", timer.timeLeft);

  // Update timer state first
  timer.isPaused = false;
  timer.isRunning = true;
  timer.lastTick = Date.now();

  // Create new alarm
  await chrome.alarms.create("timerTick", {
    periodInMinutes: 1 / 60, // Every second
  });

  // Update state
  const state = {
    type: "TIMER_UPDATE",
    isCountingDown: true,
    time: timer.timeLeft,
    isPaused: false,
    isFinished: false,
    source: "background",
    timestamp: Date.now(),
    persistOnReload: true,
    isFinalState: false,
  };

  // Update storage state
  await chrome.storage.local.set({
    focusbutton_timer_state: state,
  });

  return { success: true };
}

// Update timer state in storage and notify all tabs
async function updateTimerState() {
  const now = Date.now();

  // Don't update if timer is stopped
  if (!timer.isRunning && timer.timeLeft === 0) {
    return;
  }

  // Throttle updates
  if (now - lastStateUpdate < STATE_UPDATE_THROTTLE) {
    return;
  }
  lastStateUpdate = now;

  const state = {
    type: "TIMER_UPDATE",
    isCountingDown: timer.isRunning && !timer.isPaused,
    time: timer.timeLeft,
    isPaused: timer.isPaused,
    isFinished: timer.timeLeft === 0 && !timer.isRunning,
    source: "background",
    timestamp: now,
    persistOnReload: timer.isRunning,
  };

  try {
    const currentState = await chrome.storage.local.get([
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

    // Skip if state hasn't changed
    if (
      oldState &&
      oldState.time === state.time &&
      oldState.isCountingDown === state.isCountingDown &&
      oldState.isPaused === state.isPaused &&
      !state.isFinalState // Always update if it's a final state
    ) {
      return;
    }

    await chrome.storage.local.set({
      focusbutton_timer_state: state,
    });
    console.log("Timer state updated:", state);
  } catch (error) {
    console.error("Error updating timer state:", error);
  }
}

// Handle alarm ticks
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "timerTick") {
    // Only tick if timer is running and not paused
    if (timer.isRunning && !timer.isPaused) {
      tick().catch(console.error);
    } else if (timer.isPaused) {
      // Clear alarm if timer is paused
      chrome.alarms.clear("timerTick").catch(console.error);
    }
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  const response = {
    success: true,
    error: null,
  };

  try {
    switch (request.type) {
      case "START_TIMER":
        if (typeof request.time === "number") {
          startTimer(request.time).catch(console.error);
        } else {
          console.error("Invalid duration:", request.time);
          response.success = false;
          response.error = "Invalid duration";
        }
        break;

      case "STOP_TIMER":
        stopTimer().catch(console.error);
        break;

      case "PAUSE_TIMER":
        console.log("Handling pause timer request");
        if (timer.isRunning && !timer.isPaused) {
          pauseTimer().catch(console.error);
        }
        break;

      case "RESUME_TIMER":
        console.log("Handling resume timer request");
        if (!timer.isRunning && timer.isPaused && timer.timeLeft > 0) {
          resumeTimer().catch(console.error);
        }
        break;

      case "GET_TIMER_STATE":
        response.state = {
          isRunning: timer.isRunning,
          isPaused: timer.isPaused,
          timeLeft: timer.timeLeft,
        };
        break;

      default:
        console.warn("Unknown message type:", request.type);
        response.success = false;
        response.error = "Unknown message type";
    }

    // Send response after state is updated
    console.log("Sending response:", response);
    sendResponse(response);
    return true; // Keep the message channel open for async response
  } catch (error) {
    console.error("Error handling message:", error);
    response.success = false;
    response.error = error.message;
    sendResponse(response);
    return true;
  }
});

// Play notification sound
async function playNotificationSound() {
  try {
    console.log("Attempting to play sound...");

    // First try to close any existing offscreen document
    try {
      await chrome.offscreen.closeDocument();
    } catch (e) {
      console.log("No existing offscreen document to close");
    }

    // Create a new offscreen document with absolute URL
    try {
      const offscreenUrl = chrome.runtime.getURL("offscreen.html");
      console.log("Creating offscreen document with URL:", offscreenUrl);

      await chrome.offscreen.createDocument({
        url: offscreenUrl,
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Playing timer completion sound",
      });

      // Wait a bit for the document to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error creating offscreen document:", error);
      throw error;
    }

    // Send message to play sound and wait for response
    try {
      const response = await chrome.runtime.sendMessage({
        type: "PLAY_SOUND",
        target: "offscreen",
      });
      console.log("Sound play message response:", response);

      if (!response?.success) {
        throw new Error(response?.error || "Failed to play sound");
      }
    } catch (error) {
      console.error("Error sending play sound message:", error);
      throw error;
    }

    // Show notification
    await chrome.notifications.create("timer-complete", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title: "Timer Complete",
      message: "Your focus session has ended. Click to open FocusButton.",
      priority: 2,
      requireInteraction: true,
    });
  } catch (error) {
    console.error("Error in playNotificationSound:", error);

    // Show notification as fallback
    try {
      await chrome.notifications.create("timer-complete", {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
        title: "Timer Complete",
        message: "Your focus session has ended. Click to open FocusButton.",
        priority: 2,
        requireInteraction: true,
      });
    } catch (notifError) {
      console.error("Error showing notification:", notifError);
    }
  }
}

// Listen for notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === "timer-complete") {
    // Get the extension's URL
    const extensionURL = chrome.runtime.getURL("index.html");
    // Create a new tab with the extension page
    chrome.tabs.create({
      url: extensionURL,
      active: true,
    });
    // Close the notification
    chrome.notifications.clear(notificationId);
  }
});

// Listen for close sound tab message
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "CLOSE_SOUND_TAB") {
    // Find and close the sound tab
    chrome.tabs.query({ url: chrome.runtime.getURL("sound.html") }, (tabs) => {
      tabs.forEach((tab) => chrome.tabs.remove(tab.id));
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL("index.html");
  await chrome.tabs.create({ url, active: true });
});

// Cleanup timer on extension unload
chrome.runtime.onSuspend.addListener(() => {
  if (timer.isRunning) {
    chrome.alarms.clearAll();
  }
});
