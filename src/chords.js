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
  { id: 'G7', label: 'V7', tones: ['G', 'B', 'D', 'F'] },
  { id: 'A7', label: 'VI7', tones: ['A', 'C#', 'E', 'G'] },
  { id: 'B7', label: 'VII7', tones: ['B', 'D#', 'F#', 'A'] },
  { id: 'C', label: 'I', tones: ['C', 'E', 'G'] },
  { id: 'Dm', label: 'IIm', tones: ['D', 'F', 'A'] },
  { id: 'Em', label: 'IIIm', tones: ['E', 'G', 'B'] },
  { id: 'F', label: 'IV', tones: ['F', 'A', 'C'] },
  { id: 'G', label: 'V', tones: ['G', 'B', 'D'] },
  { id: 'Am', label: 'VIm', tones: ['A', 'C', 'E'] },
  { id: 'C7', label: 'I7', tones: ['C', 'E', 'G', 'Bb'] },
  { id: 'D7', label: 'II7', tones: ['D', 'F#', 'A', 'C'] },
  { id: 'E7', label: 'III7', tones: ['E', 'G#', 'B', 'D'] }
];

const DEFAULT_ROOT_OCTAVE = 3;
const CENTER_MIDI = noteToMidi('C4');
const LOW_BOUND = noteToMidi('C3');
const HIGH_BOUND = noteToMidi('C5');
const SHIFT_OPTIONS = [-24, -12, 0, 12, 24];
const MISSING_VOICE_PENALTY = 10;

const CHORD_MAP = new Map(CHORDS.map((chord) => [chord.id, chord]));
let lastVoicing = null;

export function getChord(id) {
  return CHORD_MAP.get(id);
}

export function voiceChord(id) {
  const chord = getChord(id);
  if (!chord) {
    throw new Error(`Chord ${id} missing`);
  }
  const tones = chord.tones;
  if (!Array.isArray(tones) || tones.length === 0) {
    throw new Error(`Chord ${id} is missing tones`);
  }
  const candidates = generateCandidates(tones);
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  candidates.forEach((candidate) => {
    const score = scoreVoicing(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  });
  lastVoicing = best.slice();
  return best.map(midiToFrequency);
}

function generateCandidates(tones) {
  const base = createRootPosition(tones);
  const inversionCount = tones.length;
  const seen = new Set();
  const candidates = [];
  for (let inversion = 0; inversion < inversionCount; inversion += 1) {
    const inverted = applyInversion(base, inversion);
    SHIFT_OPTIONS.forEach((shift) => {
      const candidate = clampToRange(inverted.map((note) => note + shift));
      const key = candidate.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push(candidate);
      }
    });
  }
  return candidates;
}

function createRootPosition(tones) {
  const notes = [];
  tones.forEach((pitch) => {
    let midi = pitchToMidi(pitch, DEFAULT_ROOT_OCTAVE);
    while (notes.length && midi <= notes[notes.length - 1]) {
      midi += 12;
    }
    notes.push(midi);
  });
  return notes;
}

function applyInversion(voicing, inversion) {
  if (!inversion) {
    return voicing.slice();
  }
  const rotated = voicing.slice();
  for (let i = 0; i < inversion; i += 1) {
    const note = rotated.shift();
    if (typeof note === 'number') {
      rotated.push(note + 12);
    }
  }
  return rotated.sort((a, b) => a - b);
}

function pitchToMidi(pitch, octave) {
  const offset = NOTE_OFFSETS[pitch];
  if (typeof offset === 'undefined') {
    throw new Error(`Unknown pitch: ${pitch}`);
  }
  return offset + (octave + 1) * 12;
}

function scoreVoicing(candidate) {
  if (lastVoicing && lastVoicing.length) {
    return voicingDistance(candidate, lastVoicing) + rangePenalty(candidate);
  }
  return centerBias(candidate) + rangePenalty(candidate);
}

function voicingDistance(current, previous) {
  const length = Math.max(current.length, previous.length);
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    const a = current[i];
    const b = previous[i];
    if (typeof a === 'number' && typeof b === 'number') {
      sum += Math.abs(a - b);
    } else {
      sum += MISSING_VOICE_PENALTY;
    }
  }
  return sum;
}

function centerBias(candidate) {
  const average = candidate.reduce((acc, note) => acc + note, 0) / candidate.length;
  return Math.abs(average - CENTER_MIDI);
}

function rangePenalty(candidate) {
  let penalty = 0;
  const lowest = Math.min(...candidate);
  const highest = Math.max(...candidate);
  if (lowest < LOW_BOUND) {
    penalty += (LOW_BOUND - lowest) * 4;
  }
  if (highest > HIGH_BOUND) {
    penalty += (highest - HIGH_BOUND) * 4;
  }
  return penalty;
}

function clampToRange(notes) {
  const result = notes.slice();
  if (!result.length) {
    return result;
  }
  let min = Math.min(...result);
  let max = Math.max(...result);
  let guard = 0;
  while (min < LOW_BOUND && guard < 8) {
    if (max + 12 > HIGH_BOUND) {
      break;
    }
    for (let i = 0; i < result.length; i += 1) {
      result[i] += 12;
    }
    min = Math.min(...result);
    max = Math.max(...result);
    guard += 1;
  }
  guard = 0;
  while (max > HIGH_BOUND && guard < 8) {
    if (min - 12 < LOW_BOUND) {
      break;
    }
    for (let i = 0; i < result.length; i += 1) {
      result[i] -= 12;
    }
    min = Math.min(...result);
    max = Math.max(...result);
    guard += 1;
  }
  return result;
}
