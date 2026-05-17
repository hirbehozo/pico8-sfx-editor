import { useMemo } from 'react';
import { P8 } from '../constants.js';

const IS_WHITE  = new Set([0, 2, 4, 5, 7, 9, 11]);
const WHITE_IDX = { 0:0, 2:1, 4:2, 5:3, 7:4, 9:5, 11:6 };
const BLACK_OFF = { 1:0.65, 3:1.65, 6:3.65, 8:4.65, 10:5.65 };

// keyW / keyH let the caller scale keys for touch (default = desktop size)
// validNotes: Set<0-11> of in-scale chromatic indices, or null for chromatic (no dim)
export default function PianoKeyboard({ activePitch, onKeyPress, keyW = 22, keyH = 64, validNotes = null }) {
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
  }, [activePitch, keyW]); // re-derive if key size changes

  // Touch handler: fire immediately, prevent ghost-click delay
  const onTouch = (e, pitch) => {
    e.preventDefault();
    onKeyPress(pitch);
  };

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div style={{ position: 'relative', width: containerW, height: keyH }}>

        {/* White keys ─────────────────────────────────────────────────────── */}
        {whites.map(({ pitch, left, active, label }) => {
          const inScale = !validNotes || validNotes.has(pitch % 12);
          return (
          <div
            key={pitch}
            onClick={() => onKeyPress(pitch)}
            onTouchStart={e => onTouch(e, pitch)}
            style={{
              position: 'absolute', left, top: 0,
              width: keyW, height: keyH,
              boxSizing: 'border-box',
              border: '1px solid #3a3a3a',
              backgroundColor: active ? P8[10] : inScale ? P8[7] : '#9a9b9f',
              cursor: 'pointer',
              opacity: inScale ? 1 : 0.55,
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
          const inScale = !validNotes || validNotes.has(pitch % 12);
          return (
          <div
            key={pitch}
            onClick={() => onKeyPress(pitch)}
            onTouchStart={e => onTouch(e, pitch)}
            style={{
              position: 'absolute', left, top: 0,
              width: blackW, height: blackH,
              boxSizing: 'border-box',
              border: '1px solid #000',
              borderRadius: '0 0 3px 3px',
              backgroundColor: active ? P8[9] : inScale ? P8[1] : '#2a2a2a',
              zIndex: 1, cursor: 'pointer',
              opacity: inScale ? 1 : 0.45,
            }}
          />
          );
        })}

      </div>
    </div>
  );
}
