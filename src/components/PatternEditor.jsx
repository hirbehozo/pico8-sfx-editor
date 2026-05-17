import { useState } from 'react';

// ── Column layout constants ────────────────────────────────────────────────────
const IDX_W  = 30;   // px — pattern index column
const CH_W   = 40;   // px — each channel column
const FLAG_W = 24;   // px — each flag toggle

// ── ChannelCell ───────────────────────────────────────────────────────────────
// Shows the SFX slot as a 2-digit hex label. Clicking opens an inline <select>.
// Double-click clears the slot without opening the picker.

function ChannelCell({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const label = value === null
    ? '--'
    : value.toString(16).padStart(2, '0').toUpperCase();

  if (open) {
    return (
      <div style={{ width: CH_W, flexShrink: 0 }}>
        <select
          autoFocus
          value={value ?? ''}
          onChange={e => {
            onChange(e.target.value === '' ? null : parseInt(e.target.value, 10));
            setOpen(false);
          }}
          onBlur={() => setOpen(false)}
          style={{
            width: '100%',
            fontFamily: 'monospace',
            fontSize: 9,
            backgroundColor: '#111',
            color: '#FFF1E8',
            border: '1px solid #29ADFF',
            padding: '1px 2px',
            outline: 'none',
          }}
        >
          <option value="">-- off</option>
          {Array.from({ length: 64 }, (_, i) => (
            <option key={i} value={i}>
              {i.toString(16).padStart(2, '0').toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setOpen(true); }}
      onDoubleClick={e => { e.stopPropagation(); onChange(null); }}
      title="Click to pick SFX · Double-click to clear"
      style={{
        width: CH_W,
        flexShrink: 0,
        fontFamily: 'monospace',
        fontSize: 9,
        textAlign: 'center',
        background: 'none',
        border: '1px solid transparent',
        color: value === null ? '#2a2a2a' : '#C2C3C7',
        cursor: 'pointer',
        padding: '2px 0',
        borderRadius: 2,
      }}
    >
      {label}
    </button>
  );
}

// ── FlagBtn ───────────────────────────────────────────────────────────────────

function FlagBtn({ active, label, activeColor, title, onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={title}
      style={{
        width: FLAG_W,
        flexShrink: 0,
        fontFamily: 'monospace',
        fontSize: 7,
        letterSpacing: 0.5,
        padding: '2px 0',
        cursor: 'pointer',
        border: `1px solid ${active ? activeColor : '#222'}`,
        backgroundColor: active ? activeColor : 'transparent',
        color: active ? '#000' : '#333',
        borderRadius: 2,
      }}
    >
      {label}
    </button>
  );
}

// ── PatternEditor ─────────────────────────────────────────────────────────────

export default function PatternEditor({
  patterns,
  curPattern,
  setCurPattern,
  isPlaying,
  playPos,
  updateChannel,
  updateFlags,
  playPatterns,
  stopPatternPlay,
  exportMusic,
}) {
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    try { await navigator.clipboard.writeText(exportMusic()); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const headCell = (w, label) => (
    <div style={{
      width: w,
      flexShrink: 0,
      fontFamily: 'monospace',
      fontSize: 8,
      color: '#5F574F',
      textAlign: 'center',
      padding: '4px 0',
      letterSpacing: 0.5,
    }}>
      {label}
    </div>
  );

  return (
    <div style={{ backgroundColor: '#0d0d0d', fontFamily: 'monospace', userSelect: 'none' }}>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderBottom: '1px solid #1c1c1c',
      }}>
        <button
          onClick={() => isPlaying ? stopPatternPlay() : playPatterns(curPattern)}
          style={{
            fontFamily: 'monospace',
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 1,
            padding: '4px 14px',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            backgroundColor: isPlaying ? '#FF004D' : '#00E436',
            color: '#000',
            minWidth: 58,
          }}
        >
          {isPlaying ? 'STOP' : 'PLAY'}
        </button>

        <button
          onClick={handleExport}
          style={{
            fontFamily: 'monospace',
            fontSize: 9,
            padding: '4px 10px',
            border: `1px solid ${copied ? '#FFEC27' : '#3a3a3a'}`,
            backgroundColor: copied ? 'rgba(255,236,39,0.06)' : 'transparent',
            color: copied ? '#FFEC27' : '#C2C3C7',
            borderRadius: 3,
            cursor: 'pointer',
            letterSpacing: 0.5,
          }}
        >
          {copied ? '✓  COPIED' : 'EXPORT __music__'}
        </button>

        <span style={{ fontSize: 9, color: '#3a3a3a', marginLeft: 4 }}>
          {'pattern '}
          <span style={{ color: '#83769C' }}>
            {curPattern.toString(16).padStart(2, '0').toUpperCase()}
          </span>
        </span>
      </div>

      {/* ── Column headers ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        borderBottom: '1px solid #111',
      }}>
        {headCell(IDX_W, '#')}
        {['CH1','CH2','CH3','CH4'].map(ch => headCell(CH_W, ch))}
        {headCell(FLAG_W, 'LB')}
        {headCell(FLAG_W, 'LE')}
        {headCell(FLAG_W, 'ST')}
      </div>

      {/* ── Scrollable pattern grid ───────────────────────────────────── */}
      <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'hidden' }}>
        {patterns.map((pat, i) => {
          const isSel    = i === curPattern;
          const isActive = i === playPos;

          // Patterns with any content get slightly lighter index text
          const hasContent = pat.channels.some(c => c !== null)
            || pat.loopBegin || pat.loopEnd || pat.stop;

          return (
            <div
              key={i}
              onClick={() => setCurPattern(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1px 10px',
                minHeight: 22,
                cursor: 'pointer',
                borderBottom: '1px solid #0f0f0f',
                borderLeft: isSel ? '2px solid #29ADFF' : '2px solid transparent',
                backgroundColor: isActive
                  ? 'rgba(0,228,54,0.10)'
                  : isSel
                    ? 'rgba(41,173,255,0.05)'
                    : 'transparent',
              }}
            >
              {/* Index */}
              <div style={{
                width: IDX_W,
                flexShrink: 0,
                fontSize: 9,
                textAlign: 'center',
                color: isActive
                  ? '#00E436'
                  : isSel
                    ? '#29ADFF'
                    : hasContent
                      ? '#5F574F'
                      : '#1c1c1c',
              }}>
                {i.toString(16).padStart(2, '0').toUpperCase()}
              </div>

              {/* Channel cells */}
              {pat.channels.map((ch, ci) => (
                <ChannelCell
                  key={ci}
                  value={ch}
                  onChange={v => updateChannel(i, ci, v)}
                />
              ))}

              {/* Flags */}
              <FlagBtn
                active={pat.loopBegin}
                label="LB"
                activeColor="#00E436"
                title="Loop begin — sequence restarts here when a loop-end is reached"
                onClick={() => updateFlags(i, { loopBegin: !pat.loopBegin })}
              />
              <FlagBtn
                active={pat.loopEnd}
                label="LE"
                activeColor="#FFA300"
                title="Loop end — jumps back to the most recent loop-begin pattern"
                onClick={() => updateFlags(i, { loopEnd: !pat.loopEnd })}
              />
              <FlagBtn
                active={pat.stop}
                label="ST"
                activeColor="#FF004D"
                title="Stop — ends playback after this pattern finishes"
                onClick={() => updateFlags(i, { stop: !pat.stop })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
