import { useState } from 'react';
import { NOTE_NAMES, WAVE_COLS, EFF_COLS } from '../constants.js';
import { sfxToHex, noteToHex } from '../utils.js';

const WAVE_SHORT = ['TRI', 'TSAW', 'SAW', 'SQR', 'PUL', 'ORG', 'NOI', 'PHA'];
const EFF_SHORT  = ['NON', 'SLD',  'VIB', 'DRP', 'FDI', 'FDO', 'ARP', 'ARS'];

// ── Atom components ───────────────────────────────────────────────────────────

function SectionHead({ children }) {
  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: 8,
      color: '#83769C',
      letterSpacing: 2,
      marginBottom: 8,
      paddingBottom: 4,
      borderBottom: '1px solid #1c1c1c',
    }}>
      {children}
    </div>
  );
}

function CopyBtn({ label, copied, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'monospace',
        fontSize: 9,
        padding: '4px 12px',
        borderRadius: 2,
        cursor: 'pointer',
        border: `1px solid ${copied ? '#FFEC27' : '#3a3a3a'}`,
        backgroundColor: copied ? 'rgba(255,236,39,0.06)' : 'transparent',
        color: copied ? '#FFEC27' : '#C2C3C7',
        letterSpacing: 0.5,
        marginBottom: 8,
        display: 'inline-block',
      }}
    >
      {copied ? '✓  COPIED' : label}
    </button>
  );
}

// Read-only hex block; userSelect:'all' lets a single click select everything
function HexPre({ children, maxHeight }) {
  return (
    <pre style={{
      margin: 0,
      padding: '8px 10px',
      backgroundColor: '#080808',
      border: '1px solid #1c1c1c',
      borderRadius: 2,
      fontFamily: 'monospace',
      fontSize: 9,
      color: '#5F574F',
      overflowX: 'auto',
      overflowY: maxHeight ? 'auto' : 'visible',
      maxHeight,
      whiteSpace: 'pre',
      lineHeight: 1.5,
      userSelect: 'all',
    }}>
      {children}
    </pre>
  );
}

// Inline code snippet used in instructions
function Code({ children }) {
  return (
    <pre style={{
      margin: '6px 0',
      padding: '7px 10px',
      backgroundColor: '#080808',
      border: '1px solid #1c1c1c',
      borderRadius: 2,
      fontFamily: 'monospace',
      fontSize: 9,
      color: '#83769C',
      whiteSpace: 'pre',
      overflowX: 'auto',
    }}>
      {children}
    </pre>
  );
}

// ── Note table ────────────────────────────────────────────────────────────────

function TH({ children, align = 'left' }) {
  return (
    <th style={{
      fontFamily: 'monospace',
      fontSize: 8,
      color: '#5F574F',
      fontWeight: 'normal',
      textAlign: align,
      padding: '3px 10px',
      borderBottom: '1px solid #1c1c1c',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </th>
  );
}

function TD({ children, color = '#C2C3C7', align = 'left' }) {
  return (
    <td style={{
      fontFamily: 'monospace',
      fontSize: 9,
      color,
      textAlign: align,
      padding: '2px 10px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  );
}

function NoteTable({ notes }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        borderCollapse: 'collapse',
        width: '100%',
        backgroundColor: '#080808',
        border: '1px solid #1c1c1c',
        borderRadius: 2,
      }}>
        <thead>
          <tr>
            <TH>#</TH>
            <TH>PITCH</TH>
            <TH>WAVE</TH>
            <TH align="center">VOL</TH>
            <TH>EFF</TH>
            <TH>HEX</TH>
          </tr>
        </thead>
        <tbody>
          {notes.map((note, i) => {
            const on = note.on;
            // Active rows use waveform/effect colours; inactive rows are near-invisible
            const dim    = '#222';
            const waveC  = on ? WAVE_COLS[note.waveform] : dim;
            const effC   = on ? EFF_COLS[note.effect]    : dim;
            const baseC  = on ? '#C2C3C7'                : dim;
            const idxC   = on ? '#5F574F'                : '#1c1c1c';
            const hexC   = on ? '#3a3a3a'                : '#181818';

            return (
              <tr
                key={i}
                style={{
                  borderBottom: '1px solid #0f0f0f',
                  backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                }}
              >
                <TD color={idxC}>{i.toString(16).padStart(2, '0')}</TD>
                <TD color={waveC}>{NOTE_NAMES[note.pitch]}</TD>
                <TD color={waveC}>{WAVE_SHORT[note.waveform]}</TD>
                <TD color={baseC} align="center">{note.volume}</TD>
                <TD color={effC}>{EFF_SHORT[note.effect]}</TD>
                <TD color={hexC}>{noteToHex(note)}</TD>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── ExportPanel ───────────────────────────────────────────────────────────────

export default function ExportPanel({ sfx, sfxSlots, curSfx }) {
  const [copiedSingle, setCopiedSingle] = useState(false);
  const [copiedAll,    setCopiedAll]    = useState(false);

  const singleHex = sfxToHex(sfx);
  const allHex    = sfxSlots.map(sfxToHex).join('\n');
  const slotHex   = curSfx.toString(16).padStart(2, '0').toUpperCase();

  const copy = async (text, set) => {
    try { await navigator.clipboard.writeText(text); } catch (_) {}
    set(true);
    setTimeout(() => set(false), 1500);
  };

  const prose = { fontSize: 9, color: '#C2C3C7', lineHeight: 1.8, margin: 0 };
  const hl    = (color) => ({ color });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 22,
      padding: 16,
      backgroundColor: '#0d0d0d',
      fontFamily: 'monospace',
    }}>

      {/* ── 1. Current SFX ───────────────────────────────────────────── */}
      <div>
        <SectionHead>CURRENT SFX — SLOT {slotHex}</SectionHead>
        <CopyBtn
          label="COPY SFX"
          copied={copiedSingle}
          onClick={() => copy(singleHex, setCopiedSingle)}
        />
        <HexPre>{singleHex}</HexPre>
      </div>

      {/* ── 2. All 64 slots ──────────────────────────────────────────── */}
      <div>
        <SectionHead>ALL 64 SFX SLOTS</SectionHead>
        <CopyBtn
          label="COPY ALL"
          copied={copiedAll}
          onClick={() => copy(allHex, setCopiedAll)}
        />
        {/* maxHeight keeps the block compact; user can scroll to see all 64 lines */}
        <HexPre maxHeight={160}>{allHex}</HexPre>
      </div>

      {/* ── 3. Paste instructions ─────────────────────────────────────── */}
      <div>
        <SectionHead>PICO-8 PASTE INSTRUCTIONS</SectionHead>
        <div style={prose}>

          <p style={{ margin: '0 0 4px' }}>
            In your <span style={hl('#FFEC27')}>.p8</span> cartridge file, locate (or add)
            the <span style={hl('#FFEC27')}>__sfx__</span> section.
            Each line is one slot, <strong>0-indexed</strong>. Paste
            the current SFX at line {curSfx}:
          </p>
          <Code>
{`__sfx__
${singleHex}   ← slot ${curSfx} (0-indexed line in __sfx__)`}
          </Code>

          <p style={{ margin: '4px 0' }}>
            To replace <em>all</em> slots, paste the 64-line block starting at the
            first line of <span style={hl('#FFEC27')}>__sfx__</span>.
          </p>

          <p style={{ margin: '4px 0' }}>
            Trigger the SFX from <span style={hl('#FFEC27')}>Lua</span> game code:
          </p>
          <Code>
{`-- play slot ${curSfx} on any free channel:
sfx(${curSfx})

-- play on a specific channel (0–3):
sfx(${curSfx}, 0)

-- stop all SFX on a channel:
sfx(-1, 0)`}
          </Code>

          <p style={{ margin: '4px 0 0', color: '#5F574F' }}>
            Full signature:{' '}
            <span style={hl('#83769C')}>
              sfx(n, [channel=−1], [offset=0], [length=−1])
            </span>
          </p>
        </div>
      </div>

      {/* ── 4. Note table ────────────────────────────────────────────── */}
      <div>
        <SectionHead>NOTE TABLE — SFX {slotHex}</SectionHead>
        <NoteTable notes={sfx.notes} />
      </div>

    </div>
  );
}
