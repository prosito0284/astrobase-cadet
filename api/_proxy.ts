// ─────────────────────────────────────────────────────────────────────────────
// Puente seguro a NASA/NOAA (funciones de Vercel). Lógica compartida y testeable.
//
// Seguridad por diseño:
// - Solo GET/HEAD. Cualquier otro método → 405.
// - Las direcciones de NASA y NOAA están FIJAS en el código: nada de lo que mande
//   el usuario (parámetros, cabeceras, cuerpo) se usa para decidir a dónde conectarse
//   → no se puede usar el puente para visitar otros sitios (SSRF).
// - La llave de NASA vive en la variable de servidor NASA_API_KEY: nunca llega al navegador.
// - Respuesta mínima y validada; los errores no revelan detalles internos.
// - Caché en el CDN de Vercel: NASA/NOAA reciben ~1 consulta cada 3 h (llamarada)
//   o cada 15 min (gráfica del Sol), sin importar cuántos niños jueguen.
// ─────────────────────────────────────────────────────────────────────────────
import { fetchLiveStorm } from '../src/cadet/engine';
import { fetchSunNow } from '../src/cadet/spaceweather';

export interface Req { method?: string }
export interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

const JSON_HEADERS: [string, string][] = [
  ['Content-Type', 'application/json; charset=utf-8'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'no-referrer'],
];

function send(res: Res, status: number, body: unknown, cache: string) {
  for (const [k, v] of JSON_HEADERS) res.setHeader(k, v);
  res.setHeader('Cache-Control', cache);
  res.status(status).end(JSON.stringify(body));
}

function onlyGet(req: Req, res: Res): boolean {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  res.setHeader('Allow', 'GET, HEAD');
  send(res, 405, { error: 'method not allowed' }, 'no-store');
  return false;
}

export const CACHE_STORM_OK = 'public, max-age=0, s-maxage=10800, stale-while-revalidate=3600';
export const CACHE_SUN_OK = 'public, max-age=0, s-maxage=900, stale-while-revalidate=600';
export const CACHE_FAIL = 'public, max-age=0, s-maxage=300';

/** Llave válida de api.nasa.gov (solo letras y números); si no, DEMO_KEY. */
export function nasaKey(env: Record<string, string | undefined>): string {
  const k = (env.NASA_API_KEY ?? '').trim();
  return /^[A-Za-z0-9]{20,64}$/.test(k) ? k : 'DEMO_KEY';
}

const serverEnv = (): Record<string, string | undefined> =>
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

export async function liveStormHandler(req: Req, res: Res, env: Record<string, string | undefined> = serverEnv()) {
  if (!onlyGet(req, res)) return;
  try {
    const storm = await fetchLiveStorm(6000, nasaKey(env));
    if (!storm) return send(res, 200, { storm: null }, CACHE_FAIL);
    // Solo los campos que el juego necesita.
    const { id, classType, date, live, liveSource, story } = storm;
    return send(res, 200, { storm: { id, classType, date, live, liveSource, story }, fetchedAt: new Date().toISOString() }, CACHE_STORM_OK);
  } catch {
    return send(res, 200, { storm: null }, CACHE_FAIL);
  }
}

export async function sunNowHandler(req: Req, res: Res) {
  if (!onlyGet(req, res)) return;
  try {
    const sun = await fetchSunNow(7000);
    return send(res, 200, { sun: sun ?? null }, sun ? CACHE_SUN_OK : CACHE_FAIL);
  } catch {
    return send(res, 200, { sun: null }, CACHE_FAIL);
  }
}
