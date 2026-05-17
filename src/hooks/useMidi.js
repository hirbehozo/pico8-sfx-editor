import { useState, useEffect, useRef } from 'react';

// midiStatus values: 'pending' | 'unsupported' | 'denied' | 'ready'

export function useMidi(onNoteOn) {
  const [midiStatus, setMidiStatus] = useState('pending');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Stable ref so the onmidimessage handler never captures a stale callback
  const onNoteOnRef = useRef(onNoteOn);
  useEffect(() => { onNoteOnRef.current = onNoteOn; }, [onNoteOn]);

  // -------------------------------------------------------------------------
  // Request MIDI access once; keep device list in sync via onstatechange
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setMidiStatus('unsupported');
      return;
    }

    let access = null;

    navigator.requestMIDIAccess().then(
      (midiAccess) => {
        access = midiAccess;
        setDevices(Array.from(midiAccess.inputs.values()));
        setMidiStatus('ready');

        // Hot-plug: device connected or disconnected
        midiAccess.onstatechange = () => {
          const inputs = Array.from(midiAccess.inputs.values());
          setDevices(inputs);

          // If the selected port was removed, clear the selection
          setSelectedDevice((prev) => {
            if (prev && !midiAccess.inputs.has(prev.id)) return null;
            return prev;
          });
        };
      },
      () => setMidiStatus('denied'),
    );

    return () => {
      if (access) access.onstatechange = null;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Attach onmidimessage to the selected device; re-attach on change
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!selectedDevice) return;

    selectedDevice.onmidimessage = (event) => {
      const [status, note, velocity] = event.data;
      const cmd = status & 0xf0;

      if (cmd === 0x90 && velocity > 0) {
        // Note-on: offset MIDI note by 36 and clamp to PICO-8 pitch range 0-63
        const pitch = Math.max(0, Math.min(63, note - 36));
        onNoteOnRef.current?.(pitch);
        return;
      }

      // Note-off: cmd 0x80, or cmd 0x90 with velocity 0 (running-status convention)
      // No external callback requested; recognised and silently consumed.
    };

    return () => {
      selectedDevice.onmidimessage = null;
    };
  }, [selectedDevice]);

  return { midiStatus, devices, selectedDevice, setSelectedDevice };
}
