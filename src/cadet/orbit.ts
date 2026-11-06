// ─────────────────────────────────────────────────────────────────────────────
// Distancia Tierra–Marte y retraso de las comunicaciones para una fecha dada.
//
// Usa los elementos orbitales aproximados de JPL ("Keplerian Elements for
// Approximate Positions of the Major Planets", E. M. Standish, válido 1800–2050)
// y resuelve la ecuación de Kepler. Ignora la pequeña inclinación de Marte
// (1.85°), así que el error es de unos pocos por ciento: suficiente para
// enseñar "hoy un mensaje tarda ~X minutos". Es un CÁLCULO, no un dato en vivo.
// Fuente: https://ssd.jpl.nasa.gov/planets/approx_pos.html
// ─────────────────────────────────────────────────────────────────────────────

export const AU_KM = 149_597_870.7;
export const LIGHT_KM_S = 299_792.458;
export const MOON_KM = 384_400;

interface Elements {
  a: number;      // semieje mayor (UA)
  e: number;      // excentricidad
  L0: number;     // longitud media en J2000 (grados)
  Ldot: number;   // grados por siglo
  w0: number;     // longitud del perihelio en J2000 (grados)
  wdot: number;   // grados por siglo
}

const EARTH: Elements = { a: 1.00000261, e: 0.01671123, L0: 100.46457166, Ldot: 35999.37244981, w0: 102.93768193, wdot: 0.32327364 };
const MARS: Elements = { a: 1.52371034, e: 0.0933941, L0: -4.55343205, Ldot: 19140.30268499, w0: -23.94362959, wdot: 0.44441088 };

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const DEG = Math.PI / 180;

function position(el: Elements, centuries: number): [number, number] {
  const L = el.L0 + el.Ldot * centuries;
  const w = el.w0 + el.wdot * centuries;
  let M = ((L - w) % 360) * DEG;
  if (M > Math.PI) M -= 2 * Math.PI;
  if (M < -Math.PI) M += 2 * Math.PI;
  let E = M;
  for (let i = 0; i < 12; i++) E -= (E - el.e * Math.sin(E) - M) / (1 - el.e * Math.cos(E));
  const xp = el.a * (Math.cos(E) - el.e);
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const c = Math.cos(w * DEG);
  const s = Math.sin(w * DEG);
  return [xp * c - yp * s, xp * s + yp * c];
}

/** Distancia aproximada Tierra–Marte en km para un instante (milisegundos UTC). */
export function earthMarsDistanceKm(timeMs: number): number {
  const T = (timeMs - J2000_MS) / (36525 * 86_400_000);
  const [ex, ey] = position(EARTH, T);
  const [mx, my] = position(MARS, T);
  return Math.hypot(mx - ex, my - ey) * AU_KM;
}

/** Segundos que tarda la luz (o la radio) en recorrer esa distancia, solo ida. */
export function lightDelaySeconds(km: number): number {
  return km / LIGHT_KM_S;
}

/** Minutos de retraso Tierra→Marte para ese instante (solo ida), con un decimal. */
export function marsDelayMinutes(timeMs: number): number {
  return Math.round((lightDelaySeconds(earthMarsDistanceKm(timeMs)) / 60) * 10) / 10;
}
