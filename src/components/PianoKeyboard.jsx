import { useMemo, useRef, useEffect } from 'react';
import { P8 } from '../constants.js';

const IS_WHITE  = new Set([0, 2, 4, 5, 7, 9, 11]);
const WHITE_IDX = { 0:0, 2:1, 4:2, 5:3, 7:4, 9:5, 11:6 };
const BLACK_OFF = { 1:0.65, 3:1.65, 6:3.65, 8:4.65, 10:5.65 };

// C4 = pitch 36: notes below this are "bass", C4 and above are "lead".
// Divider x-position: octave 3 × 7 white keys = 21 white key widths from left.
const LEAD_FROM   = 36;
const DIVIDER_COL = 21; // white-key columns from left edge to C4

// keyW / keyH let the caller scale keys for touch (default = desktop size)
// fillWidth: clips overflow instead of scrolling — use when piano spans full viewport width
// validNotes: Set<0-11> of in-scale chromatic indices, or null for chromatic (no dim)
// rangeHint: 'bass' dims notes >= C4 (out of bass register)
//            'lead' dims notes <  C4 (out of lead/melody register)
//            undefined = no range hint
export default function PianoKeyboard({ activePitch, onKeyPress, keyW = 22, keyH = 64, validNotes = null, fillWidth = false, rangeHint }) {
  const blackW = Math.round(keyW * 0.6);
  const blackH = Math.round(keyH * 0.62);

  // Container must include D#6 black key at the far right
  const containerW = Math.ceil((5 * 7 + BLACK_OFF[3]) * keyW + blackW);

  const { whites, blacks } = useMemo(() => {
    const whites = [], blacks = [];
    for (let pitch = 0; pitch < 64; pitch++) {
      const octave    = Math.floor(pitch / 12);
      const note      = pitch % 12;
      const octaveNum = octave + 1;
      const active    = pitch === activePitch;

      if (IS_WHITE.has(note)) {
        whites.push({
          pitch, active,
          left:  (octave * 7 + WHITE_IDX[note]) * keyW,
          label: note === 0 ? `C${octaveNum}` : null,
        });
      } else {
        blacks.push({
          pitch, active,
          left: (octave * 7 + BLACK_OFF[note]) * keyW,
        });
      }
    }
    return { whites, blacks };
  }, [activePitch, keyW]);

  // Native touchstart listener with { passive: false } so preventDefault works.
  // React registers onTouchStart as passive in modern builds, which silently
  // ignores preventDefault and lets the browser fire a ghost click 300ms later.
  const wrapRef = useRef(null);
  const onKeyPressRef = useRef(onKeyPress);
  useEffect(() => { onKeyPressRef.current = onKeyPress; }, [onKeyPress]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onTouch = (e) => {
      e.preventDefault(); // blocks ghost click and long-press context menu
      const t = e.changedTouches[0];
      const target = document.elementFromPoint(t.clientX, t.clientY);
      const keyEl  = target?.closest('[data-pitch]');
      if (keyEl) onKeyPressRef.current(parseInt(keyEl.dataset.pitch, 10));
    };
    el.addEventListener('touchstart', onTouch, { passive: false });
    return () => el.removeEventListener('touchstart', onTouch);
  }, []); // register once; fresh callback via ref

  return (
    <div
      ref={wrapRef}
      style={{ overflowX: fillWidth ? 'hidden' : 'auto', overflowY: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <div style={{ position: 'relative', width: containerW, height: keyH }}>

        {/* White keys ─────────────────────────────────────────────────────── */}
        {whites.map(({ pitch, left, active, label }) => {
          const inScale      = !validNotes || validNotes.has(pitch % 12);
          const isBass       = pitch < LEAD_FROM;
          const outOfRange   = rangeHint === 'bass' ? !isBass : rangeHint === 'lead' ? isBass : false;
          const baseOpacity  = inScale ? 1 : 0.55;
          return (
          <div
            key={pitch}
            data-pitch={pitch}
            onClick={() => onKeyPress(pitch)}
            style={{
              position: 'absolute', left, top: 0,
              width: keyW, height: keyH,
              boxSizing: 'border-box',
              border: `1px solid ${isBass ? '#2a3a5a' : '#3a3a3a'}`,
              backgroundColor: active
                ? P8[10]
                : inScale
                  ? (isBass ? '#c8d8ff' : P8[7])
                  : (isBass ? '#7888b8' : '#9a9b9f'),
              cursor: 'pointer',
              opacity: outOfRange ? baseOpacity * 0.38 : baseOpacity,
            }}
          >
            {label && (
              <span style={{
                position: 'absolute', bottom: 3, left: 0,
                width: keyW, textAlign: 'center',
                fontSize: Math.max(6, keyW * 0.35),
                fontFamily: 'monospace',
                color: active ? P8[4] : P8[5],
                pointerEvents: 'none',
              }}>
                {label}
              </span>
            )}
          </div>
          );
        })}

        {/* Black keys ─────────────────────────────────────────────────────── */}
        {blacks.map(({ pitch, left, active }) => {
          const inScale     = !validNotes || validNotes.has(pitch % 12);
          const isBass      = pitch < LEAD_FROM;
          const outOfRange  = rangeHint === 'bass' ? !isBass : rangeHint === 'lead' ? isBass : false;
          const baseOpacity = inScale ? 1 : 0.45;
          return (
          <div
            key={pitch}
            data-pitch={pitch}
            onClick={() => onKeyPress(pitch)}
            style={{
              position: 'absolute', left, top: 0,
              width: blackW, height: blackH,
              boxSizing: 'border-box',
              border: '1px solid #000',
              borderRadius: '0 0 3px 3px',
              backgroundColor: active
                ? P8[9]
                : inScale
                  ? (isBass ? '#0d1a40' : P8[1])
                  : '#2a2a2a',
              zIndex: 1, cursor: 'pointer',
              opacity: outOfRange ? baseOpacity * 0.38 : baseOpacity,
            }}
          />
          );
        })}

        {/* Bass / Lead divider at C4 ──────────────────────────────────────── */}
        <div style={{
          position: 'absolute',
          left: DIVIDER_COL * keyW - 1,
          top: 0, width: 2, height: keyH,
          backgroundColor: '#FFEC27', opacity: 0.5,
          zIndex: 6, pointerEvents: 'none',
        }} />
        <span style={{
          position: 'absolute',
          left: Math.max(2, DIVIDER_COL * keyW - 34),
          bottom: 4,
          fontFamily: 'monospace', fontSize: 7, letterSpacing: 1,
          color: '#4060a0', zIndex: 6, pointerEvents: 'none', userSelect: 'none',
        }}>BASS</span>
        <span style={{
          position: 'absolute',
          left: DIVIDER_COL * keyW + 4,
          bottom: 4,
          fontFamily: 'monospace', fontSize: 7, letterSpacing: 1,
          color: '#7090c0', zIndex: 6, pointerEvents: 'none', userSelect: 'none',
        }}>LEAD</span>

      </div>
    </div>
  );
}
