const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ── Scale / mode definitions ──────────────────────────────────────────────────
// notes[] = semitone offsets from the root (0-11, sorted ascending).
// MODE_GROUPS drives the <select> UI (with <optgroup> separators).
// MODES is the flat id→notes lookup used by buildScaleNotes in utils.js.

export const KEY_NAMES = CHROMATIC; // alias for UI

export const MODE_GROUPS = [
  {
    label: 'Classic Modes',
    modes: [
      { id: 'chromatic',   label: 'Chromatic',              notes: [0,1,2,3,4,5,6,7,8,9,10,11] },
      { id: 'major',       label: 'Major (Ionian)',          notes: [0,2,4,5,7,9,11] },
      { id: 'minor',       label: 'Natural Minor (Aeolian)', notes: [0,2,3,5,7,8,10] },
      { id: 'dorian',      label: 'Dorian',                  notes: [0,2,3,5,7,9,10] },
      { id: 'phrygian',    label: 'Phrygian',                notes: [0,1,3,5,7,8,10] },
      { id: 'lydian',      label: 'Lydian',                  notes: [0,2,4,6,7,9,11] },
      { id: 'mixolydian',  label: 'Mixolydian',              notes: [0,2,4,5,7,9,10] },
      { id: 'locrian',     label: 'Locrian',                 notes: [0,1,3,5,6,8,10] },
    ],
  },
  {
    label: 'Pentatonic & Blues',
    modes: [
      { id: 'pentatonicMaj', label: 'Major Pentatonic',      notes: [0,2,4,7,9] },
      { id: 'pentatonicMin', label: 'Minor Pentatonic',      notes: [0,3,5,7,10] },
      { id: 'blues',         label: 'Blues (Minor)',          notes: [0,3,5,6,7,10] },
      { id: 'bluesMaj',      label: 'Blues (Major)',          notes: [0,2,3,4,7,9] },
      { id: 'egyptian',      label: 'Egyptian / Slendro',    notes: [0,2,5,7,10] },
      { id: 'suspendedPent', label: 'Suspended Pentatonic',  notes: [0,2,5,7,9] },
    ],
  },
  {
    label: 'Melodic Minor Modes',
    modes: [
      { id: 'melodicMinor', label: 'Melodic Minor (Jazz Minor)',   notes: [0,2,3,5,7,9,11] },
      { id: 'dorianB2',     label: 'Dorian ♭2',                    notes: [0,1,3,5,7,9,10] },
      { id: 'lydianAug',    label: 'Lydian Augmented',             notes: [0,2,4,6,8,9,11] },
      { id: 'lydianDom',    label: 'Lydian Dominant / Acoustic',   notes: [0,2,4,6,7,9,10] },
      { id: 'mixolydianB6', label: 'Mixolydian ♭6',                notes: [0,2,4,5,7,8,10] },
      { id: 'locrianN2',    label: 'Locrian ♮2 (Half-Diminished)', notes: [0,2,3,5,6,8,10] },
      { id: 'altered',      label: 'Altered (Super Locrian)',      notes: [0,1,3,4,6,8,10] },
    ],
  },
  {
    label: 'Harmonic Minor Modes',
    modes: [
      { id: 'harmonicMinor',  label: 'Harmonic Minor',              notes: [0,2,3,5,7,8,11] },
      { id: 'locrianN6',      label: 'Locrian ♮6',                  notes: [0,1,3,5,6,9,10] },
      { id: 'ionianAug',      label: 'Ionian Augmented',            notes: [0,2,4,5,8,9,11] },
      { id: 'romanianDorian', label: 'Romanian / Ukrainian Dorian', notes: [0,2,3,6,7,9,10] },
      { id: 'phrygianDom',    label: 'Phrygian Dominant',           notes: [0,1,4,5,7,8,10] },
      { id: 'lydianSharp2',   label: 'Lydian ♯2',                   notes: [0,3,4,6,7,9,11] },
      { id: 'ultraLocrian',   label: 'Ultra Locrian',               notes: [0,1,3,4,6,8,9] },
    ],
  },
  {
    label: 'Harmonic Major Modes',
    modes: [
      { id: 'harmonicMaj',    label: 'Harmonic Major',        notes: [0,2,4,5,7,8,11] },
      { id: 'dorianB5',       label: 'Dorian ♭5',             notes: [0,2,3,5,6,9,10] },
      { id: 'phrygianB4',     label: 'Phrygian ♭4',           notes: [0,1,3,4,7,8,10] },
      { id: 'lydianB3',       label: 'Lydian ♭3',             notes: [0,2,3,6,7,9,11] },
      { id: 'mixolydianB2',   label: 'Mixolydian ♭2',         notes: [0,1,4,5,7,9,10] },
      { id: 'lydianAugS2',    label: 'Lydian Augmented ♯2',   notes: [0,3,4,6,8,9,11] },
      { id: 'locrianBB7',     label: 'Locrian ♭♭7',           notes: [0,1,3,5,6,8,9] },
    ],
  },
  {
    label: 'Symmetric',
    modes: [
      { id: 'wholeTone', label: 'Whole Tone',              notes: [0,2,4,6,8,10] },
      { id: 'dimWH',     label: 'Diminished (Whole-Half)', notes: [0,2,3,5,6,8,9,11] },
      { id: 'dimHW',     label: 'Diminished (Half-Whole)', notes: [0,1,3,4,6,7,9,10] },
      { id: 'augmented', label: 'Augmented',               notes: [0,3,4,7,8,11] },
      { id: 'tritone',   label: 'Tritone Scale',           notes: [0,1,4,6,7,10] },
    ],
  },
  {
    label: 'Other Exotic',
    modes: [
      { id: 'doubleHarmonic', label: 'Double Harmonic / Byzantine', notes: [0,1,4,5,7,8,11] },
      { id: 'hungarianMinor', label: 'Hungarian Minor',             notes: [0,2,3,6,7,8,11] },
      { id: 'neapolitanMin',  label: 'Neapolitan Minor',            notes: [0,1,3,5,7,8,11] },
      { id: 'neapolitanMaj',  label: 'Neapolitan Major',            notes: [0,1,3,5,7,9,11] },
      { id: 'enigmatic',      label: 'Enigmatic',                   notes: [0,1,4,6,8,10,11] },
      { id: 'persian',        label: 'Persian',                     notes: [0,1,4,5,6,8,11] },
      { id: 'romanianMinor',  label: 'Romanian Minor',              notes: [0,2,3,6,7,8,10] },
      { id: 'prometheus',     label: 'Prometheus',                  notes: [0,2,4,6,9,10] },
    ],
  },
  {
    label: 'Bebop',
    modes: [
      { id: 'bebopDom',    label: 'Bebop Dominant', notes: [0,2,4,5,7,9,10,11] },
      { id: 'bebopMaj',    label: 'Bebop Major',    notes: [0,2,4,5,7,8,9,11] },
      { id: 'bebopMinor',  label: 'Bebop Minor',    notes: [0,2,3,5,7,8,10,11] },
      { id: 'bebopDorian', label: 'Bebop Dorian',   notes: [0,2,3,5,7,9,10,11] },
    ],
  },
  {
    label: 'Japanese / Asian',
    modes: [
      { id: 'hirajoshi', label: 'Hirajoshi',       notes: [0,2,3,7,8] },
      { id: 'kumoi',     label: 'Kumoi',           notes: [0,2,3,7,9] },
      { id: 'iwato',     label: 'Iwato',           notes: [0,1,5,6,10] },
      { id: 'insen',     label: 'Insen',           notes: [0,1,5,7,10] },
      { id: 'durga',     label: 'Durga (Indian)',  notes: [0,2,5,7,9] },
      { id: 'malkauns',  label: 'Malkauns (Indian)',notes: [0,3,5,8,10] },
    ],
  },
  {
    label: 'World / Maqam / Indian',
    modes: [
      { id: 'hijaz',   label: 'Hijaz (Arabic)',          notes: [0,1,4,5,7,8,10] },
      { id: 'kurd',    label: 'Kurd (Arabic)',            notes: [0,1,3,5,7,8,10] },
      { id: 'saba',    label: 'Saba (Arabic)',            notes: [0,1,3,4,7,8,10] },
      { id: 'todi',    label: 'Todi (Indian)',            notes: [0,1,3,6,7,8,11] },
      { id: 'bhairav', label: 'Bhairav (Indian)',         notes: [0,1,4,5,7,8,11] },
      { id: 'yaman',   label: 'Yaman (Indian)',           notes: [0,2,4,6,7,9,11] },
      { id: 'kafi',    label: 'Kafi (Indian)',            notes: [0,2,3,5,7,9,10] },
      { id: 'bayati',  label: 'Bayati (Arabic, approx.)',notes: [0,2,3,5,7,8,10] },
      { id: 'rast',    label: 'Rast (Arabic, approx.)',  notes: [0,2,3,5,7,9,10] },
    ],
  },
];

// Flat id → notes lookup, derived from MODE_GROUPS.
// Used by buildScaleNotes() in utils.js — do not remove.
export const MODES = Object.fromEntries(
  MODE_GROUPS.flatMap(g => g.modes.map(({ id, notes }) => [id, notes]))
);

// Flat id → label lookup for any component that needs it without optgroups.
export const MODE_LABELS = Object.fromEntries(
  MODE_GROUPS.flatMap(g => g.modes.map(({ id, label }) => [id, label]))
);

// ── 4-channel music track identity ───────────────────────────────────────────
// Matches the PICO-8 convention: ch0=bass, ch1=melody, ch2=chords, ch3=drums.
// Users can assign any SFX to any channel — these are suggested roles only.
export const CH_ROLES  = ['BASS', 'MELODY', 'CHORDS', 'DRUMS'];
export const CH_COLORS = ['#29ADFF', '#00E436', '#FFEC27', '#FF77A8'];

// Drum pad label map: pitch → short name shown in the DRUMS NoteGrid instead of note name.
// Keyed by the default pitches from mkDrumSfx (C1=0, C2=12, C3=24, C5=48).
export const DRUM_NAMES = {
  0:  'KICK',
  12: 'TOM',
  24: 'SNARE',
  48: 'HAT',
};

// 64 pitches: C1 (pitch 0) through D#6 (pitch 63)
export const NOTE_NAMES = Array.from({ length: 64 }, (_, i) => {
  const octave = Math.floor(i / 12) + 1;
  const note = CHROMATIC[i % 12];
  return `${note}${octave}`;
});

export const WAVEFORMS = [
  'Triangle',   // 0
  'Tilted-saw', // 1
  'Saw',        // 2
  'Square',     // 3
  'Pulse',      // 4
  'Organ',      // 5
  'Noise',      // 6
  'Phaser',     // 7
  'W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', // 8-15: custom waveform instruments
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
  P8[12], // 0  triangle  → blue
  P8[9],  // 1  tilt-saw  → orange
  P8[10], // 2  saw       → yellow
  P8[11], // 3  square    → green
  P8[14], // 4  pulse     → pink
  P8[2],  // 5  organ     → dark purple
  P8[8],  // 6  noise     → red
  P8[15], // 7  phaser    → peach
  // Custom waveform instruments (W0-W7) — green tones matching PICO-8's display
  P8[11], P8[11], P8[11], P8[11], P8[11], P8[11], P8[11], P8[11],
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
