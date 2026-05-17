import { NOTE_NAMES, MODES } from './constants.js';

// Pitch 0 = C1. A4 is pitch 45 (3 octaves + 9 semitones above C1).
export function noteToFreq(n) {
  return 440 * Math.pow(2, (n - 45) / 12);
}

export function noteName(n) {
  return NOTE_NAMES[n] ?? '??';
}

// Format as zero-padded 2-digit hex
export function hex2(n) {
  return (n & 0xff).toString(16).padStart(2, '0');
}

// Format as single hex digit
export function hex1(n) {
  return (n & 0xf).toString(16);
}

export function mkNote() {
  return { pitch: 0, waveform: 0, volume: 5, effect: 0, on: false };
}

export function mkSfx() {
  return {
    speed: 16,
    loopStart: 0,
    loopEnd: 0,
    notes: Array.from({ length: 32 }, mkNote),
  };
}

// Serialize a note to its 5-character PICO-8 hex representation:
// pitch(2) + waveform(1) + volume(1) + effect(1)
export function noteToHex(note) {
  return hex2(note.pitch) + hex1(note.waveform) + hex1(note.volume) + hex1(note.effect);
}

// ── Scale utilities ───────────────────────────────────────────────────────────

// Returns a Set<0-11> of chromatic note indices that are in the scale.
export function buildScaleNotes(key, modeId) {
  const intervals = MODES[modeId] ?? MODES.chromatic;
  return new Set(intervals.map(i => (key + i) % 12));
}

// Map a pitch to the nearest pitch that lies in validNotes.
// Searches outward ±1, ±2 ... preferring the downward direction on a tie.
export function snapToScale(pitch, validNotes) {
  const note = pitch % 12;
  if (validNotes.has(note)) return pitch;
  for (let d = 1; d <= 6; d++) {
    const down = (note - d + 12) % 12;
    const up   = (note + d) % 12;
    if (validNotes.has(down)) return Math.max(0, Math.min(63, pitch - d));
    if (validNotes.has(up))   return Math.max(0, Math.min(63, pitch + d));
  }
  return pitch; // validNotes is never empty, so this path is unreachable
}

// Walk pitch in direction (+1 or -1), stepping over non-scale notes.
// Used for ArrowUp / ArrowDown and scale-aware knob stepping.
export function nextScalePitch(pitch, dir, validNotes) {
  let p = pitch + dir;
  while (p >= 0 && p <= 63) {
    if (validNotes.has(p % 12)) return p;
    p += dir;
  }
  return pitch; // already at the boundary
}

// ── SFX serialisation ─────────────────────────────────────────────────────────

// Serialize an entire SFX to its PICO-8 string format
export function sfxToHex(sfx) {
  const header =
    hex2(sfx.speed) + hex2(sfx.loopStart) + hex2(sfx.loopEnd);
  const body = sfx.notes.map(noteToHex).join('');
  return header + body;
}
