console.log("Offscreen script loaded");

// Play sound function
async function playSound() {
  console.log("Attempting to play sound");
  const audio = document.getElementById("notificationSound");

  if (!audio) {
    console.error("Audio element not found");
    return false;
  }

  try {
    audio.currentTime = 0;
    await audio.play();
    console.log("Sound played successfully");
    return true;
  } catch (error) {
    console.error("Error playing sound:", error);
    return false;
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Offscreen received message:", message);

  if (message.type === "PLAY_SOUND") {
    console.log("Playing notification sound");
    playSound().then((success) => {
      console.log("Playback result:", success);
      sendResponse({ success });

      if (success) {
        // Close after successful playback
        setTimeout(() => {
          console.log("Closing offscreen document");
          chrome?.offscreen?.closeDocument();
        }, 1000);
      }
    });
    return true; // Keep message channel open
  }
});
