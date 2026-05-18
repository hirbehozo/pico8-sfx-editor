const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  box: {
    backgroundColor: '#0d0d0d',
    border: '1px solid #3a3a3a',
    borderRadius: 4,
    padding: '24px 28px',
    maxWidth: 560,
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    fontFamily: 'monospace',
    color: '#C2C3C7',
    fontSize: 11,
    lineHeight: 1.8,
  },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    borderBottom: '1px solid #1c1c1c',
    paddingBottom: 14,
  },
  title: { fontSize: 13, color: '#FFF1E8', letterSpacing: 3 },
  close: {
    fontFamily: 'monospace', fontSize: 12,
    background: 'none', border: '1px solid #3a3a3a',
    color: '#5F574F', cursor: 'pointer',
    padding: '3px 9px', borderRadius: 2,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 8, letterSpacing: 2, color: '#83769C',
    marginBottom: 8, display: 'block',
  },
  step: { display: 'flex', gap: 10, marginBottom: 5 },
  num: { color: '#29ADFF', flexShrink: 0, width: 16 },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '3px 16px',
  },
  key: { color: '#FFEC27', marginRight: 6 },
  dim: { color: '#5F574F' },
  accent: { color: '#00E436' },
  pink: { color: '#FF77A8' },
};

const Row = ({ k, children }) => (
  <div>
    <span style={S.key}>{k}</span>
    <span style={S.dim}>{children}</span>
  </div>
);

export default function HelpModal({ onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.box} onClick={e => e.stopPropagation()}>

        <div style={S.head}>
          <span style={S.title}>PICO-8 SFX EDITOR</span>
          <button style={S.close} onClick={onClose}>✕  CLOSE</button>
        </div>

        {/* ── Quick start ───────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>QUICK START</span>
          {[
            ['1.', 'Click or drag across the note grid to paint notes on.'],
            ['2.', 'Click any note bar to select it — the EDIT panel shows pitch, waveform, volume and effect.'],
            ['3.', 'Double-click a note to silence it (rest). Use the OFF button in EDIT to toggle.'],
            ['4.', 'Press PLAY (or Space) to hear all 4 tracks loop together.'],
            ['5.', 'Hit SAVE TAKE before experimenting — you can always reload a snapshot.'],
            ['6.', 'Export → COPY SFX and paste directly into your PICO-8 cart.'],
          ].map(([n, t]) => (
            <div key={n} style={S.step}>
              <span style={S.num}>{n}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>

        {/* ── Sequencer ─────────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>SEQUENCER</span>
          <div style={{ marginBottom: 8 }}>
            <span style={S.key}>STEPS</span>
            <span style={S.dim}>
              Sets how many notes the loop plays before repeating (2 / 4 / 8 / 16 / 32).
              Steps beyond the active count are dimmed and silent. Changing STEPS while
              playing takes effect immediately — no restart needed.
            </span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={S.key}>SPEED</span>
            <span style={S.dim}>note length in ticks (1 tick = 1/60 s). Higher = slower.</span>
          </div>
          <div>
            <span style={S.key}>LOOP ST / EN</span>
            <span style={S.dim}>first and last note of the pico-8 loop. set both to 0 to disable.</span>
          </div>
        </div>

        {/* ── Live recording ────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>LIVE RECORDING</span>
          <span style={S.dim}>
            While the sequencer is playing, press piano keys or send MIDI notes to
            record in real time. Each note lands on the{' '}
            <span style={S.accent}>current step</span> the loop is on when you press —
            you'll hear it on the next loop pass. The active STEPS count bounds where
            notes can land, so a 4-step loop only records into steps 0–3.
          </span>
        </div>

        {/* ── Waveforms ─────────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>BUILT-IN WAVEFORMS (0–7)</span>
          <div style={S.grid}>
            <Row k="TRI">triangle — soft, flute-like</Row>
            <Row k="TSAW">tilted saw — brighter saw with character</Row>
            <Row k="SAW">sawtooth — harsh, buzzy</Row>
            <Row k="SQR">square — hollow, reedy</Row>
            <Row k="PUL">pulse — thin, nasal</Row>
            <Row k="ORG">organ — warm layered tone</Row>
            <Row k="NOI">noise — random, for drums and SFX</Row>
            <Row k="PHA">phaser — shimmery, metallic</Row>
          </div>
        </div>

        {/* ── Waveform instruments ──────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>WAVEFORM INSTRUMENTS (W0–W7)</span>
          <span style={S.dim}>
            SFX slots 0–7 can be turned into custom waveform instruments. Click the{' '}
            <span style={S.accent}>~ INST</span> button in any of those track headers to
            switch it into drawing mode — the note grid is replaced by a 64-point
            amplitude editor. Draw a wave shape by clicking and dragging vertically.
            Green bars go above centre (positive), pink bars go below (negative).
          </span>
          <div style={{ marginTop: 8 }}>
            <span style={S.dim}>
              To use the instrument in a note: select any note, open EDIT, and pick
              one of the <span style={S.accent}>W0–W7</span> buttons below the standard
              waveforms. The note will play your drawn wave shape at whatever pitch
              and volume you set. Changes to the wave shape are heard on the next
              loop pass — no need to stop playback.
            </span>
          </div>
        </div>

        {/* ── Effects ───────────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>EFFECTS</span>
          <div style={S.grid}>
            <Row k="NON">none — note plays straight</Row>
            <Row k="SLD">slide — pitch and volume glide from the previous note</Row>
            <Row k="VIB">vibrato — pitch wobbles at ~7 Hz</Row>
            <Row k="DRP">drop — pitch falls over the note</Row>
            <Row k="FDI">fade in — volume rises from silence</Row>
            <Row k="FDO">fade out — volume falls to silence</Row>
            <Row k="ARP">arp fast — cycles notes n/n+1/n+2/n+3 every 4 ticks</Row>
            <Row k="ARS">arp slow — same, every 8 ticks</Row>
          </div>
          <div style={{ marginTop: 6, color: '#3a3a3a', fontSize: 9 }}>
            Arpeggio uses the pitches of the next 3 notes in the grid — put your chord
            tones in consecutive steps and apply ARP to the first one.
          </div>
        </div>

        {/* ── Scale ─────────────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>SCALE</span>
          <span style={S.dim}>
            Set a key and mode to lock the piano, arrow keys, and MIDI input
            to only in-scale notes. Leave on{' '}
            <span style={S.accent}>CHROMATIC</span> to play all 12 semitones freely.
          </span>
        </div>

        {/* ── Takes & patterns ──────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>TAKES</span>
          <span style={S.dim}>Save snapshots of your SFX before experimenting. Use ▶ to preview a take without overwriting your current work, LOAD to restore it.</span>
        </div>

        <div style={S.section}>
          <span style={S.sectionTitle}>PATTERNS</span>
          <span style={S.dim}>
            Combine SFX slots into up to 64 patterns, each with 4 channels for polyphony.
            Add loop begin / loop end / stop flags to control playback flow.
            Export as <span style={S.key}>__music__()</span> data ready to paste into your cart.
          </span>
        </div>

        {/* ── Keyboard shortcuts ────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>KEYBOARD SHORTCUTS</span>
          <div style={S.grid}>
            <Row k="Space">play / stop</Row>
            <Row k="← →">move between note slots</Row>
            <Row k="↑ ↓">pitch up / down</Row>
            <Row k="Shift+↑↓">volume up / down</Row>
            <Row k="Del">silence the current note</Row>
            <Row k="Tab">cycle waveform</Row>
            <Row k="1–8">set waveform directly</Row>
            <Row k="[ ]">octave down / up</Row>
            <Row k="Q–P">white piano keys (current octave)</Row>
            <Row k="Z–M + A-row">full chromatic (one octave down)</Row>
          </div>
        </div>

      </div>
    </div>
  );
}
