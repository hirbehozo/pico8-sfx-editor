import { useRef, useEffect, useMemo } from 'react';
import { audioEngine } from '../audio.js';

const CANVAS_W = 260;
const TRACK_H  = 36;
const LABEL_W  = 34;

// ── Static waveform illustrations ─────────────────────────────────────────────

const tri = (x) => {
  const t = ((x % 1) + 1) % 1;
  return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
};

function generateStatic(waveform, samples) {
  const data = new Float32Array(samples);
  const cycles = 2;
  for (let i = 0; i < samples; i++) {
    const t    = (i / samples) * cycles;
    const tmod = t % 1;
    let v = 0;
    switch (waveform) {
      case 0: v = tri(tmod); break;
      case 1: v = tmod < 0.65 ? (tmod / 0.65) * 2 - 1 : 1 - ((tmod - 0.65) / 0.35) * 2; break;
      case 2: v = tmod * 2 - 1; break;
      case 3: v = tmod < 0.5 ? 1 : -1; break;
      case 4: v = tmod < 0.25 ? 1 : -1; break;
      case 5: v = tri(tmod) * 0.6 + tri(tmod * 2) * 0.3 + tri(tmod * 3) * 0.1; break;
      case 6: v = Math.random() * 2 - 1; break;
      case 7: v = Math.sin(tmod * Math.PI * 2) * (0.75 + 0.25 * Math.cos(tmod * Math.PI * 6)); break;
    }
    data[i] = v;
  }
  return data;
}

// ── WaveformDisplay ───────────────────────────────────────────────────────────
// channels: [{ label, color, waveform }, ...] — one entry per track (0–3)

export default function WaveformDisplay({ channels }) {
  const canvasRefs = useRef([null, null, null, null]);
  const aBufsRef   = useRef([null, null, null, null]);

  // Recompute static waveform buffers only when waveform IDs change
  const waveformKey = channels.map(ch => ch.waveform).join(',');
  const staticData  = useMemo(
    () => channels.map(ch => generateStatic(ch.waveform, CANVAS_W)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [waveformKey],
  );

  // Refs so the RAF closure always reads the latest values without restarting
  const channelsRef   = useRef(channels);
  const staticDataRef = useRef(staticData);
  useEffect(() => { channelsRef.current   = channels;   }, [channels]);
  useEffect(() => { staticDataRef.current = staticData; }, [staticData]);

  // Single RAF loop, runs for the lifetime of the component
  useEffect(() => {
    let rafId;
    const tick = () => {
      const chs    = channelsRef.current;
      const statics = staticDataRef.current;

      chs.forEach((ch, ci) => {
        const canvas = canvasRefs.current[ci];
        if (!canvas) return;
        const ctx     = canvas.getContext('2d');
        const analyser = audioEngine.getChannelAnalyser(ci);

        if (analyser && !aBufsRef.current[ci]) {
          aBufsRef.current[ci] = new Uint8Array(analyser.fftSize);
        }

        // Background + centre line
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, CANVAS_W, TRACK_H);
        ctx.strokeStyle = '#1c1c1c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, TRACK_H / 2);
        ctx.lineTo(CANVAS_W, TRACK_H / 2);
        ctx.stroke();

        // Detect live signal
        let liveMode = false;
        if (analyser && aBufsRef.current[ci]) {
          analyser.getByteTimeDomainData(aBufsRef.current[ci]);
          liveMode = aBufsRef.current[ci].some(v => Math.abs(v - 128) > 2);
        }

        // Draw waveform
        ctx.strokeStyle = ch.color;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        for (let x = 0; x < CANVAS_W; x++) {
          let amp = 0;
          if (liveMode) {
            const idx = Math.floor(x * aBufsRef.current[ci].length / CANVAS_W);
            amp = (aBufsRef.current[ci][idx] - 128) / 128;
          } else if (statics[ci]) {
            const idx = Math.floor(x * statics[ci].length / CANVAS_W);
            amp = statics[ci][idx];
          }
          const y = TRACK_H / 2 - amp * (TRACK_H / 2) * 0.85;
          if (x === 0) ctx.moveTo(x, y);
          else         ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []); // intentionally empty — reads fresh data through refs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {channels.map((ch, ci) => (
        <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            width: LABEL_W,
            fontSize: 7,
            fontFamily: 'monospace',
            letterSpacing: 1,
            color: ch.color,
            textAlign: 'right',
            flexShrink: 0,
            opacity: 0.8,
          }}>
            {ch.label.slice(0, 4)}
          </span>
          <canvas
            ref={el => { canvasRefs.current[ci] = el; }}
            width={CANVAS_W}
            height={TRACK_H}
            style={{ display: 'block' }}
          />
        </div>
      ))}
    </div>
  );
}
