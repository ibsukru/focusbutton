console.log("Content script loaded");

// Check if we're in a Chrome extension context
const isExtension =
  typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

if (isExtension) {
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);

    // Forward the message to the page
    window.postMessage(
      {
        type: "FOCUSBUTTON_EVENT",
        payload: message,
      },
      "*"
    );

    // Always send a response
    sendResponse({ success: true });
    return true;
  });

  // Listen for messages from the page
  window.addEventListener("message", (event) => {
    // Only accept messages from our window
    if (event.source !== window) return;

    if (event.data.type === "FOCUSBUTTON_EVENT") {
      console.log(
        "Content script forwarding message to background:",
        event.data.payload
      );
      chrome.runtime.sendMessage(event.data.payload);
    }
  });
} else {
  console.log("Not in Chrome extension context - skipping message handlers");
}
