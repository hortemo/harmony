import { CHORDS, voiceChord } from './chords.js';
import { AudioEngine } from './audio-engine.js';

const gridEl = document.getElementById('chord-grid');
const statusEl = document.getElementById('status');
const volumeEl = document.getElementById('volume');
const reverbEl = document.getElementById('reverb');

const engine = new AudioEngine();
const buttons = new Map();
const pointerChord = new Map();
let activePointerId = null;
let latchedChord = null;
let activeButtonId = null;

const audioUnlockedText = 'Tap any chord to unlock audio';
statusEl.textContent = audioUnlockedText;

CHORDS.forEach((chord) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chord';
  btn.textContent = chord.label;
  btn.dataset.chord = chord.id;
  btn.setAttribute('aria-label', `Play ${chord.label} chord`);
  btn.addEventListener('pointerdown', (event) => handlePointerDown(event, chord.id));
  btn.addEventListener('pointerup', (event) => handlePointerEnd(event));
  btn.addEventListener('pointerleave', (event) => handlePointerEnd(event));
  btn.addEventListener('pointercancel', (event) => handlePointerEnd(event));
  btn.addEventListener('keydown', (event) => handleKeyDown(event, chord.id));
  btn.addEventListener('keyup', (event) => handleKeyUp(event, chord.id));
  gridEl.appendChild(btn);
  buttons.set(chord.id, btn);
});

async function handlePointerDown(event, chordId) {
  event.preventDefault();
  pointerChord.set(event.pointerId, chordId);
  activePointerId = event.pointerId;
  const button = buttons.get(chordId);
  button?.setPointerCapture(event.pointerId);
  try {
    await engine.ensureStarted();
    playChord(chordId, 'pointer');
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch (err) {
    console.error(err);
    updateStatus('Audio blocked: interact again to enable sound.');
  }
}

function handlePointerEnd(event) {
  const chordId = pointerChord.get(event.pointerId);
  pointerChord.delete(event.pointerId);
  if (!chordId) {
    return;
  }
  if (activePointerId !== event.pointerId) {
    return;
  }
  activePointerId = null;
  stopChord(chordId);
}

function handleKeyDown(event, chordId) {
  if (event.code !== 'Space' && event.code !== 'Enter') {
    return;
  }
  event.preventDefault();
  if (latchedChord === chordId) {
    return;
  }
  latchedChord = chordId;
  engine.ensureStarted().then(() => playChord(chordId, 'keyboard'));
}

function handleKeyUp(event, chordId) {
  if (event.code !== 'Space' && event.code !== 'Enter') {
    return;
  }
  stopChord(chordId);
  latchedChord = null;
}

function playChord(chordId, source = 'pointer') {
  try {
    const freqs = voiceChord(chordId);
    engine.playChord(chordId, freqs);
    if (source !== 'pointer') {
      pointerChord.clear();
      activePointerId = null;
    }
    if (activeButtonId && activeButtonId !== chordId) {
      setPressed(activeButtonId, false);
    }
    setPressed(chordId, true);
    activeButtonId = chordId;
    updateStatus(`Playing ${chordId}`);
  } catch (err) {
    console.error(err);
    updateStatus('Chord data missing.');
  }
}

function stopChord(chordId) {
  setPressed(chordId, false);
  engine.stopChord(chordId);
  updateStatus('');
  if (activeButtonId === chordId) {
    activeButtonId = null;
  }
  activePointerId = null;
}

function setPressed(chordId, state) {
  const button = buttons.get(chordId);
  if (button) {
    button.dataset.pressed = state ? 'true' : 'false';
  }
}

function updateStatus(text) {
  statusEl.textContent = text || '\u00a0';
}

volumeEl?.addEventListener('input', (event) => {
  const value = parseFloat(event.target.value);
  engine.setVolume(value);
});

reverbEl?.addEventListener('change', (event) => {
  engine.setReverbEnabled(event.target.checked);
});

window.addEventListener('blur', () => {
  if (engine.currentChordId) {
    stopChord(engine.currentChordId);
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((err) => console.error('Service worker registration failed', err));
  });
}

window.addEventListener('online', () => updateStatus('Back online'));
window.addEventListener('offline', () => updateStatus('Offline mode'));
