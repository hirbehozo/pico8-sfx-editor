import { useState, useEffect, useCallback, useRef } from 'react';

import { useSfxEditor }   from './hooks/useSfxEditor.js';
import { useKeyboard }    from './hooks/useKeyboard.js';
import { useMidi }        from './hooks/useMidi.js';
import { usePatterns }    from './hooks/usePatterns.js';
import { useViewport }    from './hooks/useViewport.js';
import { mkNote, buildScaleNotes, snapToScale, nextScalePitch } from './utils.js';
import { audioEngine }    from './audio.js';

import Toolbar         from './components/Toolbar.jsx';
import ScaleSelector   from './components/ScaleSelector.jsx';
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

// ── Rotate prompt ─────────────────────────────────────────────────────────────
// Shown on touch devices in portrait orientation.
function RotatePrompt() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      backgroundColor: '#1a1c2c',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 36, padding: 32, textAlign: 'center',
      fontFamily: 'monospace',
    }}>
      {/* Device + rotation icon */}
      <svg
        width="176" height="76" viewBox="0 0 176 76" fill="none"
        style={{ animation: 'p8-hint 2.4s ease-in-out infinite' }}
      >
        {/* Portrait device — dimmed */}
        <rect x="10" y="8" width="28" height="50" rx="5"
              stroke="#3a3a3a" strokeWidth="2"/>
        <rect x="14" y="13" width="20" height="38" rx="2" fill="#222"/>
        <circle cx="24" cy="63" r="0" fill="#3a3a3a"/>

        {/* Elliptical arc from portrait (right edge) to landscape (left edge) */}
        <path d="M 40 33 A 48 24 0 0 1 136 33"
              stroke="#FFEC27" strokeWidth="2.5" strokeLinecap="round"/>

        {/* Arrowhead pointing down-right at arc end */}
        <path d="M 130 25 L 136 33 L 144 27"
              stroke="#FFEC27" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" fill="none"/>

        {/* Landscape device — highlighted */}
        <rect x="136" y="23" width="30" height="22" rx="5"
              stroke="#00E436" strokeWidth="2"/>
        <rect x="140" y="27" width="22" height="14" rx="2" fill="#222"/>
      </svg>

      <div>
        <div style={{
          fontSize: 16, color: '#FFEC27',
          letterSpacing: 4, marginBottom: 10,
        }}>
          ROTATE DEVICE
        </div>
        <div style={{ fontSize: 10, color: '#5F574F', lineHeight: 1.8 }}>
          PICO-8 SFX Editor runs in landscape mode
        </div>
      </div>
    </div>
  );
}

// ── TabBar shared by both layouts ─────────────────────────────────────────────
function TabBar({ tab, setTab, bottom = false, isTouch = false }) {
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
            fontSize: isTouch ? 11 : 9,
            letterSpacing: 1,
            padding: isTouch ? '14px 0' : '10px 0',
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
                      updateNote, loadTake, deleteTake, patterns, previewTake,
                      nextPitch, isTouch = false }) {
  return (
    <>
      {tab === 'edit' && (
        <NoteEditor
          note={sfx.notes[selectedNote]}
          noteIndex={selectedNote}
          onUpdate={patch => updateNote(selectedNote, patch)}
          nextPitch={nextPitch}
          isTouch={isTouch}
        />
      )}
      {tab === 'takes' && (
        <TakesList
          takes={savedTakes}
          curSfx={curSfx}
          onLoad={loadTake}
          onDelete={deleteTake}
          onPreview={previewTake}
          isTouch={isTouch}
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

  // ── Scale / mode ────────────────────────────────────────────────────────────
  const [scaleKey,  setScaleKey]  = useState(0);           // 0 = C
  const [scaleMode, setScaleMode] = useState('chromatic');
  const validNotes = buildScaleNotes(scaleKey, scaleMode); // Set<0-11>

  // Scale helper callbacks — passed to useKeyboard, NoteEditor, PianoKeyboard
  const snapPitch  = p => snapToScale(p, validNotes);
  const nextPitch  = (p, dir) => nextScalePitch(p, dir, validNotes);

  // Piano key sizing: on touch, fill the full viewport width across all 37 white keys
  // containerW ≈ 37.25 × keyW, so keyW = floor(vp.w / 37.25) fills edge-to-edge
  const pianoKeyW = vp.isTouch ? Math.max(18, Math.floor(vp.w / 37.25)) : 22;
  const pianoKeyH = vp.isTouch ? 80 : 64;

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
    snapPitch, nextPitch,
  });

  // ── MIDI ────────────────────────────────────────────────────────────────────
  const noteRef    = useRef(note);
  const selRef     = useRef(selectedNote);
  useEffect(() => { noteRef.current = note;         }, [note]);
  useEffect(() => { selRef.current  = selectedNote; }, [selectedNote]);

  const snapRef = useRef(snapPitch);
  useEffect(() => { snapRef.current = snapPitch; }, [snapPitch]);

  const onMidiNote = useCallback(pitch => {
    const idx      = selRef.current;
    const n        = noteRef.current;
    const snapped  = snapRef.current(pitch);   // honour active scale
    updateNote(idx, { pitch: snapped, on: true });
    audioEngine.synthNote(snapped, n.waveform, n.volume || 5, 0, 0.3);
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
    const idx     = selRef.current;
    const n       = noteRef.current;
    const snapped = snapRef.current(pitch);    // snap to active scale
    updateNote(idx, { pitch: snapped, on: true });
    audioEngine.synthNote(snapped, n.waveform, n.volume || 5, 0, 0.3);
    setSelectedNote(prev => Math.min(prev + 1, 31));
  }, [updateNote, setSelectedNote]);

  // ── Shared toolbar ──────────────────────────────────────────────────────────
  const toolbar = (
    <Toolbar
      curSfx={curSfx}  sfx={sfx}  isPlaying={isPlaying}  isTouch={vp.isTouch}
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
      {/* Scale / key selector — spans full width above grid */}
      <ScaleSelector
        scaleKey={scaleKey}
        scaleMode={scaleMode}
        validNotes={validNotes}
        onKeyChange={setScaleKey}
        onModeChange={setScaleMode}
        isTouch={vp.isTouch}
      />

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
      {/* Desktop piano — touch devices get the full-width strip at the bottom instead */}
      {!vp.isTouch && (
        <div style={{ padding: '8px 12px', flexShrink: 0 }}>
          <PianoKeyboard
            activePitch={note.pitch}
            onKeyPress={handlePianoKey}
            keyW={22}
            keyH={64}
            validNotes={validNotes}
          />
        </div>
      )}
    </>
  );

  const tabContent = (
    <TabContent
      tab={tab} sfx={sfx} sfxSlots={sfxSlots} curSfx={curSfx}
      selectedNote={selectedNote} savedTakes={savedTakes}
      updateNote={updateNote} loadTake={loadTake} deleteTake={deleteTake}
      patterns={patterns} previewTake={previewTake}
      nextPitch={nextPitch} isTouch={vp.isTouch}
    />
  );

  const root = { height: '100dvh', display: 'flex', flexDirection: 'column',
                 overflow: 'hidden', backgroundColor: '#111', color: '#C2C3C7',
                 fontFamily: 'monospace' };

  // ── Touch + portrait → rotate prompt ────────────────────────────────────────
  if (vp.isTouch && !vp.isLandscape) {
    return <RotatePrompt />;
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
          <TabBar tab={tab} setTab={setTab} isTouch={vp.isTouch} />
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {tabContent}
          </div>
        </div>
      </div>

      {/* Full-width piano strip — touch landscape only */}
      {vp.isTouch && (
        <div style={{ flexShrink: 0, borderTop: '1px solid #1c1c1c', backgroundColor: '#0d0d0d' }}>
          <PianoKeyboard
            activePitch={note.pitch}
            onKeyPress={handlePianoKey}
            keyW={pianoKeyW}
            keyH={pianoKeyH}
            validNotes={validNotes}
            fillWidth
          />
        </div>
      )}
    </div>
  );
}
