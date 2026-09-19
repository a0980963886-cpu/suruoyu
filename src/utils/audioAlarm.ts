// Web Audio API Synthesizer for Alarms, Timers, and Secretary Notifications
// No external mp3 files needed - 100% reliable in all browser contexts

let audioCtx: AudioContext | null = null;
let alarmIntervalId: any = null;
let isAlarmPlaying = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
  Plays a single bell/chime note with harmonic overtone
 */
function playChimeNote(ctx: AudioContext, frequency: number, startTime: number, duration: number, gainValue = 0.3) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Gentle overtone for a pleasant modern electronic bell
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Play a double chime sequence (used for single burst or notifications)
 */
export function playNotificationDing() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playChimeNote(ctx, 587.33, now, 0.4, 0.25); // D5
    playChimeNote(ctx, 880.0, now + 0.12, 0.6, 0.3); // A5
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
}

/**
 * Play timer finished chime (3 ascending notes)
 */
export function playTimerDoneSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playChimeNote(ctx, 523.25, now, 0.3, 0.3); // C5
    playChimeNote(ctx, 659.25, now + 0.12, 0.3, 0.3); // E5
    playChimeNote(ctx, 783.99, now + 0.24, 0.4, 0.35); // G5
    playChimeNote(ctx, 1046.5, now + 0.38, 0.8, 0.4); // C6
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
}

/**
 * Start repeating alarm sound sequence until stopped
 */
export function startAlarmLoop(onPlay?: () => void) {
  if (isAlarmPlaying) return;
  isAlarmPlaying = true;
  onPlay?.();

  const playAlarmBurst = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      // High-energy 4-tone alarm ring: A5 -> C#6 -> E6 -> A6
      playChimeNote(ctx, 880.0, now, 0.18, 0.4);
      playChimeNote(ctx, 1108.73, now + 0.12, 0.18, 0.45);
      playChimeNote(ctx, 1318.51, now + 0.24, 0.18, 0.5);
      playChimeNote(ctx, 1760.0, now + 0.36, 0.35, 0.55);

      // Second burst
      playChimeNote(ctx, 880.0, now + 0.65, 0.18, 0.4);
      playChimeNote(ctx, 1108.73, now + 0.77, 0.18, 0.45);
      playChimeNote(ctx, 1318.51, now + 0.89, 0.18, 0.5);
      playChimeNote(ctx, 1760.0, now + 1.01, 0.4, 0.55);
    } catch (e) {
      console.warn('Alarm sound error:', e);
    }
  };

  // Play immediately
  playAlarmBurst();
  // Repeat every 1.8 seconds
  alarmIntervalId = setInterval(playAlarmBurst, 1800);
}

/**
 * Stop currently ringing alarm
 */
export function stopAlarmLoop() {
  isAlarmPlaying = false;
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

export function isAlarmActive(): boolean {
  return isAlarmPlaying;
}
