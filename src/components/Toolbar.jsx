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

function MiniKnob({ label, value, min, max, onChange, valueWidth = 28, isTouch = false, title }) {
  const ab = isTouch
    ? { ...arrowBtn, padding: '7px 10px', fontSize: 13 }
    : arrowBtn;
  return (
    <div title={title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
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

// ── Step length selector ──────────────────────────────────────────────────────

const STEP_OPTIONS = [2, 4, 8, 16, 32];

function StepSelector({ length, onChange, isTouch }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={knobLabel}>STEPS</span>
      <div style={{ display: 'flex', gap: 2 }}>
        {STEP_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => onChange(s)}
            title={`Set sequence length to ${s} steps`}
            style={{
              fontFamily: 'monospace',
              fontSize: 9,
              padding: isTouch ? '6px 8px' : '2px 6px',
              border: '1px solid',
              borderColor: length === s ? '#29ADFF' : '#3a3a3a',
              borderRadius: 2,
              background: 'none',
              color: length === s ? '#29ADFF' : '#5F574F',
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  onLengthChange,
  onHelp,
  midiStatus = 'pending',
  isTouch = false,
}) {
  const seqLength   = sfx.length ?? 32;
  const activeCount = sfx.notes.slice(0, seqLength).filter(n => n.on).length;
  const msPerNote   = Math.round((sfx.speed / 60) * 1000);
  const totalSec    = (seqLength * sfx.speed / 60).toFixed(2);

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
        <div title="SFX slot (00–3F). Matches pico-8's sfx() index." style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={knobLabel}>SFX</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button
              style={{ ...arrowBtn, ...(isTouch && { padding: '7px 10px', fontSize: 13 }), opacity: curSfx <= 0 ? 0.25 : 1 }}
              disabled={curSfx <= 0}
              onClick={onPrev}
              title="Previous SFX slot"
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
              title="Next SFX slot"
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
            title={`How long each note plays. 1 tick = 1/60 second (currently ${Math.round(sfx.speed / 60 * 1000)} ms per note)`}
          />
          <MiniKnob
            label="LOOP ST"
            value={sfx.loopStart}
            min={0}
            max={31}
            onChange={onLoopStartChange}
            isTouch={isTouch}
            title="First note the sequence loops back to. Set both LOOP ST and LOOP EN to 0 to disable looping."
          />
          <MiniKnob
            label="LOOP EN"
            value={sfx.loopEnd}
            min={0}
            max={31}
            onChange={onLoopEndChange}
            isTouch={isTouch}
            title="Last note before the loop jumps back to LOOP ST. Set both to 0 to disable looping."
          />
        </div>

        <Sep />

        <StepSelector
          length={sfx.length ?? 32}
          onChange={onLengthChange}
          isTouch={isTouch}
        />

        <Sep />

        {/* Transport */}
        <button
          onClick={isPlaying ? onStop : onPlay}
          title={isPlaying ? 'Stop playback (Space)' : 'Play this SFX from the beginning (Space)'}
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
            title="Snapshot the current SFX to your Takes list so you can compare versions or recover it later"
            style={actionBtn({ border: '1px solid #FFEC27', color: '#FFEC27',
              ...(isTouch && { padding: '9px 14px', fontSize: 11 }) })}
          >
            SAVE TAKE
          </button>

          <button
            onClick={onCopy}
            title="Copy this SFX as a pico-8 sfx() line — paste it directly into your cart"
            style={actionBtn({ ...(isTouch && { padding: '9px 14px', fontSize: 11 }) })}
          >
            COPY SFX
          </button>

          <button
            onClick={onClear}
            title="Erase all 32 notes in this SFX slot"
            style={actionBtn({ border: '1px solid #FF004D', color: '#FF004D',
              ...(isTouch && { padding: '9px 14px', fontSize: 11 }) })}
          >
            CLEAR
          </button>

          <button
            onClick={onHelp}
            title="Help & keyboard shortcuts"
            style={actionBtn({ ...(isTouch && { padding: '9px 14px', fontSize: 11 }) })}
          >
            ?
          </button>
        </div>

        {/* MIDI status indicator */}
        <div
          title={
            midiStatus === 'ready'       ? 'MIDI device connected' :
            midiStatus === 'denied'      ? 'MIDI access denied — check browser permissions' :
            midiStatus === 'unsupported' ? 'Web MIDI not supported in this browser' :
                                           'No MIDI device detected'
          }
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center',
            gap: 5, paddingLeft: 14, flexShrink: 0,
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            backgroundColor:
              midiStatus === 'ready'  ? '#00E436' :
              midiStatus === 'denied' ? '#FF004D' : '#2a2a2a',
            boxShadow: midiStatus === 'ready' ? '0 0 6px #00E43666' : 'none',
          }} />
          <span style={{
            fontFamily: 'monospace', letterSpacing: 0.5,
            fontSize: isTouch ? 11 : 9,
            color:
              midiStatus === 'ready'  ? '#00E436' :
              midiStatus === 'denied' ? '#FF004D' : '#3a3a3a',
          }}>
            MIDI
          </span>
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
