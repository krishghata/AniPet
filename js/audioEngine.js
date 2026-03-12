/* ═══════════════════════════════════════════════════════════════
   AniPet — Audio Engine
   Synthesised background music + character sound effects.
   Uses Web Audio API — no external files needed.
   ═══════════════════════════════════════════════════════════════ */

let ctx         = null;
let masterGain  = null;
let sfxGain     = null;
let musicGain   = null;
let bgTimer     = null;
let bgStep      = 0;

const MUTE_KEY  = 'anipet-muted';
// Default: muted. Only unmute if user explicitly turned it on before ('0').
let muted       = localStorage.getItem(MUTE_KEY) !== '0';

/* ── Init (must be called after a user gesture) ─────────────── */
export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume(); // some browsers start suspended

  masterGain = ctx.createGain();
  masterGain.gain.value = muted ? 0 : 1;
  masterGain.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = 0.18;
  musicGain.connect(masterGain);

  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.9;
  sfxGain.connect(masterGain);

  startBgMusic();

  // Preload character audio files in background (after a short delay)
  setTimeout(() => Object.keys(AUDIO_FILES).forEach(id => loadAudioFile(id)), 500);

  // Pause audio when app goes to background; resume when it returns
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      ctx.suspend();
      stopBgMusic();
    } else {
      ctx.resume();
      if (!muted) startBgMusic();
    }
  });
}

/* ── Mute toggle ─────────────────────────────────────────────── */
export function setMuted(val) {
  muted = val;
  localStorage.setItem(MUTE_KEY, val ? '1' : '0');
  if (masterGain) {
    masterGain.gain.setTargetAtTime(val ? 0 : 1, ctx.currentTime, 0.08);
  }
}

export function isMuted() { return muted; }

/* ── Background music ────────────────────────────────────────── */
// Child-friendly pentatonic melody in C major (C D E G A)
const MELODY = [
  523.25, 659.25, 783.99, 880.00, 783.99,
  659.25, 523.25, 587.33, 659.25, 783.99,
  880.00, 783.99, 659.25, 587.33, 523.25, 0,
];
const BASS = [
  261.63, 0, 392.00, 0, 261.63, 0, 392.00, 0,
  261.63, 0, 392.00, 0, 261.63, 0, 392.00, 0,
];
const NOTE_LEN = 0.42; // seconds per step ~143bpm

function startBgMusic() {
  if (bgTimer) return;
  scheduleBgStep();
}

function scheduleBgStep() {
  if (!ctx) return;
  const freq = MELODY[bgStep % MELODY.length];
  const bass = BASS[bgStep % BASS.length];

  if (freq > 0) {
    playTone(ctx, musicGain, freq, 'sine', 0.18, NOTE_LEN * 0.85);
    // soft harmony a perfect 5th up on every 4th note
    if (bgStep % 4 === 0) {
      playTone(ctx, musicGain, freq * 1.5, 'sine', 0.06, NOTE_LEN * 0.7);
    }
  }
  if (bass > 0) {
    playTone(ctx, musicGain, bass, 'triangle', 0.10, NOTE_LEN * 0.5);
  }

  bgStep++;
  bgTimer = setTimeout(scheduleBgStep, NOTE_LEN * 1000);
}

function playTone(ctx, out, freq, type, vol, duration) {
  const osc = ctx.createOscillator();
  osc.type = freq < 300 ? 'triangle' : type;
  osc.frequency.value = freq;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, ctx.currentTime);
  env.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.03);
  env.gain.setValueAtTime(vol, ctx.currentTime + duration * 0.6);
  env.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  osc.connect(env);
  env.connect(out);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration + 0.05);
}

export function stopBgMusic() {
  clearTimeout(bgTimer);
  bgTimer = null;
}

/* ── Audio file cache ────────────────────────────────────────── */
// Preload real audio files; null means file not found (use synth fallback)
const audioBufferCache = {};

// File-based sounds: one MP3 per character (drop files in assets/audio/)
const AUDIO_FILES = {
  dog:  'assets/audio/dog_bark.mp3',
  cat:  'assets/audio/cat_meow.mp3',
  duck: 'assets/audio/duck_quack.mp3',
};

async function loadAudioFile(characterId) {
  if (characterId in audioBufferCache) return audioBufferCache[characterId];
  const src = AUDIO_FILES[characterId];
  if (!src || !ctx) { audioBufferCache[characterId] = null; return null; }
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error('not found');
    const arrayBuf = await res.arrayBuffer();
    const decoded  = await ctx.decodeAudioData(arrayBuf);
    audioBufferCache[characterId] = decoded;
    return decoded;
  } catch {
    audioBufferCache[characterId] = null; // mark as unavailable
    return null;
  }
}

function playAudioBuffer(buffer, volume = 1.0) {
  if (!ctx || !sfxGain) return;
  const src  = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(gain);
  gain.connect(sfxGain);
  src.start();
}

/* ── Character SFX ───────────────────────────────────────────── */
export async function playCharacterSfx(characterId, animId) {
  if (!ctx || !sfxGain) return;
  if (ctx.state === 'suspended') ctx.resume();

  // Try real audio file first (only for default/walkin/happy/playing/jumping)
  const useFile = ['default','walkin','happy','playing','jumping','walking'].includes(animId)
                  || !SFX_MAP[characterId]?.[animId];
  if (useFile) {
    const buf = await loadAudioFile(characterId);
    if (buf) {
      // happy / double sounds: play twice
      if (animId === 'happy') {
        playAudioBuffer(buf, 0.9);
        setTimeout(() => playAudioBuffer(buf, 0.7), 280);
      } else {
        playAudioBuffer(buf, 0.9);
      }
      return;
    }
  }

  // Fallback: synthesised sound
  const charSfx = SFX_MAP[characterId];
  if (!charSfx) return;
  const fn = charSfx[animId] || charSfx.default;
  if (fn) fn(ctx, sfxGain);
}

/* ── SFX map ─────────────────────────────────────────────────── */
const SFX_MAP = {

  dog: {
    default:  bark,
    idle:     pant,
    walkin:   bark,
    happy:    (c, o) => { bark(c, o); setTimeout(() => bark(c, o), 270); },
    sad:      whimper,
    confused: (c, o) => { whimper(c, o); setTimeout(() => whimper(c, o), 350); },
    sleepy:   yawn,
    playing:  bark,
    walking:  pant,
    jumping:  bark,
  },

  cat: {
    default:  meow,
    idle:     purr,
    walkin:   meow,
    happy:    (c, o) => { meow(c, o); setTimeout(() => purr(c, o), 400); },
    sad:      sadMeow,
    confused: sadMeow,
    sleepy:   purr,
    playing:  meow,
    walking:  purr,
    jumping:  meow,
  },

  duck: {
    default:  quack,
    idle:     softQuack,
    walkin:   quack,
    happy:    (c, o) => { quack(c, o); setTimeout(() => quack(c, o), 220); setTimeout(() => quack(c, o), 440); },
    sad:      softQuack,
    confused: (c, o) => { softQuack(c, o); setTimeout(() => softQuack(c, o), 300); },
    sleepy:   softQuack,
    playing:  quack,
    walking:  softQuack,
    jumping:  quack,
  },
};

/* ── Dog sounds ──────────────────────────────────────────────── */
function bark(ctx, out) {
  // Short noise burst shaped into a bark
  const len = Math.floor(ctx.sampleRate * 0.18);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 1.2;

  const env = ctx.createGain();
  env.gain.setValueAtTime(1.0, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

  src.connect(bp); bp.connect(env); env.connect(out);
  src.start();
}

function pant(ctx, out) {
  const len = Math.floor(ctx.sampleRate * 0.08);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.4;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.5, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  src.connect(hp); hp.connect(env); env.connect(out);
  src.start();
}

function whimper(ctx, out) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(680, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(420, ctx.currentTime + 0.45);
  osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.65);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, ctx.currentTime);
  env.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
  env.gain.setValueAtTime(0.22, ctx.currentTime + 0.4);
  env.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);

  osc.connect(env); env.connect(out);
  osc.start(); osc.stop(ctx.currentTime + 0.75);
}

function yawn(ctx, out) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.5);
  osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 1.2);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(400, ctx.currentTime);
  lp.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.5);
  lp.frequency.linearRampToValueAtTime(300, ctx.currentTime + 1.2);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, ctx.currentTime);
  env.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.2);
  env.gain.setValueAtTime(0.18, ctx.currentTime + 0.9);
  env.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);

  osc.connect(lp); lp.connect(env); env.connect(out);
  osc.start(); osc.stop(ctx.currentTime + 1.4);
}

/* ── Cat sounds ──────────────────────────────────────────────── */
function meow(ctx, out) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(370, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(720, ctx.currentTime + 0.14);
  osc.frequency.linearRampToValueAtTime(460, ctx.currentTime + 0.5);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1100;
  bp.Q.value = 2.5;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, ctx.currentTime);
  env.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 0.05);
  env.gain.setValueAtTime(0.28, ctx.currentTime + 0.38);
  env.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.62);

  osc.connect(bp); bp.connect(env); env.connect(out);
  osc.start(); osc.stop(ctx.currentTime + 0.7);
}

function sadMeow(ctx, out) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(480, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(280, ctx.currentTime + 0.65);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, ctx.currentTime);
  env.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.05);
  env.gain.setValueAtTime(0.18, ctx.currentTime + 0.45);
  env.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.75);

  osc.connect(env); env.connect(out);
  osc.start(); osc.stop(ctx.currentTime + 0.8);
}

function purr(ctx, out) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 28; // sub-bass purr

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 350;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, ctx.currentTime);
  env.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.12);
  env.gain.setValueAtTime(0.20, ctx.currentTime + 0.75);
  env.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);

  osc.connect(lp); lp.connect(env); env.connect(out);
  osc.start(); osc.stop(ctx.currentTime + 1.1);
}

/* ── Duck sounds ─────────────────────────────────────────────── */
function quack(ctx, out) {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(620, ctx.currentTime);
  osc.frequency.setValueAtTime(310, ctx.currentTime + 0.07);
  osc.frequency.setValueAtTime(620, ctx.currentTime + 0.11);
  osc.frequency.setValueAtTime(310, ctx.currentTime + 0.18);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 820;
  bp.Q.value = 3;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.45, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

  osc.connect(bp); bp.connect(env); env.connect(out);
  osc.start(); osc.stop(ctx.currentTime + 0.38);
}

function softQuack(ctx, out) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(380, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(240, ctx.currentTime + 0.3);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.22, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  osc.connect(env); env.connect(out);
  osc.start(); osc.stop(ctx.currentTime + 0.45);
}
