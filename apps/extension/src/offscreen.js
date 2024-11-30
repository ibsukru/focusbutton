console.log("Offscreen document loaded");

// Get the audio element
const audio = document.getElementById("notificationSound");

// Initialize audio when the document loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("Document loaded, initializing...");

  if (audio) {
    audio.load();
    console.log("Audio element initialized");
  } else {
    console.error("Audio element not found");
  }
});

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Offscreen received message:", message);

  // Only handle messages targeted for offscreen document
  if (message.target !== "offscreen") {
    return;
  }

  if (message.type === "PLAY_SOUND") {
    if (!audio) {
      console.error("Audio element not found");
      return;
    }

    // Reset the audio to the beginning
    audio.currentTime = 0;
    audio.volume = 1.0;

    // Play the sound
    audio
      .play()
      .then(() => {
        console.log("Sound played successfully");
      })
      .catch((error) => {
        console.error("Error playing sound:", error);
      });
  }
});
