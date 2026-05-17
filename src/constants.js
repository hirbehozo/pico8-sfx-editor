const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ── Scale / mode definitions ──────────────────────────────────────────────────
// Each value is an array of semitone intervals from the root.

export const KEY_NAMES = CHROMATIC; // alias for UI

export const MODES = {
  chromatic:     [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major:         [0, 2, 4, 5, 7, 9, 11],         // Ionian
  minor:         [0, 2, 3, 5, 7, 8, 10],          // Aeolian
  dorian:        [0, 2, 3, 5, 7, 9, 10],
  phrygian:      [0, 1, 3, 5, 7, 8, 10],
  lydian:        [0, 2, 4, 6, 7, 9, 11],
  mixolydian:    [0, 2, 4, 5, 7, 9, 10],
  locrian:       [0, 1, 3, 5, 6, 8, 10],
  pentatonicMaj: [0, 2, 4, 7, 9],
  pentatonicMin: [0, 3, 5, 7, 10],
  blues:         [0, 3, 5, 6, 7, 10],
  wholeTone:     [0, 2, 4, 6, 8, 10],
};

export const MODE_LABELS = {
  chromatic:     'Chromatic',
  major:         'Major',
  minor:         'Minor',
  dorian:        'Dorian',
  phrygian:      'Phrygian',
  lydian:        'Lydian',
  mixolydian:    'Mixolydian',
  locrian:       'Locrian',
  pentatonicMaj: 'Penta Maj',
  pentatonicMin: 'Penta Min',
  blues:         'Blues',
  wholeTone:     'Whole Tone',
};

// 64 pitches: C1 (pitch 0) through D#6 (pitch 63)
export const NOTE_NAMES = Array.from({ length: 64 }, (_, i) => {
  const octave = Math.floor(i / 12) + 1;
  const note = CHROMATIC[i % 12];
  return `${note}${octave}`;
});

export const WAVEFORMS = [
  'Triangle',
  'Tilted-saw',
  'Saw',
  'Square',
  'Pulse',
  'Organ',
  'Noise',
  'Phaser',
];

export const EFFECTS = [
  'None',
  'Slide',
  'Vibrato',
  'Drop',
  'Fade in',
  'Fade out',
  'Arp fast',
  'Arp slow',
];

// PICO-8 16-color palette
export const P8 = [
  '#000000', // 0  black
  '#1D2B53', // 1  dark blue
  '#7E2553', // 2  dark purple
  '#008751', // 3  dark green
  '#AB5236', // 4  brown
  '#5F574F', // 5  dark gray
  '#C2C3C7', // 6  light gray
  '#FFF1E8', // 7  white
  '#FF004D', // 8  red
  '#FFA300', // 9  orange
  '#FFEC27', // 10 yellow
  '#00E436', // 11 green
  '#29ADFF', // 12 blue
  '#83769C', // 13 lavender
  '#FF77A8', // 14 pink
  '#FFCCAA', // 15 peach
];

// One P8 color per waveform (indices into P8)
export const WAVE_COLS = [
  P8[12], // triangle  → blue
  P8[9],  // tilt-saw  → orange
  P8[10], // saw       → yellow
  P8[11], // square    → green
  P8[14], // pulse     → pink
  P8[2],  // organ     → dark purple
  P8[8],  // noise     → red
  P8[15], // phaser    → peach
];

// One P8 color per effect (indices into P8)
export const EFF_COLS = [
  P8[5],  // none      → dark gray
  P8[12], // slide     → blue
  P8[11], // vibrato   → green
  P8[8],  // drop      → red
  P8[10], // fade in   → yellow
  P8[9],  // fade out  → orange
  P8[14], // arp fast  → pink
  P8[15], // arp slow  → peach
];
