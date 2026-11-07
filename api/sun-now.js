// GET /api/sun-now → rayos X del Sol de las últimas 24 h (NOAA GOES), ya resumidos.
import { sunNowHandler } from './_proxy.bundle.mjs';

export default function handler(req, res) {
  return sunNowHandler(req, res);
}
