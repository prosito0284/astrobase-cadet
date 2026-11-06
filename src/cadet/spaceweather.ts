// ─────────────────────────────────────────────────────────────────────────────
// "¿Cómo está el Sol ahora?" — rayos X del Sol en las últimas 24 horas, medidos
// por los satélites GOES (NOAA, construidos y lanzados con la NASA).
// Fuente en vivo: https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json
// La clase de una llamarada (A, B, C, M, X) sale del flujo de rayos X de 0.1–0.8 nm.
// ─────────────────────────────────────────────────────────────────────────────

export const XRAYS_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json';

export interface XrayRow {
  time_tag?: string;
  flux?: number;
  energy?: string;
  satellite?: number;
}

export interface XrayPoint { t: number; flux: number }

export type SunMood = 'calm' | 'active' | 'storm';

export interface SunNow {
  points: XrayPoint[];      // como mucho ~96 puntos (uno cada 15 min)
  current: string;          // clase actual, p. ej. "C1.7"
  peak: string;             // clase más alta en 24 h
  peakTime: number;         // ms UTC
  mood: SunMood;            // calm < M ≤ active < X ≤ storm
  satellite?: number;
}

const CLASSES: [string, number][] = [['X', 1e-4], ['M', 1e-5], ['C', 1e-6], ['B', 1e-7], ['A', 1e-8]];

/** Convierte flujo de rayos X (W/m²) en clase de llamarada, p. ej. 2.3e-5 → "M2.3". */
export function fluxToClass(flux: number): string {
  if (!Number.isFinite(flux) || flux <= 0) return 'A0.0';
  for (const [letter, base] of CLASSES) {
    if (flux >= base) return `${letter}${(Math.floor((flux / base) * 10 + 1e-9) / 10).toFixed(1)}`;
  }
  return `A${(Math.floor((flux / 1e-8) * 10 + 1e-9) / 10).toFixed(1)}`;
}

export function moodOf(flux: number): SunMood {
  return flux >= 1e-4 ? 'storm' : flux >= 1e-5 ? 'active' : 'calm';
}

/** Ordena, filtra el canal 0.1–0.8 nm y reduce a un punto (el máximo) cada `bucketMin` minutos. */
export function summarizeXrays(rows: XrayRow[], bucketMin = 15): SunNow | undefined {
  const clean = rows
    .filter(r => r.energy === '0.1-0.8nm' && typeof r.flux === 'number' && r.flux > 0 && typeof r.time_tag === 'string')
    .map(r => ({ t: Date.parse(r.time_tag!), flux: r.flux!, sat: r.satellite }))
    .filter(r => Number.isFinite(r.t))
    .sort((a, b) => a.t - b.t);
  if (clean.length === 0) return undefined;

  const bucketMs = bucketMin * 60_000;
  const buckets = new Map<number, XrayPoint>();
  for (const r of clean) {
    const k = Math.floor(r.t / bucketMs);
    const prev = buckets.get(k);
    if (!prev || r.flux > prev.flux) buckets.set(k, { t: r.t, flux: r.flux });
  }
  const points = [...buckets.values()].sort((a, b) => a.t - b.t);
  const last = clean[clean.length - 1];
  const peak = clean.reduce((a, b) => (b.flux > a.flux ? b : a));
  return {
    points,
    current: fluxToClass(last.flux),
    peak: fluxToClass(peak.flux),
    peakTime: peak.t,
    mood: moodOf(peak.flux),
    satellite: last.sat,
  };
}

export async function fetchSunNow(timeoutMs = 7000): Promise<SunNow | undefined> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(XRAYS_URL, { signal: ctrl.signal });
    if (!res.ok) return undefined;
    const data: unknown = await res.json();
    return Array.isArray(data) ? summarizeXrays(data as XrayRow[]) : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
