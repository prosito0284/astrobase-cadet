// Códigos de misión para clases: "LN-48213" = Luna, Normal, semilla 48213.
// Como el motor es determinista, todos los que usan el mismo código juegan la MISMA
// misión (mismas tarjetas, mismas tormentas, mismo orden) y pueden comparar decisiones.
import type { Site } from './data';
import type { Level } from './engine';

export interface MissionCode { site: Site; level: Level; seed: number }

export const MIN_SEED = 10000;
export const MAX_SEED = 99999;

export function formatMissionCode({ site, level, seed }: MissionCode): string {
  return `${site === 'moon' ? 'L' : 'M'}${level === 'easy' ? 'F' : 'N'}-${seed}`;
}

/** Acepta mayúsculas o minúsculas, espacios y guion opcional: "ln 48213", "LN48213". */
export function parseMissionCode(raw: string): MissionCode | null {
  const m = /^\s*([LM])\s*([FN])\s*-?\s*(\d{5})\s*$/i.exec(raw ?? '');
  if (!m) return null;
  const seed = Number(m[3]);
  if (seed < MIN_SEED || seed > MAX_SEED) return null;
  return {
    site: m[1].toUpperCase() === 'L' ? 'moon' : 'mars',
    level: m[2].toUpperCase() === 'F' ? 'easy' : 'normal',
    seed,
  };
}

/** Semilla nueva para una partida normal (también tiene código para compartir). */
export function randomSeed(rand: () => number = Math.random): number {
  return MIN_SEED + Math.floor(rand() * (MAX_SEED - MIN_SEED + 1));
}
