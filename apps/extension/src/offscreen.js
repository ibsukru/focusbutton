console.log("Offscreen document loaded");

// Get the audio element
let audio = document.getElementById("notificationSound");

// Initialize audio when the document loads
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Document loaded, initializing...");

  try {
    if (!audio) {
      throw new Error("Audio element not found");
    }

    // Set the audio source using chrome.runtime.getURL
    const audioUrl = chrome.runtime.getURL("timer-end.mp3");
    console.log("Setting audio source to:", audioUrl);

    // Create a new audio element if needed
    if (!audio) {
      audio = new Audio();
      audio.id = "notificationSound";
      document.body.appendChild(audio);
    }

    audio.src = audioUrl;

    // Load the audio
    await audio.load();
    console.log("Audio element initialized successfully");

    // Test that audio is properly loaded
    const canPlayPromise = new Promise((resolve, reject) => {
      const onCanPlay = () => {
        audio.removeEventListener("error", onError);
        resolve();
      };

      const onError = (e) => {
        audio.removeEventListener("canplaythrough", onCanPlay);
        reject(
          new Error(
            `Audio load error: ${e.target.error?.message || "Unknown error"}`
          )
        );
      };

      audio.addEventListener("canplaythrough", onCanPlay, { once: true });
      audio.addEventListener("error", onError, { once: true });
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Audio load timeout")), 5000);
    });

    await Promise.race([canPlayPromise, timeoutPromise]);
    console.log("Audio is ready to play");

    // Test play (muted)
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    console.log("Audio test play successful");
  } catch (error) {
    console.error("Error initializing audio:", error);
    throw error; // Re-throw to indicate initialization failure
  }
});

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Offscreen received message:", message);

  if (message.target !== "offscreen" || message.type !== "PLAY_SOUND") {
    return;
  }

  try {
    if (!audio) {
      throw new Error("Audio element not found");
    }

    if (!audio.src) {
      const audioUrl = chrome.runtime.getURL("timer-end.mp3");
      console.log("Resetting audio source to:", audioUrl);
      audio.src = audioUrl;
      audio.load();
    }

    // Reset the audio to the beginning
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.muted = false;

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

    // Keep the message channel open for the async response
    return true;
  } catch (error) {
    console.error("Error in message handler:", error);
    sendResponse({ success: false, error: error.message });
  }
});
