console.log("Notification page loaded");

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content loaded");

  const audio = document.getElementById("notificationSound");
  console.log("Audio element:", audio);

  if (audio) {
    console.log("Audio source:", audio.src);
    audio.volume = 1.0;

    // Load the audio first
    audio.load();

    // Play when loaded
    audio.oncanplaythrough = function () {
      console.log("Audio can play through, attempting playback");
      audio
        .play()
        .then(() => {
          console.log("Sound playing successfully");
          // Wait for sound to finish before closing
          setTimeout(() => {
            window.close();
          }, 1000);
        })
        .catch((error) => {
          console.error("Error playing sound:", error);
          window.close();
        });
    };
  } else {
    console.error("Audio element not found");
    window.close();
  }
});
