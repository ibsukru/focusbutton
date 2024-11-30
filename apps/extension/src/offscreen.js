console.log('Offscreen document loaded');

let audioContext = null;
let audioBuffer = null;

// Initialize audio context and load sound
async function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    try {
      const response = await fetch(chrome.runtime.getURL('timer-end.mp3'));
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log('Audio initialized successfully');
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }
}

// Play the sound
async function playSound() {
  if (!audioContext || !audioBuffer) {
    await initAudio();
  }
  
  try {
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    return true;
  } catch (error) {
    console.error('Error playing sound:', error);
    return false;
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Offscreen received message:', message);
  
  if (message.type === 'PLAY_SOUND') {
    playSound()
      .then(success => {
        console.log('Sound played:', success ? 'successfully' : 'failed');
        sendResponse({ success });
      })
      .catch(error => {
        console.error('Error in playSound:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open
  }
});
