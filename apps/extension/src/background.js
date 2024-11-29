// Store for active timers
const activeTimers = new Set();

// Handle extension icon click
chrome.action.onClicked.addListener(function() {
  chrome.tabs.create({ 
    url: '/index.html',
    active: true
  });
});

// Handle timer messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_TIMER') {
    const { duration } = request;
    console.log('Starting timer for', duration, 'seconds');
    
    const timerId = Date.now().toString();
    activeTimers.add(timerId);
    
    chrome.alarms.create(timerId, {
      when: Date.now() + (duration * 1000)
    });

    sendResponse({ success: true, timerId });
    return true; // Keep the message channel open for the async response
  }
  
  if (request.type === 'STOP_TIMER') {
    const { timerId } = request;
    if (timerId && activeTimers.has(timerId)) {
      chrome.alarms.clear(timerId);
      activeTimers.delete(timerId);
    }
    sendResponse({ success: true });
    return true;
  }
});

// Handle timer completion
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const timerId = alarm.name;
  if (activeTimers.has(timerId)) {
    activeTimers.delete(timerId);
    
    // Get all tabs
    const tabs = await chrome.tabs.query({});
    
    // Send message to all tabs
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'TIMER_COMPLETE',
          timerId: timerId
        });
      } catch (error) {
        console.error('Failed to send message to tab:', error);
      }
    }
  }
});
