import { useRef, useEffect, useMemo } from 'react';
import { WAVE_COLS } from '../constants.js';
import { audioEngine } from '../audio.js';

// ── Canvas dimensions ─────────────────────────────────────────────────────────
const W       = 256;  // width shared by both canvases
const WAVE_H  = 64;   // waveform canvas height
const SPEC_H  = 32;   // spectrum canvas height
const NUM_BARS = 32;  // FFT bar count

// ── Static waveform illustrations ─────────────────────────────────────────────
// Generates one buffer representing 2 visual cycles of the given waveform.
// Used when no note is playing. Computed once per waveform change via useMemo.

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
      case 0: // triangle
        v = tri(tmod);
        break;
      case 1: // tilted saw — rises over 65%, drops over 35%
        v = tmod < 0.65 ? (tmod / 0.65) * 2 - 1 : 1 - ((tmod - 0.65) / 0.35) * 2;
        break;
      case 2: // saw (rising ramp)
        v = tmod * 2 - 1;
        break;
      case 3: // square 50%
        v = tmod < 0.5 ? 1 : -1;
        break;
      case 4: // pulse ~25%
        v = tmod < 0.25 ? 1 : -1;
        break;
      case 5: // organ: triangle + 2nd + 3rd harmonics (mirrors audio.js)
        v = tri(tmod) * 0.6 + tri(tmod * 2) * 0.3 + tri(tmod * 3) * 0.1;
        break;
      case 6: // noise (seeded once per waveform selection via useMemo)
        v = Math.random() * 2 - 1;
        break;
      case 7: // phaser: amplitude-modulated sine (illustrates beating)
        v = Math.sin(tmod * Math.PI * 2) * (0.75 + 0.25 * Math.cos(tmod * Math.PI * 6));
        break;
    }
    data[i] = v;
  }
  return data;
}

// ── WaveformDisplay ───────────────────────────────────────────────────────────

export default function WaveformDisplay({ currentWaveform = 0 }) {
  const waveRef = useRef(null);  // waveform canvas
  const specRef = useRef(null);  // spectrum canvas
  const aBufRef = useRef(null);  // { timeBuf, freqBuf } allocated once

  const color      = WAVE_COLS[currentWaveform] ?? WAVE_COLS[0];
  const staticData = useMemo(() => generateStatic(currentWaveform, W), [currentWaveform]);

  useEffect(() => {
    const wCvs = waveRef.current;
    const sCvs = specRef.current;
    if (!wCvs || !sCvs) return;
    const wCtx = wCvs.getContext('2d');
    const sCtx = sCvs.getContext('2d');

    let rafId;

    const tick = () => {
      const analyser = audioEngine.getAnalyser();

      // Allocate analysis buffers once when the analyser first becomes available
      if (analyser && !aBufRef.current) {
        aBufRef.current = {
          timeBuf: new Uint8Array(analyser.fftSize),
          freqBuf: new Uint8Array(analyser.frequencyBinCount),
        };
      }

      // ── Waveform canvas ─────────────────────────────────────────────────────
      wCtx.fillStyle = '#080808';
      wCtx.fillRect(0, 0, W, WAVE_H);

      // Horizontal centre reference line
      wCtx.strokeStyle = '#1c1c1c';
      wCtx.lineWidth = 1;
      wCtx.beginPath();
      wCtx.moveTo(0, WAVE_H / 2);
      wCtx.lineTo(W, WAVE_H / 2);
      wCtx.stroke();

      // Decide data source
      let liveMode = false;
      if (analyser && aBufRef.current) {
        analyser.getByteTimeDomainData(aBufRef.current.timeBuf);
        // Signal present when any sample deviates from the silence value (128)
        liveMode = aBufRef.current.timeBuf.some(v => Math.abs(v - 128) > 2);
      }

      wCtx.strokeStyle = color;
      wCtx.lineWidth   = 1.5;
      wCtx.beginPath();
      for (let x = 0; x < W; x++) {
        let amp;
        if (liveMode) {
          const idx = Math.floor(x * aBufRef.current.timeBuf.length / W);
          amp = (aBufRef.current.timeBuf[idx] - 128) / 128;
        } else {
          const idx = Math.floor(x * staticData.length / W);
          amp = staticData[idx];
        }
        // Map amplitude (-1…1) to canvas y, 10% headroom each side
        const y = WAVE_H / 2 - amp * (WAVE_H / 2) * 0.88;
        if (x === 0) wCtx.moveTo(x, y);
        else         wCtx.lineTo(x, y);
      }
      wCtx.stroke();

      // ── Spectrum canvas ─────────────────────────────────────────────────────
      sCtx.fillStyle = '#080808';
      sCtx.fillRect(0, 0, W, SPEC_H);

      if (analyser && aBufRef.current) {
        analyser.getByteFrequencyData(aBufRef.current.freqBuf);
        const { freqBuf } = aBufRef.current;
        const binsPerBar = Math.max(1, Math.floor(freqBuf.length / NUM_BARS));
        const barW       = W / NUM_BARS;

        for (let b = 0; b < NUM_BARS; b++) {
          let sum = 0;
          const start = b * binsPerBar;
          for (let k = 0; k < binsPerBar; k++) sum += freqBuf[start + k];
          const avg  = sum / binsPerBar;
          const barH = (avg / 255) * SPEC_H;

          if (barH > 0.5) {
            // Fade opacity with magnitude so quiet bars are subtler
            sCtx.globalAlpha = 0.35 + (avg / 255) * 0.65;
            sCtx.fillStyle   = color;
            sCtx.fillRect(
              Math.floor(b * barW) + 1,
              SPEC_H - barH,
              Math.max(1, Math.floor(barW) - 2),
              barH,
            );
          }
        }
        sCtx.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [color, staticData]);

  return (
    <div style={{ display: 'inline-block', backgroundColor: '#080808' }}>
      <canvas
        ref={waveRef}
        width={W}
        height={WAVE_H}
        style={{ display: 'block' }}
      />
      {/* 1px rule between waveform and spectrum */}
      <div style={{ height: 1, backgroundColor: '#1c1c1c' }} />
      <canvas
        ref={specRef}
        width={W}
        height={SPEC_H}
        style={{ display: 'block' }}
      />
    </div>
  );
}
