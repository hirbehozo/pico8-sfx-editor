import { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { audioEngine } from '../audio.js';

const MAX_SEQ_STEPS = 200; // cap prevents infinite-loop hangs in the scheduler

// ── Data helpers ──────────────────────────────────────────────────────────────

function mkPattern() {
  return { channels: [null, null, null, null], loopBegin: false, loopEnd: false, stop: false };
}

function readStorage() {
  try {
    const raw = localStorage.getItem('p8-patterns');
    return raw ? JSON.parse(raw) : Array.from({ length: 64 }, mkPattern);
  } catch (_) {
    return Array.from({ length: 64 }, mkPattern);
  }
}

// Build an ordered list of pattern indices to play, respecting loop/stop flags.
// A loopEnd flag on pattern N sends the cursor back to the most recent loopBegin.
function buildSequence(patterns, startIdx) {
  const seq = [];
  let i = startIdx;
  let loopStart = -1;
  let steps = 0;

  while (i >= 0 && i < 64 && steps < MAX_SEQ_STEPS) {
    const pat = patterns[i];
    seq.push(i);
    steps++;

    if (pat.loopBegin) loopStart = i;
    if (pat.stop) break;

    if (pat.loopEnd && loopStart >= 0) {
      i = loopStart;
    } else {
      i++;
      if (i >= 64) {
        if (loopStart >= 0) i = loopStart; // wrap to loop point
        else break;
      }
    }
  }
  return seq;
}

// ── Export serialisation ──────────────────────────────────────────────────────

// Serialise one pattern to its PICO-8 __music__ line:
//   "flags ch0 ch1 ch2 ch3"  — all values 2-digit hex, unused channels = 41
// Flags: bit 0 = loop begin, bit 1 = loop end, bit 2 = stop
export function patternToLine(pat) {
  const flags =
    (pat.loopBegin ? 0x01 : 0) |
    (pat.loopEnd   ? 0x02 : 0) |
    (pat.stop      ? 0x04 : 0);
  const chs = pat.channels.map(c =>
    c === null ? '41' : c.toString(16).padStart(2, '0'),
  );
  return `${flags.toString(16).padStart(2, '0')} ${chs.join(' ')}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePatterns(sfxSlots) {
  const [patterns,      setPatterns]      = useState(readStorage);
  const [curPattern,    setCurPattern]    = useState(0);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [playPos,       setPlayPos]       = useState(-1);
  const [notePos,       setNotePos]       = useState(-1); // 0-31 within current pattern
  const [mutedChannels, setMutedChannels] = useState([false, false, false, false]);
  const [soloChannel,   setSoloChannel]   = useState(null); // null or 0-3

  // Stable refs — callbacks never re-register because they read through these
  const patternsRef     = useRef(patterns);
  const sfxSlotsRef     = useRef(sfxSlots);
  const curPatternRef   = useRef(curPattern);
  const muteCheckRef    = useRef(() => false);

  useEffect(() => { patternsRef.current   = patterns;   }, [patterns]);
  useEffect(() => { sfxSlotsRef.current   = sfxSlots;   }, [sfxSlots]);
  useEffect(() => { curPatternRef.current = curPattern; }, [curPattern]);
  // Keep muteCheck in sync so live playback sees latest mute/solo state
  useEffect(() => {
    muteCheckRef.current = (ci) =>
      soloChannel !== null ? ci !== soloChannel : mutedChannels[ci];
  }, [mutedChannels, soloChannel]);

  // Debounced persistence
  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem('p8-patterns', JSON.stringify(patterns)); } catch (_) {}
    }, 800);
    return () => clearTimeout(id);
  }, [patterns]);

  // Stop Transport and audio on unmount
  useEffect(() => () => {
    const t = Tone.getTransport();
    t.stop();
    t.cancel();
    audioEngine.stopAll();
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const toggleMute = useCallback((ci) => {
    setSoloChannel(null);
    setMutedChannels(prev => prev.map((m, i) => i === ci ? !m : m));
  }, []);

  const toggleSolo = useCallback((ci) => {
    setSoloChannel(prev => prev === ci ? null : ci);
    setMutedChannels([false, false, false, false]);
  }, []);

  const updateChannel = useCallback((patIdx, chIdx, sfxIdx) => {
    setPatterns(pats => {
      const next     = [...pats];
      const channels = [...next[patIdx].channels];
      channels[chIdx] = sfxIdx;
      next[patIdx] = { ...next[patIdx], channels };
      return next;
    });
  }, []);

  const updateFlags = useCallback((patIdx, patch) => {
    setPatterns(pats => {
      const next = [...pats];
      next[patIdx] = { ...next[patIdx], ...patch };
      return next;
    });
  }, []);

  // ── Playback ─────────────────────────────────────────────────────────────────

  const stopPatternPlay = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    audioEngine.stopAll();
    setIsPlaying(false);
    setPlayPos(-1);
    setNotePos(-1);
  }, []);

  // Play one pattern on repeat until stopPatternPlay is called.
  // Every step fires a callback that reads live SFX state — so notes painted
  // while playing are heard on the very next loop pass.
  const playLoop = useCallback(async (patIdx) => {
    const idx = patIdx ?? curPatternRef.current;
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    audioEngine.stopAll();

    await Tone.start();
    setIsPlaying(true);

    const pats     = patternsRef.current;
    const sfxSlots = sfxSlotsRef.current;
    const pat      = pats[idx];

    // Use first active channel's speed + length for the master loop duration.
    let speed = 16;
    let masterLength = 32;
    for (let ci = 0; ci < pat.channels.length; ci++) {
      const sfx = sfxSlots[pat.channels[ci] ?? ci];
      if (sfx) { speed = sfx.speed; masterLength = sfx.length ?? 32; break; }
    }
    const noteDur = speed / 60;
    const patDur  = noteDur * masterLength;

    setPlayPos(idx);

    // Note-position ticks (drive the progress bar; repeat each loop)
    for (let ni = 0; ni < masterLength; ni++) {
      const ni_ = ni;
      transport.schedule(() => setNotePos(ni_), ni_ * noteDur);
    }

    // Schedule one callback per step per channel — reads live SFX state on each fire.
    pat.channels.forEach((sfxIdx, ci) => {
      const sfxIndex = sfxIdx ?? ci;
      const sfx = sfxSlots[sfxIndex];
      if (!sfx) return;
      const dur = sfx.speed / 60;
      const chLength = sfx.length ?? 32;

      for (let ni = 0; ni < chLength; ni++) {
        const ni_ = ni;
        transport.schedule((audioTime) => {
          if (muteCheckRef.current(ci)) return;
          const liveSfx   = sfxSlotsRef.current[sfxIndex];
          const liveNote  = liveSfx.notes[ni_];
          if (!liveNote.on) return;
          const prev       = ni_ > 0 ? liveSfx.notes[ni_ - 1] : liveNote;
          const arpPitches = [0, 1, 2, 3].map(o =>
            liveSfx.notes[Math.min(ni_ + o, 31)].pitch,
          );
          const customWave = liveNote.waveform >= 8 && liveNote.waveform <= 15
            ? (() => {
                const ws = sfxSlotsRef.current[liveNote.waveform - 8];
                return ws?.wavetable
                  ? audioEngine.getOrBuildWave(liveNote.waveform - 8, ws.samples ?? new Array(64).fill(0))
                  : null;
              })()
            : null;
          audioEngine.synthNote(
            liveNote.pitch, liveNote.waveform, liveNote.volume, liveNote.effect,
            dur, prev.pitch, ci, audioTime, arpPitches, prev.volume, customWave,
          );
        }, ni_ * dur);
      }
    });

    // Loop the transport over the master pattern duration
    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = patDur;

    transport.start();
  }, []);

  const playPatterns = useCallback(async (startIdx) => {
    const start = startIdx ?? curPatternRef.current;
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.loop = false;
    audioEngine.stopAll();

    await Tone.start();

    const pats     = patternsRef.current;
    const sfxSlots = sfxSlotsRef.current;
    const seq      = buildSequence(pats, start);
    if (seq.length === 0) return;

    setIsPlaying(true);

    let timeOffset = 0; // cumulative seconds from transport start

    for (const patIdx of seq) {
      const pat = pats[patIdx];

      let speed = 16;
      let masterLength = 32;
      for (let ci = 0; ci < pat.channels.length; ci++) {
        const sfx = sfxSlots[pat.channels[ci] ?? ci];
        if (sfx) { speed = sfx.speed; masterLength = sfx.length ?? 32; break; }
      }
      const noteDur = speed / 60;
      const patDur  = noteDur * masterLength;
      const atTime  = timeOffset;

      // Pattern-position and note-position ticks
      transport.schedule(() => setPlayPos(patIdx), atTime);
      for (let ni = 0; ni < masterLength; ni++) {
        const ni_ = ni;
        transport.schedule(() => setNotePos(ni_), atTime + ni_ * noteDur);
      }

      // Schedule one callback per step per channel — reads live SFX state on fire.
      pat.channels.forEach((sfxIdx, ci) => {
        const sfxIndex = sfxIdx ?? ci;
        const sfx = sfxSlots[sfxIndex];
        if (!sfx) return;
        const dur = sfx.speed / 60;
        const chLength = sfx.length ?? 32;

        for (let ni = 0; ni < chLength; ni++) {
          const ni_ = ni;
          transport.schedule((audioTime) => {
            if (muteCheckRef.current(ci)) return;
            const liveSfx   = sfxSlotsRef.current[sfxIndex];
            const liveNote  = liveSfx.notes[ni_];
            if (!liveNote.on) return;
            const prev       = ni_ > 0 ? liveSfx.notes[ni_ - 1] : liveNote;
            const arpPitches = [0, 1, 2, 3].map(o =>
              liveSfx.notes[Math.min(ni_ + o, 31)].pitch,
            );
            audioEngine.synthNote(
              liveNote.pitch, liveNote.waveform, liveNote.volume, liveNote.effect,
              dur, prev.pitch, ci, audioTime, arpPitches, prev.volume,
            );
          }, atTime + ni_ * dur);
        }
      });

      timeOffset += patDur;
    }

    // End of sequence
    transport.schedule(() => {
      audioEngine.stopAll();
      setIsPlaying(false);
      setPlayPos(-1);
      setNotePos(-1);
    }, timeOffset);

    transport.start();
  }, []);

  // ── Export ───────────────────────────────────────────────────────────────────

  const exportMusic = useCallback(() =>
    '__music__\n' + patternsRef.current.map(patternToLine).join('\n'),
  []);

  return {
    patterns, curPattern, setCurPattern,
    isPlaying, playPos, notePos,
    mutedChannels, soloChannel, toggleMute, toggleSolo,
    updateChannel, updateFlags,
    playPatterns, playLoop, stopPatternPlay,
    exportMusic,
  };
}
