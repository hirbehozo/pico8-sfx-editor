import { audioEngine } from '../audio.js';
import { DRUM_PRESETS } from '../constants.js';

const CATS     = ['KICK', 'SNARE', 'HAT', 'PERC'];
const CAT_LABELS = { KICK: 'KICKS', SNARE: 'SNARES', HAT: 'HI-HATS', PERC: 'PERC' };
const PREVIEW_DUR = 0.35;

function matches(note, preset) {
  return (
    note?.pitch    === preset.pitch    &&
    note?.waveform === preset.waveform &&
    note?.effect   === preset.effect
  );
}

export default function DrumLibrary({ note, onApply, channel = 3, isTouch = false }) {
  const grouped = CATS.reduce((acc, cat) => {
    acc[cat] = DRUM_PRESETS.filter(p => p.cat === cat);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontSize: 8, letterSpacing: 2, color: '#83769C',
        paddingBottom: 6, borderBottom: '1px solid #1c1c1c',
        fontFamily: 'monospace',
      }}>
        DRUM LIBRARY
      </div>

      {CATS.map(cat => {
        const presets = grouped[cat];
        return (
          <div key={cat}>
            <div style={{
              fontSize: 7, letterSpacing: 2, color: '#3a3a3a',
              fontFamily: 'monospace', marginBottom: 5,
            }}>
              {CAT_LABELS[cat]}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {presets.map(preset => {
                const active = matches(note, preset);
                return (
                  <button
                    key={preset.name}
                    onClick={() => {
                      onApply({
                        pitch:    preset.pitch,
                        waveform: preset.waveform,
                        volume:   preset.volume,
                        effect:   preset.effect,
                        on:       true,
                      });
                      audioEngine.synthNote(
                        preset.pitch, preset.waveform, preset.volume,
                        preset.effect, PREVIEW_DUR, preset.pitch, channel,
                      );
                    }}
                    title={`${preset.name} — pitch ${preset.pitch}, ${['TRI','TSAW','SAW','SQR','PUL','ORG','NOI','PHA'][preset.waveform]}, ${['NON','SLD','VIB','DRP','FDI','FDO','ARP','ARS'][preset.effect]}`}
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: isTouch ? 10 : 8,
                      letterSpacing: 0.5,
                      padding: isTouch ? '10px 0' : '7px 0',
                      border: `1px solid ${active ? preset.color : '#2a2a2a'}`,
                      borderRadius: 2,
                      background: active ? `${preset.color}20` : '#111',
                      color: active ? preset.color : '#5F574F',
                      cursor: 'pointer',
                      transition: 'border-color 0.08s, color 0.08s',
                    }}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
