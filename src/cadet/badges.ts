// Insignias coleccionables del Modo Cadete (se guardan solo en este navegador).
import type { T } from './data';
import type { CadetState } from './engine';
import type { Records } from './records';

export interface Badge {
  id: string;
  icon: string;
  name: T;
  how: T;            // cómo se gana (se muestra aunque no la tengas)
  earned: (game: CadetState, records: Records) => boolean;
}

const won = (g: CadetState) => g.status === 'won';

export const BADGES: Badge[] = [
  {
    id: 'first_mission',
    icon: '🚀',
    name: { es: 'Primera misión', en: 'First mission' },
    how: { es: 'Gana una misión.', en: 'Win a mission.' },
    earned: g => won(g),
  },
  {
    id: 'healthy_crew',
    icon: '💪',
    name: { es: 'Equipo sano', en: 'Healthy crew' },
    how: { es: 'Gana con 80 o más de salud.', en: 'Win with 80 or more health.' },
    earned: g => won(g) && g.health >= 80,
  },
  {
    id: 'scientist',
    icon: '🔬',
    name: { es: 'Científica / Científico', en: 'Scientist' },
    how: { es: 'Logra 3 descubrimientos en una misión.', en: 'Make 3 discoveries in one mission.' },
    earned: g => g.stars >= 3,
  },
  {
    id: 'normal_pilot',
    icon: '🧑‍🚀',
    name: { es: 'Piloto sin ayuda', en: 'Solo pilot' },
    how: { es: 'Gana en nivel Normal.', en: 'Win on Normal level.' },
    earned: g => won(g) && (g.level ?? 'normal') === 'normal',
  },
  {
    id: 'two_worlds',
    icon: '🌕🔴',
    name: { es: 'Dos mundos', en: 'Two worlds' },
    how: { es: 'Gana en la Luna y también en Marte.', en: 'Win on the Moon and on Mars.' },
    earned: (_g, r) => r.moon.wins > 0 && r.mars.wins > 0,
  },
  {
    id: 'persistent',
    icon: '🔁',
    name: { es: 'Nunca te rindes', en: 'Never give up' },
    how: { es: 'Juega 5 misiones.', en: 'Play 5 missions.' },
    earned: (_g, r) => r.moon.plays + r.mars.plays >= 5,
  },
];

/** Lee las insignias guardadas de forma tolerante (solo ids conocidos). */
export function parseBadges(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const known = new Set(BADGES.map(b => b.id));
    return [...new Set(data.filter((x): x is string => typeof x === 'string' && known.has(x)))];
  } catch {
    return [];
  }
}

/**
 * Suma las insignias que gana una partida terminada. `records` ya debe incluir esta
 * partida. Devuelve la lista completa y las nuevas (para celebrarlas).
 */
export function awardBadges(have: string[], game: CadetState, records: Records): { all: string[]; fresh: string[] } {
  if (game.status === 'playing') return { all: have, fresh: [] };
  const fresh = BADGES.filter(b => !have.includes(b.id) && b.earned(game, records)).map(b => b.id);
  return { all: [...have, ...fresh], fresh };
}
