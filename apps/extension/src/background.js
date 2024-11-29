// Listen for extension installation
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon-128.png',
      title: 'FocusButton New Tab Page',
      message: 'FocusButton has been set as your new tab page. Would you like to keep it?',
      buttons: [
        { title: 'Keep it' },
        { title: 'Disable it' }
      ],
      requireInteraction: true
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(function() {
  chrome.tabs.create({ 
    url: '/index.html',
    active: true
  });
});
