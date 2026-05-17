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

// Map a Y position within a column to a pitch value.
// Returns null when Y is in the hex-label zone (below bar area) → rest.
function yToPitch(relY, barArea) {
  if (relY >= barArea) return null;
  return Math.min(63, Math.max(0, Math.round((1 - relY / barArea) * 63)));
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
  notes, selectedNote, playPos, onNoteClick, onDragPaint, onDragPitch,
  rowHeight = 144,
}) {
  const BAR_AREA = rowHeight - HEX_H;

  // drag.mode: 'paint' = toggling on/off across columns
  //            'pitch' = dragging pitch within one column
  const drag   = useRef({ active: false, mode: 'paint', paintOn: false, col: -1, barArea: 0 });
  const colEls = useRef({});  // col index → DOM element, for pitch drag Y calc
  const rowRef = useRef(null);

  // cbRef keeps callbacks fresh inside stable native listeners
  const cbRef = useRef({ notes, onNoteClick, onDragPaint, onDragPitch });
  useEffect(() => { cbRef.current = { notes, onNoteClick, onDragPaint, onDragPitch }; });

  // ── Mouse: stop drag on mouseup ─────────────────────────────────────────────
  useEffect(() => {
    const stop = () => { drag.current.active = false; };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  // ── Mouse: pitch drag follows cursor while button is held ───────────────────
  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current;
      if (!d.active || d.mode !== 'pitch') return;
      const el = colEls.current[d.col];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const pitch = yToPitch(relY, d.barArea);
      const { onDragPaint: dp, onDragPitch: dph } = cbRef.current;
      if (pitch === null) dp(d.col, false);      // dragged to rest zone
      else if (dph) dph(d.col, pitch);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // ── Mouse handlers (per column) ─────────────────────────────────────────────
  function handleMouseDown(e, i) {
    e.preventDefault();
    cbRef.current.onNoteClick(i);
    if (notes[i].on) {
      // Note is on → pitch-drag mode
      const rect = e.currentTarget.getBoundingClientRect();
      drag.current = { active: true, mode: 'pitch', col: i, barArea: BAR_AREA };
      const pitch = yToPitch(e.clientY - rect.top, BAR_AREA);
      if (pitch === null) cbRef.current.onDragPaint(i, false);
      else if (cbRef.current.onDragPitch) cbRef.current.onDragPitch(i, pitch);
    } else {
      // Note is off → paint-on mode
      drag.current = { active: true, mode: 'paint', paintOn: true, col: i, barArea: BAR_AREA };
      cbRef.current.onDragPaint(i, true);
    }
  }

  function handleMouseEnter(i) {
    const d = drag.current;
    if (!d.active || d.mode !== 'paint') return;
    cbRef.current.onDragPaint(i, d.paintOn);
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
      const { notes: ns, onNoteClick: nc, onDragPaint: dp, onDragPitch: dph } = cbRef.current;
      nc(i);

      if (ns[i].on) {
        // Pitch drag
        const rect = colEl.getBoundingClientRect();
        const relY = e.touches[0].clientY - rect.top;
        drag.current = { active: true, mode: 'pitch', col: i, barArea: rowHeight - HEX_H };
        const pitch = yToPitch(relY, drag.current.barArea);
        if (pitch === null) dp(i, false);
        else if (dph) dph(i, pitch);
      } else {
        // Paint on
        drag.current = { active: true, mode: 'paint', paintOn: true, col: i, barArea: rowHeight - HEX_H };
        dp(i, true);
      }
    };

    const onMove = (e) => {
      const d = drag.current;
      if (!d.active) return;
      e.preventDefault();

      if (d.mode === 'pitch') {
        const { clientX, clientY } = e.touches[0];
        const el = colEls.current[d.col];
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const relY = clientY - rect.top;
        const pitch = yToPitch(relY, d.barArea);
        const { onDragPaint: dp, onDragPitch: dph } = cbRef.current;
        if (pitch === null) dp(d.col, false);
        else if (dph) dph(d.col, pitch);
        return;
      }

      // Paint mode: follow finger across columns
      const { clientX, clientY } = e.touches[0];
      const target = document.elementFromPoint(clientX, clientY);
      const colEl  = target?.closest('[data-idx]');
      if (colEl) {
        cbRef.current.onDragPaint(parseInt(colEl.dataset.idx, 10), d.paintOn);
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
          const bh         = barHeight(note.pitch, BAR_AREA);
          const colBg      = isPlaying ? 'rgba(0,228,54,0.12)' : '#111';
          const shadow     = isSelected ? 'inset 2px 0 0 #29ADFF' : undefined;
          const barColor   = note.on ? WAVE_COLS[note.waveform] : '#252525';
          const nameBtm    = Math.min(HEX_H + bh + 1, rowHeight - 10);
          // Volume maps to bar opacity: quiet notes fade, loud notes are fully lit
          const barOpacity = note.on ? 0.2 + (note.volume / 7) * 0.8 : undefined;

          return (
            <div
              key={i}
              data-idx={i}
              ref={el => { if (el) colEls.current[i] = el; }}
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
