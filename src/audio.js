import { noteToFreq } from './utils.js';

// Major triad semitone offsets for arpeggio effects
const MAJOR_TRIAD = [0, 4, 7];

class AudioEngine {
  constructor() {
    this._ctx      = null;
    this._analyser = null;
    this._active   = []; // [{ toStop: Node[], masterGain: GainNode }]
  }

  getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      // AnalyserNode sits between all output and the destination so
      // WaveformDisplay can read live time-domain and frequency data.
      this._analyser = this._ctx.createAnalyser();
      this._analyser.fftSize = 2048;
      this._analyser.smoothingTimeConstant = 0.75;
      this._analyser.connect(this._ctx.destination);
    }
    // iOS and some browsers create the context in a suspended state even
    // during a user gesture. Resume whenever we're about to use it.
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  // Returns the shared AnalyserNode, or null before the first note is played.
  getAnalyser() { return this._analyser; }

  stopAll() {
    if (!this._ctx) return;
    const now = this._ctx.currentTime;
    for (const { toStop, masterGain } of this._active) {
      for (const node of toStop) {
        try { node.stop(now); } catch (_) {}
      }
      try { masterGain.disconnect(); } catch (_) {}
    }
    this._active = [];
  }

  // prevPitch defaults to pitch so slide has no effect when there is no prior note
  synthNote(pitch, waveform, volume, effect, duration, prevPitch = pitch) {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const freq = noteToFreq(pitch);
    const targetGain = 0.35 * (volume / 7);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(targetGain, now);
    masterGain.connect(this._analyser); // route through shared analyser

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

      default:
        addOsc('triangle', 1, masterGain);
    }

    // -------------------------------------------------------------------------
    // Effects
    // -------------------------------------------------------------------------
    switch (effect) {
      case 1: { // slide — linear freq ramp from prevPitch over first 40% of note
        const fromFreq = noteToFreq(prevPitch);
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

      case 6: // arpeggio fast — major triad, 40 ms per step
      case 7: { // arpeggio slow — major triad, 90 ms per step
        const step = effect === 6 ? 0.040 : 0.090;
        for (const { osc, freqMult } of sources) {
          if (!osc.frequency || !freqMult) continue;
          let t = now;
          let i = 0;
          while (t < now + duration) {
            const semitones = MAJOR_TRIAD[i % 3];
            osc.frequency.setValueAtTime(
              freq * freqMult * Math.pow(2, semitones / 12),
              t,
            );
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
    const DECLICK = 0.012; // 12 ms — inaudible as a fade, eliminates the click
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
      osc.stop(now + duration + 0.005); // tiny tail so gain ramp completes first
    }

    this._active.push({ toStop, masterGain });

    // Auto-cleanup when the first source ends so _active doesn't grow unbounded
    sources[0]?.osc.addEventListener('ended', () => {
      try { masterGain.disconnect(); } catch (_) {}
      this._active = this._active.filter(a => a.toStop !== toStop);
    });
  }
}

export const audioEngine = new AudioEngine();
export default audioEngine;
