import { getChord, voiceChord, ensureChordVariant, CHORD_TYPES } from './chords.js';
import { AudioEngine } from './audio-engine.js';

const gridEl = document.getElementById('chord-grid');
const engine = new AudioEngine();
engine.setVolume(0.5);
const pointerChord = new Map();
const typeButtons = new Map();
const typePointerState = new Map();
const chordButtons = [];
const keyboardActiveKeys = new Map();
let activePointerId = null;
let latchedChord = null;
let activeButton = null;
let activeTypeButton = null;
let manualOverrideType = null;
let keyboardKeyOrder = 0;

const TYPE_META = new Map();
CHORD_TYPES.forEach((type) => TYPE_META.set(type.id, type));

const TILE_LAYOUT = [
  // Top outer row
  { chordId: null, variant: 'spacer', row: 1, column: 1 },
  { chordId: 'G7', variant: 'border', orientation: 'horizontal', row: 1, column: 2 },
  { chordId: null, variant: 'spacer', row: 1, column: 3 },
  { chordId: 'A7', variant: 'border', orientation: 'horizontal', row: 1, column: 4 },
  { chordId: null, variant: 'spacer', row: 1, column: 5 },
  { chordId: 'B7', variant: 'border', orientation: 'horizontal', row: 1, column: 6 },
  { chordId: null, variant: 'spacer', row: 1, column: 7 },
  // Row 2 (top main row) with outer borders
  { chordId: 'Bdim', variant: 'border', orientation: 'vertical', row: 2, column: 1 },
  { chordId: 'C', variant: 'main', row: 2, column: 2 },
  { chordId: 'C#dim', variant: 'border', orientation: 'vertical', row: 2, column: 3 },
  { chordId: 'Dm', variant: 'main', row: 2, column: 4 },
  { chordId: 'D#dim', variant: 'border', orientation: 'vertical', row: 2, column: 5 },
  { chordId: 'Em', variant: 'main', row: 2, column: 6 },
  { chordId: 'Edim', variant: 'border', orientation: 'vertical', row: 2, column: 7 },
  // Row 3 (first inner horizontal row)
  { chordId: null, variant: 'spacer', row: 3, column: 1 },
  { chordId: 'C7', variant: 'border', orientation: 'horizontal', row: 3, column: 2 },
  { chordId: null, variant: 'spacer', row: 3, column: 3 },
  { chordId: 'D7', variant: 'border', orientation: 'horizontal', row: 3, column: 4 },
  { chordId: null, variant: 'spacer', row: 3, column: 5 },
  { chordId: 'E7', variant: 'border', orientation: 'horizontal', row: 3, column: 6 },
  { chordId: null, variant: 'spacer', row: 3, column: 7 },
  // Row 4 (middle main row)
  { chordId: 'Edim', variant: 'border', orientation: 'vertical', row: 4, column: 1 },
  { chordId: 'F', variant: 'main', row: 4, column: 2 },
  { chordId: 'F#dim', variant: 'border', orientation: 'vertical', row: 4, column: 3 },
  { chordId: 'G', variant: 'main', row: 4, column: 4 },
  { chordId: 'G#dim', variant: 'border', orientation: 'vertical', row: 4, column: 5 },
  { chordId: 'Am', variant: 'main', row: 4, column: 6 },
  { chordId: 'Adim', variant: 'border', orientation: 'vertical', row: 4, column: 7 },
  // Row 5 (second inner horizontal row)
  { chordId: null, variant: 'spacer', row: 5, column: 1 },
  { chordId: 'F7', variant: 'border', orientation: 'horizontal', row: 5, column: 2 },
  { chordId: null, variant: 'spacer', row: 5, column: 3 },
  { chordId: 'G7', variant: 'border', orientation: 'horizontal', row: 5, column: 4 },
  { chordId: null, variant: 'spacer', row: 5, column: 5 },
  { chordId: 'A7', variant: 'border', orientation: 'horizontal', row: 5, column: 6 },
  { chordId: null, variant: 'spacer', row: 5, column: 7 },
  // Row 6 (bottom main row)
  { chordId: 'Adim', variant: 'border', orientation: 'vertical', row: 6, column: 1 },
  { chordId: 'Bb', variant: 'main', row: 6, column: 2 },
  { chordId: 'Bdim', variant: 'border', orientation: 'vertical', row: 6, column: 3 },
  { chordId: 'C', variant: 'main', row: 6, column: 4 },
  { chordId: 'C#dim', variant: 'border', orientation: 'vertical', row: 6, column: 5 },
  { type: 'modifier-grid', row: 6, column: 6 },
  { chordId: null, variant: 'spacer', row: 6, column: 7 },
  // Bottom outer row
  { chordId: null, variant: 'spacer', row: 7, column: 1 },
  { chordId: 'Bb7', variant: 'border', orientation: 'horizontal', row: 7, column: 2 },
  { chordId: null, variant: 'spacer', row: 7, column: 3 },
  { chordId: 'C7', variant: 'border', orientation: 'horizontal', row: 7, column: 4 },
  { chordId: null, variant: 'spacer', row: 7, column: 5 },
  { chordId: null, variant: 'spacer', row: 7, column: 6 },
  { chordId: null, variant: 'spacer', row: 7, column: 7 }
];

const TYPE_GRID_LAYOUT = [
  ['major', '7', 'maj7'],
  ['m', 'm7', 'mMaj7'],
  ['dim', 'm7b5', 'dim7'],
  ['sus4', '7sus4', '11']
];

const KEY_TYPE_SEQUENCE = [
  { key: '1', type: 'major' },
  { key: '2', type: '7' },
  { key: '3', type: 'maj7' },
  { key: 'q', type: 'm' },
  { key: 'w', type: 'm7' },
  { key: 'e', type: 'mMaj7' },
  { key: 'a', type: 'dim' },
  { key: 's', type: 'm7b5' },
  { key: 'd', type: 'dim7' },
  { key: 'z', type: 'sus4' },
  { key: 'x', type: '7sus4' },
  { key: 'c', type: '11' }
];

const KEY_TYPE_MAP = new Map(KEY_TYPE_SEQUENCE.map(({ key, type }) => [key, type]));

TILE_LAYOUT.forEach((tile) => {
  if (tile.type === 'modifier-grid') {
    const grid = document.createElement('div');
    grid.className = 'type-grid';
    grid.style.gridRow = tile.row;
    grid.style.gridColumn = tile.column;
    grid.setAttribute('aria-label', 'Chord modifier grid');
    TYPE_GRID_LAYOUT.forEach((row) => {
      row.forEach((typeId) => {
        if (!typeId) {
          const filler = document.createElement('div');
          filler.className = 'type-spacer';
          filler.setAttribute('aria-hidden', 'true');
          grid.appendChild(filler);
          return;
        }
        const type = TYPE_META.get(typeId);
        if (!type) {
          return;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'type-button';
        btn.textContent = type.label;
        btn.dataset.type = type.id;
        btn.setAttribute('aria-label', `Hold to apply ${type.label} chord`);
        btn.addEventListener('pointerdown', (event) => handleTypePointerDown(event, type.id, btn));
        btn.addEventListener('pointerup', (event) => handleTypePointerEnd(event));
        btn.addEventListener('pointerleave', (event) => handleTypePointerEnd(event));
        btn.addEventListener('pointercancel', (event) => handleTypePointerEnd(event));
        grid.appendChild(btn);
        typeButtons.set(type.id, btn);
      });
    });
    gridEl.appendChild(grid);
    return;
  }
  if (!tile.chordId) {
    const filler = document.createElement('div');
    filler.className = 'spacer';
    filler.dataset.variant = tile.variant ?? 'border';
    filler.style.gridRow = tile.row;
    filler.style.gridColumn = tile.column;
    filler.setAttribute('aria-hidden', 'true');
    gridEl.appendChild(filler);
    return;
  }

  const chord = getChord(tile.chordId);
  if (!chord) {
    console.warn(`Skipping unknown chord ${tile.chordId}`);
    return;
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chord';
  btn.textContent = tile.label ?? chord.label;
  btn.dataset.chord = tile.chordId;
  btn.dataset.variant = tile.variant;
  btn.dataset.orientation = tile.orientation ?? 'main';
  btn.style.gridRow = tile.row;
  btn.style.gridColumn = tile.column;
  btn.setAttribute('aria-label', `Play ${btn.textContent} chord`);
  btn.addEventListener('pointerdown', (event) => handlePointerDown(event, tile.chordId, btn));
  btn.addEventListener('pointerup', (event) => handlePointerEnd(event));
  btn.addEventListener('pointerleave', (event) => handlePointerEnd(event));
  btn.addEventListener('pointercancel', (event) => handlePointerEnd(event));
  btn.addEventListener('keydown', (event) => handleKeyDown(event, tile.chordId, btn));
  btn.addEventListener('keyup', (event) => handleKeyUp(event, tile.chordId, btn));
  gridEl.appendChild(btn);
  chordButtons.push({
    button: btn,
    chordId: tile.chordId,
    defaultLabel: btn.textContent,
    allowModifiers: chord.allowModifiers === true
  });
});

applyLabelOverride(null);
setActiveType(null);

async function handlePointerDown(event, chordId, button) {
  event.preventDefault();
  const selection = resolveChordSelection(chordId);
  pointerChord.set(event.pointerId, { resolvedId: selection.chordId, baseChordId: chordId, button });
  activePointerId = event.pointerId;
  button?.setPointerCapture(event.pointerId);
  try {
    await engine.ensureStarted();
    playChord(selection.chordId, 'pointer', button);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch (err) {
    console.error(err);
    updateStatus('Audio blocked: interact again to enable sound.');
  }
}

function handlePointerEnd(event) {
  if (event.type === 'pointerleave' && event.buttons !== 0) {
    return;
  }
  const entry = pointerChord.get(event.pointerId);
  pointerChord.delete(event.pointerId);
  if (!entry || !entry.resolvedId) {
    if (activePointerId === event.pointerId) {
      activePointerId = null;
    }
    return;
  }
  if (activePointerId !== event.pointerId) {
    return;
  }
  activePointerId = null;
  stopChord(entry.resolvedId, { button: entry.button });
}

function handleChordPointerMove(event) {
  if (activePointerId !== event.pointerId) {
    return;
  }
  const entry = pointerChord.get(event.pointerId);
  const currentChordId = entry?.resolvedId || null;
  const currentButton = entry?.button || null;
  const targetButton = document.elementFromPoint(event.clientX, event.clientY)?.closest('button.chord');
  const nextChordId = targetButton?.dataset.chord || null;
  if (nextChordId && nextChordId === entry?.baseChordId) {
    return;
  }
  if (!nextChordId) {
    if (currentChordId) {
      stopChord(currentChordId, { keepPointer: true, silent: true, button: currentButton });
    }
    pointerChord.set(event.pointerId, { resolvedId: null, button: null });
    return;
  }
  if (currentChordId) {
    stopChord(currentChordId, { keepPointer: true, silent: true, button: currentButton });
  }
  const selection = resolveChordSelection(nextChordId);
  pointerChord.set(event.pointerId, { resolvedId: selection.chordId, baseChordId: nextChordId, button: targetButton });
  playChord(selection.chordId, 'pointer', targetButton);
}

function handleTypePointerMove(event) {
  const entry = typePointerState.get(event.pointerId);
  if (!entry || entry.pointerType !== 'touch') {
    return;
  }
  const currentTypeId = entry.typeId;
  const currentButton = entry.button;
  const targetButton = document.elementFromPoint(event.clientX, event.clientY)?.closest('button.type-button');
  const nextTypeId = targetButton?.dataset.type || null;
  if (nextTypeId === currentTypeId) {
    return;
  }
  if (currentTypeId) {
    setTypeHeld(currentTypeId, false);
  }
  if (currentButton && currentButton !== targetButton && currentButton.releasePointerCapture) {
    currentButton.releasePointerCapture(event.pointerId);
  }
  if (!nextTypeId) {
    entry.typeId = null;
    entry.button = null;
    updateOverrideState();
    return;
  }
  entry.typeId = nextTypeId;
  entry.button = targetButton;
  targetButton?.setPointerCapture(event.pointerId);
  setTypeHeld(nextTypeId, true);
  updateOverrideState();
}

function handleKeyDown(event, chordId, button) {
  if (event.code !== 'Space' && event.code !== 'Enter') {
    return;
  }
  event.preventDefault();
  if (latchedChord?.baseId === chordId) {
    return;
  }
  const selection = resolveChordSelection(chordId);
  latchedChord = { baseId: chordId, resolvedId: selection.chordId, button };
  engine.ensureStarted().then(() => playChord(selection.chordId, 'keyboard', button));
}

function handleKeyUp(event, chordId, button) {
  if (event.code !== 'Space' && event.code !== 'Enter') {
    return;
  }
  if (latchedChord?.baseId !== chordId) {
    return;
  }
  stopChord(latchedChord.resolvedId, { button: latchedChord.button || button });
  latchedChord = null;
}

function playChord(chordId, source = 'pointer', button = null) {
  try {
    const freqs = voiceChord(chordId);
    engine.playChord(chordId, freqs);
    if (source !== 'pointer') {
      pointerChord.clear();
      activePointerId = null;
    }
    if (activeButton && activeButton !== button) {
      setPressed(activeButton, false);
    }
    if (button) {
      setPressed(button, true);
      activeButton = button;
    } else {
      activeButton = null;
    }
    const chordMeta = getChord(chordId);
    setActiveType(manualOverrideType);
    updateStatus(`Playing ${chordMeta?.label || chordId}`);
  } catch (err) {
    console.error(err);
    updateStatus('Chord data missing.');
  }
}

function stopChord(chordId, options = {}) {
  if (!chordId) {
    return;
  }
  const button = options.button ?? activeButton;
  setPressed(button, false);
  engine.stopChord(chordId);
  if (!options.silent) {
    updateStatus('');
  }
  if (activeButton && button === activeButton) {
    activeButton = null;
  }
  if (!engine.currentChordId) {
    setActiveType(manualOverrideType);
  }
  if (!options.keepPointer) {
    activePointerId = null;
  }
}

function setPressed(button, state) {
  if (!button) {
    return;
  }
  button.dataset.pressed = state ? 'true' : 'false';
}

function updateStatus() {}

function resolveChordSelection(chordId) {
  const chord = getChord(chordId);
  if (!chord) {
    return { chordId, typeId: null };
  }
  if (chord.allowModifiers && manualOverrideType) {
    try {
      const variant = ensureChordVariant(chord.id, manualOverrideType);
      return { chordId: variant.id, typeId: variant.chordType || null };
    } catch (err) {
      console.warn(err);
    }
  }
  return { chordId: chord.id, typeId: chord.chordType || null };
}

function handleTypePointerDown(event, typeId, button) {
  event.preventDefault();
  if (event.pointerType !== 'touch') {
    return;
  }
  typePointerState.set(event.pointerId, { typeId, button, pointerType: 'touch' });
  button?.setPointerCapture(event.pointerId);
  setTypeHeld(typeId, true);
  updateOverrideState();
}

function handleTypePointerEnd(event) {
  if (event.type === 'pointerleave' && event.buttons !== 0) {
    return;
  }
  const entry = typePointerState.get(event.pointerId);
  if (!entry) {
    return;
  }
  if (entry.button?.releasePointerCapture) {
    entry.button.releasePointerCapture(event.pointerId);
  }
  typePointerState.delete(event.pointerId);
  if (entry.typeId) {
    setTypeHeld(entry.typeId, false);
  }
  updateOverrideState();
}

function getActiveTouchOverride() {
  const entries = [];
  typePointerState.forEach((value) => entries.push(value));
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].pointerType === 'touch' && entries[i].typeId) {
      return entries[i].typeId;
    }
  }
  return null;
}

function setTypeHeld(typeId, state) {
  const button = typeButtons.get(typeId);
  if (button) {
    button.dataset.held = state ? 'true' : 'false';
  }
}

function setActiveType(typeId) {
  if (activeTypeButton && (!typeId || typeButtons.get(typeId) !== activeTypeButton)) {
    activeTypeButton.dataset.active = 'false';
    activeTypeButton = null;
  }
  if (typeId) {
    const button = typeButtons.get(typeId);
    if (button) {
      button.dataset.active = 'true';
      activeTypeButton = button;
    }
  }
}

function updateOverrideState() {
  const override = getActiveTouchOverride() ?? getActiveKeyboardOverride() ?? null;
  if (override !== manualOverrideType) {
    manualOverrideType = override;
    applyLabelOverride(manualOverrideType);
    refreshActiveChordVoicing();
  }
  setActiveType(manualOverrideType);
}

function applyLabelOverride(typeId) {
  const activeType = typeId ? TYPE_META.get(typeId) : null;
  chordButtons.forEach(({ button, defaultLabel, allowModifiers, chordId }) => {
    if (!allowModifiers || !activeType) {
      button.textContent = defaultLabel;
      return;
    }
    const chord = getChord(chordId);
    if (!chord) {
      button.textContent = defaultLabel;
      return;
    }
    const baseSuffix = chord.chordType ? TYPE_META.get(chord.chordType)?.suffix ?? '' : '';
    const overrideSuffix = activeType.suffix ?? '';
    let rootLabel = defaultLabel;
    if (baseSuffix && rootLabel.endsWith(baseSuffix)) {
      rootLabel = rootLabel.slice(0, -baseSuffix.length);
    }
    button.textContent = `${rootLabel}${overrideSuffix}`;
  });
}

function refreshActiveChordVoicing() {
  pointerChord.forEach((entry, pointerId) => {
    if (!entry?.baseChordId || !entry.button) {
      return;
    }
    const selection = resolveChordSelection(entry.baseChordId);
    if (selection.chordId === entry.resolvedId) {
      return;
    }
    stopChord(entry.resolvedId, { button: entry.button, keepPointer: true, silent: true });
    playChord(selection.chordId, 'pointer', entry.button);
    pointerChord.set(pointerId, { ...entry, resolvedId: selection.chordId });
  });
  if (latchedChord?.baseId) {
    const selection = resolveChordSelection(latchedChord.baseId);
    if (selection.chordId !== latchedChord.resolvedId) {
      stopChord(latchedChord.resolvedId, { button: latchedChord.button, silent: true });
      playChord(selection.chordId, 'keyboard', latchedChord.button);
      latchedChord.resolvedId = selection.chordId;
    }
  }
}

window.addEventListener('blur', () => {
  if (engine.currentChordId) {
    stopChord(engine.currentChordId);
  }
  if (keyboardActiveKeys.size) {
    keyboardActiveKeys.clear();
    updateOverrideState();
  }
});

const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.endsWith('.local');

if ('serviceWorker' in navigator && !isLocalhost) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((err) => console.error('Service worker registration failed', err));
  });
} else if ('serviceWorker' in navigator) {
  // Ensure dev server sessions do not keep using an old cached layout.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

window.addEventListener('online', () => updateStatus('Back online'));
window.addEventListener('offline', () => updateStatus('Offline mode'));
window.addEventListener('pointermove', (event) => {
  handleChordPointerMove(event);
  handleTypePointerMove(event);
});
window.addEventListener('keydown', handleTypeKeyDown);
window.addEventListener('keyup', handleTypeKeyUp);

function getActiveKeyboardOverride() {
  let active = null;
  keyboardActiveKeys.forEach((value) => {
    if (!active || value.order > active.order) {
      active = value;
    }
  });
  return active?.typeId || null;
}

function handleTypeKeyDown(event) {
  const key = event.key?.toLowerCase();
  const typeId = KEY_TYPE_MAP.get(key);
  if (!typeId) {
    return;
  }
  if (keyboardActiveKeys.has(key)) {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  keyboardKeyOrder += 1;
  keyboardActiveKeys.set(key, { typeId, order: keyboardKeyOrder });
  updateOverrideState();
}

function handleTypeKeyUp(event) {
  const key = event.key?.toLowerCase();
  if (!keyboardActiveKeys.has(key)) {
    return;
  }
  event.preventDefault();
  keyboardActiveKeys.delete(key);
  updateOverrideState();
}
