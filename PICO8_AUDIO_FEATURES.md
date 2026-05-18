# PICO-8 Audio — Features & Export To-Do

Everything here is a PICO-8 canonical feature that maps to exported `.p8` data or Lua API calls.
Nothing in this list is app-only — every item produces something you paste into a real cart.

*Sources: official PICO-8 manual §2.4–2.5, real `.p8` cartridge analysis.*

---

## What PICO-8's Audio System Actually Is

### SFX data model

**64 SFX slots** (index 0–63). Each has:

| Field | Range | Notes |
|---|---|---|
| `speed` | 1–255 | Ticks per note. 1 tick = 1/60 s. |
| `loopStart` | 0–31 | Loop jump-back point. When `loopStart >= loopEnd`, looping is OFF. |
| `loopEnd` | 0–31 | Trigger point for loop. |
| **LEN mode** | — | When `loopStart = N` and `loopEnd = 0`, PICO-8 plays only the first N notes (shown as "LEN" instead of "LOOP" in the editor). This is the native PICO-8 equivalent of our `length` field. |
| `notes[32]` | — | Always exactly 32 notes. |
| `filters` | 5 switches | NOIZ · BUZZ · DETUNE · REVERB · DAMPEN (see below). |

Each note:

| Field | Range | Notes |
|---|---|---|
| `pitch` | 0–63 | C0 to ~C5. **App currently labels these C1–D#6 — off by one octave.** |
| `instrument` | 0–15 | 0–7 = built-in. 8–15 = SFX slots 0–7 as instruments. |
| `volume` | 0–7 | 0 = silent, 7 = full. |
| `effect` | 0–7 | See Effects table below. |

### Effects (per note)

| ID | Name | Behaviour |
|---|---|---|
| 0 | None | — |
| 1 | Slide | Slide pitch AND volume to the next note's values. |
| 2 | Vibrato | Rapidly vary pitch within one quarter-tone. |
| 3 | Drop | Rapidly drop frequency to very low values. (Also: forces SFX instrument retrigger.) |
| 4 | Fade in | Ramp volume up from 0. |
| 5 | Fade out | Ramp volume down to 0. |
| 6 | Arpeggio fast | Cycle through this note AND the next 3 notes' pitches, every 4 ticks (2 ticks if SFX speed ≤ 8). |
| 7 | Arpeggio slow | Same, every 8 ticks (4 ticks if SFX speed ≤ 8). |

⚠️ **Arpeggio bug in current app:** The engine uses a hardcoded major-triad `[0, 4, 7]` semitone pattern. Real PICO-8 arpeggio iterates over the pitches of the current note AND the next 3 consecutive notes in the SFX. The chords are defined by what you put in notes n, n+1, n+2, n+3 — not a fixed interval pattern.

⚠️ **Slide bug in current app:** Slide only ramps pitch. Real PICO-8 slides both pitch AND volume toward the next note's values.

### Filters (per SFX, not per note)

Five filter switches stored in each SFX. Accessible in tracker mode. Each has 1–2 levels:

| Filter | Behaviour |
|---|---|
| NOIZ | Generate pure white noise (only affects instrument 6). With BUZZ on and NOIZ off → brown noise. |
| BUZZ | Various waveform alterations to add buzziness. |
| DETUNE | Two levels: DETUNE-1 = second detuned voice (flange). DETUNE-2 = second voice offset by an octave. |
| REVERB | Echo with delay of 2 ticks (level 1) or 4 ticks (level 2). |
| DAMPEN | Low-pass filter at 2 levels. |

These are stored in the SFX binary data. Not currently in the app's data model or export.

### SFX instruments (waveforms 8–15)

SFX slots 0–7 can be used as instruments in two modes, toggled by the instrument selector:

**SFX instrument mode:** The SFX plays as a note sequence when triggered. Behaviour when used in another SFX's note:
- Pitch of the note is added relative to C2 (the instrument's pitches are offsets)
- Volume is multiplied (note volume × instrument volume)
- Effects from the triggering note are applied on top of the instrument's effects
- Filters active on the instrument SFX are enabled for that note
- Only retriggered when pitch changes or previous note had zero volume
- Effect 3 (drop) inverts this: forces retrigger every note

**Waveform instrument mode:** The SFX stores a **64-byte looping waveform** instead of notes. Each byte is a signed amplitude sample. Samples are drawn with the mouse in the SFX editor. Same pitch/volume/filter behaviour as SFX instruments.

### Music patterns

**64 patterns** (index 0–63). Each pattern:

| Field | Notes |
|---|---|
| `channels[4]` | SFX indices 0–63 for channels 0–3. `41` hex = empty. |
| `loopBegin` | Marks this pattern as the loop jump-back target. |
| `loopEnd` | Triggers a search back to the nearest loopBegin pattern (or pattern 0 if none). |
| `stop` | Halt playback after this pattern ends. |

**Pattern timing:** A pattern ends when the **leftmost non-looping channel** finishes. Other channels may still be playing. This is intentional — it enables polyrhythms (double-time drums, 3/4 time, etc.).

### Lua API

```lua
-- SFX
sfx(n)                          -- play slot n, auto channel
sfx(n, channel)                 -- force channel 0–3; -1 = auto
sfx(n, channel, offset, length) -- start at note offset, play length notes
sfx(-1)                         -- stop all SFX
sfx(-1, channel)                -- stop SFX on one channel
sfx(-2, channel)                -- release loop (plays to end then stops)

-- Music
music(n)                        -- start from pattern n
music(n, fade_len)              -- fade in over ms
music(n, fade_len, channel_mask)-- reserve channels (bitfield: 1<<ch)
music(-1)                       -- stop immediately
music(-1, fade_len)             -- fade out

-- Query state (for syncing game events to beat)
stat(54)   -- current pattern index
stat(55)   -- total patterns played
stat(56)   -- ticks elapsed in current pattern
stat(57)   -- 1 if music playing
stat(46)   -- SFX on channel 0 (-1 if silent)
stat(47)   -- SFX on channel 1
stat(48)   -- SFX on channel 2
stat(49)   -- SFX on channel 3
stat(50)   -- current note (0–31) on channel 0
stat(51–53)-- current note on channels 1–3
```

### .p8 file format

**`__sfx__` section** — 64 lines, 168 hex chars each:
```
{editor_mode:2}{speed:2}{loopStart:2}{loopEnd:2}{note0..31 × 5 chars each}
```
- `editor_mode`: `00` = pitch mode, `01` = tracker mode
- Each note: `pitch(2) instrument(1) volume(1) effect(1)`
- Filters (NOIZ/BUZZ/DETUNE/REVERB/DAMPEN) are encoded somewhere in this line — **exact bit positions not yet verified** (see verification task below)

**`__music__` section** — 64 lines:
```
{flags:2} {ch0:2} {ch1:2} {ch2:2} {ch3:2}
```
- `flags`: bit 0 = loopBegin · bit 1 = loopEnd · bit 2 = stop
- Channel bytes: SFX index 0–63, or `41` = empty

---

## What the App Already Gets Right

- SFX hex body format (notes, speed, loop fields) — ✅
- `editor_mode` prefix byte (`00`) — ✅ fixed (168 chars total)
- All 8 built-in waveforms — ✅ (audio approximation)
- All 8 effects — ✅ arpeggio (consecutive note pitches, correct tick timing) and slide (pitch + volume) bugs fixed
- `__music__` export with flags and 4 channel slots — ✅
- Pattern loop/stop flags — ✅
- 4-track playback with mute/solo — ✅
- Tone.Transport for drift-free sequencing — ✅
- Variable sequence length (STEPS: 2/4/8/16/32) — ✅
  - Tiled to 32 notes in the exported hex
  - Live length change updates `transport.loopEnd` immediately while playing
- Live note input (piano/MIDI → lands on current step while sequencer runs) — ✅
- Scale snap (CTRL in PICO-8 = our scale selector) — ✅
- Custom waveform instruments (W0–W7) — ✅ UI + audio complete
  - SFX slots 0–7 toggle between note-sequence and waveform-drawing mode
  - 64-column amplitude editor; Web Audio PeriodicWave synthesis via DFT
  - ⚠️ Export encoding (editor_mode byte + sample packing) is a best-guess — verify against real .p8 file

---

## Feature Backlog

### ✅ Fixed — audio engine bugs

#### 1. Arpeggio: consecutive note pitches — DONE
Arpeggio now cycles through the pitches of notes n, n+1, n+2, n+3 from the live SFX state. Step timing uses PICO-8 tick math (4/60s fast, 8/60s slow, halved when speed ≤ 8). The `MAJOR_TRIAD` hack is gone.

#### 2. Slide: ramps both pitch and volume — DONE
Effect 1 now ramps gain from `prevVolume` to the current note's volume over the first 40% of the note, in addition to the pitch glide.

---

### 🟡 Medium — missing PICO-8 features

#### 3. SFX filters: NOIZ · BUZZ · DETUNE · REVERB · DAMPEN
**What's missing:** Five per-SFX filter switches that affect how the SFX sounds. Not in the data model, not in the UI, not exported.
**Data model:** Add to each SFX object:
```js
filters: { noiz: false, buzz: false, detune: 0, reverb: 0, dampen: 0 }
// detune, reverb, dampen each have 2 levels (0 = off, 1 = level 1, 2 = level 2)
```
**UI:** 5 toggle/slider controls visible in tracker mode for slots 0–7. Simple 2-state or 3-state buttons.
**Audio approximation:**
- NOIZ: mix white noise when instrument = 6
- BUZZ: add subtle distortion (WaveShaper node)
- DETUNE: create a second oscillator detuned by ~15 cents (level 1) or an octave (level 2)
- REVERB: `ConvolverNode` or feedback delay at 2×noteDur (level 1) or 4×noteDur (level 2)
- DAMPEN: `BiquadFilter` lowpass at ~2kHz (level 1) or ~800Hz (level 2)
**Exports to:** Filter bits in the `__sfx__` hex line — **bit positions need verification** (see below).

#### 4. Note naming: correct PICO-8 octave labels (C0–C5, not C1–D#6)
**Bug:** The app labels pitch 0 as C1. PICO-8 calls it C0. Every label is off by one octave.
**Fix:** Update `NOTE_NAMES` array in `constants.js` to use C0–D#5 naming.
**Exports to:** No format change (pitch values are unchanged, only display labels).

#### 5. BPM ↔ speed calculator in the Toolbar
**Formula:** At 120 BPM, one beat = 0.5 s = 30 ticks → speed 30 for quarter notes, 15 for 8th notes, 7–8 for 16th notes.
`speed = round(3600 / BPM / subdivisions_per_beat)`
**Build:** BPM input + subdivision selector → shows speed value → click to apply.
**Exports to:** The `speed` field in the SFX hex.

#### 6. music() call generator in export
**Build:** In the Patterns tab or ExportPanel, generate:
```lua
music(0)                -- play from pattern 0
music(0, 0, 12)         -- channels 2+3 for music, 0+1 free for sfx()
music(-1, 500)          -- fade out over 500ms
```
With controls for: starting pattern, fade_len, channel_mask (4 checkboxes).
**Exports to:** Lua game code snippet.

#### 7. sfx() call generator with length in ExportPanel
**What's missing:** When `sfx.length < 32`, the correct Lua call is `sfx(n, -1, 0, length)`.
Also: PICO-8 has a native LEN feature — `loopStart = N, loopEnd = 0` makes PICO-8 play only N notes (shown as "LEN" in its editor). The current tiling approach fills 32 notes but the LEN approach is more idiomatic. Both are valid; generate both snippets.
**Exports to:** Lua code snippet.

#### 8. stat() beat-sync snippets in ExportPanel
```lua
function _update()
  if stat(57) == 1 then          -- music is playing
    local tick = stat(56)        -- ticks into current pattern
    local note = stat(50)        -- note position on ch 0 (0-31)
    if note == 0 then            -- downbeat: do something every bar
    end
  end
end
```
**Exports to:** Lua game code (paste into `_update()`).

---

### 🟢 Low — custom waveform instruments

#### 9. Waveform instrument editor (instruments 8–15)
**What it is:** SFX slots 0–7 in waveform mode. Each stores a **64-byte looping waveform** (signed amplitude samples). Used by referencing instrument 8–15 in any note.

**Data model:**
```js
// Added to SFX 0–7 only:
wavetable: false,
samples: new Array(64).fill(0),  // signed, approx -7 to +7
```

**UI:**
- `NOTE / WAVE` toggle button for slots 0–7
- `WavetableEditor` component: 64 narrow columns, amplitude bars centered on midline, drag to set
- Instrument picker gains entries 8–15 labeled "W0"–"W7" (grayed if slot not in wave mode)
- Filter controls (item 3) still apply in waveform mode

**Audio:** Build a `PeriodicWave` via DFT of the 64 samples → `ctx.createPeriodicWave(cos, sin)`. Cache per slot, invalidate on sample change.

**Export:** ⚠️ 64 bytes need to be packed into the 32 × 5-char note slots — **exact encoding not verified**. Verification method below.

---

## ⚠️ Verification needed before implementing items 3 and 9

### What to verify

Two things in the `__sfx__` 168-char line are not yet confirmed:
1. **Filter bits** (NOIZ/BUZZ/DETUNE/REVERB/DAMPEN) — which chars encode them?
2. **Waveform sample encoding** — how are 64 bytes packed into 32 note slots?

### How to verify (step by step)

**Setup:** Open PICO-8. Open or create a cart. Open the file with a text editor alongside.

**Experiment A — filters:**
1. SFX slot 0, tracker mode. All filters OFF. Save → copy the 168-char line as baseline.
2. Turn NOIZ on. Save → diff. Note which chars changed and to what value.
3. Reset. Turn BUZZ on. Save → diff.
4. Repeat for DETUNE (level 1), DETUNE (level 2), REVERB (level 1), REVERB (level 2), DAMPEN (level 1), DAMPEN (level 2).

**Experiment B — waveform encoding:**
1. SFX slot 0, switch to waveform mode (`~` button). All samples at center (0). Save → copy as baseline.
2. Set sample 0 to maximum UP. Save → diff. Note which char group changed and the value.
3. Set sample 0 to maximum DOWN. Save → diff. Note how negative is encoded.
4. Reset sample 0, set sample 1 to max UP. Save → diff. Note the stride between samples.

**Report format:**
```
NOIZ on:    chars at position XX–XX changed from XXXX to XXXX
BUZZ on:    ...
DETUNE L1:  ...
DETUNE L2:  ...
REVERB L1:  ...
REVERB L2:  ...
DAMPEN L1:  ...
DAMPEN L2:  ...

Waveform sample 0 max up:   note group 0 (chars 8–12) = XXXXX
Waveform sample 0 max down: note group 0 = XXXXX
Waveform sample 1 max up:   note group 1 (chars 13–17) = XXXXX
```

Once these are confirmed, items 3 and 9 can be implemented with correct export.

---

## Hard limits (will not add)

- More than 64 SFX slots or 64 patterns
- More than 4 simultaneous audio channels
- Custom effect types beyond the 8 built-in
- Stereo / per-note panning (PICO-8 is mono)
- Sample playback from external audio files
