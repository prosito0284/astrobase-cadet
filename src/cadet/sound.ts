// Sonidos cortos generados con Web Audio (sin archivos que descargar).
// Volumen bajo a propósito: el juego se usa en salones con muchos niños.

export type SoundKind = 'tap' | 'good' | 'bad' | 'storm' | 'win' | 'lose' | 'ping';

type Note = [freq: number, startS: number, durS: number, wave?: OscillatorType];

const PATTERNS: Record<SoundKind, Note[]> = {
  tap: [[660, 0, 0.06, 'triangle']],
  good: [[523, 0, 0.1], [784, 0.09, 0.14]],
  bad: [[330, 0, 0.14, 'sawtooth'], [220, 0.12, 0.2, 'sawtooth']],
  storm: [[180, 0, 0.35, 'sawtooth'], [140, 0.05, 0.4, 'square']],
  win: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.3]],
  lose: [[392, 0, 0.18, 'triangle'], [330, 0.18, 0.18, 'triangle'], [262, 0.36, 0.35, 'triangle']],
  ping: [[1319, 0, 0.12, 'sine'], [1760, 0.08, 0.16, 'sine']],
};

let ctx: AudioContext | null = null;

export function playSound(kind: SoundKind, volume = 0.08): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.01;
    for (const [freq, start, dur, wave = 'sine'] of PATTERNS[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.02);
    }
  } catch { /* sin audio: el juego sigue igual */ }
}
