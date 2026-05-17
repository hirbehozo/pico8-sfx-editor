import { useState } from 'react';

const IDX_W  = 28;
const CH_W   = 52;
const FLAG_W = 22;

const CH_ROLES  = ['BASS', 'MELODY', 'CHORDS', 'DRUMS'];
const CH_COLORS = ['#29ADFF', '#00E436', '#FFEC27', '#FF77A8'];

// ── ChannelCell ───────────────────────────────────────────────────────────────
function ChannelCell({ value, onChange, onNavigate, color }) {
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
            width: '100%', fontFamily: 'monospace', fontSize: 9,
            backgroundColor: '#111', color: '#FFF1E8',
            border: `1px solid ${color}`, padding: '2px 3px', outline: 'none',
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
    <div style={{ display: 'flex', width: CH_W, flexShrink: 0 }}>
      <button
        onClick={e => { e.stopPropagation(); if (value !== null) onNavigate(value); }}
        onDoubleClick={e => { e.stopPropagation(); onChange(null); }}
        title={value !== null ? `SFX ${label} — click to edit, double-click to clear` : 'No SFX — click ▾ to assign'}
        style={{
          flex: 1, fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold',
          textAlign: 'center',
          background: value !== null ? `${color}14` : 'none',
          border: value !== null ? `1px solid ${color}44` : '1px solid transparent',
          borderRadius: '2px 0 0 2px',
          color: value !== null ? color : '#252525',
          cursor: value !== null ? 'pointer' : 'default',
          padding: '3px 0', lineHeight: 1,
        }}
      >{label}</button>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title="Assign SFX to this channel"
        style={{
          width: 16, flexShrink: 0, background: 'none',
          border: '1px solid #1c1c1c', borderLeft: 'none',
          borderRadius: '0 2px 2px 0',
          color: '#2a2a2a', cursor: 'pointer', fontSize: 9, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >▾</button>
    </div>
  );
}

// ── FlagBtn ───────────────────────────────────────────────────────────────────
function FlagBtn({ active, label, activeColor, title, onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={title}
      style={{
        width: FLAG_W, flexShrink: 0, fontFamily: 'monospace', fontSize: 7,
        letterSpacing: 0.5, padding: '3px 0', cursor: 'pointer',
        border: `1px solid ${active ? activeColor : '#1c1c1c'}`,
        backgroundColor: active ? activeColor : 'transparent',
        color: active ? '#000' : '#252525', borderRadius: 2,
      }}
    >{label}</button>
  );
}

// ── ChannelStrip ──────────────────────────────────────────────────────────────
// Always-visible panel showing the 4 channels of the selected pattern.
// Includes mute / solo buttons and a direct "EDIT SFX" jump.
function ChannelStrip({ pattern, mutedChannels, soloChannel, toggleMute, toggleSolo, onSelectSfx, updateChannel }) {
  return (
    <div style={{
      display: 'flex', borderBottom: '2px solid #1c1c1c',
      backgroundColor: '#080808',
    }}>
      {CH_ROLES.map((role, ci) => {
        const sfxIdx = pattern.channels[ci];
        const label  = sfxIdx === null ? '--' : sfxIdx.toString(16).padStart(2, '0').toUpperCase();
        const color  = CH_COLORS[ci];
        const muted  = soloChannel !== null ? ci !== soloChannel : mutedChannels[ci];
        const soloed = soloChannel === ci;

        return (
          <div key={ci} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '7px 4px 6px',
            borderRight: ci < 3 ? '1px solid #1a1a1a' : 'none',
            opacity: muted ? 0.35 : 1,
            transition: 'opacity 120ms',
          }}>
            {/* Role label */}
            <span style={{
              fontSize: 8, letterSpacing: 1.5, fontWeight: 'bold',
              color: muted ? '#3a3a3a' : color, marginBottom: 5,
            }}>
              {role}
            </span>

            {/* SFX badge — click to jump to editor */}
            <button
              onClick={() => sfxIdx !== null && onSelectSfx?.(sfxIdx)}
              title={sfxIdx !== null ? `Edit SFX ${label}` : 'No SFX assigned'}
              style={{
                fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold',
                padding: '3px 8px', borderRadius: 3, cursor: sfxIdx !== null ? 'pointer' : 'default',
                border: sfxIdx !== null ? `1px solid ${color}55` : '1px solid #1a1a1a',
                backgroundColor: sfxIdx !== null ? `${color}18` : 'transparent',
                color: sfxIdx !== null ? color : '#2a2a2a',
                marginBottom: 6, minWidth: 36, textAlign: 'center',
              }}
            >
              {label}
            </button>

            {/* Mute / Solo buttons */}
            <div style={{ display: 'flex', gap: 3 }}>
              <button
                onClick={() => toggleMute(ci)}
                title={mutedChannels[ci] ? 'Unmute this channel' : 'Mute this channel'}
                style={{
                  fontFamily: 'monospace', fontSize: 8, padding: '2px 5px',
                  borderRadius: 2, cursor: 'pointer',
                  border: `1px solid ${mutedChannels[ci] ? '#FF004D' : '#2a2a2a'}`,
                  backgroundColor: mutedChannels[ci] ? '#FF004D22' : 'transparent',
                  color: mutedChannels[ci] ? '#FF004D' : '#3a3a3a',
                  letterSpacing: 0.5,
                }}
              >M</button>
              <button
                onClick={() => toggleSolo(ci)}
                title={soloed ? 'Unsolo' : 'Solo this channel (mutes all others)'}
                style={{
                  fontFamily: 'monospace', fontSize: 8, padding: '2px 5px',
                  borderRadius: 2, cursor: 'pointer',
                  border: `1px solid ${soloed ? '#FFEC27' : '#2a2a2a'}`,
                  backgroundColor: soloed ? '#FFEC2722' : 'transparent',
                  color: soloed ? '#FFEC27' : '#3a3a3a',
                  letterSpacing: 0.5,
                }}
              >S</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Empty state guide ─────────────────────────────────────────────────────────
function EmptyGuide() {
  return (
    <div style={{
      padding: '20px 16px', fontFamily: 'monospace', color: '#3a3a3a',
      fontSize: 10, lineHeight: 2,
    }}>
      <div style={{ fontSize: 8, color: '#5F574F', letterSpacing: 2, marginBottom: 12 }}>
        HOW TO BUILD A SONG
      </div>
      {[
        ['1', 'Create SFX in the EDIT tab — one per role: bass, melody, chords, drums'],
        ['2', 'Come back here and click ▾ in any column to assign an SFX to that channel'],
        ['3', 'Add more pattern rows below for verses, chorus, bridge…'],
        ['4', 'Hit PLAY — all 4 channels play simultaneously, just like pico-8 __music__'],
        ['5', 'Click any SFX label to jump straight back to the editor for that track'],
      ].map(([n, t]) => (
        <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
          <span style={{ color: '#29ADFF', flexShrink: 0 }}>{n}.</span>
          <span>{t}</span>
        </div>
      ))}
    </div>
  );
}

// ── PatternEditor ─────────────────────────────────────────────────────────────
export default function PatternEditor({
  patterns,
  curPattern,
  setCurPattern,
  isPlaying,
  playPos,
  notePos,
  mutedChannels,
  soloChannel,
  toggleMute,
  toggleSolo,
  updateChannel,
  updateFlags,
  playPatterns,
  stopPatternPlay,
  exportMusic,
  onSelectSfx,
}) {
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    try { await navigator.clipboard.writeText(exportMusic()); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hasAnyContent = patterns.some(p =>
    p.channels.some(c => c !== null) || p.loopBegin || p.loopEnd || p.stop
  );

  return (
    <div style={{ backgroundColor: '#0d0d0d', fontFamily: 'monospace', userSelect: 'none' }}>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap',
        gap: 8, padding: '8px 10px', borderBottom: '1px solid #1c1c1c',
      }}>
        <button
          onClick={() => isPlaying ? stopPatternPlay() : playPatterns(curPattern)}
          style={{
            fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold', letterSpacing: 1,
            padding: '5px 16px', border: 'none', borderRadius: 3, cursor: 'pointer',
            backgroundColor: isPlaying ? '#FF004D' : '#00E436', color: '#000', minWidth: 60,
          }}
        >{isPlaying ? 'STOP' : 'PLAY'}</button>

        <button
          onClick={handleExport}
          style={{
            fontFamily: 'monospace', fontSize: 9, padding: '5px 10px',
            border: `1px solid ${copied ? '#FFEC27' : '#3a3a3a'}`,
            backgroundColor: copied ? 'rgba(255,236,39,0.06)' : 'transparent',
            color: copied ? '#FFEC27' : '#C2C3C7',
            borderRadius: 3, cursor: 'pointer', letterSpacing: 0.5,
          }}
        >{copied ? '✓  COPIED' : 'EXPORT __music__'}</button>

        {isPlaying && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#5F574F' }}>
              pat <span style={{ color: '#83769C' }}>
                {playPos >= 0 ? playPos.toString(16).padStart(2,'0').toUpperCase() : '--'}
              </span>
            </span>
            <div style={{ display: 'flex', gap: 1 }}>
              {Array.from({ length: 32 }, (_, i) => (
                <div key={i} style={{
                  width: 3, height: 8, borderRadius: 1,
                  backgroundColor: i <= notePos ? '#00E436' : '#1a1a1a',
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Channel strip — always visible ───────────────────────────── */}
      <ChannelStrip
        pattern={patterns[curPattern]}
        mutedChannels={mutedChannels}
        soloChannel={soloChannel}
        toggleMute={toggleMute}
        toggleSolo={toggleSolo}
        onSelectSfx={onSelectSfx}
        updateChannel={(ci, v) => updateChannel(curPattern, ci, v)}
      />

      {/* ── Column headers ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '3px 10px', borderBottom: '1px solid #111',
        backgroundColor: '#060606',
      }}>
        <div style={{ width: IDX_W, flexShrink: 0, fontSize: 7, color: '#2a2a2a', textAlign: 'center' }}>#</div>
        {CH_ROLES.map((role, ci) => (
          <div key={ci} style={{
            width: CH_W, flexShrink: 0, textAlign: 'center',
            fontSize: 7, letterSpacing: 1, color: CH_COLORS[ci] + '88',
          }}>{role}</div>
        ))}
        <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
          {['LB','LE','ST'].map(l => (
            <div key={l} style={{ width: FLAG_W, textAlign: 'center', fontSize: 7, color: '#2a2a2a' }}>{l}</div>
          ))}
        </div>
      </div>

      {/* ── Empty state guide ────────────────────────────────────────── */}
      {!hasAnyContent && <EmptyGuide />}

      {/* ── Pattern rows ─────────────────────────────────────────────── */}
      <div style={{ maxHeight: hasAnyContent ? 360 : 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {patterns.map((pat, i) => {
          const isSel      = i === curPattern;
          const isActive   = i === playPos;
          const hasContent = pat.channels.some(c => c !== null)
            || pat.loopBegin || pat.loopEnd || pat.stop;

          return (
            <div
              key={i}
              onClick={() => setCurPattern(i)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center',
                padding: '2px 10px', minHeight: 26, cursor: 'pointer',
                borderBottom: '1px solid #0f0f0f',
                borderLeft: isSel ? '2px solid #29ADFF' : '2px solid transparent',
                backgroundColor: isActive
                  ? 'rgba(0,228,54,0.07)'
                  : isSel ? 'rgba(41,173,255,0.05)' : 'transparent',
              }}
            >
              <div style={{
                width: IDX_W, flexShrink: 0, fontSize: 9, textAlign: 'center',
                color: isActive ? '#00E436' : isSel ? '#29ADFF'
                  : hasContent ? '#5F574F' : '#1c1c1c',
              }}>
                {i.toString(16).padStart(2, '0').toUpperCase()}
              </div>

              {pat.channels.map((ch, ci) => (
                <ChannelCell
                  key={ci}
                  value={ch}
                  color={CH_COLORS[ci]}
                  onChange={v => updateChannel(i, ci, v)}
                  onNavigate={idx => onSelectSfx?.(idx)}
                />
              ))}

              <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
                <FlagBtn active={pat.loopBegin} label="LB" activeColor="#00E436"
                  title="Loop begin — playback loops back to this pattern"
                  onClick={() => updateFlags(i, { loopBegin: !pat.loopBegin })} />
                <FlagBtn active={pat.loopEnd} label="LE" activeColor="#FFA300"
                  title="Loop end — jumps back to loop-begin"
                  onClick={() => updateFlags(i, { loopEnd: !pat.loopEnd })} />
                <FlagBtn active={pat.stop} label="ST" activeColor="#FF004D"
                  title="Stop — ends playback after this pattern"
                  onClick={() => updateFlags(i, { stop: !pat.stop })} />
              </div>

              {isActive && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#111' }}>
                  <div style={{
                    height: '100%', backgroundColor: '#00E436',
                    width: notePos >= 0 ? `${((notePos + 1) / 32) * 100}%` : '0%',
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
