// ─────────────────────────────────────────────────────────────────────────────
// "Código de resultado" verificable (antitrampas).
//
// El código NO contiene el puntaje: guarda la misión (sitio, nivel, semilla y, si
// la hubo, la llamarada en vivo) y las decisiones A/B de cada día. Para verificarlo
// se vuelve a jugar la misión con esas decisiones: como el motor es determinista,
// el resultado sale igual. Editar el navegador no sirve, porque el puntaje se calcula
// de nuevo y no se puede inventar. Solo cuenta lo que se jugó de verdad.
//
// Formato: R-XXXX-XXXX-XXXX (Crockford base32, sin letras confusas), con una suma
// de control de 8 bits para atrapar errores al copiarlo.
// ─────────────────────────────────────────────────────────────────────────────
import type { Site, SolarStorm } from './data';
import type { CadetState, Level, Status } from './engine';
import { choose, createGame, medal, TOTAL_DAYS } from './engine';
import { formatMissionCode } from './missionCode';

const VERSION = 1n;
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LETTERS = ['A', 'B', 'C', 'M', 'X'];
const MAX_SEED = (1 << 17) - 1;

export interface DecodedResult {
  site: Site;
  level: Level;
  seed: number;
  picks: (0 | 1)[];
  liveClass?: string; // p. ej. "M3.5" si la primera tormenta fue en vivo
}

export interface VerifiedResult extends DecodedResult {
  missionCode: string;
  status: Exclude<Status, 'playing'>;
  daysPlayed: number;
  health: number;
  air: number;
  stars: number;
  doseMSv: number;
  medal: number;
  lostReason?: 'air' | 'health';
}

function fnv8(n: bigint): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < 7; i++) {
    h ^= Number((n >> BigInt(8 * i)) & 0xffn);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h ^ (h >>> 8) ^ (h >>> 16) ^ (h >>> 24)) & 0xff;
}

function parseClass(cls: string): { letter: number; tenths: number } | null {
  const m = /^([ABCMX])(\d+(?:\.\d)?)$/.exec(cls.trim().toUpperCase());
  if (!m) return null;
  const tenths = Math.round(parseFloat(m[2]) * 10);
  if (tenths < 0 || tenths > 1023) return null;
  return { letter: LETTERS.indexOf(m[1]), tenths };
}

/** Arma el código a partir de una partida TERMINADA. undefined si no se puede (partida vieja o sin decisiones guardadas). */
export function encodeResult(game: CadetState): string | undefined {
  if (game.status === 'playing') return undefined;
  const picks = game.history.map(h => h.pick);
  if (picks.length === 0 || picks.length > TOTAL_DAYS || picks.some(p => p !== 0 && p !== 1)) return undefined;
  if (!Number.isInteger(game.seed) || game.seed < 0 || game.seed > MAX_SEED) return undefined;
  const first = game.deck[0];
  const live = first?.kind === 'storm' && first.storm.live ? parseClass(first.storm.classType) : null;
  if (first?.kind === 'storm' && first.storm.live && !live) return undefined;

  let p = 0n;
  const put = (v: number | bigint, bits: number) => { p = (p << BigInt(bits)) | (BigInt(v) & ((1n << BigInt(bits)) - 1n)); };
  put(VERSION, 2);
  put(game.site === 'mars' ? 1 : 0, 1);
  put((game.level ?? 'normal') === 'easy' ? 1 : 0, 1);
  put(game.seed, 17);
  put(picks.length, 4);
  put(picks.reduce<number>((acc, x, i) => acc | ((x as number) << i), 0), 10);
  put(live ? 1 : 0, 1);
  put(live?.letter ?? 0, 3);
  put(live?.tenths ?? 0, 10);
  const full = (p << 8n) | BigInt(fnv8(p)); // 49 + 8 = 57 bits → 12 caracteres

  let s = '';
  let v = full;
  for (let i = 0; i < 12; i++) { s = ALPHABET[Number(v & 31n)] + s; v >>= 5n; }
  return `R-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

/** Lee el código (tolera minúsculas, espacios, O→0, I/L→1). null si está mal escrito. */
export function decodeResult(raw: string): DecodedResult | null {
  const clean = (raw ?? '').toUpperCase().replace(/^\s*R[\s-]*/, '').replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (!/^[0-9A-HJKMNP-TV-Z]{12}$/.test(clean)) return null;
  let v = 0n;
  for (const ch of clean) v = (v << 5n) | BigInt(ALPHABET.indexOf(ch));
  if (v >> 57n) return null;
  const check = Number(v & 0xffn);
  let p = v >> 8n;
  if (fnv8(p) !== check) return null;
  const take = (bits: number) => { const x = Number(p & ((1n << BigInt(bits)) - 1n)); p >>= BigInt(bits); return x; };
  const tenths = take(10), letter = take(3), hasLive = take(1), picksBits = take(10), n = take(4), seed = take(17), easy = take(1), mars = take(1), version = take(2);
  if (BigInt(version) !== VERSION || n < 1 || n > TOTAL_DAYS || letter >= LETTERS.length) return null;
  const picks = Array.from({ length: n }, (_, i) => ((picksBits >> i) & 1) as 0 | 1);
  return {
    site: mars ? 'mars' : 'moon',
    level: easy ? 'easy' : 'normal',
    seed,
    picks,
    liveClass: hasLive ? `${LETTERS[letter]}${(tenths / 10).toFixed(1)}` : undefined,
  };
}

/** Vuelve a jugar la misión con esas decisiones. null si el código no corresponde a una partida terminada. */
export function verifyResult(raw: string): VerifiedResult | null {
  const d = decodeResult(raw);
  if (!d) return null;
  const live: SolarStorm | undefined = d.liveClass
    ? { id: 'live', classType: d.liveClass, date: '', live: true, story: { es: '', en: '' } }
    : undefined;
  let g = createGame(d.site, d.seed, live, d.level);
  for (const pick of d.picks) {
    if (g.status !== 'playing') return null; // sobran decisiones: no es una partida real
    g = choose(g, pick);
  }
  if (g.status === 'playing') return null; // faltan decisiones: partida sin terminar
  return {
    ...d,
    missionCode: formatMissionCode({ site: d.site, level: d.level, seed: d.seed }),
    status: g.status,
    daysPlayed: g.history.length,
    health: g.health,
    air: g.air,
    stars: g.stars,
    doseMSv: g.doseMSv,
    medal: medal(g),
    lostReason: g.lostReason,
  };
}
