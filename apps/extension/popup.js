document.addEventListener('DOMContentLoaded', () => {
  const focusButton = document.getElementById('focusButton');
  const timerDisplay = document.getElementById('timer');
  let isHolding = false;
  let startTime = null;
  let timerInterval = null;

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function startTimer() {
    if (!isHolding) {
      isHolding = true;
      startTime = Date.now();
      focusButton.textContent = 'Hold to Focus';
      focusButton.classList.add('holding');
      
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timerDisplay.textContent = formatTime(elapsed);
      }, 100);
    }
  }

  function stopTimer() {
    if (isHolding) {
      isHolding = false;
      clearInterval(timerInterval);
      focusButton.textContent = 'Press and Hold';
      focusButton.classList.remove('holding');
      
      // Save the session time
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      chrome.storage.local.get(['sessions'], (result) => {
        const sessions = result.sessions || [];
        sessions.push({
          timestamp: new Date().toISOString(),
          duration: elapsed
        });
        chrome.storage.local.set({ sessions });
      });
    }
  }

  focusButton.addEventListener('mousedown', startTimer);
  focusButton.addEventListener('mouseup', stopTimer);
  focusButton.addEventListener('mouseleave', stopTimer);
  focusButton.addEventListener('touchstart', startTimer);
  focusButton.addEventListener('touchend', stopTimer);
});
