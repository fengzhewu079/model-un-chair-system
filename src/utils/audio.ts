// Global audio context that persists across component renders
let audioContext: AudioContext | null = null;
let currentAlarmInterval: number | null = null;

// Initialize audio context on first user interaction
export const initAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('Failed to create AudioContext:', error);
    }
  }

  // Resume context if it's suspended (required by some browsers)
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
};

// Play a powerful alarm beep (强力警报音效 - 哔哔哔)
export const playAlarmBeep = (volume: number = 0.5, duration: number = 0.12) => {
  try {
    const context = initAudioContext();
    if (!context) return;

    // Create two oscillators for a more powerful siren-like sound
    const osc1 = context.createOscillator();
    const osc2 = context.createOscillator();
    const gainNode = context.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(context.destination);

    // Use high frequencies with slight offset for a harsh alarm sound
    osc1.frequency.value = 1500;  // High pitch
    osc2.frequency.value = 1520;  // Slightly offset creates beating effect
    osc1.type = 'square';         // Square wave is harsher
    osc2.type = 'square';

    // Boost volume for more power
    const actualVolume = Math.min(1.0, volume * 1.5);
    gainNode.gain.setValueAtTime(actualVolume, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

    osc1.start(context.currentTime);
    osc2.start(context.currentTime);
    osc1.stop(context.currentTime + duration);
    osc2.stop(context.currentTime + duration);
  } catch (error) {
    console.error('Audio playback failed:', error);
  }
};

// Play warning alarm - rapid beeping (哔哔哔)
export const playWarningBeeps = (volume: number = 0.5) => {
  // Play 3 short, sharp beeps in quick succession
  playAlarmBeep(volume, 0.12);
  setTimeout(() => playAlarmBeep(volume, 0.12), 150);
  setTimeout(() => playAlarmBeep(volume, 0.12), 300);
};

// Play completion alarm - continuous urgent beeping for 3 seconds (滴滴滴滴滴...)
export const playCompletionSound = (volume: number = 0.5) => {
  // Stop any existing alarm
  stopAlarm();

  // Play continuous urgent beeps
  const beepInterval = 250; // Very fast beeping - every 250ms
  const duration = 3000; // Last for 3 seconds
  let elapsed = 0;

  const playBeeps = () => {
    if (elapsed >= duration) {
      stopAlarm();
      return;
    }
    // Slightly longer beep for completion
    playAlarmBeep(volume, 0.15);
    elapsed += beepInterval;
  };

  // Play first beep immediately
  playBeeps();

  // Continue beeping rapidly
  currentAlarmInterval = window.setInterval(playBeeps, beepInterval);
};

// Stop the continuous alarm
export const stopAlarm = () => {
  if (currentAlarmInterval) {
    clearInterval(currentAlarmInterval);
    currentAlarmInterval = null;
  }
};

// Play a simple beep (for testing)
export const playBeep = (volume: number = 0.5, frequency: number = 1500, duration: number = 0.12) => {
  try {
    const context = initAudioContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'square';

    const actualVolume = Math.min(1.0, volume * 1.5);
    gainNode.gain.setValueAtTime(actualVolume, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);
  } catch (error) {
    console.error('Audio playback failed:', error);
  }
};
