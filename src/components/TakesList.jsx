import { useState } from 'react';
import { sfxToHex } from '../utils.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slotHex(slot) {
  return slot.toString(16).padStart(2, '0').toUpperCase();
}

function activeNotes(sfx) {
  return sfx.notes.filter(n => n.on).length;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Btn({ children, onClick, title, variant = 'neutral' }) {
  const colors = {
    neutral: { border: '#3a3a3a', color: '#C2C3C7' },
    accent:  { border: '#29ADFF', color: '#29ADFF' },
    green:   { border: '#00E436', color: '#00E436' },
    red:     { border: '#FF004D', color: '#FF004D' },
    yellow:  { border: '#FFEC27', color: '#FFEC27' },
  };
  const { border, color } = colors[variant] ?? colors.neutral;

  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        fontFamily: 'monospace',
        fontSize: 9,
        padding: '3px 7px',
        borderRadius: 2,
        cursor: 'pointer',
        background: 'none',
        border: `1px solid ${border}`,
        color,
        flexShrink: 0,
        lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  );
}

function TakeRow({ take, index, isCurrent, onLoad, onDelete, onPreview }) {
  const [copied, setCopied] = useState(false);

  const count = activeNotes(take.sfx);
  const hex   = slotHex(take.slot);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sfxToHex(take.sfx));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (_) {
      // clipboard unavailable — fail silently
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete Take ${index + 1} (SFX ${hex})?`)) {
      onDelete(take.id);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderBottom: '1px solid #181818',
        // Highlight rows that came from the currently open SFX slot
        backgroundColor: isCurrent ? 'rgba(41,173,255,0.04)' : 'transparent',
        borderLeft: isCurrent ? '2px solid #29ADFF' : '2px solid transparent',
      }}
    >
      {/* SFX slot badge */}
      <div style={{
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: 2,
        backgroundColor: '#1D2B53',
        color: '#29ADFF',
        flexShrink: 0,
        minWidth: 26,
        textAlign: 'center',
      }}>
        {hex}
      </div>

      {/* Name + metadata */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#FFF1E8',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          Take {index + 1}
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 8,
          color: '#5F574F',
          marginTop: 1,
        }}>
          {count === 0 ? 'empty' : `${count} note${count !== 1 ? 's' : ''}`}
          {' · '}
          {formatTime(take.createdAt)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <Btn
          onClick={() => onPreview(take)}
          title="Preview without loading"
          variant="accent"
        >
          ▶
        </Btn>

        <Btn
          onClick={() => onLoad(take)}
          title="Load into current SFX slot"
          variant="green"
        >
          LOAD
        </Btn>

        <Btn
          onClick={handleCopy}
          title="Copy PICO-8 SFX line to clipboard"
          variant={copied ? 'yellow' : 'neutral'}
        >
          {copied ? '✓' : '⎘'}
        </Btn>

        <Btn
          onClick={handleDelete}
          title="Delete take"
          variant="red"
        >
          ✕
        </Btn>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      padding: '36px 16px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#3a3a3a',
        marginBottom: 8,
      }}>
        no takes saved
      </div>
      <div style={{
        fontFamily: 'monospace',
        fontSize: 8,
        color: '#2a2a2a',
        lineHeight: 1.6,
      }}>
        press SAVE TAKE in the toolbar<br />
        to snapshot the current SFX
      </div>
    </div>
  );
}

// ── TakesList ─────────────────────────────────────────────────────────────────

export default function TakesList({ takes, curSfx, onLoad, onDelete, onPreview }) {
  return (
    <div style={{ backgroundColor: '#0d0d0d' }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 10px',
        borderBottom: '1px solid #1c1c1c',
      }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 8,
          color: '#83769C',
          letterSpacing: 2,
        }}>
          TAKES
        </span>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 8,
          color: '#3a3a3a',
        }}>
          {takes.length} saved
        </span>
      </div>

      {/* Scrollable list */}
      <div style={{
        maxHeight: 420,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {takes.length === 0 ? (
          <EmptyState />
        ) : (
          takes.map((take, i) => (
            <TakeRow
              key={take.id}
              take={take}
              index={i}
              isCurrent={take.slot === curSfx}
              onLoad={onLoad}
              onDelete={onDelete}
              onPreview={onPreview}
            />
          ))
        )}
      </div>

    </div>
  );
}
