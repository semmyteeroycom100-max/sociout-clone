let audioEnabled = localStorage.getItem('soundEnabled') !== 'false';

export const toggleSound = () => {
  audioEnabled = !audioEnabled;
  localStorage.setItem('soundEnabled', audioEnabled);
  return audioEnabled;
};

export const playClick = () => {
  if (!audioEnabled) return;
  const audio = new Audio('/sounds/click.mp3');
  audio.volume = 0.3;
  audio.play().catch(e => console.log('Audio play failed', e));
};