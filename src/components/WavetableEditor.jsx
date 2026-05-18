import { useRef, useEffect } from 'react';

const COL_W    = 13;   // half of NoteGrid's 26 → same total width at 64 cols
const ROW_H    = 72;
const LABEL_H  = 14;
const BAR_AREA = ROW_H - LABEL_H; // 58px — vertical space for bars
const CENTER_Y = BAR_AREA / 2;    // 29px from top of bar area
const MAX_AMP  = 7;

function ampToBarH(amp) {
  return Math.round((Math.abs(amp) / MAX_AMP) * (CENTER_Y - 2));
}

function yToAmp(relY) {
  const clamped    = Math.max(0, Math.min(BAR_AREA, relY));
  const normalized = (CENTER_Y - clamped) / CENTER_Y; // +1 top, −1 bottom
  return Math.round(Math.max(-MAX_AMP, Math.min(MAX_AMP, normalized * MAX_AMP)));
}

export default function WavetableEditor({ samples = new Array(64).fill(0), onUpdate }) {
  const drag   = useRef({ active: false, col: -1 });
  const colEls = useRef({});
  const cbRef  = useRef({ samples, onUpdate });
  useEffect(() => { cbRef.current = { samples, onUpdate }; });

  useEffect(() => {
    const stop = () => { drag.current.active = false; };
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current;
      if (!d.active) return;
      const el = colEls.current[d.col];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      cbRef.current.onUpdate(d.col, yToAmp(e.clientY - rect.top));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  function handleMouseDown(e, i) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { active: true, col: i };
    cbRef.current.onUpdate(i, yToAmp(e.clientY - rect.top));
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div style={{ display: 'flex', height: ROW_H, width: COL_W * 64, touchAction: 'none' }}>
        {samples.map((amp, i) => {
          const barH   = ampToBarH(amp);
          const barTop = amp >= 0 ? CENTER_Y - barH : CENTER_Y;
          const color  = amp > 0 ? '#00E436' : amp < 0 ? '#FF77A8' : null;

          return (
            <div
              key={i}
              ref={el => { if (el) colEls.current[i] = el; }}
              onMouseDown={e => handleMouseDown(e, i)}
              style={{
                position: 'relative',
                width: COL_W, height: ROW_H,
                flexShrink: 0, boxSizing: 'border-box',
                backgroundColor: '#111',
                borderRight: '1px solid #1c1c1c',
                cursor: 'ns-resize',
              }}
            >
              {/* center line */}
              <div style={{
                position: 'absolute', top: CENTER_Y,
                left: 0, width: COL_W, height: 1,
                backgroundColor: '#2a2a2a', pointerEvents: 'none',
              }} />

              {/* amplitude bar */}
              {amp !== 0 && (
                <div style={{
                  position: 'absolute',
                  top: barTop, left: 1,
                  width: COL_W - 2, height: Math.max(1, barH),
                  backgroundColor: color,
                  borderRadius: 1, pointerEvents: 'none',
                }} />
              )}

              {/* sample index label */}
              <span style={{
                position: 'absolute', bottom: 0, left: 0,
                width: COL_W, height: LABEL_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 6, fontFamily: 'monospace',
                color: '#2a2a2a', pointerEvents: 'none',
              }}>
                {i.toString(16).padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
