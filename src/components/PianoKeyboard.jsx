import { useMemo } from 'react';
import { P8 } from '../constants.js';

const WHITE_W = 20;  // px
const WHITE_H = 58;  // px
const BLACK_W = 13;  // px
const BLACK_H = 36;  // px

// Which chromatic notes (0-11) are white keys
const IS_WHITE = new Set([0, 2, 4, 5, 7, 9, 11]);

// White-key index within one octave (position among the 7 white keys)
const WHITE_IDX = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };

// Left-edge offset of each black key within its octave, in white-key-width units
const BLACK_OFF = { 1: 0.65, 3: 1.65, 6: 3.65, 8: 4.65, 10: 5.65 };

// Pitches 0-63 span 5 full octaves (C1-B5) + C6, C#6, D6, D#6.
// Rightmost key: D#6 (pitch 63, octave 5, note 3, offset 1.65).
//   left  = (5×7 + 1.65) × 20 = 733 px
//   right = 733 + 13          = 746 px
const CONTAINER_W = Math.ceil((5 * 7 + BLACK_OFF[3]) * WHITE_W + BLACK_W);

// ── Stable style objects ──────────────────────────────────────────────────────

const scrollWrap = {
  overflowX: 'auto',
  overflowY: 'hidden',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const labelStyle = {
  position: 'absolute',
  bottom: 3,
  left: 0,
  width: WHITE_W,
  textAlign: 'center',
  fontSize: 7,
  fontFamily: 'monospace',
  pointerEvents: 'none',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PianoKeyboard({ activePitch, onKeyPress }) {
  // Separate white and black keys so whites render first (behind blacks)
  const { whites, blacks } = useMemo(() => {
    const whites = [];
    const blacks = [];

    for (let pitch = 0; pitch < 64; pitch++) {
      const octave = Math.floor(pitch / 12);
      const note   = pitch % 12;
      const octaveNum = octave + 1;          // C1 starts at pitch 0
      const active = pitch === activePitch;

      if (IS_WHITE.has(note)) {
        whites.push({
          pitch,
          left:   (octave * 7 + WHITE_IDX[note]) * WHITE_W,
          active,
          label:  note === 0 ? `C${octaveNum}` : null,
        });
      } else {
        blacks.push({
          pitch,
          left:   (octave * 7 + BLACK_OFF[note]) * WHITE_W,
          active,
        });
      }
    }

    return { whites, blacks };
  }, [activePitch]);

  return (
    <div style={scrollWrap}>
      <div style={{ position: 'relative', width: CONTAINER_W, height: WHITE_H }}>

        {/* ── White keys ───────────────────────────────────────────────── */}
        {whites.map(({ pitch, left, active, label }) => (
          <div
            key={pitch}
            onClick={() => onKeyPress(pitch)}
            style={{
              position: 'absolute',
              left,
              top: 0,
              width:  WHITE_W,
              height: WHITE_H,
              boxSizing: 'border-box',
              border: '1px solid #3a3a3a',
              backgroundColor: active ? P8[10] : P8[7],   // yellow : white
              cursor: 'pointer',
            }}
          >
            {label && (
              <span style={{ ...labelStyle, color: active ? P8[4] : P8[5] }}>
                {label}
              </span>
            )}
          </div>
        ))}

        {/* ── Black keys (z-index 1 keeps them above white keys) ───────── */}
        {blacks.map(({ pitch, left, active }) => (
          <div
            key={pitch}
            onClick={() => onKeyPress(pitch)}
            style={{
              position: 'absolute',
              left,
              top: 0,
              width:  BLACK_W,
              height: BLACK_H,
              boxSizing: 'border-box',
              border: '1px solid #000',
              borderRadius: '0 0 3px 3px',
              backgroundColor: active ? P8[9] : P8[1],    // orange : dark blue
              zIndex: 1,
              cursor: 'pointer',
            }}
          />
        ))}

      </div>
    </div>
  );
}
