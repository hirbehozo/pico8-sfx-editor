import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [patterns,   setPatterns]   = useState(readStorage);
  const [curPattern, setCurPattern] = useState(0);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [playPos,    setPlayPos]    = useState(-1);

  // Stable refs — callbacks never re-register because they read through these
  const patternsRef   = useRef(patterns);
  const sfxSlotsRef   = useRef(sfxSlots);
  const curPatternRef = useRef(curPattern);
  const playTimersRef = useRef([]);
  const stopRef       = useRef(false);

  useEffect(() => { patternsRef.current   = patterns;   }, [patterns]);
  useEffect(() => { sfxSlotsRef.current   = sfxSlots;   }, [sfxSlots]);
  useEffect(() => { curPatternRef.current = curPattern; }, [curPattern]);

  // Debounced persistence
  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem('p8-patterns', JSON.stringify(patterns)); } catch (_) {}
    }, 800);
    return () => clearTimeout(id);
  }, [patterns]);

  // Cleanup on unmount
  useEffect(() => () => {
    playTimersRef.current.forEach(clearTimeout);
    audioEngine.stopAll();
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────────

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
    stopRef.current = true;
    playTimersRef.current.forEach(clearTimeout);
    playTimersRef.current = [];
    audioEngine.stopAll();
    setIsPlaying(false);
    setPlayPos(-1);
  }, []);

  const playPatterns = useCallback((startIdx) => {
    const start    = startIdx ?? curPatternRef.current;
    stopRef.current = false;
    playTimersRef.current.forEach(clearTimeout);
    playTimersRef.current = [];
    audioEngine.stopAll();

    const pats     = patternsRef.current;
    const sfxSlots = sfxSlotsRef.current;
    const seq      = buildSequence(pats, start);
    if (seq.length === 0) return;

    setIsPlaying(true);

    // ids is both the local array AND playTimersRef.current (same reference),
    // so note timeouts added inside pattern callbacks are also tracked.
    const ids = [];
    playTimersRef.current = ids;

    let delayMs = 0;

    for (const patIdx of seq) {
      const pat = pats[patIdx];

      // Use the first active channel's SFX speed for pattern duration
      let speed = 16;
      for (const sfxIdx of pat.channels) {
        if (sfxIdx !== null && sfxSlots[sfxIdx]) { speed = sfxSlots[sfxIdx].speed; break; }
      }
      const patMs = Math.round(32 * speed / 60 * 1000);
      const atMs  = delayMs;

      const patId = setTimeout(() => {
        if (stopRef.current) return;
        setPlayPos(patIdx);

        // Schedule every note of every active channel
        pat.channels.forEach(sfxIdx => {
          if (sfxIdx === null) return;
          const sfx = sfxSlots[sfxIdx];
          if (!sfx) return;
          const noteDur = sfx.speed / 60;

          sfx.notes.forEach((note, ni) => {
            if (!note.on) return;
            const noteId = setTimeout(() => {
              if (stopRef.current) return;
              audioEngine.synthNote(
                note.pitch, note.waveform, note.volume, note.effect, noteDur,
                ni > 0 ? sfx.notes[ni - 1].pitch : note.pitch,
              );
            }, Math.round(ni * noteDur * 1000));
            ids.push(noteId); // tracked via shared reference
          });
        });
      }, atMs);
      ids.push(patId);

      delayMs += patMs;
    }

    // End of sequence
    ids.push(setTimeout(() => {
      if (stopRef.current) return;
      audioEngine.stopAll();
      setIsPlaying(false);
      setPlayPos(-1);
    }, delayMs));
  }, []);

  // ── Export ───────────────────────────────────────────────────────────────────

  const exportMusic = useCallback(() =>
    '__music__\n' + patternsRef.current.map(patternToLine).join('\n'),
  []);

  return {
    patterns, curPattern, setCurPattern,
    isPlaying, playPos,
    updateChannel, updateFlags,
    playPatterns, stopPatternPlay,
    exportMusic,
  };
}
