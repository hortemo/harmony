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

const SHARP_PITCHES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_PITCHES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

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

export const CHORD_TYPES = [
  { id: 'major', label: 'M', description: 'major', intervals: [0, 4, 7], suffix: '' },
  { id: 'm', label: 'm', description: 'minor', intervals: [0, 3, 7], suffix: 'm' },
  { id: '7', label: '7', description: 'dominant', intervals: [0, 4, 7, 10], suffix: '7' },
  { id: 'dim', label: 'o', description: 'diminished', intervals: [0, 3, 6], suffix: 'dim' },
  { id: 'maj7', label: 'M7', description: 'major seventh', intervals: [0, 4, 7, 11], suffix: 'maj7' },
  { id: 'm7', label: 'm7', description: 'minor seventh', intervals: [0, 3, 7, 10], suffix: 'm7' },
  { id: '7sus4', label: '7sus4', description: 'dominant suspended fourth', intervals: [0, 5, 7, 10], suffix: '7sus4' },
  { id: 'dim7', label: 'o7', description: 'diminished seventh', intervals: [0, 3, 6, 9], suffix: 'dim7' },
  { id: 'sus2', label: 'sus2', description: 'suspended second', intervals: [0, 2, 7], suffix: 'sus2' },
  { id: 'aug', label: '+', description: 'augmented', intervals: [0, 4, 8], suffix: '+' },
  { id: '6', label: '6', description: 'major sixth', intervals: [0, 4, 7, 9], suffix: '6' },
  { id: 'm6', label: 'm6', description: 'minor sixth', intervals: [0, 3, 7, 9], suffix: 'm6' },
  { id: 'm7b5', label: 'ø', description: 'half-diminished', intervals: [0, 3, 6, 10], suffix: 'm7b5' },
  { id: '9', label: '9', description: 'dominant ninth', intervals: [0, 4, 7, 10, 14], suffix: '9' },
  { id: 'm9', label: 'm9', description: 'minor ninth', intervals: [0, 3, 7, 10, 14], suffix: 'm9' },
  { id: 'maj9', label: 'M9', description: 'major ninth', intervals: [0, 4, 7, 11, 14], suffix: 'maj9' },
  { id: 'sus4', label: 'sus4', description: 'suspended fourth', intervals: [0, 5, 7], suffix: 'sus4' },
  { id: 'mMaj7', label: 'm(maj7)', description: 'minor major seventh', intervals: [0, 3, 7, 11], suffix: 'mMaj7' },
  { id: '7sharp5', label: '7#5', description: 'dominant seventh sharp five', intervals: [0, 4, 8, 10], suffix: '7#5' },
  { id: '11', label: '11', description: 'dominant eleventh', intervals: [0, 5, 7, 10, 14], suffix: '11' },
  { id: '7b9', label: '7b9', description: 'dominant seventh flat nine', intervals: [0, 4, 7, 10, 13], suffix: '7b9' },
  { id: 'm7b5_7', label: 'ø7', description: 'half-diminished seventh', intervals: [0, 3, 6, 10], suffix: 'm7b5' }
];

const CHORD_TYPE_MAP = new Map(CHORD_TYPES.map((type) => [type.id, type]));

export const CHORDS = [
  { id: 'C', label: 'I', tones: ['C', 'E', 'G'], root: 'C', chordType: 'major', allowModifiers: true },
  { id: 'Dm', label: 'ii', tones: ['D', 'F', 'A'], root: 'D', chordType: 'm', allowModifiers: true },
  { id: 'Em', label: 'iii', tones: ['E', 'G', 'B'], root: 'E', chordType: 'm', allowModifiers: true },
  { id: 'F', label: 'IV', tones: ['F', 'A', 'C'], root: 'F', chordType: 'major', allowModifiers: true },
  { id: 'G', label: 'V', tones: ['G', 'B', 'D'], root: 'G', chordType: 'major', allowModifiers: true },
  { id: 'Am', label: 'vi', tones: ['A', 'C', 'E'], root: 'A', chordType: 'm', allowModifiers: true },
  { id: 'Bm7b5', label: 'vii°', tones: ['B', 'D', 'F', 'A'], root: 'B', chordType: 'm7b5', allowModifiers: true },
  { id: 'Bb', label: 'bVII', tones: ['Bb', 'D', 'F'], root: 'Bb', chordType: 'major', allowModifiers: true },
  { id: 'C#dim', label: 'o', tones: ['C#', 'E', 'G'], root: 'C#', chordType: 'dim', allowModifiers: true },
  { id: 'D#dim', label: 'o', tones: ['D#', 'F#', 'A'], root: 'D#', chordType: 'dim', allowModifiers: true },
  { id: 'F#dim', label: 'o', tones: ['F#', 'A', 'C'], root: 'F#', chordType: 'dim', allowModifiers: true },
  { id: 'G#dim', label: 'o', tones: ['G#', 'B', 'D'], root: 'G#', chordType: 'dim', allowModifiers: true },
  { id: 'Bdim', label: 'o', tones: ['B', 'D', 'F'], root: 'B', chordType: 'dim', allowModifiers: true },
  { id: 'C7', label: '7', tones: ['C', 'E', 'G', 'Bb'], root: 'C', chordType: '7', allowModifiers: true },
  { id: 'D7', label: '7', tones: ['D', 'F#', 'A', 'C'], root: 'D', chordType: '7', allowModifiers: true },
  { id: 'E7', label: '7', tones: ['E', 'G#', 'B', 'D'], root: 'E', chordType: '7', allowModifiers: true },
  { id: 'F7', label: '7', tones: ['F', 'A', 'C', 'Eb'], root: 'F', chordType: '7', allowModifiers: true },
  { id: 'G7', label: '7', tones: ['G', 'B', 'D', 'F'], root: 'G', chordType: '7', allowModifiers: true },
  { id: 'A7', label: '7', tones: ['A', 'C#', 'E', 'G'], root: 'A', chordType: '7', allowModifiers: true },
  { id: 'B7', label: '7', tones: ['B', 'D#', 'F#', 'A'], root: 'B', chordType: '7', allowModifiers: true },
  { id: 'Edim', label: 'o', tones: ['E', 'G', 'Bb'], root: 'E', chordType: 'dim', allowModifiers: true },
  { id: 'Adim', label: 'o', tones: ['A', 'C', 'Eb'], root: 'A', chordType: 'dim', allowModifiers: true },
  { id: 'Bb7', label: '7', tones: ['Bb', 'D', 'F', 'Ab'], root: 'Bb', chordType: '7', allowModifiers: true }
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

export function ensureChordVariant(baseId, typeId) {
  const baseChord = getChord(baseId);
  if (!baseChord) {
    throw new Error(`Chord ${baseId} missing`);
  }
  const targetType = typeId || baseChord.chordType;
  if (!targetType || targetType === baseChord.chordType) {
    return baseChord;
  }
  const variantId = `${baseId}__${targetType}`;
  const existing = CHORD_MAP.get(variantId);
  if (existing) {
    return existing;
  }
  if (!baseChord.root) {
    return baseChord;
  }
  const tones = buildChordFromType(baseChord.root, targetType);
  const typeMeta = CHORD_TYPE_MAP.get(targetType);
  const variantLabel = typeMeta ? `${baseChord.label} ${typeMeta.label}` : `${baseChord.label} ${targetType}`;
  const variant = {
    ...baseChord,
    id: variantId,
    label: variantLabel,
    tones,
    chordType: targetType
  };
  CHORD_MAP.set(variantId, variant);
  return variant;
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

function buildChordFromType(root, typeId) {
  const baseOffset = NOTE_OFFSETS[root];
  const type = CHORD_TYPE_MAP.get(typeId);
  if (typeof baseOffset === 'undefined' || !type) {
    throw new Error(`Cannot build chord for ${root} (${typeId})`);
  }
  const preferFlat = root.includes('b');
  return type.intervals.map((interval) => pitchFromOffset(baseOffset + interval, preferFlat));
}

function pitchFromOffset(offset, preferFlat = false) {
  const index = ((offset % 12) + 12) % 12;
  return preferFlat ? FLAT_PITCHES[index] : SHARP_PITCHES[index];
}
