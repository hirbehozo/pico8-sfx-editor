import { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { mkSfx, mkDrumSfx, mkNote, sfxToHex } from '../utils.js';
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
    readStorage('p8-sfx', Array.from({ length: 64 }, (_, i) => i === 3 ? mkDrumSfx() : mkSfx())),
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
  }, [savedTakes]);

  // Stop Transport and audio on unmount
  useEffect(() => () => {
    const t = Tone.getTransport();
    t.stop();
    t.cancel();
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

  // Like updateNote but targets any SFX slot by index — used by the 4-track grid
  // so drag-painting in track 2 updates that track's SFX without changing curSfx.
  const updateAnyNote = useCallback((sfxIdx, noteIdx, patch) => {
    setSfxSlots(slots => {
      const notes = [...slots[sfxIdx].notes];
      notes[noteIdx] = { ...notes[noteIdx], ...patch };
      const next = [...slots];
      next[sfxIdx] = { ...slots[sfxIdx], notes };
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

  const toggleWavetable = useCallback((sfxIdx) => {
    if (sfxIdx > 7) return;
    audioEngine.invalidateWaveCache(sfxIdx);
    setSfxSlots(slots => {
      const next = [...slots];
      next[sfxIdx] = { ...slots[sfxIdx], wavetable: !(slots[sfxIdx].wavetable ?? false) };
      return next;
    });
  }, []);

  const updateSample = useCallback((sfxIdx, sampleIdx, value) => {
    audioEngine.invalidateWaveCache(sfxIdx);
    setSfxSlots(slots => {
      const samples = [...(slots[sfxIdx].samples ?? new Array(64).fill(0))];
      samples[sampleIdx] = Math.max(-7, Math.min(7, value));
      const next = [...slots];
      next[sfxIdx] = { ...slots[sfxIdx], samples };
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
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    audioEngine.stopAll();
    setIsPlaying(false);
    setPlayPos(-1);
  }, []);

  const playSfx = useCallback(async () => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.loop = false;
    audioEngine.stopAll();

    await Tone.start();

    const sfxIndex    = curSfxRef.current;
    const sfx         = sfxSlotsRef.current[sfxIndex];
    const noteDuration = sfx.speed / 60;
    const seqLength   = sfx.length ?? 32;

    setIsPlaying(true);
    setPlayPos(0);

    for (let i = 0; i < seqLength; i++) {
      const i_ = i;
      transport.schedule((audioTime) => {
        setPlayPos(i_);
        const liveSfx  = sfxSlotsRef.current[sfxIndex];
        const liveNote = liveSfx.notes[i_];
        if (liveNote.on) {
          const prev       = i_ > 0 ? liveSfx.notes[i_ - 1] : liveNote;
          const arpPitches = [0, 1, 2, 3].map(o =>
            liveSfx.notes[Math.min(i_ + o, 31)].pitch,
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
            noteDuration, prev.pitch, -1, audioTime, arpPitches, prev.volume, customWave,
          );
        }
      }, i_ * noteDuration);
    }

    transport.schedule(() => {
      setIsPlaying(false);
      setPlayPos(-1);
    }, seqLength * noteDuration);

    transport.start();
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

  // Reset the 4 default tracks to their starting state:
  // slots 0–2 → blank SFX, slot 3 → default drum groove.
  const resetTracks = useCallback(() => {
    setSfxSlots(slots => {
      const next = [...slots];
      next[0] = { ...mkSfx(), notes: Array.from({ length: 32 }, mkNote) };
      next[1] = { ...mkSfx(), notes: Array.from({ length: 32 }, mkNote) };
      next[2] = { ...mkSfx(), notes: Array.from({ length: 32 }, mkNote) };
      next[3] = mkDrumSfx();
      return next;
    });
  }, []);

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
    updateAnyNote,
    updateSfxField,
    toggleNote,
    setCurSfx,
    setSelectedNote,
    playSfx,
    stopPlay,
    toggleWavetable,
    updateSample,
    saveTake,
    loadTake,
    deleteTake,
    exportSingle,
    exportAll,
    resetTracks,
  };
}
