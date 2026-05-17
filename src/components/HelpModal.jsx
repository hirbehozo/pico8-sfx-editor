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
            ['1.', 'Click or drag across the note grid to paint notes on and off.'],
            ['2.', 'Tap any note bar to select it — the EDIT panel shows its settings.'],
            ['3.', 'In EDIT, pick a waveform (the sound character) and an effect.'],
            ['4.', 'Press PLAY to hear your SFX.'],
            ['5.', 'Hit SAVE TAKE before experimenting — you can always reload a snapshot.'],
            ['6.', 'When happy, go to EXPORT → COPY SFX and paste into your PICO-8 cart.'],
          ].map(([n, t]) => (
            <div key={n} style={S.step}>
              <span style={{ ...S.num }}>{n}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>

        {/* ── SFX controls ──────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>SFX CONTROLS</span>
          <div style={S.grid}>
            <Row k="SFX 00–3F">64 slots matching pico-8's sfx() indices</Row>
            <Row k="SPEED">note length in ticks (1 tick = 1/60 s). higher = slower</Row>
            <Row k="LOOP ST / EN">first and last note of the loop. set both to 0 to disable</Row>
          </div>
        </div>

        {/* ── Waveforms ─────────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>WAVEFORMS</span>
          <div style={S.grid}>
            <Row k="TRI">triangle — soft, flute-like</Row>
            <Row k="TSAW">tilted saw — brighter saw with character</Row>
            <Row k="SAW">sawtooth — harsh, buzzy</Row>
            <Row k="SQR">square — hollow, reedy</Row>
            <Row k="PUL">pulse — thin, nasal</Row>
            <Row k="ORG">organ — warm layered tone with harmonics</Row>
            <Row k="NOI">noise — random, useful for drums and hit SFX</Row>
            <Row k="PHA">phaser — shimmery, metallic chorus</Row>
          </div>
        </div>

        {/* ── Effects ───────────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>EFFECTS</span>
          <div style={S.grid}>
            <Row k="NON">none — note plays straight</Row>
            <Row k="SLD">slide — pitch glides from the previous note</Row>
            <Row k="VIB">vibrato — pitch wobbles at ~7 Hz</Row>
            <Row k="DRP">drop — pitch falls over the note</Row>
            <Row k="FDI">fade in — volume rises from silence</Row>
            <Row k="FDO">fade out — volume falls to silence</Row>
            <Row k="ARP">arp fast — rapid major-triad arpeggio</Row>
            <Row k="ARS">arp slow — slow major-triad arpeggio</Row>
          </div>
        </div>

        {/* ── Scale ─────────────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>SCALE</span>
          <span>
            Set a key and mode to lock the piano, arrow keys, and MIDI input
            to only in-scale notes — great for staying in tune while composing.
            Leave the mode on <span style={S.accent}>CHROMATIC</span> to play all 12 semitones freely.
          </span>
        </div>

        {/* ── Takes & patterns ──────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.sectionTitle}>TAKES</span>
          <span>Save snapshots of your SFX before experimenting. Use ▶ to preview a take without overwriting your current work, LOAD to restore it.</span>
        </div>

        <div style={S.section}>
          <span style={S.sectionTitle}>PATTERNS</span>
          <span>
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
