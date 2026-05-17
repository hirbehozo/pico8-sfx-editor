import { useRef, useEffect } from 'react';
import { WAVE_COLS } from '../constants.js';
import { noteName } from '../utils.js';

const COL_W    = 22;   // px per column
const COL_H    = 144;  // px total column height
const HEX_H    = 16;   // px reserved at bottom for hex label
const BAR_PAD  = 2;    // px left/right inset for the pitch bar
const BAR_AREA = COL_H - HEX_H;           // 128 px of drawable bar space
const BAR_W    = COL_W - BAR_PAD * 2;     // 18 px bar width

// Minimum bar height so pitch-0 notes still show a visible sliver
const MIN_BAR_H = 2;

function barHeight(pitch) {
  return Math.max(MIN_BAR_H, Math.round((pitch / 63) * BAR_AREA));
}

// ── Styles that never change ──────────────────────────────────────────────────

const scrollWrap = {
  overflowX: 'auto',
  overflowY: 'hidden',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const row = {
  display: 'flex',
  height: COL_H,
  width: COL_W * 32,
};

const hexStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: COL_W,
  height: HEX_H,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 8,
  fontFamily: 'monospace',
  pointerEvents: 'none',
};

const nameStyle = {
  position: 'absolute',
  left: 0,
  width: COL_W,
  height: 9,
  textAlign: 'center',
  fontSize: 7,
  fontFamily: 'monospace',
  color: '#FFF1E8',
  lineHeight: '9px',
  pointerEvents: 'none',
  overflow: 'hidden',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NoteGrid({
  notes,
  selectedNote,
  playPos,
  onNoteClick,
  onDragPaint,
}) {
  // drag.paintOn is the on-value being written for the current drag gesture
  const drag = useRef({ active: false, paintOn: false });

  // Release drag on mouseup anywhere, including outside the grid
  useEffect(() => {
    const stop = () => { drag.current.active = false; };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  function handleMouseDown(e, i) {
    e.preventDefault(); // prevent text selection during drag
    const paintOn = !notes[i].on;
    drag.current = { active: true, paintOn };
    onNoteClick(i);
    onDragPaint(i, paintOn);
  }

  function handleMouseEnter(i) {
    if (drag.current.active) {
      onDragPaint(i, drag.current.paintOn);
    }
  }

  return (
    <div style={scrollWrap}>
      <div style={row}>
        {notes.map((note, i) => {
          const isSelected = i === selectedNote;
          const isPlaying  = i === playPos;
          const bh         = barHeight(note.pitch);

          // Column background; playing gets a green tint
          const colBg = isPlaying ? 'rgba(0,228,54,0.12)' : '#111';

          // Blue inset shadow instead of border-left so layout width stays 22 px
          const shadow = isSelected ? 'inset 2px 0 0 #29ADFF' : undefined;

          // Bar color: waveform color when on, dark placeholder when off
          const barColor = note.on ? WAVE_COLS[note.waveform] : '#252525';

          // Note name sits just above the bar; clamped so it never leaves the column
          const nameBtm = Math.min(HEX_H + bh + 1, COL_H - 10);

          return (
            <div
              key={i}
              onMouseDown={e => handleMouseDown(e, i)}
              onMouseEnter={() => handleMouseEnter(i)}
              style={{
                position: 'relative',
                width: COL_W,
                height: COL_H,
                flexShrink: 0,
                boxSizing: 'border-box',
                backgroundColor: colBg,
                borderRight: '1px solid #1c1c1c',
                boxShadow: shadow,
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              {/* Pitch bar ───────────────────────────────────────────────── */}
              <div
                style={{
                  position: 'absolute',
                  bottom: HEX_H,
                  left: BAR_PAD,
                  width: BAR_W,
                  height: bh,
                  backgroundColor: barColor,
                  borderRadius: 1,
                  pointerEvents: 'none',
                }}
              />

              {/* Note name (only when the note is active) ────────────────── */}
              {note.on && (
                <span style={{ ...nameStyle, bottom: nameBtm }}>
                  {noteName(note.pitch)}
                </span>
              )}

              {/* Hex column index ────────────────────────────────────────── */}
              <span
                style={{
                  ...hexStyle,
                  color: isSelected ? '#29ADFF' : '#5F574F',
                }}
              >
                {i.toString(16).padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
