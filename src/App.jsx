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
import HelpModal       from './components/HelpModal.jsx';

// ── Scale preference persistence (30-day TTL) ────────────────────────────────
const SCALE_PREFS_KEY = 'p8-scale-prefs';
function loadScalePrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(SCALE_PREFS_KEY) ?? 'null');
    if (!p || Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}
function saveScalePrefs(key, mode) {
  try {
    localStorage.setItem(SCALE_PREFS_KEY, JSON.stringify({
      key, mode, exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    }));
  } catch {}
}

// ── First-interaction tracking ────────────────────────────────────────────────
const INTERACTED_KEY = 'p8-interacted';
function loadInteracted() {
  try { return localStorage.getItem(INTERACTED_KEY) === '1'; } catch { return false; }
}

// ── Rotating tips shown after first interaction ───────────────────────────────
const TIPS = [
  'Drag across the grid to paint or erase multiple notes at once.',
  'Shift + ↑↓ raises or lowers the selected note\'s volume.',
  'Set a Key and Mode — the piano and keyboard snap to your scale.',
  'Save a Take before experimenting so you can always go back.',
  'COPY SFX puts a ready-to-paste pico-8 sfx() line on your clipboard.',
  '[ and ] shift the keyboard octave down or up.',
  'Slide effect glides pitch smoothly from the previous note.',
  'Set Loop Start and Loop End to loop a section of your SFX.',
  'Press 1–8 to instantly set the waveform on the selected note.',
  'Tab cycles through waveforms; Del silences the current note.',
  'The PATTERNS tab arranges SFX slots into background music.',
  'MIDI keyboard connected? It inputs notes directly into the grid.',
];

// ── Keyboard-key badge ────────────────────────────────────────────────────────
function Kbd({ children }) {
  return (
    <span style={{
      display: 'inline-block', fontFamily: 'monospace', fontSize: 10,
      color: '#C2C3C7', background: '#1c1c1c',
      border: '1px solid #333', borderBottom: '2px solid #111',
      borderRadius: 3, padding: '1px 6px', lineHeight: '16px',
      userSelect: 'none',
    }}>
      {children}
    </span>
  );
}

// ── Welcome / Tips panel ──────────────────────────────────────────────────────
// Before first interaction: plain-English guide + keyboard shortcuts.
// After first interaction: rotating tips only.
function WelcomeTips({ hasInteracted, octave }) {
  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    if (!hasInteracted) return;
    const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 7000);
    return () => clearInterval(id);
  }, [hasInteracted]);

  const base = {
    borderTop: '1px solid #1c1c1c', backgroundColor: '#0a0a0a',
    fontFamily: 'monospace', userSelect: 'none', flexShrink: 0, marginTop: 'auto',
  };

  if (!hasInteracted) {
    return (
      <div style={{ ...base, padding: '14px 16px 12px' }}>
        <div style={{ fontSize: 8, color: '#83769C', letterSpacing: 2, marginBottom: 12 }}>
          HOW TO USE
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'max-content 1fr',
          gap: '5px 14px', marginBottom: 14, fontSize: 10,
        }}>
          <span style={{ color: '#FFEC27' }}>Paint notes</span>
          <span style={{ color: '#5F574F' }}>click or drag across the grid to turn notes on</span>
          <span style={{ color: '#FFEC27' }}>Edit a note</span>
          <span style={{ color: '#5F574F' }}>click any colored bar — EDIT panel opens on the right</span>
          <span style={{ color: '#FFEC27' }}>Play</span>
          <span style={{ color: '#5F574F' }}>press the green PLAY button (or Space) to hear it</span>
          <span style={{ color: '#FFEC27' }}>Export</span>
          <span style={{ color: '#5F574F' }}>COPY SFX puts a pico-8 sfx() line on your clipboard</span>
        </div>
        <div style={{
          borderTop: '1px solid #181818', paddingTop: 10,
          display: 'flex', flexWrap: 'wrap', gap: '5px 8px',
          alignItems: 'center', fontSize: 10, color: '#4a4a4a', lineHeight: 2,
        }}>
          <Kbd>Space</Kbd> play
          {' · '}<Kbd>← →</Kbd> navigate
          {' · '}<Kbd>↑ ↓</Kbd> pitch
          {' · '}<Kbd>⇧↑↓</Kbd> volume
          {' · '}<Kbd>Del</Kbd> silence
          {' · '}<Kbd>Tab</Kbd> waveform
          {' · '}<Kbd>1–8</Kbd> set wave
          {' · '}<Kbd>[ ]</Kbd> oct {octave}
          {' · '}<Kbd>Q–P</Kbd> piano
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...base, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 8, color: '#29ADFF', letterSpacing: 2, flexShrink: 0 }}>TIP</span>
      <span style={{ fontSize: 10, color: '#5F574F', lineHeight: 1.5 }}>{TIPS[tipIdx]}</span>
    </div>
  );
}

const TABS = [
  { id: 'edit',     label: 'EDIT',     title: 'Edit the selected note — pitch, waveform, volume and effect' },
  { id: 'takes',    label: 'TAKES',    title: 'Saved snapshots of your SFX for comparison and recovery' },
  { id: 'export',   label: 'EXPORT',   title: 'Copy SFX data as pico-8 code ready to paste into your cart' },
  { id: 'patterns', label: 'PATTERNS', title: 'Arrange SFX slots into music patterns using __music__()' },
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
      {TABS.map(({ id, label, title }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          title={title}
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
                      nextPitch, isTouch = false, onSelectSfx }) {
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
          notePos={patterns.notePos}
          mutedChannels={patterns.mutedChannels}
          soloChannel={patterns.soloChannel}
          toggleMute={patterns.toggleMute}
          toggleSolo={patterns.toggleSolo}
          updateChannel={patterns.updateChannel}
          updateFlags={patterns.updateFlags}
          playPatterns={patterns.playPatterns}
          stopPatternPlay={patterns.stopPatternPlay}
          exportMusic={patterns.exportMusic}
          onSelectSfx={onSelectSfx}
        />
      )}
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('edit');
  const [showHelp, setShowHelp] = useState(false);
  const vp = useViewport();

  // ── Interaction tracking ─────────────────────────────────────────────────────
  const [hasInteracted, setHasInteracted] = useState(loadInteracted);
  const markInteracted = useCallback(() => {
    setHasInteracted(was => {
      if (was) return was;
      try { localStorage.setItem(INTERACTED_KEY, '1'); } catch {}
      return true;
    });
  }, []);

  // ── Scale / mode ─────────────────────────────────────────────────────────────
  // Default is minor. User's last choice is remembered for 30 days.
  const [scaleKey,  setScaleKey]  = useState(() => loadScalePrefs()?.key  ?? 0);
  const [scaleMode, setScaleMode] = useState(() => loadScalePrefs()?.mode ?? 'minor');
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

  // ── Mark interaction on first keydown or pointerdown ─────────────────────────
  useEffect(() => {
    const fn = () => markInteracted();
    window.addEventListener('keydown',    fn, { once: true });
    window.addEventListener('pointerdown', fn, { once: true });
    return () => {
      window.removeEventListener('keydown',    fn);
      window.removeEventListener('pointerdown', fn);
    };
  }, [markInteracted]);

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
    markInteracted();
    const idx     = selRef.current;
    const n       = noteRef.current;
    const snapped = snapRef.current(pitch);    // snap to active scale
    updateNote(idx, { pitch: snapped, on: true });
    audioEngine.synthNote(snapped, n.waveform, n.volume || 5, 0, 0.3);
    setSelectedNote(prev => Math.min(prev + 1, 31));
  }, [updateNote, setSelectedNote, markInteracted]);

  const handlePlay = useCallback(() => { markInteracted(); playSfx(); }, [playSfx, markInteracted]);

  // ── Shared toolbar ──────────────────────────────────────────────────────────
  const toolbar = (
    <Toolbar
      curSfx={curSfx}  sfx={sfx}  isPlaying={isPlaying}  isTouch={vp.isTouch}
      onHelp={() => setShowHelp(true)}
      midiStatus={midiStatus}
      onPrev={() => setCurSfx(Math.max(0, curSfx - 1))}
      onNext={() => setCurSfx(Math.min(63, curSfx + 1))}
      onPlay={handlePlay}  onStop={stopPlay}
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
        onKeyChange={k  => { setScaleKey(k);  saveScalePrefs(k, scaleMode); }}
        onModeChange={m => { setScaleMode(m); saveScalePrefs(scaleKey, m); }}
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
          onNoteClick={i => { setSelectedNote(i); setTab('edit'); }}
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
      onSelectSfx={idx => { setCurSfx(idx); setTab('edit'); }}
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
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {toolbar}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
                      overflow: 'hidden' }}>
          {editingColumn}

          {!vp.isTouch && <WelcomeTips hasInteracted={hasInteracted} octave={octave} />}
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
