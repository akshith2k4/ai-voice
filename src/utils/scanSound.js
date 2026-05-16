/**
 * Scan sound utility — plays a sound each time an RFID item is scanned.
 * Uses the Web Audio API so no external audio file is needed.
 *
 * 4 built-in sounds:
 *   "beep"    – Classic barcode-scanner beep (short & sharp)
 *   "chime"   – Soft pleasant notification ding
 *   "pop"     – Quick playful pop / bubble
 *   "kaching" – Cash-register ka-ching
 *
 * Switch sound:
 *   import { setScanSoundType, playScanSound } from "../utils/scanSound";
 *   setScanSoundType("chime");   // pick one
 *   playScanSound();             // plays the chosen sound
 *
 * Test in browser console (click the page first so AudioContext is allowed):
 *   import("/src/utils/scanSound.js").then(m => { m.setScanSoundType("beep");   m.playScanSound(); })
 *   import("/src/utils/scanSound.js").then(m => { m.setScanSoundType("chime");  m.playScanSound(); })
 *   import("/src/utils/scanSound.js").then(m => { m.setScanSoundType("pop");    m.playScanSound(); })
 *   import("/src/utils/scanSound.js").then(m => { m.setScanSoundType("kaching");m.playScanSound(); })
 *
 *   // or play all 4 back-to-back to compare:
 *   import("/src/utils/scanSound.js").then(m => m.playAllSounds())
 */

let audioCtx = null;
let currentSoundType = "chime"; // default

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ─────────────────────────────────────────────────────────
// 1. BEEP  – Classic barcode scanner beep (short & sharp)
// ─────────────────────────────────────────────────────────
function playBeep() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const d = 0.1;

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1800, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + d);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + d);
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────
// 2. CHIME – Soft pleasant notification ding
// ─────────────────────────────────────────────────────────
function playChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const d = 0.35;

    // Main bell tone – C6
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1047, now);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.28, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + d);
    osc1.connect(g1);
    g1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + d);

    // Overtone – E6
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318, now);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.12, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + d * 0.8);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + d);

    // Warm body – C5
    const osc3 = ctx.createOscillator();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(523, now);
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.08, now);
    g3.gain.exponentialRampToValueAtTime(0.001, now + d * 0.6);
    osc3.connect(g3);
    g3.connect(ctx.destination);
    osc3.start(now);
    osc3.stop(now + d);
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────
// 3. POP – Quick playful pop / bubble
// ─────────────────────────────────────────────────────────
function playPop() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────
// 4. KA-CHING – Cash register
// ─────────────────────────────────────────────────────────
function playKaching() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // "Ka" — metallic click (filtered noise burst)
    const noiseLen = 0.04;
    const buf = ctx.createBuffer(1, ctx.sampleRate * noiseLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 6000;
    bp.Q.value = 2;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.6, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);
    nSrc.connect(bp);
    bp.connect(nGain);
    nGain.connect(ctx.destination);
    nSrc.start(now);
    nSrc.stop(now + noiseLen);

    // "Ching" — bell ring
    const t = now + 0.03;
    const d = 0.25;

    const b1 = ctx.createOscillator();
    b1.type = "sine";
    b1.frequency.setValueAtTime(1318, t);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.30, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + d);
    b1.connect(g1);
    g1.connect(ctx.destination);
    b1.start(t);
    b1.stop(t + d);

    const b2 = ctx.createOscillator();
    b2.type = "sine";
    b2.frequency.setValueAtTime(1661, t);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.15, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + d);
    b2.connect(g2);
    g2.connect(ctx.destination);
    b2.start(t);
    b2.stop(t + d);

    const b3 = ctx.createOscillator();
    b3.type = "sine";
    b3.frequency.setValueAtTime(659, t);
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.10, t);
    g3.gain.exponentialRampToValueAtTime(0.001, t + d * 0.7);
    b3.connect(g3);
    g3.connect(ctx.destination);
    b3.start(t);
    b3.stop(t + d);
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────
// Sound dispatcher
// ─────────────────────────────────────────────────────────
const SOUNDS = { beep: playBeep, chime: playChime, pop: playPop, kaching: playKaching };

function playOnce() {
  (SOUNDS[currentSoundType] || playBeep)();
}

/**
 * Switch the active scan sound.
 * @param {"beep"|"chime"|"pop"|"kaching"} type
 */
export function setScanSoundType(type) {
  if (SOUNDS[type]) {
    currentSoundType = type;
  } else {
    console.warn(`Unknown scan sound "${type}". Available: ${Object.keys(SOUNDS).join(", ")}`);
  }
}

/** Get the current sound type. */
export function getScanSoundType() {
  return currentSoundType;
}

/**
 * Play all 4 sounds back-to-back (for easy comparison in browser console).
 * Usage:  import("/src/utils/scanSound.js").then(m => m.playAllSounds())
 */
export function playAllSounds() {
  const types = Object.keys(SOUNDS);
  types.forEach((type, i) => {
    setTimeout(() => {
      console.log(`🔊 Playing: ${type}`);
      SOUNDS[type]();
    }, i * 600);
  });
}

const STAGGER_MS = 250; // gap between consecutive sounds

/**
 * Play the scan sound `count` times (1 per scanned item).
 *
 * @param {number} [count=1]
 */
export function playScanSound(count = 1) {
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      playOnce();
    } else {
      setTimeout(playOnce, i * STAGGER_MS);
    }
  }
}

/**
 * Count the number of scanned items inside a WebSocket message body.
 * Mirrors the parsing logic used by the dialog components.
 *
 * @param {object} msg – parsed JSON body from the RFID WebSocket
 * @returns {number}
 */
export function countScannedItems(msg) {
  if (!msg) return 0;

  const items = Array.isArray(msg.results?.items)
    ? msg.results.items
    : Array.isArray(msg.scannedTags)
      ? msg.scannedTags
      : msg.inventoryItemId
        ? [msg]
        : [];

  // Only count items that have a usable identifier
  return items.filter((it) => it.inventoryItemId || it.rfidTag).length;
}
