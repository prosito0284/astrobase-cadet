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
export const CLASS_KEY = 'astrobase_cadet_class_mode';
export const AUTOREAD_KEY = 'astrobase_cadet_autoread';
export const THEME_KEY = 'astrobase_cadet_theme';
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

/** Cuánto tiempo se reutiliza una llamarada en vivo ya descargada. */
export const LIVE_TTL_MS = 3 * 60 * 60 * 1000;

/**
 * Llamarada en vivo ya consultada en este navegador en las últimas 3 horas.
 * La llave pública DEMO_KEY de api.nasa.gov solo permite ~30 consultas por hora por
 * red: en un salón con muchas computadoras en el mismo wifi se agota rápido. Por eso
 * se reutiliza el resultado y solo se guardan los éxitos (un fallo se reintenta).
 */
export function readCachedLive(now: number = Date.now()): { status: LiveStatus; storm?: SolarStorm } | null {
  try {
    const raw = localStorage.getItem(LIVE_KEY) ?? sessionStorage.getItem(LIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { storm?: SolarStorm; savedAt?: number } | SolarStorm | null;
    if (!parsed) return null;
    // Formato nuevo { storm, savedAt }; el viejo era la llamarada sola (de esta sesión).
    const storm = 'savedAt' in parsed ? parsed.storm : (parsed as SolarStorm);
    const savedAt = 'savedAt' in parsed ? parsed.savedAt ?? 0 : now;
    if (!storm || typeof storm.classType !== 'string' || now - savedAt > LIVE_TTL_MS) return null;
    return { status: 'ok', storm };
  } catch {
    return null;
  }
}

export const DONKI_BACKOFF_KEY = 'astrobase_donki_backoff_until';
export const DONKI_BACKOFF_MS = 60 * 60 * 1000;

/** ¿DONKI respondió "límite de uso" o falló hace menos de 1 hora? Entonces no se le pregunta. */
export function donkiBackedOff(now: number = Date.now()): boolean {
  try { return now < Number(localStorage.getItem(DONKI_BACKOFF_KEY) ?? 0); } catch { return false; }
}

export function setDonkiBackoff(now: number = Date.now()) {
  try { localStorage.setItem(DONKI_BACKOFF_KEY, String(now + DONKI_BACKOFF_MS)); } catch { /* sin almacenamiento */ }
}

export function writeCachedLive(storm: SolarStorm, now: number = Date.now()) {
  try { localStorage.setItem(LIVE_KEY, JSON.stringify({ storm, savedAt: now })); } catch { /* sin almacenamiento */ }
}
