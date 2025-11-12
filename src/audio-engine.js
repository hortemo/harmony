const DEFAULT_ENV = {
  attack: 0.16,
  decay: 0.6,
  sustain: 0.7,
  release: 1.1
};

const FILTER_CUTOFF = 1500;
const FILTER_Q = 0.8;
const DETUNE_CENTS = 8;
const REVERB_SEND = 0.35;

const IR_URL = './ir/room-impulse.wav';

export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.initialized = false;
    this.activeVoices = [];
    this.currentChordId = null;
    this.env = { ...DEFAULT_ENV };
    this.reverbEnabled = true;
    this.reverbReady = false;
    this.volume = 0.8;
  }

  async init() {
    if (this.initialized) {
      return;
    }
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this.volume;

    this.compressor = this.audioCtx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 25;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.audioCtx.destination);

    this.reverbSendGain = this.audioCtx.createGain();
    this.reverbSendGain.gain.value = REVERB_SEND;

    this.convolver = this.audioCtx.createConvolver();
    this.convolver.normalize = true;
    this.convolver.connect(this.masterGain);
    this.reverbSendGain.connect(this.convolver);

    try {
      await this.#loadImpulse();
      this.reverbReady = true;
    } catch (err) {
      console.warn('IR load failed, disabling reverb', err);
      this.reverbEnabled = false;
      this.reverbSendGain.gain.value = 0;
    }

    this.initialized = true;
  }

  async ensureStarted() {
    await this.init();
    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  setVolume(value) {
    this.volume = value;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(value, this.audioCtx.currentTime, 0.05);
    }
  }

  setReverbEnabled(isEnabled) {
    if (isEnabled && !this.reverbReady) {
      return;
    }
    this.reverbEnabled = Boolean(isEnabled);
    if (this.reverbSendGain && this.audioCtx) {
      const target = this.reverbEnabled ? REVERB_SEND : 0;
      this.reverbSendGain.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.08);
    }
  }

  playChord(chordId, frequencies) {
    if (!this.audioCtx || !Array.isArray(frequencies)) {
      return;
    }
    const now = this.audioCtx.currentTime;
    this.#scheduleRelease(now + 0.1);
    this.currentChordId = chordId;
    this.activeVoices = frequencies.map((freq) => this.#createVoice(freq, now));
  }

  stopChord(chordId) {
    if (this.currentChordId && chordId && chordId !== this.currentChordId) {
      return;
    }
    this.#scheduleRelease(this.audioCtx?.currentTime ?? 0);
    this.currentChordId = null;
  }

  #scheduleRelease(startTime) {
    if (!this.activeVoices.length || !this.audioCtx) {
      return;
    }
    this.activeVoices.forEach((voice) => {
      const { gainNode, oscillators } = voice;
      const current = Math.max(gainNode.gain.value, 0.0001);
      gainNode.gain.cancelScheduledValues(startTime);
      gainNode.gain.setValueAtTime(current, startTime);
      const release = Math.max(this.env.release, 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + release);
      oscillators.forEach((osc) => {
        osc.stop(startTime + release + 0.05);
      });
    });
    this.activeVoices = [];
  }

  #createVoice(frequency, startTime) {
    const oscA = this.audioCtx.createOscillator();
    const oscB = this.audioCtx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.setValueAtTime(frequency, startTime);
    oscB.frequency.setValueAtTime(frequency, startTime);
    oscA.detune.value = -DETUNE_CENTS;
    oscB.detune.value = DETUNE_CENTS;

    const gainNode = this.audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.0001, startTime);

    oscA.connect(gainNode);
    oscB.connect(gainNode);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(FILTER_CUTOFF, startTime);
    filter.Q.value = FILTER_Q;

    gainNode.connect(filter);
    filter.connect(this.masterGain);
    if (this.reverbEnabled && this.reverbReady) {
      filter.connect(this.reverbSendGain);
    }

    const attackEnd = startTime + this.env.attack;
    const decayEnd = attackEnd + this.env.decay;
    gainNode.gain.exponentialRampToValueAtTime(1, Math.max(attackEnd, startTime + 0.01));
    gainNode.gain.exponentialRampToValueAtTime(Math.max(this.env.sustain, 0.01), Math.max(decayEnd, attackEnd + 0.01));

    oscA.start(startTime);
    oscB.start(startTime);

    return { oscillators: [oscA, oscB], gainNode };
  }

  async #loadImpulse() {
    const response = await fetch(IR_URL);
    if (!response.ok) {
      throw new Error('Impulse response fetch failed');
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    this.convolver.buffer = audioBuffer;
  }
}
