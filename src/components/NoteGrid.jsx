import { useRef, useEffect } from 'react';
import { WAVE_COLS } from '../constants.js';
import { noteName } from '../utils.js';

const COL_W     = 26;
const HEX_H     = 18;
const BAR_PAD   = 2;
const BAR_W     = COL_W - BAR_PAD * 2;
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
  rowHeight = 144, noteLabel = null, length = 32,
}) {
  const BAR_AREA = rowHeight - HEX_H;

  // drag state: paint mode only (pitch drag removed)
  const drag   = useRef({ active: false, paintOn: true });
  const rowRef = useRef(null);

  // cbRef keeps callbacks fresh inside stable native listeners
  const cbRef = useRef({ notes, onNoteClick, onDragPaint });
  useEffect(() => { cbRef.current = { notes, onNoteClick, onDragPaint }; });

  // ── Mouse: stop drag on mouseup ─────────────────────────────────────────────
  useEffect(() => {
    const stop = () => { drag.current.active = false; };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  // ── Mouse handlers (per column) ─────────────────────────────────────────────
  function handleMouseDown(e, i) {
    e.preventDefault();
    cbRef.current.onNoteClick(i);
    if (!notes[i].on) {
      // Note is off → turn it on and start paint-on drag
      drag.current = { active: true, paintOn: true };
      cbRef.current.onDragPaint(i, true);
    } else {
      // Note is on → just select it; dragging into other columns will paint them on
      drag.current = { active: true, paintOn: true };
    }
  }

  function handleMouseEnter(i) {
    if (!drag.current.active) return;
    cbRef.current.onDragPaint(i, drag.current.paintOn);
  }

  // ── Double-click → rest ─────────────────────────────────────────────────────
  function handleDblClick(e, i) {
    e.preventDefault();
    cbRef.current.onDragPaint(i, false);
  }

  // ── Touch drag (passive:false so preventDefault works) ──────────────────────
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const onStart = (e) => {
      const colEl = e.target.closest('[data-idx]');
      if (!colEl) return;
      e.preventDefault();
      const i = parseInt(colEl.dataset.idx, 10);
      const { notes: ns, onNoteClick: nc, onDragPaint: dp } = cbRef.current;
      nc(i);
      drag.current = { active: true, paintOn: true };
      if (!ns[i].on) dp(i, true);
    };

    const onMove = (e) => {
      if (!drag.current.active) return;
      e.preventDefault();
      const { clientX, clientY } = e.touches[0];
      const target = document.elementFromPoint(clientX, clientY);
      const colEl  = target?.closest('[data-idx]');
      if (colEl) {
        cbRef.current.onDragPaint(parseInt(colEl.dataset.idx, 10), drag.current.paintOn);
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
  }, [rowHeight]);

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div
        ref={rowRef}
        style={{
          display: 'flex', height: rowHeight, width: COL_W * 32,
          touchAction: 'none',
        }}
      >
        {notes.map((note, i) => {
          const isSelected = i === selectedNote;
          const isPlaying  = i === playPos;
          const isInactive = i >= length;
          const bh         = barHeight(note.pitch, BAR_AREA);
          const colBg      = isPlaying ? 'rgba(0,228,54,0.12)' : '#111';
          const shadow     = isSelected ? 'inset 2px 0 0 #29ADFF' : undefined;
          const barColor   = note.on ? WAVE_COLS[note.waveform] : '#252525';
          const nameBtm    = Math.min(HEX_H + bh + 1, rowHeight - 10);
          const barOpacity = note.on ? 0.2 + (note.volume / 7) * 0.8 : undefined;

          return (
            <div
              key={i}
              data-idx={i}
              onMouseDown={e => handleMouseDown(e, i)}
              onMouseEnter={() => handleMouseEnter(i)}
              onDoubleClick={e => handleDblClick(e, i)}
              style={{
                position: 'relative',
                width: COL_W, height: rowHeight,
                flexShrink: 0, boxSizing: 'border-box',
                backgroundColor: colBg,
                borderRight: '1px solid #1c1c1c',
                boxShadow: shadow,
                overflow: 'hidden', cursor: 'pointer',
                opacity: isInactive ? 0.25 : 1,
              }}
            >
              <div style={{
                position: 'absolute', bottom: HEX_H,
                left: BAR_PAD, width: BAR_W, height: bh,
                backgroundColor: barColor, borderRadius: 1,
                pointerEvents: 'none',
                opacity: barOpacity,
              }} />

              {note.on && (
                <span style={{
                  ...nameStyle, bottom: nameBtm,
                  opacity: 0.3 + (note.volume / 7) * 0.7,
                }}>
                  {noteLabel ? noteLabel(note.pitch) : noteName(note.pitch)}
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
