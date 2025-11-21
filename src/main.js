import { getChord, voiceChord, ensureChordVariant, CHORD_TYPES } from './chords.js';
import { AudioEngine } from './audio-engine.js';

const modifierGridEl = document.getElementById('modifier-grid');
const harmonyGridEl = document.getElementById('harmony-grid');

const responsiveTiles = new Set();
const TILE_FONT_CONFIG = {
  ratio: 0.28,
  min: 14,
  max: 40
};
const tileFontObserver = typeof ResizeObserver !== 'undefined'
  ? new ResizeObserver((entries) => {
    entries.forEach(({ target, contentRect }) => {
      applyTileFontSize(target, contentRect);
    });
  })
  : null;

function applyTileFontSize(element, rect = null) {
  if (!element) {
    return;
  }
  const width = rect?.width ?? element.offsetWidth;
  const height = rect?.height ?? element.offsetHeight;
  const size = Math.min(width, height);
  if (!size) {
    return;
  }
  const targetSize = Math.max(
    TILE_FONT_CONFIG.min,
    Math.min(TILE_FONT_CONFIG.max, size * TILE_FONT_CONFIG.ratio)
  );
  element.style.fontSize = `${targetSize}px`;
}

function registerResponsiveTile(element) {
  if (!element || responsiveTiles.has(element)) {
    return;
  }
  responsiveTiles.add(element);
  applyTileFontSize(element);
  if (tileFontObserver) {
    tileFontObserver.observe(element);
  }
}

if (!tileFontObserver) {
  window.addEventListener('resize', () => {
    responsiveTiles.forEach((tile) => applyTileFontSize(tile));
  });
}

function preloadAudioEngine(engineInstance) {
  const warmup = () => {
    engineInstance.init().catch((err) => console.warn('Audio warmup failed', err));
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    warmup();
  } else {
    window.addEventListener('DOMContentLoaded', warmup, { once: true });
  }
}

const engine = new AudioEngine();
engine.setVolume(0.5);
preloadAudioEngine(engine);
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
// Contextual type behavior disabled
// const CONTEXTUAL_TYPE_TARGETS = new Map([...]);
const typeControlTargets = new Map();
let activeChordBaseType = null;

const TYPE_META = new Map();
CHORD_TYPES.forEach((type) => TYPE_META.set(type.id, type));

// Modifier grid layout: 4x4 grid with all chord types
const MODIFIER_LAYOUT = [
  ['major', 'maj7', 'aug', 'sus4'],
  ['m', 'm7', 'm6', 'mMaj7'],
  ['7', '7sus4', '7sharp5', '7b9'],
  ['dim', 'dim7', 'm7b5', 'm7b5_7']
];

// Harmony grid layout: 5x5 grid with border tiles
// Main chords: V, vi, vii° / I, ii, iii / IV, V, vi
// Horizontal borders (dim): between main chords
// Vertical borders (7th): dominant 7 version of chord above
// null = spacer tile
const HARMONY_LAYOUT = [
  ['G', 'G#dim', 'Am', 'A#dim', 'Bdim'],  // Row 1: V, dim, vi, dim, vii°
  ['G7', null, 'A7', null, 'B7'],         // Row 2: 7th chords (dominant 7 of chord above)
  ['C', 'C#dim', 'Dm', 'D#dim', 'Em'],    // Row 3: I, dim, ii, dim, iii
  ['C7', null, 'D7', null, 'E7'],         // Row 4: 7th chords (dominant 7 of chord above)
  ['F', 'F#dim', 'G', 'G#dim', 'Am']      // Row 5: IV, dim, V, dim, vi
];

const KEY_TYPE_SEQUENCE = [
  { key: 'shift', type: 'major' },
  { key: 'm', type: 'm' },
  { key: '7', type: '7' },
  { key: 'd', type: 'dim' }
];

const KEY_TYPE_MAP = new Map(KEY_TYPE_SEQUENCE.map(({ key, type }) => [key, type]));

// Generate modifier grid (left side)
MODIFIER_LAYOUT.forEach((row, rowIndex) => {
  row.forEach((typeId, colIndex) => {
    if (!typeId) {
      return;
    }
    const type = TYPE_META.get(typeId);
    if (!type) {
      return;
    }
    const btn = document.createElement('div');
    btn.className = 'tile type-button';
    btn.tabIndex = 0;
    btn.setAttribute('role', 'button');
    btn.textContent = type.label;
    btn.dataset.type = type.id;
    btn.style.gridRow = rowIndex + 1;
    btn.style.gridColumn = colIndex + 1;
    const description = type.description || type.label;
    btn.setAttribute('aria-label', `Hold to apply ${description} chord`);
    btn.addEventListener('pointerdown', (event) => handleTypePointerDown(event, type.id, btn));
    btn.addEventListener('pointerup', (event) => handleTypePointerEnd(event));
    btn.addEventListener('pointerleave', (event) => handleTypePointerEnd(event));
    btn.addEventListener('pointercancel', (event) => handleTypePointerEnd(event));
    modifierGridEl.appendChild(btn);
    registerResponsiveTile(btn);
    typeButtons.set(type.id, btn);
    // typeControlTargets.set(type.id, type.id);
  });
});

// Generate harmony grid (right side)
HARMONY_LAYOUT.forEach((row, rowIndex) => {
  row.forEach((chordId, colIndex) => {
    if (!chordId) {
      // Create spacer tile
      const spacer = document.createElement('div');
      spacer.className = 'tile spacer';
      spacer.dataset.variant = 'border';
      spacer.style.gridRow = rowIndex + 1;
      spacer.style.gridColumn = colIndex + 1;
      spacer.setAttribute('aria-hidden', 'true');
      harmonyGridEl.appendChild(spacer);
      return;
    }
    const chord = getChord(chordId);
    if (!chord) {
      console.warn(`Skipping unknown chord ${chordId}`);
      return;
    }
    const btn = document.createElement('div');
    btn.className = 'tile chord';
    btn.tabIndex = 0;
    btn.setAttribute('role', 'button');
    btn.textContent = chord.label;
    btn.dataset.chord = chordId;
    // Determine if this is a border tile (dim or 7th)
    const isDim = chord.chordType === 'dim';
    const is7th = chord.chordType === '7';
    if (isDim) {
      btn.dataset.variant = 'border';
      btn.dataset.orientation = 'vertical';
    } else if (is7th) {
      btn.dataset.variant = 'border';
      btn.dataset.orientation = 'horizontal';
    }
    btn.style.gridRow = rowIndex + 1;
    btn.style.gridColumn = colIndex + 1;
    btn.setAttribute('aria-label', `Play ${btn.textContent} chord`);
    btn.addEventListener('pointerdown', (event) => handlePointerDown(event, chordId, btn));
    btn.addEventListener('pointerup', (event) => handlePointerEnd(event));
    btn.addEventListener('pointerleave', (event) => handlePointerEnd(event));
    btn.addEventListener('pointercancel', (event) => handlePointerEnd(event));
    btn.addEventListener('keydown', (event) => handleKeyDown(event, chordId, btn));
    btn.addEventListener('keyup', (event) => handleKeyUp(event, chordId, btn));
    registerResponsiveTile(btn);
    harmonyGridEl.appendChild(btn);
    chordButtons.push({
      button: btn,
      chordId: chordId,
      defaultLabel: btn.textContent,
      allowModifiers: chord.allowModifiers === true
    });
  });
});

setActiveType(null);
// applyTypeControlContext(null);

async function handlePointerDown(event, chordId, button) {
  event.preventDefault();
  const selection = resolveChordSelection(chordId);
  pointerChord.set(event.pointerId, { resolvedId: selection.chordId, baseChordId: chordId, button });
  activePointerId = event.pointerId;
  button?.setPointerCapture(event.pointerId);
  try {
    await engine.ensureStarted();
    engine.unlockSilentMode();
    playChord(selection, 'pointer', button);
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
  const targetButton = document.elementFromPoint(event.clientX, event.clientY)?.closest('.tile.chord');
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
  playChord(selection, 'pointer', targetButton);
}

function handleTypePointerMove(event) {
  const entry = typePointerState.get(event.pointerId);
  if (!entry) {
    return;
  }
  const currentControlId = entry.controlId;
  const currentButton = entry.button;
  const targetButton = document.elementFromPoint(event.clientX, event.clientY)?.closest('.type-button');
  const nextControlId = targetButton?.dataset.type || null;
  if (nextControlId === currentControlId) {
    return;
  }
  if (currentControlId) {
    setTypeHeld(currentControlId, false);
  }
  if (currentButton && currentButton !== targetButton && currentButton.releasePointerCapture) {
    currentButton.releasePointerCapture(event.pointerId);
  }
  if (!nextControlId) {
    entry.controlId = null;
    entry.targetTypeId = null;
    entry.button = null;
    updateOverrideState();
    return;
  }
  entry.controlId = nextControlId;
  entry.targetTypeId = getControlTargetType(nextControlId);
  entry.button = targetButton;
  targetButton?.setPointerCapture(event.pointerId);
  setTypeHeld(nextControlId, true);
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
  latchedChord = { baseId: chordId, resolvedId: selection.chordId, button, baseTypeId: selection.baseTypeId || null };
  engine.ensureStarted().then(() => {
    engine.unlockSilentMode();
    playChord(selection, 'keyboard', button);
  });
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

function playChord(selection, source = 'pointer', button = null) {
  const target = typeof selection === 'string' ? { chordId: selection } : selection || {};
  const chordId = target?.chordId;
  if (!chordId) {
    return;
  }
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
    // Contextual type updates are disabled since all types are available.
    // applyTypeControlContext(baseTypeForContext);
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
    // applyTypeControlContext(null);
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

function updateStatus() { }

function resolveChordSelection(chordId) {
  const chord = getChord(chordId);
  if (!chord) {
    return { chordId, typeId: null, baseChordId: chordId, baseTypeId: null };
  }
  const baseTypeId = chord.chordType || null;
  if (chord.allowModifiers && manualOverrideType) {
    try {
      const variant = ensureChordVariant(chord.id, manualOverrideType);
      return {
        chordId: variant.id,
        typeId: variant.chordType || null,
        baseChordId: chord.id,
        baseTypeId
      };
    } catch (err) {
      console.warn(err);
    }
  }
  return {
    chordId: chord.id,
    typeId: chord.chordType || null,
    baseChordId: chord.id,
    baseTypeId
  };
}

function handleTypePointerDown(event, controlId, button) {
  event.preventDefault();
  const targetTypeId = getControlTargetType(controlId);
  const pointerType = event.pointerType || 'mouse';
  typePointerState.set(event.pointerId, { controlId, targetTypeId, button, pointerType });
  button?.setPointerCapture(event.pointerId);
  setTypeHeld(controlId, true);
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
  if (entry.controlId) {
    setTypeHeld(entry.controlId, false);
  }
  updateOverrideState();
}

function getActivePointerOverride() {
  const entries = [];
  typePointerState.forEach((value) => entries.push(value));
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].targetTypeId) {
      return entries[i].targetTypeId;
    }
  }
  return null;
}

function setTypeHeld(controlId, state) {
  const button = typeButtons.get(controlId);
  if (button) {
    button.dataset.held = state ? 'true' : 'false';
  }
}

function setActiveType(typeId) {
  const nextButton = getButtonForType(typeId);
  if (activeTypeButton && activeTypeButton !== nextButton) {
    activeTypeButton.dataset.active = 'false';
    activeTypeButton = null;
  }
  if (nextButton && nextButton !== activeTypeButton) {
    nextButton.dataset.active = 'true';
    activeTypeButton = nextButton;
  }
}

function getButtonForType(typeId) {
  if (!typeId) {
    return null;
  }
  return typeButtons.get(typeId) || null;
}

function getControlTargetType(controlId) {
  return controlId;
}

// function applyTypeControlContext(baseTypeId) {
//   // Disabled
// }

// function resolveControlTarget(controlId, baseTypeId) {
//   return controlId;
// }

// function updateTypeButtonVisual(controlId, targetTypeId) {
//   // Disabled
// }

function updateOverrideState() {
  const override = getActivePointerOverride() ?? getActiveKeyboardOverride() ?? null;
  if (override !== manualOverrideType) {
    manualOverrideType = override;
    refreshActiveChordVoicing();
  }
  setActiveType(manualOverrideType);
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
    playChord(selection, 'pointer', entry.button);
    pointerChord.set(pointerId, { ...entry, resolvedId: selection.chordId });
  });
  if (latchedChord?.baseId) {
    const selection = resolveChordSelection(latchedChord.baseId);
    if (selection.chordId !== latchedChord.resolvedId) {
      stopChord(latchedChord.resolvedId, { button: latchedChord.button, silent: true });
      playChord(selection, 'keyboard', latchedChord.button);
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
  const controlId = KEY_TYPE_MAP.get(key);
  if (!controlId) {
    return;
  }
  if (keyboardActiveKeys.has(key)) {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  keyboardKeyOrder += 1;
  const targetTypeId = getControlTargetType(controlId);
  keyboardActiveKeys.set(key, { typeId: targetTypeId, controlId, order: keyboardKeyOrder });
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

function getAvailableViewportSize() {
  const viewport = window.visualViewport;
  if (viewport?.width && viewport?.height) {
    return { width: viewport.width, height: viewport.height };
  }
  return {
    width: document.documentElement.clientWidth || window.innerWidth || 0,
    height: window.innerHeight || document.documentElement.clientHeight || 0
  };
}

function updateGridLayout() {
  const container = document.querySelector('.two-pane-container');
  if (!container) return;

  const { width: viewportWidth, height: viewportHeight } = getAvailableViewportSize();
  document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);

  const w = Math.min(container.clientWidth || viewportWidth, viewportWidth);
  const h = Math.min(container.clientHeight || viewportHeight, viewportHeight);

  const harmonySize = Math.min(w, h);
  const remainingW = w - harmonySize;
  const modifierSize = Math.max(0, Math.min(remainingW, h));

  if (harmonyGridEl) {
    harmonyGridEl.style.width = `${harmonySize}px`;
    harmonyGridEl.style.height = `${harmonySize}px`;
    harmonyGridEl.style.flex = 'none';
  }

  if (modifierGridEl) {
    modifierGridEl.style.width = `${modifierSize}px`;
    modifierGridEl.style.height = `${modifierSize}px`;
    modifierGridEl.style.flex = 'none';
    modifierGridEl.style.display = modifierSize < 1 ? 'none' : 'grid';
  }
}

window.addEventListener('resize', updateGridLayout);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateGridLayout);
}
// Initial layout update
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', updateGridLayout);
} else {
  updateGridLayout();
}
