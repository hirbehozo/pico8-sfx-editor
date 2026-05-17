import { useRef, useEffect } from 'react';
import { WAVE_COLS } from '../constants.js';
import { noteName } from '../utils.js';

const COL_W    = 26;
const HEX_H    = 18;
const BAR_PAD  = 2;
const BAR_W    = COL_W - BAR_PAD * 2;
const MIN_BAR_H = 2;

function barHeight(pitch, barArea) {
  return Math.max(MIN_BAR_H, Math.round((pitch / 63) * barArea));
}

const hexStyle = {
  position: 'absolute', bottom: 0, left: 0,
  width: COL_W, height: HEX_H,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 8, fontFamily: 'monospace',
  pointerEvents: 'none',
};

const nameStyle = {
  position: 'absolute', left: 0, width: COL_W,
  height: 9, textAlign: 'center',
  fontSize: 7, fontFamily: 'monospace',
  color: '#FFF1E8', lineHeight: '9px',
  pointerEvents: 'none', overflow: 'hidden',
};

export default function NoteGrid({
  notes, selectedNote, playPos, onNoteClick, onDragPaint,
  rowHeight = 144,
}) {
  const BAR_AREA = rowHeight - HEX_H;
  const drag    = useRef({ active: false, paintOn: false });
  const rowRef  = useRef(null);
  // cbRef keeps callbacks fresh without re-registering native listeners
  const cbRef   = useRef({ notes, onNoteClick, onDragPaint });
  useEffect(() => { cbRef.current = { notes, onNoteClick, onDragPaint }; });

  // ── Mouse drag ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const stop = () => { drag.current.active = false; };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  function handleMouseDown(e, i) {
    e.preventDefault();
    const paintOn = !notes[i].on;
    drag.current = { active: true, paintOn };
    onNoteClick(i);
    onDragPaint(i, paintOn);
  }

  function handleMouseEnter(i) {
    if (drag.current.active) onDragPaint(i, drag.current.paintOn);
  }

  // ── Touch drag (passive:false so preventDefault works) ────────────────────
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const onStart = (e) => {
      const col = e.target.closest('[data-idx]');
      if (!col) return;
      e.preventDefault(); // stop scroll + long-press context menu
      const i = parseInt(col.dataset.idx, 10);
      const { notes, onNoteClick, onDragPaint } = cbRef.current;
      const paintOn = !notes[i].on;
      drag.current = { active: true, paintOn };
      onNoteClick(i);
      onDragPaint(i, paintOn);
    };

    const onMove = (e) => {
      if (!drag.current.active) return;
      e.preventDefault();
      const { clientX, clientY } = e.touches[0];
      const target = document.elementFromPoint(clientX, clientY);
      const col = target?.closest('[data-idx]');
      if (col) {
        cbRef.current.onDragPaint(
          parseInt(col.dataset.idx, 10),
          drag.current.paintOn,
        );
      }
    };

    const onEnd = () => { drag.current.active = false; };

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd);

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, []); // empty — reads fresh state via cbRef

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div
        ref={rowRef}
        style={{
          display: 'flex',
          height: rowHeight,
          width: COL_W * 32,
          touchAction: 'none', // hand all touch gestures to our listeners
        }}
      >
        {notes.map((note, i) => {
          const isSelected = i === selectedNote;
          const isPlaying  = i === playPos;
          const bh         = barHeight(note.pitch, BAR_AREA);
          const colBg      = isPlaying ? 'rgba(0,228,54,0.12)' : '#111';
          const shadow     = isSelected ? 'inset 2px 0 0 #29ADFF' : undefined;
          const barColor   = note.on ? WAVE_COLS[note.waveform] : '#252525';
          const nameBtm    = Math.min(HEX_H + bh + 1, COL_H - 10);

          return (
            <div
              key={i}
              data-idx={i}
              onMouseDown={e => handleMouseDown(e, i)}
              onMouseEnter={() => handleMouseEnter(i)}
              style={{
                position: 'relative',
                width: COL_W, height: rowHeight,
                flexShrink: 0, boxSizing: 'border-box',
                backgroundColor: colBg,
                borderRight: '1px solid #1c1c1c',
                boxShadow: shadow,
                overflow: 'hidden', cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute', bottom: HEX_H,
                left: BAR_PAD, width: BAR_W, height: bh,
                backgroundColor: barColor, borderRadius: 1,
                pointerEvents: 'none',
              }} />

              {note.on && (
                <span style={{ ...nameStyle, bottom: nameBtm }}>
                  {noteName(note.pitch)}
                </span>
              )}

              <span style={{ ...hexStyle, color: isSelected ? '#29ADFF' : '#5F574F' }}>
                {i.toString(16).padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
