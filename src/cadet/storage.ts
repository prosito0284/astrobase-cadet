// Guardado en el navegador (localStorage / sessionStorage), siempre a prueba de bloqueos.
import { isValidSave } from './engine';
import type { CadetState } from './engine';
import type { SolarStorm } from './data';

export const SAVE_KEY = 'astrobase_cadet_game_v1';
export const LANG_KEY = 'astrobase_cadet_lang';
export const LIVE_KEY = 'astrobase_cadet_live_storm_v1';
export const TUTORIAL_KEY = 'astrobase_cadet_tutorial_done';
export const NAME_KEY = 'astrobase_cadet_name';
export const RECORDS_KEY = 'astrobase_cadet_records_v1';
export const SOUND_KEY = 'astrobase_cadet_sound';
export const LEVEL_KEY = 'astrobase_cadet_level';
export const BADGES_KEY = 'astrobase_cadet_badges_v1';
export type LiveStatus = 'loading' | 'ok' | 'fail';

export function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* almacenamiento bloqueado: el juego sigue funcionando */ }
}

export function loadGame(): CadetState | null {
  const raw = safeGet(SAVE_KEY);
  if (!raw) return null;
  try {
    const s: unknown = JSON.parse(raw);
    return isValidSave(s) ? s : null;
  } catch { return null; }
}

/** Resultado de DONKI ya consultado en esta sesión del navegador (para no gastar la cuota de la API). */
export function readCachedLive(): { status: LiveStatus; storm?: SolarStorm } | null {
  try {
    const cached = sessionStorage.getItem(LIVE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as SolarStorm | null;
    // Solo se guardan los éxitos: un fallo pasajero se vuelve a intentar al recargar.
    return parsed ? { status: 'ok', storm: parsed } : null;
  } catch {
    return null;
  }
}
