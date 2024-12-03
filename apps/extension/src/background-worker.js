// Background timer state
let timer = {
  timeLeft: 0,
  isRunning: false,
  lastTick: 0,
  isPaused: false,
  isCompleting: false, // Add flag to prevent multiple completions
  startTime: 0,
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
    const result = await chrome.storage.local.get(["focusbutton_timer_state"]);
    const state = result.focusbutton_timer_state;

    if (state && state.persistOnReload) {
      timer.timeLeft = state.time;
      timer.isPaused = state.isPaused;
      timer.isRunning = state.isCountingDown;
      timer.startTime = state.startTime;

      // Update storage to maintain state
      await chrome.storage.local.set({
        focusbutton_timer_state: {
          ...state,
          timestamp: Date.now(),
        },
      });
    }

    // Always start with a clean state
    timer = {
      timeLeft: 0,
      isRunning: false,
      lastTick: 0,
      isPaused: false,
      isCompleting: false,
      startTime: 0,
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

let timerIntervalId = null;

const startTimer = async (duration) => {
  try {
    // Stop any existing timer
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }

    // Initialize timer state
    timer.isRunning = true;
    timer.isPaused = false;
    timer.timeLeft = duration;
    timer.startTime = Date.now();
    timer.lastTick = Date.now();
    timer.isCompleting = false;

    // Initial state update
    await chrome.storage.local.set({
      focusbutton_timer_state: {
        type: "TIMER_UPDATE",
        isCountingDown: true,
        time: timer.timeLeft,
        isPaused: false,
        source: "background",
        timestamp: Date.now(),
        startTime: timer.startTime,
      },
    });

    let expectedTime = Date.now();

    timerIntervalId = setInterval(async () => {
      const drift = Date.now() - expectedTime;

      // Update timer state
      timer.timeLeft = Math.max(0, timer.timeLeft - 1);
      timer.lastTick = Date.now();

      // Update state
      const state = {
        type: "TIMER_UPDATE",
        isCountingDown: timer.timeLeft > 0,
        time: timer.timeLeft,
        isPaused: false,
        source: "background",
        timestamp: Date.now(),
        startTime: timer.startTime,
      };

      await chrome.storage.local.set({
        focusbutton_timer_state: state,
      });

      // Log every second
      console.log(
        `[${new Date().toLocaleTimeString()}] time: ${timer.timeLeft}`
      );

      if (timer.timeLeft === 0) {
        console.log("Timer completed, playing notification...");
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        timer.isRunning = false;
        timer.isCompleting = true;

        // Send final state update before playing sound
        const finalState = {
          type: "TIMER_UPDATE",
          isCountingDown: false,
          time: 0,
          isPaused: false,
          isFinished: true,
          source: "background",
          timestamp: Date.now(),
          isFinalState: true,
          startTime: timer.startTime,
        };

        await chrome.storage.local.set({
          focusbutton_timer_state: finalState,
        });

        // Play sound and show notification
        await playNotificationSound();
        return;
      }

      // Compensate for drift
      expectedTime += 1000;
      const nextDelay = Math.max(0, 1000 - drift);
      if (drift > 1000) {
        expectedTime = Date.now() + 1000; // Reset if drift is too large
      }
    }, 1000);
  } catch (error) {
    console.error("Error starting timer:", error);
    throw error;
  }
};

async function stopTimer(isCanceled = false) {
  console.log("Stopping timer");

  // Prevent multiple completions
  if (timer.isCompleting) {
    console.log("Timer already completing, ignoring stop request");
    return;
  }

  timer.isCompleting = true;

  try {
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
      isCanceled,
    };

    await chrome.storage.local.set({
      focusbutton_timer_state: state,
    });

    // Only play notification if timer wasn't canceled
    if (!isCanceled) {
      console.log("Timer stopped (not canceled), playing notification...");
      await playNotificationSound();
    }
  } finally {
    timer.isCompleting = false;
  }
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
  if (!timer.isRunning || timer.isPaused || timer.isCompleting) {
    return;
  }

  const now = performance.now();
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
    await stopTimer();
    return;
  }

  // Calculate new time and update last tick
  const newTime = Math.max(0, timer.timeLeft - 1);
  timer.lastTick = now;

  // Only update if time has actually changed
  if (newTime !== timer.timeLeft) {
    timer.timeLeft = newTime;
    console.log("Timer tick, new time:", newTime);

    if (newTime === 0) {
      console.log("Timer completed");
      await stopTimer();
    } else {
      const state = {
        type: "TIMER_UPDATE",
        isCountingDown: true,
        time: newTime,
        isPaused: timer.isPaused,
        isFinished: false,
        source: "background",
        timestamp: Date.now(),
        persistOnReload: timer.isRunning && !timer.isPaused,
      };
      await updateState(state);
    }
  }
}

async function pauseTimer() {
  console.log("Pausing timer");

  // Clear the interval first
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }

  // Update timer state
  timer.isPaused = true;
  timer.isRunning = false;
  timer.lastTick = Date.now();

  // Save state with persistOnReload flag
  await chrome.storage.local.set({
    focusbutton_timer_state: {
      type: "TIMER_UPDATE",
      isCountingDown: false,
      time: timer.timeLeft,
      isPaused: true,
      source: "background",
      timestamp: Date.now(),
      startTime: timer.startTime,
      persistOnReload: true,
    },
  });

  return { success: true };
}

async function resumeTimer() {
  console.log("Resuming timer with time:", timer.timeLeft);

  // Start a new timer with remaining time
  timer.isPaused = false;
  timer.isRunning = true;
  timer.lastTick = Date.now();
  timer.startTime = Date.now(); // Reset start time on resume

  // Start new timer
  await startTimer(timer.timeLeft);

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
        if (typeof request.time === "number" && request.time > 0) {
          // Stop any existing timer
          if (timerIntervalId) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
          }

          // Start new timer
          startTimer(request.time).catch(console.error);
        } else {
          console.error("Invalid duration:", request.time);
          response.success = false;
          response.error = "Invalid duration";
        }
        break;

      case "STOP_TIMER":
        console.log("Stopping timer, isCanceled:", request.isCanceled);
        if (timerIntervalId) {
          clearInterval(timerIntervalId);
          timerIntervalId = null;
        }
        timer.isRunning = false;
        timer.isPaused = false;
        timer.timeLeft = 0;
        timer.startTime = 0;
        timer.lastTick = 0;
        timer.isCompleting = false;
        break;

      case "PAUSE_TIMER":
        console.log("Handling pause timer request");
        if (timer.isRunning && !timer.isPaused) {
          if (timerIntervalId) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
          }
          timer.isPaused = true;
          timer.isRunning = false;
        }
        break;

      case "RESUME_TIMER":
        console.log("Handling resume timer request");
        if (!timer.isRunning && timer.isPaused && timer.timeLeft > 0) {
          timer.lastTick = performance.now();
          startTimer(timer.timeLeft).catch(console.error);
        }
        break;

      case "GET_TIMER_STATE":
        response.running = timer.isRunning && !timer.isPaused;
        response.remainingTime = timer.timeLeft;
        break;

      default:
        console.warn("Unknown message type:", request.type);
        response.success = false;
        response.error = "Unknown message type";
    }

    console.log("Sending response:", response);
    sendResponse(response);
    return true;
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
  console.log("playNotificationSound called");
  try {
    console.log("Attempting to play sound...");

    // Detect if we're running in Firefox
    const isFirefox = navigator.userAgent.includes("Firefox");
    const api = isFirefox ? browser : chrome;

    if (isFirefox) {
      // Firefox implementation using Audio API
      try {
        const audio = new Audio(api.runtime.getURL("timer-end.mp3"));
        audio.volume = 1.0; // Ensure full volume
        await audio.play();
        console.log("Sound played successfully in Firefox");
      } catch (error) {
        console.error("Error playing sound in Firefox:", error);
      }
    } else {
      // Chrome implementation using offscreen API
      try {
        await chrome.offscreen.closeDocument();
      } catch (e) {
        console.log("No existing offscreen document to close");
      }

      try {
        const offscreenUrl = chrome.runtime.getURL("offscreen.html");
        console.log("Creating offscreen document with URL:", offscreenUrl);

        await chrome.offscreen.createDocument({
          url: offscreenUrl,
          reasons: ["AUDIO_PLAYBACK"],
          justification: "Playing timer completion sound",
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        const response = await chrome.runtime.sendMessage({
          type: "PLAY_SOUND",
          target: "offscreen",
        });
        console.log("Sound play message response:", response);

        if (!response?.success) {
          throw new Error(response?.error || "Failed to play sound");
        }
      } catch (error) {
        console.error("Error with offscreen document:", error);
      }
    }

    // Show notification
    try {
      const notificationOptions = {
        type: "basic",
        iconUrl: api.runtime.getURL("icons/icon-128.png"),
        title: "Time's up!",
        message: "Your focus session has ended. Click to open FocusButton.",
        priority: 2,
        requireInteraction: true
      };

      if (isFirefox) {
        await browser.notifications.create("timer-complete", notificationOptions);
      } else {
        await chrome.notifications.create("timer-complete", notificationOptions);
      }
      console.log("Notification created successfully");
    } catch (notifError) {
      console.error("Error showing notification:", notifError);
    }
  } catch (error) {
    console.error("Error in playNotificationSound:", error);
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
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: "index.html",
  });
});

// Cleanup timer on extension unload
chrome.runtime.onSuspend.addListener(() => {
  if (timer.isRunning) {
    chrome.alarms.clearAll();
  }
});
