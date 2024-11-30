console.log("Background worker starting...");

// Keep service worker alive
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed");
  // Clear any existing alarms
  await chrome.alarms.clearAll();
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log("Extension icon clicked");

  // Inject content script into active tab
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content-script.js"],
    });
    console.log("Content script injected successfully");
  } catch (error) {
    console.error("Failed to inject content script:", error);
  }

  const extensionUrl = chrome.runtime.getURL("index.html");
  console.log("Opening extension at:", extensionUrl);

  // Check if we already have a tab open
  const tabs = await chrome.tabs.query({
    url: extensionUrl,
  });

  if (tabs.length > 0) {
    // Focus existing tab
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    // Create new tab
    await chrome.tabs.create({
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
chrome.runtime.onStartup.addListener(async () => {
  console.log("Extension starting up");
  await initializeTimerState();
});

// Also initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed");
  await initializeTimerState();
});

async function initializeTimerState() {
  try {
    const result = await chrome.storage.local.get(["focusbutton_timer_state"]);
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

    // Play notification sound using offscreen document
    setupOffscreenDocument().then(() => {
      chrome.runtime
        .sendMessage({ type: "PLAY_SOUND" })
        .catch((error) =>
          console.error("Error sending play sound message:", error)
        );
    });
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
  await chrome.alarms.clear("timerTick");
  await chrome.alarms.clear("timerBackup");

  await chrome.alarms.create("timerTick", {
    periodInMinutes: 1 / 60, // Every second
    when: Date.now() + 1000, // Start in 1 second
  });

  // Create a backup alarm that fires every minute
  await chrome.alarms.create("timerBackup", {
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
  await chrome.alarms.clear("timerTick");

  // Update state one last time to ensure UI reflects stopped state
  await updateTimerState();

  // Send final state update to mark as finished
  await chrome.storage.local.set({
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
chrome.alarms.onAlarm.addListener((alarm) => {
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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

// Update timer state in storage and notify all tabs
async function updateTimerState() {
  const state = {
    type: "TIMER_UPDATE",
    time: timer.timeLeft,
    isCountingDown: timer.isRunning,
    isPaused: false,
    isFinished: timer.timeLeft === 0,
  };

  console.log("Updating timer state:", state);

  try {
    // Update storage - this will trigger storage listeners in tabs
    await chrome.storage.local.set({
      focusbutton_timer_state: state,
    });
  } catch (error) {
    console.error("Error updating timer state:", error);
  }
}

// Setup offscreen document for audio
async function setupOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Playing timer completion sound",
  });
}

// Cleanup timer on extension unload
chrome.runtime.onSuspend.addListener(() => {
  if (timer.isRunning) {
    chrome.alarms.clearAll();
  }
});
