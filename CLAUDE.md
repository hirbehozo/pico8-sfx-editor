# pico8-sfx-editor — codebase guide

## What this is

A browser-based SFX editor that replicates the PICO-8 sound chip. No backend; everything lives in React state.

## Data model

### Top level

The app holds **64 SFX slots** (indices 0–63).

```js
sfxList: Array(64)   // one entry per slot
```

### SFX object

```js
{
  speed:     number,   // 1–255; ticks per note (lower = faster)
  loopStart: number,   // 0–31; first note of loop (0 = no loop)
  loopEnd:   number,   // 0–31; last note of loop (0 = no loop)
  notes:     Note[32], // always exactly 32 notes
}
```

`speed` maps directly to PICO-8's `speed` field. A speed of 1 plays at ~183 bpm; speed 16 is the default (~11 bpm per note).

### Note object

```js
{
  pitch:    number,  // 0–63  (C1–D#6)
  waveform: number,  // 0–7   see WAVEFORMS in constants.js
  volume:   number,  // 0–7   (7 = loudest)
  effect:   number,  // 0–7   see EFFECTS in constants.js
  on:       boolean, // false = silent/rest; pitch/waveform still stored
}
```

`on: false` renders the note as a rest. The pitch and waveform values are preserved so toggling back on restores them.

## Hex export format

PICO-8 stores SFX as a compact ASCII hex string. Each note serialises to **5 hex characters**:

```
[pitch: 2 chars][waveform: 1 char][volume: 1 char][effect: 1 char]
```

Examples:
- `1c350` → pitch 0x1c (28 = E3), waveform 3 (square), volume 5, effect 0 (none)
- `00000` → pitch 0, waveform 0, volume 0, effect 0

A full SFX header prepends speed, loopStart, loopEnd (2 hex chars each = 6 chars), followed by `32 × 5 = 160` note chars — **166 characters total**.

See `noteToHex` / `sfxToHex` in `src/utils.js`.

## Key constants (`src/constants.js`)

| Export | Purpose |
|---|---|
| `NOTE_NAMES` | 64-element array, pitch index → `"C1"` … `"D#6"` |
| `WAVEFORMS` | 8-element array of waveform display names |
| `EFFECTS` | 8-element array of effect display names |
| `P8` | 16-element array of PICO-8 palette hex colors |
| `WAVE_COLS` | 8-element array — one P8 color per waveform |
| `EFF_COLS` | 8-element array — one P8 color per effect |

## Key utils (`src/utils.js`)

| Export | Signature | Notes |
|---|---|---|
| `noteToFreq` | `(n: number) => number` | Hz; pitch 45 = A4 = 440 Hz |
| `noteName` | `(n: number) => string` | Looks up `NOTE_NAMES[n]` |
| `hex2` | `(n: number) => string` | 2-char zero-padded hex |
| `hex1` | `(n: number) => string` | 1-char hex digit |
| `mkNote` | `() => Note` | Default note (on: false, vol 5) |
| `mkSfx` | `() => Sfx` | Default SFX (speed 16, 32 notes) |
| `noteToHex` | `(note: Note) => string` | 5-char hex per PICO-8 format |
| `sfxToHex` | `(sfx: Sfx) => string` | Full 166-char SFX string |

## Pitch → frequency mapping

```
freq = 440 × 2^((pitch − 45) / 12)
```

Pitch 0 = C1 ≈ 32.7 Hz. Pitch 63 = D#6 ≈ 1244.5 Hz.

## Waveform IDs

| ID | Name | ID | Name |
|---|---|---|---|
| 0 | Triangle | 4 | Pulse |
| 1 | Tilted-saw | 5 | Organ |
| 2 | Saw | 6 | Noise |
| 3 | Square | 7 | Phaser |

## Effect IDs

| ID | Name | ID | Name |
|---|---|---|---|
| 0 | None | 4 | Fade in |
| 1 | Slide | 5 | Fade out |
| 2 | Vibrato | 6 | Arp fast |
| 3 | Drop | 7 | Arp slow |

## File layout

```
src/
  constants.js   — NOTE_NAMES, WAVEFORMS, EFFECTS, WAVE_COLS, EFF_COLS, P8
  utils.js       — noteToFreq, noteName, hex2, hex1, mkNote, mkSfx, noteToHex, sfxToHex
  App.jsx        — root component, holds sfxList state
```
