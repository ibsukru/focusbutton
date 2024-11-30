console.log("Background worker starting...");

// Background timer state
let timer = {
  intervalId: null,
  timeLeft: 0,
  isRunning: false,
  lastTick: 0,
};

// Restore timer state on startup
chrome.storage.local.get(["focusbutton_timer_state"], (result) => {
  console.log("Restoring timer state:", result);
  const state = result.focusbutton_timer_state;
  if (state?.type === "TIMER_UPDATE" && state.isCountingDown) {
    startTimer(state.time);
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(function () {
  console.log("Extension icon clicked");
  chrome.tabs.create({
    url: "/index.html",
    active: true,
  });
});

async function updateTimerState() {
  if (!timer.isRunning) return;

  console.log("Updating timer state:", timer);
  const state = {
    type: "TIMER_UPDATE",
    time: timer.timeLeft,
    isCountingDown: timer.isRunning,
    isPaused: false,
    isFinished: timer.timeLeft === 0,
  };

  try {
    await chrome.storage.local.set({
      focusbutton_timer_state: state,
    });
  } catch (error) {
    console.error("Error updating timer state:", error);
  }
}

// Create or get the offscreen document
async function setupOffscreenDocument() {
  // Check if we already have an offscreen document
  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  // Create an offscreen document
  await chrome.offscreen
    .createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Playing timer end notification sound",
    })
    .catch((error) => {
      console.error("Error creating offscreen document:", error);
    });
}

// Initialize offscreen document
setupOffscreenDocument().catch(console.error);

function tick() {
  if (!timer.isRunning || timer.timeLeft <= 0) {
    stopTimer();
    return;
  }

  const now = Date.now();
  if (now - timer.lastTick < 900) {
    // Prevent ticks that are too close together
    return;
  }

  console.log("Timer tick:", timer.timeLeft);
  timer.timeLeft = Math.max(0, timer.timeLeft - 1);
  timer.lastTick = now;
  updateTimerState();

  if (timer.timeLeft === 0) {
    stopTimer();

    // Play notification sound using offscreen document
    console.log("Playing notification sound");
    setupOffscreenDocument().then(() => {
      chrome.runtime
        .sendMessage({ type: "PLAY_SOUND" })
        .catch((error) =>
          console.error("Error sending play sound message:", error)
        );
    });

    // Show notification
    chrome.notifications.create("timer-complete", {
      type: "basic",
      iconUrl: "/icons/icon-128.png",
      title: "Time's up!",
      message: "Your focus session has ended.",
      requireInteraction: true,
      silent: true,
    });

    // No need to notify tabs since we're playing sound in offscreen document
  }
}

async function startTimer(duration) {
  console.log("Starting timer with duration:", duration);
  await stopTimer();

  timer = {
    intervalId: null,
    timeLeft: duration,
    isRunning: true,
    lastTick: Date.now(),
  };

  // Only create interval if it doesn't exist
  if (!timer.intervalId) {
    timer.intervalId = setInterval(tick, 1000);
  }

  await updateTimerState();
}

async function stopTimer() {
  console.log("Stopping timer");
  if (timer.intervalId) {
    clearInterval(timer.intervalId);
  }

  timer = {
    intervalId: null,
    timeLeft: 0,
    isRunning: false,
    lastTick: 0,
  };

  await updateTimerState();
}

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Got message:", message, "from:", sender);

  (async () => {
    try {
      if (message.type === "START_TIMER") {
        console.log("Starting timer from message:", message);
        await startTimer(message.duration);
        sendResponse({ success: true });
      } else if (message.type === "STOP_TIMER") {
        console.log("Stopping timer from message:", message);
        await stopTimer();
        sendResponse({ success: true });
      } else if (message.type === "TIMER_END") {
        console.log("Ending timer from message:", message);
        sendResponse({ success: true });
      } else if (message.type === "GET_TIMER_STATE") {
        console.log("Getting timer state");
        sendResponse({
          success: true,
          state: {
            time: timer.timeLeft,
            isCountingDown: timer.isRunning,
            isPaused: false,
            isFinished: timer.timeLeft === 0,
          },
        });
      } else {
        console.warn("Unexpected message type:", message);
        sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});
