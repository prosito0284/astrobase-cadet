// GET /api/sun-now → rayos X del Sol de las últimas 24 h (NOAA GOES), ya resumidos.
import { sunNowHandler } from './_proxy';
import type { Req, Res } from './_proxy';

export default function handler(req: Req, res: Res) {
  return sunNowHandler(req, res);
}
