let audio = null;

export const preloadSound = () => {
  if (!audio) {
    audio = new Audio('/sounds/click.mp3');
    audio.volume = 0.3;
    audio.load();
  }
};

export const playClickSound = () => {
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  if (!soundEnabled) return;
  
  if (!audio) {
    audio = new Audio('/sounds/click.mp3');
    audio.volume = 0.3;
    audio.load();
  }
  
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

// Keep old exports for backward compatibility
export const toggleSound = () => {
  const current = localStorage.getItem('soundEnabled') !== 'false';
  const newState = !current;
  localStorage.setItem('soundEnabled', newState);
  return newState;
};

export const playClick = () => {
  if (localStorage.getItem('soundEnabled') === 'false') return;
  const audio = new Audio('/sounds/click.mp3');
  audio.volume = 0.3;
  audio.play().catch(() => {});
};
