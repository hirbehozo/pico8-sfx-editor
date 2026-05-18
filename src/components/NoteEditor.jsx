import { useRef, useEffect, useState } from 'react';
import { WAVE_COLS, EFF_COLS } from '../constants.js';
import { noteName } from '../utils.js';
import { audioEngine } from '../audio.js';

const WAVE_LABELS = ['TRI', 'TSAW', 'SAW', 'SQR', 'PUL', 'ORG', 'NOI', 'PHA'];
const EFF_LABELS  = ['NON', 'SLD',  'VIB', 'DRP', 'FDI', 'FDO', 'ARP', 'ARS'];

const WAVE_DESCS = [
  'Triangle — soft, flute-like tone',
  'Tilted saw — brighter saw with character',
  'Saw — harsh, buzzy tone',
  'Square — hollow, reedy tone',
  'Pulse — thin, nasal tone',
  'Organ — warm tone with harmonics',
  'Noise — random, useful for drums and hit SFX',
  'Phaser — shimmery, metallic chorus',
];
const EFF_DESCS = [
  'None — note plays straight',
  'Slide — pitch glides from the previous note',
  'Vibrato — pitch wobbles at ~7 Hz',
  'Drop — pitch falls over the note duration',
  'Fade in — volume rises from silence',
  'Fade out — volume falls to silence',
  'Arp fast — rapid major-triad arpeggio (~40 ms per step)',
  'Arp slow — slow major-triad arpeggio (~90 ms per step)',
];

const PREVIEW_DUR = 0.35; // seconds; effect 0 (none) avoids arp/slide artifacts

// Returns white or black text depending on the background luminance
function textOn(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128 ? '#FFF1E8' : '#000000';
}

// ── Knob ──────────────────────────────────────────────────────────────────────

const arrowBtn = {
  fontFamily: 'monospace',
  fontSize: 11,
  lineHeight: 1,
  padding: '2px 6px',
  background: 'none',
  border: '1px solid #3a3a3a',
  borderRadius: 2,
  color: '#C2C3C7',
  cursor: 'pointer',
};

function Knob({ label, value, min, max, onChange, isTouch = false }) {
  const ab = isTouch
    ? { ...arrowBtn, padding: '10px 14px', fontSize: 14 }
    : arrowBtn;

  // Flash the displayed value whenever it changes (selection, drag, arrow keys)
  const [flashKey, setFlashKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setFlashKey(k => k + 1);
    }
  }, [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <span style={{
        fontSize: 8,
        fontFamily: 'monospace',
        color: '#83769C',
        letterSpacing: 1,
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          style={{ ...ab, opacity: value <= min ? 0.25 : 1 }}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          ◀
        </button>
        <span key={flashKey} className={flashKey > 0 ? 'p8-flash' : ''} style={{
          fontFamily: 'monospace',
          fontSize: 14,
          color: '#FFF1E8',
          minWidth: 26,
          textAlign: 'center',
          display: 'inline-block',
        }}>
          {value}
        </span>
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

// ── Shared styles ─────────────────────────────────────────────────────────────

const sectionHead = {
  fontSize: 8,
  fontFamily: 'monospace',
  color: '#5F574F',
  letterSpacing: 2,
  marginBottom: 4,
};

const selBtn = (color, active, isTouch = false) => ({
  fontFamily: 'monospace',
  fontSize: 9,
  padding: isTouch ? '10px 0' : '4px 0',
  width: 40,
  cursor: 'pointer',
  borderRadius: 2,
  border: `1px solid ${active ? color : '#2a2a2a'}`,
  backgroundColor: active ? color : '#181818',
  color: active ? textOn(color) : color,
});

// ── NoteEditor ────────────────────────────────────────────────────────────────

const wrap = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: 16,
  backgroundColor: '#0d0d0d',
};

export default function NoteEditor({ note, noteIndex, onUpdate, nextPitch = null, isTouch = false, channel = -1, wavetableActive = [], getCustomWave = null }) {
  if (noteIndex == null || !note) {
    return (
      <div style={{
        ...wrap,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        color: '#3a3a3a',
        fontFamily: 'monospace',
        fontSize: 10,
      }}>
        select a note to edit
      </div>
    );
  }

  const preview = (pitch, waveform) => {
    const customWave = getCustomWave ? getCustomWave(waveform) : null;
    audioEngine.synthNote(
      pitch, waveform, Math.max(note.volume, 1), 0, PREVIEW_DUR,
      pitch, channel, undefined, [], Math.max(note.volume, 1), customWave,
    );
  };

  // When a scale is active, stepping ◀ or ▶ should jump to the next in-scale pitch
  // rather than stopping at every semitone.
  const handlePitchChange = (raw) => {
    let pitch = raw;
    if (nextPitch && raw !== note.pitch) {
      const dir = raw > note.pitch ? 1 : -1;
      pitch = nextPitch(note.pitch, dir);
    }
    onUpdate({ pitch });
    preview(pitch, note.waveform);
  };

  const handleWaveformChange = (waveform) => {
    onUpdate({ waveform });
    preview(note.pitch, waveform);
  };

  const waveColor = WAVE_COLS[note.waveform];

  return (
    <div style={wrap}>

      {/* ── Large pitch name ──────────────────────────────────────────── */}
      <div style={{
        fontSize: 32,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        textAlign: 'center',
        color: waveColor,
        letterSpacing: 3,
        textShadow: `0 0 16px ${waveColor}55`,
      }}>
        {noteName(note.pitch)}
      </div>

      {/* ── Knobs: pitch + volume ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
        <Knob
          label="PITCH"
          value={note.pitch}
          min={0}
          max={63}
          onChange={handlePitchChange}
          isTouch={isTouch}
        />
        <Knob
          label="VOL"
          value={note.volume}
          min={0}
          max={7}
          onChange={(volume) => onUpdate({ volume })}
          isTouch={isTouch}
        />
      </div>

      {/* ── Waveform selector ─────────────────────────────────────────── */}
      <div>
        <div style={sectionHead}>WAVEFORM</div>
        <div style={{ display: 'flex', gap: 2 }}>
          {WAVE_LABELS.map((lbl, i) => (
            <button
              key={i}
              onClick={() => handleWaveformChange(i)}
              title={WAVE_DESCS[i]}
              style={selBtn(WAVE_COLS[i], note.waveform === i, isTouch)}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Custom waveform instruments W0–W7 (PICO-8 waveforms 8–15) */}
        <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
            const waveId = i + 8;
            const active = wavetableActive[i] ?? false;
            return (
              <button
                key={waveId}
                onClick={() => handleWaveformChange(waveId)}
                title={active
                  ? `Custom waveform instrument W${i} (SFX slot ${i})`
                  : `W${i} — SFX slot ${i} is not in waveform mode`}
                style={{
                  ...selBtn('#00E436', note.waveform === waveId, isTouch),
                  opacity: active ? 1 : 0.3,
                }}
              >
                W{i}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Effect selector ───────────────────────────────────────────── */}
      <div>
        <div style={sectionHead}>EFFECT</div>
        <div style={{ display: 'flex', gap: 2 }}>
          {EFF_LABELS.map((lbl, i) => (
            <button
              key={i}
              onClick={() => onUpdate({ effect: i })}
              title={EFF_DESCS[i]}
              style={selBtn(EFF_COLS[i], note.effect === i, isTouch)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── ON / OFF toggle ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => onUpdate({ on: !note.on })}
          title={note.on ? 'This note plays — click to silence it (rest)' : 'This note is silent — click to turn it on'}
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 'bold',
            letterSpacing: 3,
            padding: isTouch ? '12px 36px' : '7px 28px',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            backgroundColor: note.on ? '#00E436' : '#5F574F',
            color:           note.on ? '#000000' : '#FFF1E8',
          }}
        >
          {note.on ? 'ON' : 'OFF'}
        </button>
      </div>

    </div>
  );
}
