// GET /api/live-storm → la llamarada real más fuerte (NASA DONKI, o NOAA si DONKI falla).
// La lógica (y sus tests) está en api/_proxy.ts; aquí se usa su versión empaquetada.
import { liveStormHandler } from './_proxy.bundle.mjs';

export default function handler(req, res) {
  return liveStormHandler(req, res);
}
