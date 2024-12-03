// Timer Web Worker for precise timing
let timer = null;
let startTime = 0;
let duration = 0;

self.onmessage = (e) => {
  const { type, time } = e.data;
  
  switch (type) {
    case 'START':
      startTime = Date.now();
      duration = time;
      startTimer();
      break;
      
    case 'STOP':
      stopTimer();
      break;
  }
};

function startTimer() {
  stopTimer();
  
  timer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, duration - elapsed);
    
    self.postMessage({
      type: 'TICK',
      time: remaining
    });
    
    if (remaining === 0) {
      stopTimer();
    }
  }, 1000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
