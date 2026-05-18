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
    length: 32,
    wavetable: false,
    samples: new Array(64).fill(0), // signed amplitude −7..+7 for waveform instrument mode
    notes: Array.from({ length: 32 }, mkNote),
  };
}

// Default drum groove for SFX slot 3 (DRUMS channel).
// 32 16th-note steps, 2 bars of 4/4.
// Pitches: C1=0, C2=12, C3=24, C5=48
export function mkDrumSfx() {
  const K = () => ({ pitch: 0,  waveform: 0, volume: 7, effect: 3, on: true });  // kick
  const S = () => ({ pitch: 24, waveform: 6, volume: 6, effect: 5, on: true });  // snare
  const H = () => ({ pitch: 48, waveform: 6, volume: 3, effect: 5, on: true });  // hat
  const T = () => ({ pitch: 12, waveform: 3, volume: 6, effect: 3, on: true });  // tom
  const _ = mkNote;                                                                // rest
  const notes = [
  // 0    1   2   3    4   5   6   7    8   9   10  11   12  13  14  15
    K(), _(), H(), _(), S(), _(), H(), _(), K(), _(), H(), _(), S(), _(), T(), _(),
  // 16   17  18  19   20  21  22  23   24  25  26  27   28  29  30  31
    K(), _(), H(), _(), S(), _(), H(), _(), K(), _(), H(), _(), S(), _(), T(), _(),
  ];
  return { ...mkSfx(), notes };
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

// Serialize an entire SFX to its PICO-8 string format (168 hex chars).
// If sfx.length < 32, the active notes are tiled to fill all 32 slots.
// If sfx.wavetable is true, encodes the 64-sample waveform instead of notes.
// ⚠ Waveform encoding (editor_mode byte + sample layout) is a best-guess —
//   verify against a real .p8 file before shipping (see PICO8_AUDIO_FEATURES.md).
export function sfxToHex(sfx) {
  const header = (sfx.wavetable
    ? '02'   // editor_mode = 02 = waveform instrument (unverified)
    : '00')  // editor_mode = 00 = pitch mode
    + hex2(sfx.speed) + hex2(sfx.loopStart) + hex2(sfx.loopEnd);

  if (sfx.wavetable) {
    const samples = sfx.samples ?? new Array(64).fill(0);
    // Pack two 4-bit amplitude values (−7..+7 → 0..14) into each note's pitch byte.
    // 32 notes × 2 samples = 64 samples total. Instrument/vol/effect bytes = 0.
    const noteHex = Array.from({ length: 32 }, (_, i) => {
      const a = Math.max(-7, Math.min(7, samples[i * 2]     ?? 0)) + 7; // 0-14
      const b = Math.max(-7, Math.min(7, samples[i * 2 + 1] ?? 0)) + 7;
      return hex2((a << 4) | b) + '000';
    }).join('');
    return header + noteHex;
  }

  const seqLen = sfx.length ?? 32;
  const active = sfx.notes.slice(0, seqLen);
  const notes32 = Array.from({ length: 32 }, (_, i) => active[i % seqLen]);
  return header + notes32.map(noteToHex).join('');
}
