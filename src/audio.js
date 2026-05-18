import * as Tone from 'tone';
import { noteToFreq } from './utils.js';

function rawCtx() { return Tone.getContext().rawContext; }

class AudioEngine {
  constructor() {
    this._analyser         = null;
    this._channelAnalysers = [null, null, null, null];
    this._active           = [];
    this._waveCache        = new Map(); // slotIdx → PeriodicWave
  }

  _ensureSharedAnalyser() {
    if (!this._analyser) {
      const ctx = rawCtx();
      this._analyser = ctx.createAnalyser();
      this._analyser.fftSize = 2048;
      this._analyser.smoothingTimeConstant = 0.75;
      this._analyser.connect(ctx.destination);
    }
    return this._analyser;
  }

  _ensureChannelAnalyser(ci) {
    if (!this._channelAnalysers[ci]) {
      const ctx = rawCtx();
      const a = ctx.createAnalyser();
      a.fftSize = 2048;
      a.smoothingTimeConstant = 0.75;
      a.connect(ctx.destination);
      this._channelAnalysers[ci] = a;
    }
    return this._channelAnalysers[ci];
  }

  getChannelAnalyser(ci) { return this._channelAnalysers[ci]; }
  getAnalyser() { return this._analyser; }

  // Build a PeriodicWave from 64 amplitude samples (−7..+7) via DFT and cache it.
  getOrBuildWave(slotIdx, samples) {
    if (this._waveCache.has(slotIdx)) return this._waveCache.get(slotIdx);
    const ctx = rawCtx();
    const N = samples.length; // 64
    const half = N >> 1;
    const real = new Float32Array(half + 1);
    const imag = new Float32Array(half + 1);
    for (let k = 1; k <= half; k++) {
      let cos = 0, sin = 0;
      for (let n = 0; n < N; n++) {
        const phase = (2 * Math.PI * k * n) / N;
        cos += samples[n] * Math.cos(phase);
        sin += samples[n] * Math.sin(phase);
      }
      real[k] = (2 / N) * cos;
      imag[k] = (2 / N) * sin;
    }
    real[0] = 0; imag[0] = 0; // no DC offset
    const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: true });
    this._waveCache.set(slotIdx, wave);
    return wave;
  }

  invalidateWaveCache(slotIdx) { this._waveCache.delete(slotIdx); }

  stopAll() {
    const ctx = rawCtx();
    const now = ctx.currentTime;
    for (const { toStop, masterGain } of this._active) {
      for (const node of toStop) {
        try { node.stop(now); } catch (_) {}
      }
      try { masterGain.disconnect(); } catch (_) {}
    }
    this._active = [];
  }

  // startTime  — AudioContext time for sample-accurate scheduling from Transport callbacks.
  // arpPitches — pitches of notes [n, n+1, n+2, n+3] for arpeggio cycling.
  // prevVolume — previous note's volume, used by slide to ramp gain as well as pitch.
  // channel 0-3 routes to that track's AnalyserNode; -1 uses the shared one.
  synthNote(pitch, waveform, volume, effect, duration,
            prevPitch = pitch, channel = -1, startTime,
            arpPitches = [], prevVolume = volume, customWave = null) {
    const ctx = rawCtx();
    const now = startTime ?? ctx.currentTime;
    const freq = noteToFreq(pitch);
    const targetGain = 0.35 * (volume / 7);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(targetGain, now);
    const dest = (channel >= 0 && channel <= 3)
      ? this._ensureChannelAnalyser(channel)
      : this._ensureSharedAnalyser();
    masterGain.connect(dest);

    // sources: { osc: AudioScheduledSourceNode, freqMult: number }
    // freqMult === 0 means the source has no .frequency param (noise)
    const sources = [];
    const toStop = []; // every node that needs .stop() — sources + LFOs

    // Creates an OscillatorNode, connects it, and registers it
    const addOsc = (type, freqMult, destination, detune = 0) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * freqMult;
      if (detune) osc.detune.value = detune;
      osc.connect(destination);
      sources.push({ osc, freqMult });
      toStop.push(osc);
    };

    // -------------------------------------------------------------------------
    // Waveforms
    // -------------------------------------------------------------------------
    switch (waveform) {
      case 0: // triangle
        addOsc('triangle', 1, masterGain);
        break;

      case 1: // tilted saw — sawtooth with +15 ¢ colour
        addOsc('sawtooth', 1, masterGain, 15);
        break;

      case 2: // saw
        addOsc('sawtooth', 1, masterGain);
        break;

      case 3: // square
        addOsc('square', 1, masterGain);
        break;

      case 4: { // pulse — two squares detuned ±25 ¢
        const mix = ctx.createGain();
        mix.gain.value = 0.5;
        mix.connect(masterGain);
        addOsc('square', 1, mix, -25);
        addOsc('square', 1, mix, +25);
        break;
      }

      case 5: { // organ — triangle fundamental + 2nd + 3rd harmonics
        for (const [mult, gain] of [[1, 0.6], [2, 0.3], [3, 0.1]]) {
          const g = ctx.createGain();
          g.gain.value = gain;
          g.connect(masterGain);
          addOsc('triangle', mult, g);
        }
        break;
      }

      case 6: { // noise — looped random AudioBuffer
        const frames = Math.ceil(ctx.sampleRate * Math.max(duration, 0.1));
        const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(masterGain);
        sources.push({ osc: src, freqMult: 0 });
        toStop.push(src);
        break;
      }

      case 7: { // phaser — two sines ±8 ¢
        const mix = ctx.createGain();
        mix.gain.value = 0.5;
        mix.connect(masterGain);
        addOsc('sine', 1, mix, -8);
        addOsc('sine', 1, mix, +8);
        break;
      }

      default: {
        // Waveforms 8-15 → custom PeriodicWave instruments (W0-W7)
        if (waveform >= 8 && waveform <= 15 && customWave) {
          const osc = ctx.createOscillator();
          osc.setPeriodicWave(customWave);
          osc.frequency.value = freq;
          osc.connect(masterGain);
          sources.push({ osc, freqMult: 1 });
          toStop.push(osc);
        } else {
          addOsc('triangle', 1, masterGain); // fallback if wave not built yet
        }
      }
    }

    // -------------------------------------------------------------------------
    // Effects
    // -------------------------------------------------------------------------
    switch (effect) {
      case 1: { // slide — ramp pitch AND volume from previous note over first 40%
        const fromFreq = noteToFreq(prevPitch);
        const fromGain = 0.35 * (prevVolume / 7);
        // Override the initial gain so volume starts from the previous note's level
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(fromGain, now);
        masterGain.gain.linearRampToValueAtTime(targetGain, now + duration * 0.4);
        for (const { osc, freqMult } of sources) {
          if (!osc.frequency || !freqMult) continue;
          osc.frequency.setValueAtTime(fromFreq * freqMult, now);
          osc.frequency.linearRampToValueAtTime(freq * freqMult, now + duration * 0.4);
        }
        break;
      }

      case 2: { // vibrato — sine LFO at 7 Hz, ±2% depth
        for (const { osc, freqMult } of sources) {
          if (!osc.frequency || !freqMult) continue;
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.value = 7;
          lfoGain.gain.value = freq * freqMult * 0.02;
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(now);
          lfo.stop(now + duration);
          toStop.push(lfo);
        }
        break;
      }

      case 3: { // drop — exponential ramp to 35% of start freq
        for (const { osc, freqMult } of sources) {
          if (!osc.frequency || !freqMult) continue;
          osc.frequency.setValueAtTime(freq * freqMult, now);
          osc.frequency.exponentialRampToValueAtTime(
            Math.max(freq * freqMult * 0.35, 20), // clamp above 20 Hz
            now + duration,
          );
        }
        break;
      }

      case 4: // fade in
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(targetGain, now + duration);
        break;

      case 5: // fade out
        masterGain.gain.setValueAtTime(targetGain, now);
        masterGain.gain.linearRampToValueAtTime(0, now + duration);
        break;

      case 6: // arpeggio fast — iterate notes n/n+1/n+2/n+3 every 4 ticks (2 if speed≤8)
      case 7: { // arpeggio slow — every 8 ticks (4 if speed≤8)
        const sfxSpeed = Math.round(duration * 60);
        const halfArp  = sfxSpeed <= 8;
        const step = effect === 6
          ? (halfArp ? 2 / 60 : 4 / 60)
          : (halfArp ? 4 / 60 : 8 / 60);
        // Build 4-pitch cycle from consecutive SFX notes; fill gaps with current pitch
        const cycle = [0, 1, 2, 3].map(offset =>
          noteToFreq(arpPitches[offset] !== undefined ? arpPitches[offset] : pitch),
        );
        for (const { osc, freqMult } of sources) {
          if (!osc.frequency || !freqMult) continue;
          let t = now;
          let i = 0;
          while (t < now + duration) {
            osc.frequency.setValueAtTime(cycle[i % 4] * freqMult, t);
            t += step;
            i++;
          }
        }
        break;
      }
      // case 0 — no effect, fall through
    }

    // -------------------------------------------------------------------------
    // De-click: ramp gain to 0 just before the note ends so the oscillator
    // doesn't cut mid-cycle and produce an audible pop.
    // Fade-out (effect 5) already reaches 0 at `duration`, so skip it.
    // -------------------------------------------------------------------------
    const DECLICK = 0.012;
    if (effect !== 5) {
      const rampStart = Math.max(now, now + duration - DECLICK);
      masterGain.gain.setValueAtTime(targetGain, rampStart);
      masterGain.gain.linearRampToValueAtTime(0, now + duration);
    }

    // -------------------------------------------------------------------------
    // Start & schedule stop for all source nodes
    // -------------------------------------------------------------------------
    for (const { osc } of sources) {
      osc.start(now);
      osc.stop(now + duration + 0.005);
    }

    this._active.push({ toStop, masterGain });

    sources[0]?.osc.addEventListener('ended', () => {
      try { masterGain.disconnect(); } catch (_) {}
      this._active = this._active.filter(a => a.toStop !== toStop);
    });
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
