// GET /api/live-storm → la llamarada real más fuerte (NASA DONKI, o NOAA si DONKI falla).
import { liveStormHandler } from './_proxy';
import type { Req, Res } from './_proxy';

export default function handler(req: Req, res: Res) {
  return liveStormHandler(req, res);
}
