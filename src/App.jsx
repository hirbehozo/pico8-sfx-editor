import { useState, useEffect, useCallback, useRef } from 'react';

import { useSfxEditor }  from './hooks/useSfxEditor.js';
import { useKeyboard }   from './hooks/useKeyboard.js';
import { useMidi }       from './hooks/useMidi.js';
import { usePatterns }   from './hooks/usePatterns.js';
import { mkNote }        from './utils.js';
import { audioEngine }   from './audio.js';

import Toolbar        from './components/Toolbar.jsx';
import NoteGrid       from './components/NoteGrid.jsx';
import NoteEditor     from './components/NoteEditor.jsx';
import PianoKeyboard  from './components/PianoKeyboard.jsx';
import WaveformDisplay from './components/WaveformDisplay.jsx';
import TakesList      from './components/TakesList.jsx';
import ExportPanel    from './components/ExportPanel.jsx';
import PatternEditor  from './components/PatternEditor.jsx';

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'edit',     label: 'EDIT'     },
  { id: 'takes',    label: 'TAKES'    },
  { id: 'export',   label: 'EXPORT'   },
  { id: 'patterns', label: 'PATTERNS' },
];

export default function App() {
  const [tab, setTab] = useState('edit');

  // ── Core state ──────────────────────────────────────────────────────────────
  const {
    sfxSlots, curSfx, selectedNote, isPlaying, playPos, savedTakes,
    updateNote, updateSfxField, setCurSfx, setSelectedNote,
    playSfx, stopPlay, saveTake, loadTake, deleteTake, exportSingle,
  } = useSfxEditor();

  const sfx  = sfxSlots[curSfx];
  const note = sfx.notes[selectedNote];

  // Pattern sequencer (receives sfxSlots so it can read SFX speeds)
  const patterns = usePatterns(sfxSlots);

  // ── AudioContext: create on first pointer interaction ─────────────────────
  // Browsers keep AudioContext suspended until a user gesture occurs.
  // Calling getCtx() here (inside a pointerdown) primes it so subsequent
  // setTimeout-scheduled synthNote calls don't get blocked.
  useEffect(() => {
    const prime = () => audioEngine.getCtx();
    document.addEventListener('pointerdown', prime, { once: true });
    return () => document.removeEventListener('pointerdown', prime);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const { octave } = useKeyboard({
    selectedNote, sfx, isPlaying,
    setSelectedNote, updateNote, playSfx, stopPlay,
  });

  // ── MIDI input ────────────────────────────────────────────────────────────
  // Refs keep the handler stable so useMidi doesn't re-register on every render
  const noteRef    = useRef(note);
  const selNoteRef = useRef(selectedNote);
  useEffect(() => { noteRef.current    = note;         }, [note]);
  useEffect(() => { selNoteRef.current = selectedNote; }, [selectedNote]);

  const onMidiNote = useCallback(pitch => {
    const idx = selNoteRef.current;
    const n   = noteRef.current;
    updateNote(idx, { pitch, on: true });
    audioEngine.synthNote(pitch, n.waveform, n.volume || 5, 0, 0.3);
    setSelectedNote(prev => Math.min(prev + 1, 31));
  }, [updateNote, setSelectedNote]);

  const { midiStatus } = useMidi(onMidiNote);

  // ── Toolbar callbacks ─────────────────────────────────────────────────────
  const handleCopy = () =>
    navigator.clipboard.writeText(exportSingle()).catch(() => {});

  const handleClear = () => {
    const hex = curSfx.toString(16).padStart(2, '0').toUpperCase();
    if (window.confirm(`Clear all notes in SFX ${hex}?`))
      updateSfxField({ notes: Array.from({ length: 32 }, mkNote) });
  };

  // ── Take preview (plays without loading) ─────────────────────────────────
  const previewTake = useCallback(take => {
    const s = take.sfx;
    const dur = s.speed / 60;
    s.notes.forEach((n, i) => {
      if (!n.on) return;
      setTimeout(() => {
        audioEngine.synthNote(
          n.pitch, n.waveform, n.volume, n.effect, dur,
          i > 0 ? s.notes[i - 1].pitch : n.pitch,
        );
      }, Math.round(i * dur * 1000));
    });
  }, []);

  // ── Piano key → enter note at cursor and advance ──────────────────────────
  const handlePianoKey = useCallback(pitch => {
    const idx = selNoteRef.current;
    const n   = noteRef.current;
    updateNote(idx, { pitch, on: true });
    audioEngine.synthNote(pitch, n.waveform, n.volume || 5, 0, 0.3);
    setSelectedNote(prev => Math.min(prev + 1, 31));
  }, [updateNote, setSelectedNote]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#111',
      color: '#C2C3C7',
      fontFamily: 'monospace',
    }}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <Toolbar
        curSfx={curSfx}
        sfx={sfx}
        isPlaying={isPlaying}
        onPrev={() => setCurSfx(Math.max(0, curSfx - 1))}
        onNext={() => setCurSfx(Math.min(63, curSfx + 1))}
        onPlay={playSfx}
        onStop={stopPlay}
        onSave={saveTake}
        onCopy={handleCopy}
        onClear={handleClear}
        onSpeedChange={v => updateSfxField({ speed: v })}
        onLoopStartChange={v => updateSfxField({ loopStart: v })}
        onLoopEndChange={v => updateSfxField({ loopEnd: v })}
      />

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left column ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Waveform display + keyboard hint */}
          <div style={{
            display: 'flex',
            gap: 12,
            padding: '8px 12px',
            borderBottom: '1px solid #1c1c1c',
            flexShrink: 0,
          }}>
            <WaveformDisplay currentWaveform={note.waveform} />
            <div style={{ fontSize: 8, color: '#3a3a3a', lineHeight: 2, paddingTop: 2, userSelect: 'none' }}>
              <div><span style={{ color: '#5F574F' }}>SPACE</span> play / stop</div>
              <div><span style={{ color: '#5F574F' }}>← →</span> select note</div>
              <div><span style={{ color: '#5F574F' }}>↑ ↓</span> pitch ±1</div>
              <div><span style={{ color: '#5F574F' }}>⇧↑ ⇧↓</span> volume ±1</div>
              <div><span style={{ color: '#5F574F' }}>DEL</span> note off</div>
              <div><span style={{ color: '#5F574F' }}>TAB</span> next waveform</div>
              <div><span style={{ color: '#5F574F' }}>1–8</span> set waveform</div>
              <div><span style={{ color: '#5F574F' }}>[ ]</span> octave <span style={{ color: '#83769C' }}>{octave}</span></div>
              <div><span style={{ color: '#5F574F' }}>Q–P / Z–M</span> piano keys</div>
              {midiStatus === 'ready' && (
                <div style={{ color: '#00E436', marginTop: 4 }}>● MIDI</div>
              )}
            </div>
          </div>

          {/* Note grid */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #1c1c1c', flexShrink: 0 }}>
            <NoteGrid
              notes={sfx.notes}
              selectedNote={selectedNote}
              playPos={playPos}
              onNoteClick={setSelectedNote}
              onDragPaint={(i, on) => updateNote(i, { on })}
            />
          </div>

          {/* Piano keyboard */}
          <div style={{ padding: '8px 12px', flexShrink: 0 }}>
            <PianoKeyboard
              activePitch={note.pitch}
              onKeyPress={handlePianoKey}
            />
          </div>

        </div>

        {/* Right sidebar ───────────────────────────────────────────────── */}
        <div style={{
          width: 370,
          flexShrink: 0,
          borderLeft: '1px solid #1c1c1c',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1c1c1c', flexShrink: 0 }}>
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: 8,
                  letterSpacing: 1,
                  padding: '8px 0',
                  border: 'none',
                  borderBottom: tab === id ? '2px solid #29ADFF' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: tab === id ? '#29ADFF' : '#5F574F',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {tab === 'edit' && (
              <NoteEditor
                note={note}
                noteIndex={selectedNote}
                onUpdate={patch => updateNote(selectedNote, patch)}
              />
            )}
            {tab === 'takes' && (
              <TakesList
                takes={savedTakes}
                curSfx={curSfx}
                onLoad={loadTake}
                onDelete={deleteTake}
                onPreview={previewTake}
              />
            )}
            {tab === 'export' && (
              <ExportPanel
                sfx={sfx}
                sfxSlots={sfxSlots}
                curSfx={curSfx}
              />
            )}
            {tab === 'patterns' && (
              <PatternEditor
                patterns={patterns.patterns}
                curPattern={patterns.curPattern}
                setCurPattern={patterns.setCurPattern}
                isPlaying={patterns.isPlaying}
                playPos={patterns.playPos}
                updateChannel={patterns.updateChannel}
                updateFlags={patterns.updateFlags}
                playPatterns={patterns.playPatterns}
                stopPatternPlay={patterns.stopPatternPlay}
                exportMusic={patterns.exportMusic}
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
