// Simple Web Audio-based notification ringtones
// No external audio files needed

const ctx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

function resumeContext() {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

function beepTone(frequency, type, duration, delay = 0, gainValue = 0.1) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
  gain.gain.setValueAtTime(gainValue, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

export const ringtones = {
  beep: 'Beep Singkat',
  bell: 'Bell Klasik',
  chime: 'Chime Lembut',
  marimba: 'Marimba Manis',
  digital: 'Digital Alert'
};

export function playNotification(ringtone = 'bell') {
  if (typeof window === 'undefined' || !ctx) return;
  resumeContext();

  switch (ringtone) {
    case 'beep':
      beepTone(880, 'sine', 0.2, 0, 0.15);
      break;
    case 'bell':
      beepTone(880, 'sine', 0.6, 0, 0.12);
      beepTone(1100, 'sine', 0.4, 0.15, 0.1);
      break;
    case 'chime':
      beepTone(523.25, 'sine', 0.5, 0, 0.1);
      beepTone(659.25, 'sine', 0.5, 0.1, 0.1);
      beepTone(783.99, 'sine', 0.6, 0.2, 0.1);
      break;
    case 'marimba':
      beepTone(523.25, 'sine', 0.25, 0, 0.12);
      beepTone(659.25, 'sine', 0.25, 0.12, 0.12);
      beepTone(783.99, 'sine', 0.25, 0.24, 0.12);
      beepTone(1046.5, 'sine', 0.4, 0.36, 0.12);
      break;
    case 'digital':
    default:
      beepTone(1200, 'square', 0.08, 0, 0.08);
      beepTone(800, 'square', 0.15, 0.1, 0.08);
      break;
  }
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  const permission = await Notification.requestPermission();
  return permission;
}

export function showBrowserNotification(title, body, icon = '/logo.png') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.hidden || document.visibilityState === 'hidden') {
    try {
      new Notification(title, {
        body,
        icon,
        badge: icon,
        tag: 'love-notes-chat'
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
}
