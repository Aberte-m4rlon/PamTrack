/**
 * Loud consecutive repeating offline alert engine + lock-screen/background audio
 * support for Pamasahe Tracker Live Trip Monitor.
 */

export type AlertAlarmMode = 'urgent' | 'arrival' | 'info';

const IS_JSDOM =
  typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');

let cachedUrgentWavUri: string | null = null;
let cachedArrivalWavUri: string | null = null;
let cachedKeepaliveWavUri: string | null = null;

let activeAudioEl: HTMLAudioElement | null = null;
let activeWebAudioInterval: ReturnType<typeof setInterval> | null = null;
let activeVibrateInterval: ReturnType<typeof setInterval> | null = null;
let activeAutoStopTimer: ReturnType<typeof setTimeout> | null = null;
let activeAudioCtx: AudioContext | null = null;
let keepaliveAudioEl: HTMLAudioElement | null = null;
let activeWakeLock: { release?: () => Promise<void> } | null = null;
let alarmRinging = false;

const alarmListeners = new Set<(ringing: boolean) => void>();

function notifyAlarmListeners(ringing: boolean) {
  alarmRinging = ringing;
  alarmListeners.forEach((cb) => {
    try {
      cb(ringing);
    } catch {
      // Ignore subscriber errors
    }
  });
}

export function isAlertAlarmRinging(): boolean {
  return alarmRinging;
}

export function subscribeAlertAlarmState(cb: (ringing: boolean) => void): () => void {
  alarmListeners.add(cb);
  cb(alarmRinging);
  return () => {
    alarmListeners.delete(cb);
  };
}

/**
 * Generates an uncompressed PCM 16-bit mono WAV data URI entirely offline so
 * consecutive alert alarms work reliably without network access or external MP3 files.
 */
export function buildPcmWavDataUri(
  segments: Array<{ freqHz: number; secondaryFreqHz?: number; durationSec: number; volume: number }>,
  sampleRate = 16000
): string {
  const totalSamples = Math.max(
    1,
    Math.floor(segments.reduce((sum, s) => sum + s.durationSec, 0) * sampleRate)
  );
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  let sampleOffset = 0;
  for (const seg of segments) {
    const count = Math.floor(seg.durationSec * sampleRate);
    for (let i = 0; i < count && sampleOffset < totalSamples; i += 1) {
      let wave = 0;
      if (seg.freqHz > 0 && seg.volume > 0) {
        const t = i / sampleRate;
        const attack = Math.min(1, i / (sampleRate * 0.012));
        const release = Math.min(1, (count - i) / (sampleRate * 0.015));
        const env = attack * release;
        const primary = Math.sin(2 * Math.PI * seg.freqHz * t);
        const harmonic = Math.sin(2 * Math.PI * (seg.secondaryFreqHz || seg.freqHz * 1.5) * t);
        // Hard-edged dual-harmonic alert timbre for crisp mobile speaker cut-through
        const shaped = Math.tanh((primary * 0.72 + harmonic * 0.45) * 1.75);
        wave = shaped * seg.volume * env;
      }
      const clamped = Math.max(-1, Math.min(1, wave));
      view.setInt16(44 + sampleOffset * 2, Math.round(clamped * 32767), true);
      sampleOffset += 1;
    }
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function getUrgentSirenWavUri(): string {
  if (!cachedUrgentWavUri) {
    // Rapid consecutive dual-tone repeating emergency pulse pattern (~1.8s cycle)
    cachedUrgentWavUri = buildPcmWavDataUri([
      { freqHz: 987, secondaryFreqHz: 1480, durationSec: 0.19, volume: 0.96 },
      { freqHz: 0, durationSec: 0.06, volume: 0 },
      { freqHz: 1318, secondaryFreqHz: 1975, durationSec: 0.19, volume: 0.96 },
      { freqHz: 0, durationSec: 0.06, volume: 0 },
      { freqHz: 987, secondaryFreqHz: 1480, durationSec: 0.19, volume: 0.96 },
      { freqHz: 0, durationSec: 0.06, volume: 0 },
      { freqHz: 1318, secondaryFreqHz: 1975, durationSec: 0.24, volume: 0.96 },
      { freqHz: 0, durationSec: 0.25, volume: 0 },
    ]);
  }
  return cachedUrgentWavUri;
}

function getArrivalChimeWavUri(): string {
  if (!cachedArrivalWavUri) {
    // Loud consecutive 3-pulse ascending alert cadence (~1.5s cycle)
    cachedArrivalWavUri = buildPcmWavDataUri([
      { freqHz: 880, secondaryFreqHz: 1320, durationSec: 0.16, volume: 0.92 },
      { freqHz: 0, durationSec: 0.06, volume: 0 },
      { freqHz: 1175, secondaryFreqHz: 1760, durationSec: 0.16, volume: 0.92 },
      { freqHz: 0, durationSec: 0.06, volume: 0 },
      { freqHz: 1568, secondaryFreqHz: 2349, durationSec: 0.24, volume: 0.94 },
      { freqHz: 0, durationSec: 0.28, volume: 0 },
    ]);
  }
  return cachedArrivalWavUri;
}

function getKeepaliveWavUri(): string {
  if (!cachedKeepaliveWavUri) {
    // Minimal low-footprint audio frame that holds the mobile MediaSession open
    cachedKeepaliveWavUri = buildPcmWavDataUri([
      { freqHz: 40, durationSec: 1.0, volume: 0.0001 },
    ], 8000);
  }
  return cachedKeepaliveWavUri;
}

function registerMediaSessionControls(title: string, isAlarm: boolean) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    const ms = navigator.mediaSession;
    if (typeof MediaMetadata !== 'undefined') {
      ms.metadata = new MediaMetadata({
        title,
        artist: 'Pamasahe Tracker – Live Trip Alert',
        album: isAlarm ? 'Tap Stop or Pause to Silence Alarm' : 'Active Trip Monitor',
        artwork: [
          { src: '/assets/pamasahe-tracker-icon.png', sizes: '192x192', type: 'image/png' },
        ],
      });
    }
    ms.playbackState = 'playing';
    ms.setActionHandler('pause', () => stopOfflineAlertAlarm());
    ms.setActionHandler('stop', () => stopOfflineAlertAlarm());
  } catch {
    // Ignore unsupported MediaSession implementations
  }
}

/**
 * Unlocks mobile audio + optional WakeLock during a user tap (e.g. Start Live Trip)
 * so alerts can sound loudly later even if the phone screen is turned off or backgrounded.
 */
export async function armBackgroundTripAudio(): Promise<void> {
  if (IS_JSDOM || typeof window === 'undefined') return;

  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (nav.wakeLock && !activeWakeLock) {
      activeWakeLock = await nav.wakeLock.request('screen').catch(() => null);
    }
  } catch {
    // Wake Lock optional
  }

  try {
    if (!keepaliveAudioEl) {
      keepaliveAudioEl = new Audio(getKeepaliveWavUri());
      keepaliveAudioEl.loop = true;
      keepaliveAudioEl.volume = 0.01;
    }
    const p = keepaliveAudioEl.play?.();
    if (p && typeof p.catch === 'function') await p.catch(() => null);
    registerMediaSessionControls('Pamasahe Tracker Live Trip Active', false);
  } catch {
    // Ignore autoplay errors in restricted tabs
  }
}

export async function releaseBackgroundTripAudio(): Promise<void> {
  try {
    keepaliveAudioEl?.pause?.();
  } catch {
    // Ignore
  }
  keepaliveAudioEl = null;

  try {
    await activeWakeLock?.release?.();
  } catch {
    // Ignore
  }
  activeWakeLock = null;
}

function playCompressedWebAudioBurst(mode: AlertAlarmMode) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!activeAudioCtx || activeAudioCtx.state === 'closed') {
      activeAudioCtx = new AudioCtx();
    }
    if (activeAudioCtx.state === 'suspended') {
      activeAudioCtx.resume().catch(() => null);
    }

    const ctx = activeAudioCtx;
    const compressor = ctx.createDynamicsCompressor?.();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.95, ctx.currentTime);

    if (compressor) {
      compressor.threshold.setValueAtTime(-16, ctx.currentTime);
      compressor.knee.setValueAtTime(6, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.002, ctx.currentTime);
      compressor.release.setValueAtTime(0.12, ctx.currentTime);
      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);
    } else {
      masterGain.connect(ctx.destination);
    }

    const dest = compressor || masterGain;
    const now = ctx.currentTime;
    const steps =
      mode === 'urgent'
        ? [987, 1318, 987, 1318]
        : mode === 'arrival'
          ? [880, 1175, 1568]
          : [987, 1318];

    steps.forEach((freq, idx) => {
      const startAt = now + idx * 0.22;
      const dur = 0.18;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const stepGain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(freq, startAt);
      osc2.frequency.setValueAtTime(freq * 1.5, startAt);

      stepGain.gain.setValueAtTime(0.001, startAt);
      stepGain.gain.exponentialRampToValueAtTime(0.75, startAt + 0.015);
      stepGain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);

      osc1.connect(stepGain);
      osc2.connect(stepGain);
      stepGain.connect(dest);

      osc1.start(startAt);
      osc2.start(startAt);
      osc1.stop(startAt + dur + 0.01);
      osc2.stop(startAt + dur + 0.01);
    });
  } catch {
    // Ignore AudioContext blocks cleanly
  }
}

/**
 * Stops any actively ringing consecutive alarm sound and repeating vibration.
 */
export function stopOfflineAlertAlarm(): void {
  if (activeWebAudioInterval) {
    clearInterval(activeWebAudioInterval);
    activeWebAudioInterval = null;
  }
  if (activeVibrateInterval) {
    clearInterval(activeVibrateInterval);
    activeVibrateInterval = null;
  }
  if (activeAutoStopTimer) {
    clearTimeout(activeAutoStopTimer);
    activeAutoStopTimer = null;
  }
  try {
    activeAudioEl?.pause?.();
  } catch {
    // Ignore
  }
  activeAudioEl = null;

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(0);
    } catch {
      // Ignore
    }
  }
  notifyAlarmListeners(false);
}

/**
 * Fires consecutive repeating loud alarm audio (HTMLAudio loop for locked/background
 * screens + DynamicsCompressor Web Audio boost in foreground) plus repeating vibration.
 */
export function startLoudConsecutiveAlertSound(input: {
  title: string;
  mode: AlertAlarmMode;
  repeatMs?: number;
}): void {
  stopOfflineAlertAlarm();

  const repeatMs = input.repeatMs ?? (input.mode === 'urgent' ? 30000 : 12000);
  const vibPattern =
    input.mode === 'urgent'
      ? [450, 110, 450, 110, 450, 160, 650]
      : [320, 100, 320, 100, 480];

  const triggerVibe = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(vibPattern);
      } catch {
        // Ignore
      }
    }
  };

  triggerVibe();
  playCompressedWebAudioBurst(input.mode);
  notifyAlarmListeners(true);

  if (!IS_JSDOM && typeof Audio !== 'undefined') {
    try {
      const wavUri =
        input.mode === 'urgent' ? getUrgentSirenWavUri() : getArrivalChimeWavUri();
      activeAudioEl = new Audio(wavUri);
      activeAudioEl.loop = true;
      activeAudioEl.volume = 1.0;
      const p = activeAudioEl.play?.();
      if (p && typeof p.catch === 'function') p.catch(() => null);
      registerMediaSessionControls(input.title, true);
    } catch {
      // Fallback to Web Audio interval below
    }
  }

  activeWebAudioInterval = setInterval(
    () => playCompressedWebAudioBurst(input.mode),
    input.mode === 'urgent' ? 1150 : 1250
  );
  activeVibrateInterval = setInterval(triggerVibe, 2200);
  activeAutoStopTimer = setTimeout(() => {
    stopOfflineAlertAlarm();
  }, repeatMs);
}
