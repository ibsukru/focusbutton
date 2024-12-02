// Initialize audio when the document loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("Offscreen document loaded");

  // Get the audio element
  const audio = document.getElementById("notification");
  if (!audio) {
    console.error("Audio element not found on load");
    return;
  }

  // Ensure audio is loaded
  audio.load();
});

// Handle messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Offscreen received message:", message);

  if (message.type === "PLAY_SOUND" && message.target === "offscreen") {
    const audio = document.getElementById("notification");
    if (!audio) {
      console.error("Audio element not found");
      sendResponse({ success: false, error: "Audio element not found" });
      return true;
    }

    // Reset audio state
    audio.currentTime = 0;
    audio.volume = 1.0;

    // Play the sound
    audio
      .play()
      .then(() => {
        console.log("Sound played successfully");
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Error playing sound:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep the message channel open for the async response
  }
});

console.log("Offscreen document loaded and ready");
