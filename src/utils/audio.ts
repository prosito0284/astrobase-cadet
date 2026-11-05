// Synthesized audio using Web Audio API (Zero external assets needed - 100% procedural 0 KB footprint)

let audioCtx: AudioContext | null = null;
let isMuted = false;

export function getAudioContext(): AudioContext | null {
  if (isMuted) return null;
  if (!audioCtx) {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    } else if (typeof globalThis !== 'undefined' && (globalThis as any).AudioContext) {
      audioCtx = new (globalThis as any).AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      const p = audioCtx.resume();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    } catch {}
  }
  return audioCtx;
}

export function setAudioContext(ctx: AudioContext | null): void {
  audioCtx = ctx;
}

// ============================================================================
// NASA Apollo Houston Quindar Tones (2525 Hz intro / 2475 Hz outro)
// ============================================================================

export interface QuindarEvent {
  type: 'intro' | 'outro';
  freq: number;
  timestamp: number;
  durationMs: number;
}

export const quindarHistory: QuindarEvent[] = [];

export function clearQuindarHistory(): void {
  quindarHistory.length = 0;
}

export interface QuindarToneResult {
  success: boolean;
  frequencyHz: number;
  durationMs: number;
}

export function playQuindarTone(type: 'intro' | 'outro' = 'intro'): QuindarToneResult {
  if (isMuted) {
    return { success: false, frequencyHz: 0, durationMs: 0 };
  }

  const frequencyHz = type === 'outro' ? 2475 : 2525;
  const durationMs = 250;

  quindarHistory.push({
    type,
    freq: frequencyHz,
    timestamp: Date.now(),
    durationMs,
  });

  const ctx = getAudioContext();
  if (ctx) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequencyHz, ctx.currentTime);

      // NASA Apollo PTT/unkey Quindar tone profile: crisp onset and clean decay
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.245);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio autoplay policy catch
    }
  }

  return { success: true, frequencyHz, durationMs };
}

// ============================================================================
// General Sound Effects Suite (Zero External Assets)
// ============================================================================

export const soundFx = {
  toggleMute: () => {
    isMuted = !isMuted;
    if (isMuted) {
      spaceAmbient.stop();
      evaBreathing.stop();
    }
    return isMuted;
  },
  setMuted: (muted: boolean) => {
    isMuted = muted;
    if (isMuted) {
      spaceAmbient.stop();
      evaBreathing.stop();
    }
    return isMuted;
  },
  getIsMuted: () => isMuted,

  playClick: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  },

  playToggleOn: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {}
  },

  playToggleOff: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {}
  },

  playAlert: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(440, now + 0.12);
      osc.frequency.setValueAtTime(880, now + 0.24);
      osc.frequency.setValueAtTime(440, now + 0.36);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.48);
    } catch {}
  },

  playHarvest: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.12, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.2);
      });
    } catch {}
  },

  playVictory: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.4);
      });
    } catch {}
  },

  playRadioBeep: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  },

  // Apollo Houston Quindar Beeps
  playQuindarTone: (type: 'intro' | 'outro' = 'intro') => playQuindarTone(type),
  playQuindarIntro: () => playQuindarTone('intro'),
  playQuindarOutro: () => playQuindarTone('outro'),

  // Achievement Unlocked High-Tech Chime
  playAchievement: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.07);
        gain.gain.setValueAtTime(0.12, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.45);
      });
    } catch {}
  },
};

// ============================================================================
// Procedural Space Ambient Pad Generator (Interstellar / Cosmos inspired)
// ============================================================================

export interface ChordDefinition {
  name: string;
  freqs: number[];
}

export const SPACE_AMBIENT_CHORDS: ChordDefinition[] = [
  { name: 'Em9', freqs: [82.41, 164.81, 246.94, 392.00] },
  { name: 'Cmaj7', freqs: [130.81, 196.00, 261.63, 329.63] },
  { name: 'G', freqs: [98.00, 146.83, 196.00, 293.66] },
  { name: 'Dsus4', freqs: [110.00, 146.83, 220.00, 293.66] },
];

export class SpaceAmbientSynth {
  private isPlaying = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private activeVoices: { osc: OscillatorNode; gain: GainNode }[] = [];
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private intensity: number = 0.0; // 0.0 (calm noon) to 1.0 (eerie night / crisis)

  public readonly filterCenterHz: number = 550;
  public readonly filterSweepRange: [number, number] = [200, 800];
  public readonly chords: ChordDefinition[] = SPACE_AMBIENT_CHORDS;
  private chordIndex = 0;

  public start() {
    if (this.isPlaying || isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    this.isPlaying = true;
    try {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.04 * (1.0 + this.intensity * 0.6), ctx.currentTime);

      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(this.filterCenterHz, ctx.currentTime);
      this.filter.Q.setValueAtTime(1.2 + this.intensity * 3.5, ctx.currentTime);

      // Slow LFO frequency sweep centered at 550 Hz (sweeping 300 Hz peak = [250, 850] range)
      try {
        this.lfoOsc = ctx.createOscillator();
        this.lfoOsc.type = 'sine';
        this.lfoOsc.frequency.setValueAtTime(0.08, ctx.currentTime); // ~12.5s slow sweep cycle

        this.lfoGain = ctx.createGain();
        this.lfoGain.gain.setValueAtTime(300, ctx.currentTime);

        this.lfoOsc.connect(this.lfoGain);
        this.lfoGain.connect(this.filter.frequency);
        this.lfoOsc.start();
      } catch {}

      this.filter.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);

      this.playCurrentChord();
      this.intervalId = setInterval(() => {
        this.chordIndex = (this.chordIndex + 1) % this.chords.length;
        this.playCurrentChord();
      }, 7000);
    } catch {
      this.isPlaying = false;
    }
  }

  private playCurrentChord() {
    const ctx = getAudioContext();
    if (!ctx || !this.filter || !this.isPlaying || isMuted) return;

    // Fade out previous voices
    this.activeVoices.forEach(v => {
      try {
        v.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);
        v.osc.stop(ctx.currentTime + 2.1);
      } catch {}
    });
    this.activeVoices = [];

    // Play new chord voices with detuned multi-oscillators and warm slow attack
    const freqs = this.chords[this.chordIndex].freqs;
    freqs.forEach((freq, noteIdx) => {
      // Detuned oscillator pair for lush stereo pad spread
      const detunes = [-4, 4];
      detunes.forEach(detuneCents => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = noteIdx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          if (osc.detune) {
            osc.detune.setValueAtTime(detuneCents, ctx.currentTime);
          }

          // Warm slow attack ramp (2.5s)
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.018, ctx.currentTime + 2.5);

          osc.connect(gain);
          gain.connect(this.filter!);

          osc.start();
          this.activeVoices.push({ osc, gain });
        } catch {}
      });
    });

    // Sub-bass drone tracking fundamental note one octave below
    try {
      const droneOsc = ctx.createOscillator();
      const droneGain = ctx.createGain();
      const subBassFreq = freqs[0] * 0.5;

      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(subBassFreq, ctx.currentTime);

      const droneLevel = 0.02 + this.intensity * 0.035;
      droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      droneGain.gain.linearRampToValueAtTime(droneLevel, ctx.currentTime + 3.0);

      droneOsc.connect(droneGain);
      if (this.masterGain) {
        droneGain.connect(this.masterGain);
      } else {
        droneGain.connect(this.filter);
      }

      droneOsc.start();
      this.activeVoices.push({ osc: droneOsc, gain: droneGain });
    } catch {}
  }

  public setIntensity(level: number) {
    const sanitized = Number.isFinite(level) ? level : (level === Infinity ? 1.0 : 0.0);
    this.intensity = Math.max(0.0, Math.min(1.0, sanitized));
    const ctx = getAudioContext();
    if (ctx && this.masterGain && this.filter) {
      try {
        const targetGain = 0.04 * (1.0 + this.intensity * 0.6);
        this.masterGain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 1.0);
        this.filter.Q.linearRampToValueAtTime(1.2 + this.intensity * 3.5, ctx.currentTime + 1.0);
      } catch {}
    }
  }

  public getIntensity(): number {
    return this.intensity;
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
        this.lfoOsc.disconnect();
      } catch {}
      this.lfoOsc = null;
    }
    if (this.lfoGain) {
      try {
        this.lfoGain.disconnect();
      } catch {}
      this.lfoGain = null;
    }

    const ctx = getAudioContext();
    if (ctx) {
      this.activeVoices.forEach(v => {
        try {
          v.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
          v.osc.stop(ctx.currentTime + 0.6);
        } catch {}
      });
    }
    this.activeVoices = [];
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public dispose() {
    this.stop();
    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch {}
      this.masterGain = null;
    }
    if (this.filter) {
      try { this.filter.disconnect(); } catch {}
      this.filter = null;
    }
  }
}

export const spaceAmbient = new SpaceAmbientSynth();

// ============================================================================
// Audio EVA: Pressurized Suit Helmet Breathing Engine (6.6s respiratory cycle)
// ============================================================================

export type BreathingPhase = 'inhalation' | 'pause1' | 'exhalation' | 'pause2';

export class EvaBreathingEngine {
  private isActive: boolean = false;
  public readonly cyclePeriodSec: number = 6.6;
  private cycleProgressSec: number = 0;
  private cadenceMultiplier: number = 1.0;
  private lastUpdateTime: number = 0;

  // Web Audio Nodes
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscLow: OscillatorNode | null = null;
  private oscMid: OscillatorNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  public start(): void {
    if (this.isActive || isMuted) return;
    this.isActive = true;
    this.cycleProgressSec = 0;
    this.lastUpdateTime = Date.now();

    const ctx = getAudioContext();
    if (ctx) {
      try {
        this.masterGain = ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.001, ctx.currentTime);

        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'bandpass';
        this.filter.frequency.setValueAtTime(700, ctx.currentTime);
        this.filter.Q.setValueAtTime(1.5, ctx.currentTime);

        this.filter.connect(this.masterGain);
        this.masterGain.connect(ctx.destination);

        // Dual oscillators generating pressurized helmet air resonance
        this.oscLow = ctx.createOscillator();
        this.oscLow.type = 'sine';
        this.oscLow.frequency.setValueAtTime(140, ctx.currentTime);

        this.oscMid = ctx.createOscillator();
        this.oscMid.type = 'triangle';
        this.oscMid.frequency.setValueAtTime(480, ctx.currentTime);

        this.oscLow.connect(this.filter);
        this.oscMid.connect(this.filter);
        this.oscLow.start();
        this.oscMid.start();

        // Optional procedural white noise buffer for regulator valve hiss
        if (typeof ctx.createBuffer === 'function') {
          const bufferSize = ctx.sampleRate * 2;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.15;
          }
          this.noiseSource = ctx.createBufferSource();
          this.noiseSource.buffer = noiseBuffer;
          this.noiseSource.loop = true;
          this.noiseSource.connect(this.filter);
          this.noiseSource.start();
        }
      } catch {
        // Safe catch for environment variations
      }
    }

    // Start cadence clock
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      if (!this.isActive) return;
      const now = Date.now();
      const dt = Math.min(0.2, (now - this.lastUpdateTime) / 1000);
      this.lastUpdateTime = now;
      this.advanceCycle(dt);
    }, 100);
  }

  public stop(): void {
    this.isActive = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    const ctx = getAudioContext();
    if (ctx && this.masterGain) {
      try {
        this.masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      } catch {}
    }

    setTimeout(() => {
      if (!this.isActive) {
        if (this.oscLow) {
          try { this.oscLow.stop(); this.oscLow.disconnect(); } catch {}
          this.oscLow = null;
        }
        if (this.oscMid) {
          try { this.oscMid.stop(); this.oscMid.disconnect(); } catch {}
          this.oscMid = null;
        }
        if (this.noiseSource) {
          try { this.noiseSource.stop(); this.noiseSource.disconnect(); } catch {}
          this.noiseSource = null;
        }
        if (this.filter) {
          try { this.filter.disconnect(); } catch {}
          this.filter = null;
        }
        if (this.masterGain) {
          try { this.masterGain.disconnect(); } catch {}
          this.masterGain = null;
        }
      }
    }, 180);
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getCadenceMultiplier(): number {
    return this.cadenceMultiplier;
  }

  public updateCadence(isMoving: boolean, isSprinting: boolean, o2Pct: number, dt?: number): void {
    // Cadence factor: accelerates respiratory cadence when sprinting or when oxygen is low
    let factor = 1.0;
    if (isMoving) factor += 0.35;
    if (isSprinting) factor += 0.65; // Total 2.0x when sprinting

    // Hypoxia acceleration if O2 drops below 40%
    if (o2Pct < 40) {
      const oxygenDeficit = Math.max(0, (40 - o2Pct) / 40);
      factor += oxygenDeficit * 0.75;
    }

    this.cadenceMultiplier = Math.max(1.0, Math.min(3.0, factor));

    if (dt !== undefined && dt > 0) {
      this.advanceCycle(dt);
    }
  }

  private advanceCycle(dt: number): void {
    this.cycleProgressSec = (this.cycleProgressSec + dt * this.cadenceMultiplier) % this.cyclePeriodSec;

    // Apply real-time acoustic modulation
    const phase = this.getBreathingPhase(this.cycleProgressSec);
    const ctx = getAudioContext();
    if (!ctx || !this.masterGain || !this.filter) return;

    try {
      const now = ctx.currentTime;
      if (phase === 'inhalation') {
        // Airflow through regulator: rising hiss centered around 850 Hz
        const t = this.cycleProgressSec / 2.8;
        const gainVal = Math.sin(t * Math.PI) * 0.045;
        this.masterGain.gain.linearRampToValueAtTime(gainVal, now + 0.08);
        this.filter.frequency.linearRampToValueAtTime(800 + t * 200, now + 0.08);
      } else if (phase === 'pause1') {
        // Brief post-inhalation valve hold: near silence
        this.masterGain.gain.linearRampToValueAtTime(0.002, now + 0.08);
      } else if (phase === 'exhalation') {
        // Exhalation: lower-frequency warm chest resonance centered around 420 Hz
        const t = (this.cycleProgressSec - 3.3) / 2.8;
        const gainVal = Math.sin(t * Math.PI) * 0.038;
        this.masterGain.gain.linearRampToValueAtTime(gainVal, now + 0.08);
        this.filter.frequency.linearRampToValueAtTime(450 - t * 80, now + 0.08);
      } else {
        // Pause 2: resting valve seal before next breath
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.08);
      }
    } catch {}
  }

  public getBreathingPhase(cycleProgressSec?: number): BreathingPhase {
    const t = (cycleProgressSec !== undefined ? cycleProgressSec : this.cycleProgressSec) % this.cyclePeriodSec;
    if (t < 2.8) return 'inhalation';
    if (t < 3.3) return 'pause1';
    if (t < 6.1) return 'exhalation';
    return 'pause2';
  }

  public dispose(): void {
    this.stop();
  }
}

export const evaBreathing = new EvaBreathingEngine();
