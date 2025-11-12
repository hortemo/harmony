const NOTE_OFFSETS = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11
};

const BASE_A4_FREQ = 440;
const A4_MIDI = 69;

/**
 * Converts note string (e.g. 'C#4') to MIDI value.
 */
export function noteToMidi(note) {
  const match = note.match(/^([A-G](?:#|b)?)(-?\d)$/);
  if (!match) {
    throw new Error(`Invalid note: ${note}`);
  }
  const [, pitch, octaveStr] = match;
  const octave = Number(octaveStr);
  const base = NOTE_OFFSETS[pitch];
  if (typeof base === 'undefined') {
    throw new Error(`Unknown pitch: ${pitch}`);
  }
  return base + (octave + 1) * 12;
}

export function midiToFrequency(midi) {
  return BASE_A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

export function noteToFrequency(note) {
  return midiToFrequency(noteToMidi(note));
}

export const CHORDS = [
  { id: 'G7', label: 'G7', tones: ['G', 'B', 'D', 'F'], voicing: ['G3', 'B3', 'D4', 'F4'] },
  { id: 'A7', label: 'A7', tones: ['A', 'C#', 'E', 'G'], voicing: ['A3', 'C#4', 'E4', 'G4'] },
  { id: 'B7', label: 'B7', tones: ['B', 'D#', 'F#', 'A'], voicing: ['B3', 'D#4', 'F#4', 'A4'] },
  { id: 'C', label: 'C', tones: ['C', 'E', 'G'], voicing: ['G3', 'C4', 'E4'] },
  { id: 'Dm', label: 'Dm', tones: ['D', 'F', 'A'], voicing: ['A3', 'D4', 'F4'] },
  { id: 'Em', label: 'Em', tones: ['E', 'G', 'B'], voicing: ['B3', 'E4', 'G4'] },
  { id: 'F', label: 'F', tones: ['F', 'A', 'C'], voicing: ['C4', 'F4', 'A4'] },
  { id: 'G', label: 'G', tones: ['G', 'B', 'D'], voicing: ['D4', 'G4', 'B4'] },
  { id: 'Am', label: 'Am', tones: ['A', 'C', 'E'], voicing: ['C4', 'E4', 'A4'] },
  { id: 'C7', label: 'C7', tones: ['C', 'E', 'G', 'Bb'], voicing: ['G3', 'Bb3', 'C4', 'E4'] },
  { id: 'D7', label: 'D7', tones: ['D', 'F#', 'A', 'C'], voicing: ['D3', 'F#3', 'A3', 'C4'] },
  { id: 'E7', label: 'E7', tones: ['E', 'G#', 'B', 'D'], voicing: ['E3', 'G#3', 'B3', 'D4'] }
];

const CHORD_MAP = new Map(CHORDS.map((chord) => [chord.id, chord]));

export function getChord(id) {
  return CHORD_MAP.get(id);
}

export function voiceChord(id) {
  const chord = getChord(id);
  if (!chord) {
    throw new Error(`Chord ${id} missing`);
  }
  return chord.voicing.map(noteToFrequency);
}
