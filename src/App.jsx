import { useState, useEffect, useCallback, useRef } from 'react';

import { useSfxEditor }   from './hooks/useSfxEditor.js';
import { useKeyboard }    from './hooks/useKeyboard.js';
import { useMidi }        from './hooks/useMidi.js';
import { usePatterns }    from './hooks/usePatterns.js';
import { useViewport }    from './hooks/useViewport.js';
import { mkNote }         from './utils.js';
import { audioEngine }    from './audio.js';

import Toolbar         from './components/Toolbar.jsx';
import NoteGrid        from './components/NoteGrid.jsx';
import NoteEditor      from './components/NoteEditor.jsx';
import PianoKeyboard   from './components/PianoKeyboard.jsx';
import WaveformDisplay from './components/WaveformDisplay.jsx';
import TakesList       from './components/TakesList.jsx';
import ExportPanel     from './components/ExportPanel.jsx';
import PatternEditor   from './components/PatternEditor.jsx';

const TABS = [
  { id: 'edit',     label: 'EDIT'     },
  { id: 'takes',    label: 'TAKES'    },
  { id: 'export',   label: 'EXPORT'   },
  { id: 'patterns', label: 'PATTERNS' },
];

// ── TabBar shared by both layouts ─────────────────────────────────────────────
function TabBar({ tab, setTab, bottom = false }) {
  return (
    <div style={{
      display: 'flex',
      borderTop:    bottom ? '1px solid #1c1c1c' : 'none',
      borderBottom: bottom ? 'none' : '1px solid #1c1c1c',
      flexShrink: 0,
      backgroundColor: '#0d0d0d',
    }}>
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          style={{
            flex: 1,
            fontFamily: 'monospace',
            fontSize: 9,
            letterSpacing: 1,
            padding: '10px 0',  // 44 px touch target height
            border: 'none',
            borderTop:    bottom && tab === id ? '2px solid #29ADFF' : bottom ? '2px solid transparent' : 'none',
            borderBottom: !bottom && tab === id ? '2px solid #29ADFF' : !bottom ? '2px solid transparent' : 'none',
            backgroundColor: 'transparent',
            color: tab === id ? '#29ADFF' : '#5F574F',
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── TabContent shared by both layouts ─────────────────────────────────────────
function TabContent({ tab, sfx, sfxSlots, curSfx, selectedNote, savedTakes,
                      updateNote, loadTake, deleteTake, patterns, previewTake }) {
  return (
    <>
      {tab === 'edit' && (
        <NoteEditor
          note={sfx.notes[selectedNote]}
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
        <ExportPanel sfx={sfx} sfxSlots={sfxSlots} curSfx={curSfx} />
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
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('edit');
  const vp = useViewport();

  // Piano key sizes — larger on touch devices for comfortable tapping
  const keyW = vp.isTouch ? 30 : 22;
  const keyH = vp.isTouch ? 76 : 64;

  // ── SFX state ───────────────────────────────────────────────────────────────
  const {
    sfxSlots, curSfx, selectedNote, isPlaying, playPos, savedTakes,
    updateNote, updateSfxField, setCurSfx, setSelectedNote,
    playSfx, stopPlay, saveTake, loadTake, deleteTake, exportSingle,
  } = useSfxEditor();

  const sfx  = sfxSlots[curSfx];
  const note = sfx.notes[selectedNote];

  const patterns = usePatterns(sfxSlots);

  // ── AudioContext priming (must happen inside a user gesture) ────────────────
  useEffect(() => {
    const prime = () => audioEngine.getCtx();
    document.addEventListener('pointerdown', prime, { once: true });
    return () => document.removeEventListener('pointerdown', prime);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  const { octave } = useKeyboard({
    selectedNote, sfx, isPlaying,
    setSelectedNote, updateNote, playSfx, stopPlay,
  });

  // ── MIDI ────────────────────────────────────────────────────────────────────
  const noteRef    = useRef(note);
  const selRef     = useRef(selectedNote);
  useEffect(() => { noteRef.current = note;         }, [note]);
  useEffect(() => { selRef.current  = selectedNote; }, [selectedNote]);

  const onMidiNote = useCallback(pitch => {
    const idx = selRef.current;
    const n   = noteRef.current;
    updateNote(idx, { pitch, on: true });
    audioEngine.synthNote(pitch, n.waveform, n.volume || 5, 0, 0.3);
    setSelectedNote(prev => Math.min(prev + 1, 31));
  }, [updateNote, setSelectedNote]);

  const { midiStatus } = useMidi(onMidiNote);

  // ── Toolbar actions ─────────────────────────────────────────────────────────
  const handleCopy = () =>
    navigator.clipboard.writeText(exportSingle()).catch(() => {});

  const handleClear = () => {
    const hex = curSfx.toString(16).padStart(2, '0').toUpperCase();
    if (window.confirm(`Clear all notes in SFX ${hex}?`))
      updateSfxField({ notes: Array.from({ length: 32 }, mkNote) });
  };

  // ── Take preview ─────────────────────────────────────────────────────────
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

  // ── Piano key press ─────────────────────────────────────────────────────────
  const handlePianoKey = useCallback(pitch => {
    const idx = selRef.current;
    const n   = noteRef.current;
    updateNote(idx, { pitch, on: true });
    audioEngine.synthNote(pitch, n.waveform, n.volume || 5, 0, 0.3);
    setSelectedNote(prev => Math.min(prev + 1, 31));
  }, [updateNote, setSelectedNote]);

  // ── Shared toolbar ──────────────────────────────────────────────────────────
  const toolbar = (
    <Toolbar
      curSfx={curSfx}  sfx={sfx}  isPlaying={isPlaying}
      onPrev={() => setCurSfx(Math.max(0, curSfx - 1))}
      onNext={() => setCurSfx(Math.min(63, curSfx + 1))}
      onPlay={playSfx}  onStop={stopPlay}
      onSave={saveTake}  onCopy={handleCopy}  onClear={handleClear}
      onSpeedChange={v => updateSfxField({ speed: v })}
      onLoopStartChange={v => updateSfxField({ loopStart: v })}
      onLoopEndChange={v => updateSfxField({ loopEnd: v })}
    />
  );

  // ── Shared editing column ───────────────────────────────────────────────────
  const editingColumn = (
    <>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1c1c1c', flexShrink: 0 }}>
        <WaveformDisplay currentWaveform={note.waveform} />
      </div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1c1c1c', flexShrink: 0 }}>
        <NoteGrid
          notes={sfx.notes}
          selectedNote={selectedNote}
          playPos={playPos}
          onNoteClick={setSelectedNote}
          onDragPaint={(i, on) => updateNote(i, { on })}
        />
      </div>
      <div style={{ padding: '8px 12px', flexShrink: 0 }}>
        <PianoKeyboard
          activePitch={note.pitch}
          onKeyPress={handlePianoKey}
          keyW={keyW}
          keyH={keyH}
        />
      </div>
    </>
  );

  const tabContent = (
    <TabContent
      tab={tab} sfx={sfx} sfxSlots={sfxSlots} curSfx={curSfx}
      selectedNote={selectedNote} savedTakes={savedTakes}
      updateNote={updateNote} loadTake={loadTake} deleteTake={deleteTake}
      patterns={patterns} previewTake={previewTake}
    />
  );

  const root = { height: '100dvh', display: 'flex', flexDirection: 'column',
                 overflow: 'hidden', backgroundColor: '#111', color: '#C2C3C7',
                 fontFamily: 'monospace' };

  // ── Portrait layout (compact or tall): vertical stack, bottom tab bar ────────
  if (vp.isCompact) {
    return (
      <div style={root}>
        {toolbar}

        {/* Scrollable top section: waveform + grid + piano */}
        <div style={{ flexShrink: 0, overflow: 'hidden' }}>
          {editingColumn}
        </div>

        {/* Bottom panel: tab bar at bottom edge, content above it */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                      overflow: 'hidden', minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {tabContent}
          </div>
          <TabBar tab={tab} setTab={setTab} bottom />
        </div>
      </div>
    );
  }

  // ── Landscape / desktop layout: sidebar ──────────────────────────────────────
  return (
    <div style={root}>
      {toolbar}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
                      overflow: 'hidden' }}>
          {editingColumn}

          {/* Keyboard shortcut hint — only useful if a keyboard is attached */}
          {!vp.isTouch && (
            <div style={{ padding: '8px 14px', fontSize: 8, color: '#2a2a2a',
                          lineHeight: 2, userSelect: 'none', marginTop: 'auto' }}>
              <span style={{ color: '#3a3a3a' }}>SPACE</span> play ·{' '}
              <span style={{ color: '#3a3a3a' }}>← →</span> select ·{' '}
              <span style={{ color: '#3a3a3a' }}>↑↓</span> pitch ·{' '}
              <span style={{ color: '#3a3a3a' }}>⇧↑↓</span> vol ·{' '}
              <span style={{ color: '#3a3a3a' }}>DEL</span> off ·{' '}
              <span style={{ color: '#3a3a3a' }}>TAB</span> wave ·{' '}
              <span style={{ color: '#3a3a3a' }}>1–8</span> waveform ·{' '}
              <span style={{ color: '#3a3a3a' }}>[ ]</span> oct {octave} ·{' '}
              <span style={{ color: '#3a3a3a' }}>Q–P / Z–M</span> piano
              {midiStatus === 'ready' && (
                <span style={{ color: '#00E436', marginLeft: 8 }}>● MIDI</span>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ width: 370, flexShrink: 0, borderLeft: '1px solid #1c1c1c',
                      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TabBar tab={tab} setTab={setTab} />
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {tabContent}
          </div>
        </div>
      </div>
    </div>
  );
}
