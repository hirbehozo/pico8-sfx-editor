import { useState, useEffect, useCallback, useRef } from 'react';
import { mkSfx, sfxToHex } from '../utils.js';
import { audioEngine } from '../audio.js';

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

export function useSfxEditor() {
  const [sfxSlots, setSfxSlots] = useState(() =>
    readStorage('p8-sfx', Array.from({ length: 64 }, mkSfx)),
  );
  const [savedTakes, setSavedTakes] = useState(() =>
    readStorage('p8-takes', []),
  );
  const [curSfx, setCurSfx] = useState(0);
  const [selectedNote, setSelectedNote] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPos, setPlayPos] = useState(-1);

  // Stable refs so callbacks never capture stale state
  const sfxSlotsRef = useRef(sfxSlots);
  const curSfxRef = useRef(curSfx);
  const playTimersRef = useRef([]);

  useEffect(() => { sfxSlotsRef.current = sfxSlots; }, [sfxSlots]);
  useEffect(() => { curSfxRef.current = curSfx; }, [curSfx]);

  // ── Debounced localStorage persistence ────────────────────────────────────

  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem('p8-sfx', JSON.stringify(sfxSlots)); } catch (_) {}
    }, 800);
    return () => clearTimeout(id);
  }, [sfxSlots]);

  useEffect(() => {
    const id = setTimeout(() => {
      try { localStorage.setItem('p8-takes', JSON.stringify(savedTakes)); } catch (_) {}
    }, 800);
    return () => clearTimeout(id);
  }, [savedTakes]);

  // Clean up audio and timers on unmount
  useEffect(() => () => {
    playTimersRef.current.forEach(clearTimeout);
    audioEngine.stopAll();
  }, []);

  // ── Note & SFX mutations ──────────────────────────────────────────────────

  const updateNote = useCallback((idx, patch) => {
    setSfxSlots(slots => {
      const cur = curSfxRef.current;
      const notes = [...slots[cur].notes];
      notes[idx] = { ...notes[idx], ...patch };
      const next = [...slots];
      next[cur] = { ...slots[cur], notes };
      return next;
    });
  }, []);

  const updateSfxField = useCallback((patch) => {
    setSfxSlots(slots => {
      const cur = curSfxRef.current;
      const next = [...slots];
      next[cur] = { ...slots[cur], ...patch };
      return next;
    });
  }, []);

  const toggleNote = useCallback((idx) => {
    setSfxSlots(slots => {
      const cur = curSfxRef.current;
      const notes = [...slots[cur].notes];
      notes[idx] = { ...notes[idx], on: !notes[idx].on };
      const next = [...slots];
      next[cur] = { ...slots[cur], notes };
      return next;
    });
  }, []);

  // ── Playback ──────────────────────────────────────────────────────────────

  const stopPlay = useCallback(() => {
    playTimersRef.current.forEach(clearTimeout);
    playTimersRef.current = [];
    audioEngine.stopAll();
    setIsPlaying(false);
    setPlayPos(-1);
  }, []);

  const playSfx = useCallback(() => {
    // Cancel any in-progress playback before starting fresh
    playTimersRef.current.forEach(clearTimeout);
    playTimersRef.current = [];
    audioEngine.stopAll();

    // Snapshot the SFX so edits during playback don't affect the current run
    const sfx = sfxSlotsRef.current[curSfxRef.current];
    const noteDuration = sfx.speed / 60;  // seconds per note
    const noteMs = noteDuration * 1000;   // ms per note

    setIsPlaying(true);
    setPlayPos(0);

    const noteIds = sfx.notes.map((note, i) =>
      setTimeout(() => {
        setPlayPos(i);
        if (note.on) {
          // Provide previous note's pitch so slide effect has a source to ramp from
          const prevPitch = i > 0 ? sfx.notes[i - 1].pitch : note.pitch;
          audioEngine.synthNote(
            note.pitch,
            note.waveform,
            note.volume,
            note.effect,
            noteDuration,
            prevPitch,
          );
        }
      }, i * noteMs),
    );

    // Reset playback state after the last note's duration has elapsed
    const endId = setTimeout(() => {
      setIsPlaying(false);
      setPlayPos(-1);
    }, 32 * noteMs);

    playTimersRef.current = [...noteIds, endId];
  }, []);

  // ── Takes ─────────────────────────────────────────────────────────────────

  const saveTake = useCallback(() => {
    const sfx = sfxSlotsRef.current[curSfxRef.current];
    setSavedTakes(prev => [
      ...prev,
      {
        id: Date.now(),
        slot: curSfxRef.current,
        sfx: structuredClone(sfx),
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const loadTake = useCallback((take) => {
    setSfxSlots(slots => {
      const next = [...slots];
      next[curSfxRef.current] = structuredClone(take.sfx);
      return next;
    });
  }, []);

  const deleteTake = useCallback((id) => {
    setSavedTakes(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Export ────────────────────────────────────────────────────────────────

  const exportSingle = useCallback(() =>
    sfxToHex(sfxSlotsRef.current[curSfxRef.current]),
  []);

  // Returns all 64 slots as a newline-separated block ready to paste into a .p8 file
  const exportAll = useCallback(() =>
    sfxSlotsRef.current.map(sfxToHex).join('\n'),
  []);

  return {
    // State (read-only for consumers)
    sfxSlots,
    curSfx,
    selectedNote,
    isPlaying,
    playPos,
    savedTakes,
    // Actions
    updateNote,
    updateSfxField,
    toggleNote,
    setCurSfx,       // raw React setter — stable reference, safe to pass as prop
    setSelectedNote, // raw React setter — stable reference, safe to pass as prop
    playSfx,
    stopPlay,
    saveTake,
    loadTake,
    deleteTake,
    exportSingle,
    exportAll,
  };
}
