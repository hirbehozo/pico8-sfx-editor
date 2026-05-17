// ── Shared micro-styles ───────────────────────────────────────────────────────

const arrowBtn = {
  fontFamily: 'monospace',
  fontSize: 10,
  lineHeight: 1,
  padding: '2px 5px',
  background: 'none',
  border: '1px solid #3a3a3a',
  borderRadius: 2,
  color: '#C2C3C7',
  cursor: 'pointer',
};

const knobLabel = {
  fontSize: 8,
  fontFamily: 'monospace',
  color: '#83769C',
  letterSpacing: 1,
};

const knobValue = {
  fontFamily: 'monospace',
  fontSize: 12,
  color: '#FFF1E8',
  textAlign: 'center',
  display: 'inline-block',
};

// Thin vertical rule between sections
const Sep = () => (
  <div style={{
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#2a2a2a',
    flexShrink: 0,
    margin: '0 6px',
  }} />
);

// ── MiniKnob ──────────────────────────────────────────────────────────────────

function MiniKnob({ label, value, min, max, onChange, valueWidth = 28, isTouch = false }) {
  const ab = isTouch
    ? { ...arrowBtn, padding: '7px 10px', fontSize: 13 }
    : arrowBtn;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={knobLabel}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <button
          style={{ ...ab, opacity: value <= min ? 0.25 : 1 }}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          ◀
        </button>
        <span style={{ ...knobValue, minWidth: valueWidth }}>{value}</span>
        <button
          style={{ ...ab, opacity: value >= max ? 0.25 : 1 }}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

// ── Action button presets ─────────────────────────────────────────────────────

const actionBtn = (overrides = {}) => ({
  fontFamily: 'monospace',
  fontSize: 9,
  padding: '5px 10px',
  borderRadius: 3,
  cursor: 'pointer',
  letterSpacing: 0.5,
  background: 'none',
  border: '1px solid #3a3a3a',
  color: '#C2C3C7',
  ...overrides,
});

// ── Toolbar ───────────────────────────────────────────────────────────────────

export default function Toolbar({
  curSfx,
  sfx,
  isPlaying,
  onPrev,
  onNext,
  onPlay,
  onStop,
  onSave,
  onCopy,
  onClear,
  onSpeedChange,
  onLoopStartChange,
  onLoopEndChange,
  isTouch = false,
}) {
  const activeCount = sfx.notes.filter(n => n.on).length;
  const msPerNote   = Math.round((sfx.speed / 60) * 1000);
  const totalSec    = (32 * sfx.speed / 60).toFixed(2);

  return (
    <div style={{
      backgroundColor: '#111',
      borderBottom: '1px solid #222',
      userSelect: 'none',
    }}>

      {/* ── Main control row ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        gap: 0,
      }}>

        {/* SFX slot selector — displayed as 2-digit hex (00–3F) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={knobLabel}>SFX</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button
              style={{ ...arrowBtn, ...(isTouch && { padding: '7px 10px', fontSize: 13 }), opacity: curSfx <= 0 ? 0.25 : 1 }}
              disabled={curSfx <= 0}
              onClick={onPrev}
            >
              ◀
            </button>
            <span style={{ ...knobValue, minWidth: 22 }}>
              {curSfx.toString(16).padStart(2, '0').toUpperCase()}
            </span>
            <button
              style={{ ...arrowBtn, ...(isTouch && { padding: '7px 10px', fontSize: 13 }), opacity: curSfx >= 63 ? 0.25 : 1 }}
              disabled={curSfx >= 63}
              onClick={onNext}
            >
              ▶
            </button>
          </div>
        </div>

        <Sep />

        {/* Speed + loop knobs */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <MiniKnob
            label="SPEED"
            value={sfx.speed}
            min={1}
            max={255}
            onChange={onSpeedChange}
            valueWidth={32}
            isTouch={isTouch}
          />
          <MiniKnob
            label="LOOP ST"
            value={sfx.loopStart}
            min={0}
            max={31}
            onChange={onLoopStartChange}
            isTouch={isTouch}
          />
          <MiniKnob
            label="LOOP EN"
            value={sfx.loopEnd}
            min={0}
            max={31}
            onChange={onLoopEndChange}
            isTouch={isTouch}
          />
        </div>

        <Sep />

        {/* Transport */}
        <button
          onClick={isPlaying ? onStop : onPlay}
          style={{
            fontFamily: 'monospace',
            fontSize: isTouch ? 13 : 11,
            fontWeight: 'bold',
            letterSpacing: 1,
            padding: isTouch ? '9px 20px' : '5px 16px',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            backgroundColor: isPlaying ? '#FF004D' : '#00E436',
            color: '#000',
            minWidth: 60,
          }}
        >
          {isPlaying ? 'STOP' : 'PLAY'}
        </button>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 10 }}>
          <button
            onClick={onSave}
            style={actionBtn({ border: '1px solid #FFEC27', color: '#FFEC27',
              ...(isTouch && { padding: '9px 14px', fontSize: 11 }) })}
          >
            SAVE TAKE
          </button>

          <button onClick={onCopy} style={actionBtn({ ...(isTouch && { padding: '9px 14px', fontSize: 11 }) })}>
            COPY SFX
          </button>

          <button
            onClick={onClear}
            style={actionBtn({ border: '1px solid #FF004D', color: '#FF004D',
              ...(isTouch && { padding: '9px 14px', fontSize: 11 }) })}
          >
            CLEAR
          </button>
        </div>

      </div>

      {/* ── Status line ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px 6px',
        fontSize: 9,
        fontFamily: 'monospace',
        color: '#5F574F',
      }}>
        <span>
          <span style={{ color: activeCount > 0 ? '#83769C' : '#3a3a3a' }}>
            {activeCount}
          </span>
          {' '}notes active
        </span>
        <span style={{ color: '#2a2a2a' }}>•</span>
        <span>{msPerNote}ms/note</span>
        <span style={{ color: '#2a2a2a' }}>•</span>
        <span>{totalSec}s total</span>
      </div>

    </div>
  );
}
