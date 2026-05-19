# pico8-sfx-editor — codebase guide

## What this is

A browser-based SFX editor that replicates the PICO-8 sound chip. No backend; everything lives in React state. Deployed to Vercel.

## Stack

- **React** (Vite) — UI and state
- **Tone.js** — Transport for drift-free sequencing; raw Web Audio API for synthesis
- `npm run dev` → dev server, `npm run build` → production build

## Data model

### Top level

```js
sfxList: Array(64)   // one entry per SFX slot
patterns: Array(64)  // one entry per music pattern
```

### SFX object

```js
{
  speed:     number,          // 1–255; ticks per note (1 tick = 1/60 s)
  loopStart: number,          // 0–31; PICO-8 loop jump-back point
  loopEnd:   number,          // 0–31; PICO-8 loop trigger point
  length:    number,          // 2/4/8/16/32; active step count (app-level, not in P8 format)
  notes:     Note[32],        // always exactly 32 notes
  wavetable: boolean,         // true = slot is a waveform instrument (slots 0–7 only)
  samples:   number[64],      // signed amplitude samples for waveform mode (-7 to +7)
}
```

`wavetable: true` replaces the note-sequence view with the WavetableEditor for that slot.

### Note object

```js
{
  pitch:    number,  // 0–63  (C1–D#6; note: PICO-8 calls this C0–D#5)
  waveform: number,  // 0–15  (0–7 = built-in; 8–15 = waveform instruments W0–W7)
  volume:   number,  // 0–7   (7 = loudest)
  effect:   number,  // 0–7
  on:       boolean, // false = silent rest (pitch/waveform still stored)
}
```

### Pattern object

```js
{
  channels:  number[4],  // SFX slot indices (0–63); 255 = empty
  loopBegin: boolean,
  loopEnd:   boolean,
  stop:      boolean,
}
```

## Hex export format

**`__sfx__` line — 168 hex chars:**

```
{editor_mode:2}{speed:2}{loopStart:2}{loopEnd:2}{note0..31 × 5 chars each}
```

- `editor_mode`: `00` = pitch mode, `02` = waveform instrument mode
- Each note: `pitch(2) instrument(1) volume(1) effect(1)`
- Short sequences (length < 32) are tiled to fill all 32 note slots
- For wavetable slots: two 4-bit amplitude nibbles are packed into the pitch bytes of consecutive note slots

**`__music__` line — 13 hex chars + spaces:**

```
{flags:2} {ch0:2} {ch1:2} {ch2:2} {ch3:2}
```

- `flags`: bit 0 = loopBegin · bit 1 = loopEnd · bit 2 = stop
- Channel bytes: SFX index 0–63, or `41` = empty

See `sfxToHex` / `noteToHex` in `src/utils.js`.

## Key constants (`src/constants.js`)

| Export | Purpose |
|---|---|
| `NOTE_NAMES` | 64-element array, pitch index → `"C1"` … `"D#6"` |
| `WAVEFORMS` | 16-element array — indices 0–7 built-in, 8–15 `"W0"`–`"W7"` |
| `EFFECTS` | 8-element array of effect display names |
| `P8` | 16-element PICO-8 palette hex colors |
| `WAVE_COLS` | 16-element array — one P8 color per waveform (W0–W7 use green) |
| `EFF_COLS` | 8-element array — one P8 color per effect |
| `DRUM_PRESETS` | 12 drum presets with `{cat, name, color, pitch, waveform, volume, effect}` |

## Key utils (`src/utils.js`)

| Export | Signature | Notes |
|---|---|---|
| `noteToFreq` | `(n: number) => number` | Hz; pitch 45 = A4 = 440 Hz |
| `noteName` | `(n: number) => string` | Looks up `NOTE_NAMES[n]` |
| `hex2` | `(n: number) => string` | 2-char zero-padded hex |
| `hex1` | `(n: number) => string` | 1-char hex digit |
| `mkNote` | `() => Note` | Default note (on: false, vol 5) |
| `mkSfx` | `() => Sfx` | Default SFX (speed 16, length 32, 32 notes) |
| `noteToHex` | `(note: Note) => string` | 5-char hex per PICO-8 format |
| `sfxToHex` | `(sfx: Sfx) => string` | Full 168-char SFX string (tiles short sequences) |

## Pitch → frequency mapping

```
freq = 440 × 2^((pitch − 45) / 12)
```

Pitch 0 ≈ 32.7 Hz. Pitch 63 ≈ 1244.5 Hz.

## Waveform IDs

| ID | Name | ID | Name |
|---|---|---|---|
| 0 | Triangle | 8 | W0 (custom) |
| 1 | Tilted-saw | 9 | W1 (custom) |
| 2 | Saw | 10 | W2 (custom) |
| 3 | Square | 11 | W3 (custom) |
| 4 | Pulse | 12 | W4 (custom) |
| 5 | Organ | 13 | W5 (custom) |
| 6 | Noise | 14 | W6 (custom) |
| 7 | Phaser | 15 | W7 (custom) |

Custom waveforms W0–W7 map to SFX slots 0–7 when `wavetable: true`.

## Effect IDs

| ID | Name | Behaviour |
|---|---|---|
| 0 | None | — |
| 1 | Slide | Glide pitch AND volume from previous note's values |
| 2 | Vibrato | Pitch wobbles at ~7 Hz |
| 3 | Drop | Pitch falls over the note duration |
| 4 | Fade in | Volume ramps up from 0 |
| 5 | Fade out | Volume ramps down to 0 |
| 6 | Arp fast | Cycles pitches of notes n/n+1/n+2/n+3 every 4 ticks (2 ticks if speed ≤ 8) |
| 7 | Arp slow | Same, every 8 ticks (4 ticks if speed ≤ 8) |

Arpeggio reads the **consecutive note pitches** from live SFX state — not a fixed interval pattern.

## Audio engine (`src/audio.js`)

- Uses `Tone.getContext().rawContext` (shared Web Audio context)
- `synthNote(pitch, waveform, volume, effect, duration, prevPitch, channel, startTime, arpPitches, prevVolume, customWave)`
- `getOrBuildWave(slotIdx, samples)` — DFT → `PeriodicWave`, cached per slot
- `invalidateWaveCache(slotIdx)` — call when samples change

## Sequencing (`src/hooks/usePatterns.js`, `src/hooks/useSfxEditor.js`)

- **Tone.Transport** loop: all 32 steps scheduled upfront; `transport.loopEnd` set to active length
- Live state read inside callbacks via refs (`liveSfxRef`, `sfxSlotsRef`) — no stale closure
- Length changes while playing: `transport.loopEnd` updated immediately, no restart needed
- Live note input writes to `notePosRef.current % length` (current step, not next)

## File layout

```
src/
  audio.js                  — synthesis engine (Tone.js + Web Audio)
  constants.js              — NOTE_NAMES, WAVEFORMS (×16), EFFECTS, WAVE_COLS, EFF_COLS, DRUM_PRESETS
  utils.js                  — noteToFreq, noteName, mkNote, mkSfx, noteToHex, sfxToHex
  App.jsx                   — root component; sfxList + patterns state; piano/MIDI live input
  hooks/
    useSfxEditor.js         — SFX CRUD, toggleWavetable, updateSample, playSfx
    usePatterns.js          — pattern CRUD, playLoop (Transport-based), playPatterns
  components/
    NoteGrid.jsx            — 4-track sequencer grid; click-to-select, drag-to-paint
    NoteEditor.jsx          — pitch/vol/waveform/effect controls for selected note
    WavetableEditor.jsx     — 64-column amplitude editor for waveform instruments
    DrumLibrary.jsx         — 12 drum presets shown in NoteEditor when channel = 3
    Toolbar.jsx             — StepSelector (2/4/8/16/32), speed, loop fields, scale
    HelpModal.jsx           — keyboard reference and feature explanations
    ExportPanel.jsx         — SFX hex copy, music pattern export
    Piano.jsx               — clickable piano for note preview and live input
    PatternsPanel.jsx       — pattern editor UI
```
