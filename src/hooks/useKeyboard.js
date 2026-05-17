import { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../audio.js';

const PREVIEW_DUR = 0.25; // seconds; effect 0 avoids slide/arp artefacts

// ── Piano key maps ────────────────────────────────────────────────────────────
//
// Q-P row  →  white keys, current octave
//   Q W E R T Y U  I  O  P
//   C D E F G A B  C+ D+ E+   (+ = next octave)
//
// Z-M row + A-row sharps  →  full chromatic, one octave below Q-P
//   Z  S  X  D  C  V  G  B  H  N  J   M
//   C  C# D  D# E  F  F# G  G# A  A#  B

const Q_ROW = {
  q: 0,  w: 2,  e: 4,  r: 5,  t: 7,  y: 9,  u: 11,
  i: 12, o: 14, p: 16,
};

const Z_ROW = {
  z: 0,  s: 1,  x: 2,  d: 3,  c: 4,  v: 5,
  g: 6,  b: 7,  h: 8,  n: 9,  j: 10, m: 11,
};

const OCTAVE_MIN = 1;
const OCTAVE_MAX = 5;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useKeyboard({
  selectedNote,
  sfx,
  isPlaying,
  setSelectedNote,
  updateNote,
  playSfx,
  stopPlay,
  // Scale helpers — identity defaults keep the hook backwards-compatible
  snapPitch  = p => p,
  nextPitch  = (p, dir) => Math.max(0, Math.min(63, p + dir)),
}) {
  const [octave, setOctave] = useState(3); // default base octave → Q=C3

  // Keep a single stable ref-bundle so the event listener never needs to
  // re-register (empty dep array), yet always reads fresh values.
  const live = useRef({});
  live.current = { selectedNote, sfx, isPlaying, octave,
                   setSelectedNote, updateNote, playSfx, stopPlay,
                   snapPitch, nextPitch };

  useEffect(() => {
    const onKeyDown = (e) => {
      // Let browser handle keys when the user is typing in a form control
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Let browser handle Ctrl / Cmd shortcuts (copy, reload, etc.)
      if (e.ctrlKey || e.metaKey) return;

      const {
        selectedNote, sfx, isPlaying, octave,
        setSelectedNote, updateNote, playSfx, stopPlay,
        snapPitch, nextPitch,
      } = live.current;

      const note  = sfx.notes[selectedNote];
      const shift = e.shiftKey;
      const k     = e.key;
      let handled = true;

      // Play a short preview using the note's current waveform/volume
      const preview = (pitch) =>
        audioEngine.synthNote(pitch, note.waveform, note.volume || 1, 0, PREVIEW_DUR);

      // Enter a piano note: snap to scale, set pitch + on, preview, advance cursor
      const enterNote = (rawPitch) => {
        const pitch = snapPitch(Math.max(0, Math.min(63, rawPitch)));
        updateNote(selectedNote, { pitch, on: true });
        preview(pitch);
        setSelectedNote(Math.min(selectedNote + 1, 31));
      };

      switch (k) {
        // ── Navigation ─────────────────────────────────────────────────────
        case 'ArrowRight':
          setSelectedNote(Math.min(selectedNote + 1, 31));
          break;

        case 'ArrowLeft':
          setSelectedNote(Math.max(selectedNote - 1, 0));
          break;

        // ── Pitch / Volume (Shift) ─────────────────────────────────────────
        case 'ArrowUp': {
          if (shift) {
            updateNote(selectedNote, { volume: Math.min(7, note.volume + 1) });
          } else {
            const p = nextPitch(note.pitch, 1); // skips non-scale notes
            updateNote(selectedNote, { pitch: p });
            preview(p);
          }
          break;
        }

        case 'ArrowDown': {
          if (shift) {
            updateNote(selectedNote, { volume: Math.max(0, note.volume - 1) });
          } else {
            const p = nextPitch(note.pitch, -1); // skips non-scale notes
            updateNote(selectedNote, { pitch: p });
            preview(p);
          }
          break;
        }

        // ── Note on/off ────────────────────────────────────────────────────
        case 'Delete':
        case 'Backspace':
          updateNote(selectedNote, { on: false });
          break;

        // ── Transport ──────────────────────────────────────────────────────
        case ' ':
          isPlaying ? stopPlay() : playSfx();
          break;

        // ── Waveform cycle ─────────────────────────────────────────────────
        case 'Tab':
          updateNote(selectedNote, { waveform: (note.waveform + 1) % 8 });
          break;

        // ── Octave ────────────────────────────────────────────────────────
        case '[':
          setOctave(o => Math.max(OCTAVE_MIN, o - 1));
          break;

        case ']':
          setOctave(o => Math.min(OCTAVE_MAX, o + 1));
          break;

        // ── Default: waveform 1-8, piano Q row, piano Z row ───────────────
        default: {
          const lk = k.toLowerCase();

          // 1–8  →  waveform 0–7 (checked first to avoid conflict with piano)
          if (lk >= '1' && lk <= '8') {
            updateNote(selectedNote, { waveform: parseInt(lk, 10) - 1 });
            break;
          }

          // Q-P row  →  white keys + next-octave notes, current octave
          // Pitch 0 = C1, so C(octave) = (octave - 1) * 12
          if (lk in Q_ROW) {
            enterNote((octave - 1) * 12 + Q_ROW[lk]);
            break;
          }

          // Z-M row + A-row sharps  →  full chromatic, one octave below Q row
          if (lk in Z_ROW) {
            enterNote((octave - 2) * 12 + Z_ROW[lk]);
            break;
          }

          handled = false;
        }
      }

      if (handled) e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []); // Empty: listener is installed once; live ref carries fresh state

  return { octave };
}
