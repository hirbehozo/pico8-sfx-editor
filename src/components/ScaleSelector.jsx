import { KEY_NAMES, MODES, MODE_LABELS } from '../constants.js';

const CHROMATIC_NAMES = KEY_NAMES; // C C# D D# E F F# G G# A A# B

const sel = {
  fontFamily: 'monospace',
  fontSize: 10,
  backgroundColor: '#111',
  color: '#C2C3C7',
  border: '1px solid #3a3a3a',
  borderRadius: 2,
  padding: '3px 6px',
  cursor: 'pointer',
  outline: 'none',
};

export default function ScaleSelector({ scaleKey, scaleMode, onKeyChange, onModeChange, validNotes, isTouch = false }) {
  const isChromatic = scaleMode === 'chromatic';
  const selTouch = isTouch ? { ...sel, minHeight: 36, fontSize: 13, padding: '6px 8px' } : sel;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '5px 12px',
      borderBottom: '1px solid #1c1c1c',
      backgroundColor: '#0d0d0d',
      flexWrap: 'wrap',
    }}>

      {/* Key selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 8, color: '#83769C', fontFamily: 'monospace', letterSpacing: 1 }}>
          KEY
        </span>
        <select
          value={scaleKey}
          onChange={e => onKeyChange(parseInt(e.target.value, 10))}
          style={selTouch}
        >
          {KEY_NAMES.map((name, i) => (
            <option key={i} value={i}>{name}</option>
          ))}
        </select>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 8, color: '#83769C', fontFamily: 'monospace', letterSpacing: 1 }}>
          MODE
        </span>
        <select
          value={scaleMode}
          onChange={e => onModeChange(e.target.value)}
          style={selTouch}
        >
          {Object.entries(MODE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>

      {/* Scale note dots — 12 chromatic positions, highlighted if in scale */}
      <div style={{
        display: 'flex',
        gap: 3,
        alignItems: 'center',
        marginLeft: 4,
        flexWrap: 'nowrap',
      }}>
        {CHROMATIC_NAMES.map((name, i) => {
          const inScale = isChromatic || validNotes?.has(i);
          const isBlack = [1, 3, 6, 8, 10].includes(i);
          return (
            <div
              key={i}
              title={name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {/* Dot */}
              <div style={{
                width:  inScale ? 7 : 5,
                height: inScale ? 7 : 5,
                borderRadius: '50%',
                backgroundColor: inScale
                  ? isBlack ? '#83769C' : '#FFEC27'
                  : '#2a2a2a',
                transition: 'all 120ms ease',
              }} />
              {/* Note name — only for in-scale notes */}
              {inScale && (
                <span style={{
                  fontSize: 6,
                  fontFamily: 'monospace',
                  color: isBlack ? '#83769C' : '#5F574F',
                  lineHeight: 1,
                  userSelect: 'none',
                }}>
                  {name}
                </span>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
