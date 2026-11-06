// Récords por sitio (Luna / Marte), guardados solo en este navegador.
import type { Site } from './data';
import { medal } from './engine';
import type { CadetState } from './engine';

export interface SiteRecord {
  plays: number;
  wins: number;
  bestMedal: number;      // 0–3 estrellas (solo partidas ganadas)
  bestStars: number;      // más descubrimientos en una partida
  lowestDose: number | null; // menor radiación total en una partida ganada (mSv)
}

export type Records = Record<Site, SiteRecord>;

export const EMPTY_RECORD: SiteRecord = { plays: 0, wins: 0, bestMedal: 0, bestStars: 0, lowestDose: null };

export function emptyRecords(): Records {
  return { moon: { ...EMPTY_RECORD }, mars: { ...EMPTY_RECORD } };
}

/** Lee récords guardados de forma tolerante: cualquier dato raro vuelve a cero. */
export function parseRecords(raw: string | null): Records {
  const out = emptyRecords();
  if (!raw) return out;
  try {
    const data = JSON.parse(raw) as Partial<Records>;
    for (const site of ['moon', 'mars'] as Site[]) {
      const r = data?.[site];
      if (!r || typeof r !== 'object') continue;
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
      out[site] = {
        plays: num(r.plays),
        wins: Math.min(num(r.wins), num(r.plays)),
        bestMedal: Math.min(3, num(r.bestMedal)),
        bestStars: num(r.bestStars),
        lowestDose: typeof r.lowestDose === 'number' && Number.isFinite(r.lowestDose) && r.lowestDose >= 0 ? r.lowestDose : null,
      };
    }
  } catch { /* récords dañados: empezar de cero */ }
  return out;
}

/** Suma una partida terminada a los récords. Partidas sin terminar no cuentan. */
export function addResult(records: Records, game: CadetState): Records {
  if (game.status === 'playing') return records;
  const prev = records[game.site];
  const won = game.status === 'won';
  const next: SiteRecord = {
    plays: prev.plays + 1,
    wins: prev.wins + (won ? 1 : 0),
    bestMedal: won ? Math.max(prev.bestMedal, medal(game)) : prev.bestMedal,
    bestStars: Math.max(prev.bestStars, game.stars),
    lowestDose: won ? (prev.lowestDose === null ? game.doseMSv : Math.min(prev.lowestDose, game.doseMSv)) : prev.lowestDose,
  };
  return { ...records, [game.site]: next };
}
