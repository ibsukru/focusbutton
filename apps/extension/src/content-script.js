import { browserAPI } from "./browser-api";
console.log("Content script loaded");

// More robust check for extension context
const isExtension = (() => {
  try {
    return !!(browserAPI && browserAPI.runtime);
  } catch (e) {
    console.warn("Extension context check failed:", e);
    return false;
  }
})();

if (isExtension) {
  // Listen for messages from the background script
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      browserAPI.runtime.sendMessage(event.data.payload);
    }
  });
} else {
  console.log("Not in Chrome extension context - skipping message handlers");
}
