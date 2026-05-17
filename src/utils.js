import { NOTE_NAMES } from './constants.js';

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

// Serialize an entire SFX to its PICO-8 string format
export function sfxToHex(sfx) {
  const header =
    hex2(sfx.speed) + hex2(sfx.loopStart) + hex2(sfx.loopEnd);
  const body = sfx.notes.map(noteToHex).join('');
  return header + body;
}
