// El juego le pregunta primero al puente propio (/api/…, en Vercel): un solo pedido
// a NASA/NOAA cada pocas horas para todos los jugadores, con la llave escondida.
// Si el puente no existe (desarrollo local, otra hosting) o no responde, devuelve
// { ok: false } y el juego usa la conexión directa de siempre.
// Lo que responde el puente se valida: aunque es nuestro, se trata como dato externo.
import type { SolarStorm } from './data';
import type { SunNow } from './spaceweather';

const base = () => (typeof document !== 'undefined' ? document.baseURI : 'http://localhost/');

async function getBridge(path: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(new URL(path, base()), { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return undefined;
    return await res.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(t);
  }
}

const isText = (x: unknown, max = 600): x is string => typeof x === 'string' && x.length <= max;

export function validStorm(x: unknown): SolarStorm | null {
  if (!x || typeof x !== 'object') return null;
  const s = x as Record<string, unknown>;
  const story = s.story as Record<string, unknown> | undefined;
  if (!isText(s.id, 80) || !isText(s.classType, 8) || !/^[ABCMX]\d{1,3}(\.\d)?$/.test(s.classType) || !isText(s.date, 10)) return null;
  if (!story || !isText(story.es) || !isText(story.en)) return null;
  if (s.liveSource !== undefined && s.liveSource !== 'donki' && s.liveSource !== 'swpc') return null;
  return { id: s.id, classType: s.classType, date: s.date, live: true, liveSource: s.liveSource as SolarStorm['liveSource'], story: { es: story.es, en: story.en } };
}

export function validSun(x: unknown): SunNow | null {
  if (!x || typeof x !== 'object') return null;
  const s = x as Record<string, unknown>;
  const pts = s.points;
  if (!Array.isArray(pts) || pts.length < 2 || pts.length > 200) return null;
  if (!pts.every(p => p && typeof p === 'object' && Number.isFinite((p as { t: number }).t) && Number.isFinite((p as { flux: number }).flux) && (p as { flux: number }).flux > 0)) return null;
  if (!isText(s.current, 8) || !isText(s.peak, 8) || !Number.isFinite(s.peakTime as number)) return null;
  if (s.mood !== 'calm' && s.mood !== 'active' && s.mood !== 'storm') return null;
  return {
    points: (pts as { t: number; flux: number }[]).map(p => ({ t: p.t, flux: p.flux })),
    current: s.current, peak: s.peak, peakTime: s.peakTime as number, mood: s.mood,
    satellite: Number.isInteger(s.satellite) ? (s.satellite as number) : undefined,
  };
}

export async function bridgeStorm(timeoutMs = 8000): Promise<{ ok: true; storm: SolarStorm | null } | { ok: false }> {
  const data = await getBridge('api/live-storm', timeoutMs);
  if (!data || typeof data !== 'object' || !('storm' in data)) return { ok: false };
  const raw = (data as { storm: unknown }).storm;
  return { ok: true, storm: raw === null ? null : validStorm(raw) };
}

export async function bridgeSun(timeoutMs = 8000): Promise<{ ok: true; sun: SunNow | null } | { ok: false }> {
  const data = await getBridge('api/sun-now', timeoutMs);
  if (!data || typeof data !== 'object' || !('sun' in data)) return { ok: false };
  const raw = (data as { sun: unknown }).sun;
  return { ok: true, sun: raw === null ? null : validSun(raw) };
}
