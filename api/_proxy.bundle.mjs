// ⚠️ Archivo generado por scripts/bundle-api.mjs a partir de api/_proxy.ts. No editar a mano.

// src/cadet/engine.ts
var CLASS_ORDER = { A: 0, B: 1, C: 2, M: 3, X: 4 };
function flareRank(classType) {
  const m = /^([ABCMX])\s*(\d+(?:\.\d+)?)/i.exec(classType.trim());
  if (!m) return -1;
  return CLASS_ORDER[m[1].toUpperCase()] * 100 + parseFloat(m[2]);
}
function stormFromDonki(flares) {
  const valid = flares.filter((f) => typeof f.classType === "string" && flareRank(f.classType) >= 0);
  if (valid.length === 0) return void 0;
  const best = valid.reduce((a, b) => flareRank(b.classType) > flareRank(a.classType) ? b : a);
  const date = (best.peakTime ?? best.beginTime ?? "").slice(0, 10);
  const cls = best.classType;
  return {
    id: best.flrID ?? `live-${date}`,
    classType: cls,
    date,
    live: true,
    story: {
      es: `Esta llamarada ${cls} es REAL: el Sol la lanz\xF3 el ${date}, hace pocos d\xEDas. Los datos llegaron en vivo desde DONKI de la NASA al empezar tu partida.`,
      en: `This ${cls} flare is REAL: the Sun fired it on ${date}, just days ago. The data came live from NASA's DONKI when your game started.`
    }
  };
}
var isWeak = (cls) => flareRank(cls) < CLASS_ORDER.M * 100;
function stormFromSwpc(flares) {
  const valid = flares.filter((f) => typeof f.max_class === "string" && flareRank(f.max_class) >= 0);
  if (valid.length === 0) return void 0;
  const best = valid.reduce((a, b) => flareRank(b.max_class) > flareRank(a.max_class) ? b : a);
  const date = (best.max_time ?? best.begin_time ?? "").slice(0, 10);
  const cls = best.max_class;
  const calm = isWeak(cls);
  return {
    id: `swpc-${cls}-${date}`,
    classType: cls,
    date,
    live: true,
    liveSource: "swpc",
    story: {
      es: `Esta llamarada ${cls} es REAL: los sat\xE9lites GOES la midieron el ${date}. Los datos llegaron en vivo desde NOAA SWPC al empezar tu partida.${calm ? " Fue peque\xF1a: esta semana el Sol estuvo bastante tranquilo." : ""}`,
      en: `This ${cls} flare is REAL: the GOES satellites measured it on ${date}. The data came live from NOAA SWPC when your game started.${calm ? " It was small: the Sun was fairly calm this week." : ""}`
    }
  };
}
async function getJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return { status: res.status };
    return { status: res.status, data: await res.json() };
  } catch {
    return { status: 0 };
  } finally {
    clearTimeout(timer);
  }
}
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
var SWPC_FLARES_URL = "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json";
async function fetchLiveStorm(timeoutMs = 6e3, apiKey = "DEMO_KEY", opts = {}) {
  if (!opts.skipDonki) {
    const end = /* @__PURE__ */ new Date();
    const start = new Date(end.getTime() - 30 * 24 * 3600 * 1e3);
    const donki = await getJson(
      `https://api.nasa.gov/DONKI/FLR?startDate=${isoDate(start)}&endDate=${isoDate(end)}&api_key=${encodeURIComponent(apiKey)}`,
      timeoutMs
    );
    opts.onDonkiStatus?.(donki.status);
    const fromDonki = Array.isArray(donki.data) ? stormFromDonki(donki.data) : void 0;
    if (fromDonki) return fromDonki;
  }
  const swpc = await getJson(SWPC_FLARES_URL, timeoutMs);
  return Array.isArray(swpc.data) ? stormFromSwpc(swpc.data) : void 0;
}

// src/cadet/spaceweather.ts
var XRAYS_URL = "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json";
var CLASSES = [["X", 1e-4], ["M", 1e-5], ["C", 1e-6], ["B", 1e-7], ["A", 1e-8]];
function fluxToClass(flux) {
  if (!Number.isFinite(flux) || flux <= 0) return "A0.0";
  for (const [letter, base] of CLASSES) {
    if (flux >= base) return `${letter}${(Math.floor(flux / base * 10 + 1e-9) / 10).toFixed(1)}`;
  }
  return `A${(Math.floor(flux / 1e-8 * 10 + 1e-9) / 10).toFixed(1)}`;
}
function moodOf(flux) {
  return flux >= 1e-4 ? "storm" : flux >= 1e-5 ? "active" : "calm";
}
function summarizeXrays(rows, bucketMin = 15) {
  const clean = rows.filter((r) => r.energy === "0.1-0.8nm" && typeof r.flux === "number" && r.flux > 0 && typeof r.time_tag === "string").map((r) => ({ t: Date.parse(r.time_tag), flux: r.flux, sat: r.satellite })).filter((r) => Number.isFinite(r.t)).sort((a, b) => a.t - b.t);
  if (clean.length === 0) return void 0;
  const bucketMs = bucketMin * 6e4;
  const buckets = /* @__PURE__ */ new Map();
  for (const r of clean) {
    const k = Math.floor(r.t / bucketMs);
    const prev = buckets.get(k);
    if (!prev || r.flux > prev.flux) buckets.set(k, { t: r.t, flux: r.flux });
  }
  const points = [...buckets.values()].sort((a, b) => a.t - b.t);
  const last = clean[clean.length - 1];
  const peak = clean.reduce((a, b) => b.flux > a.flux ? b : a);
  return {
    points,
    current: fluxToClass(last.flux),
    peak: fluxToClass(peak.flux),
    peakTime: peak.t,
    mood: moodOf(peak.flux),
    satellite: last.sat
  };
}
async function fetchSunNow(timeoutMs = 7e3) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(XRAYS_URL, { signal: ctrl.signal });
    if (!res.ok) return void 0;
    const data = await res.json();
    return Array.isArray(data) ? summarizeXrays(data) : void 0;
  } catch {
    return void 0;
  } finally {
    clearTimeout(timer);
  }
}

// api/_proxy.ts
var JSON_HEADERS = [
  ["Content-Type", "application/json; charset=utf-8"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "no-referrer"]
];
function send(res, status, body, cache) {
  for (const [k, v] of JSON_HEADERS) res.setHeader(k, v);
  res.setHeader("Cache-Control", cache);
  res.status(status).end(JSON.stringify(body));
}
function onlyGet(req, res) {
  if (req.method === "GET" || req.method === "HEAD") return true;
  res.setHeader("Allow", "GET, HEAD");
  send(res, 405, { error: "method not allowed" }, "no-store");
  return false;
}
var CACHE_STORM_OK = "public, max-age=0, s-maxage=10800, stale-while-revalidate=3600";
var CACHE_SUN_OK = "public, max-age=0, s-maxage=900, stale-while-revalidate=600";
var CACHE_FAIL = "public, max-age=0, s-maxage=300";
function nasaKey(env) {
  const k = (env.NASA_API_KEY ?? "").trim();
  return /^[A-Za-z0-9]{20,64}$/.test(k) ? k : "DEMO_KEY";
}
var serverEnv = () => globalThis.process?.env ?? {};
async function liveStormHandler(req, res, env = serverEnv()) {
  if (!onlyGet(req, res)) return;
  try {
    const storm = await fetchLiveStorm(6e3, nasaKey(env));
    if (!storm) return send(res, 200, { storm: null }, CACHE_FAIL);
    const { id, classType, date, live, liveSource, story } = storm;
    return send(res, 200, { storm: { id, classType, date, live, liveSource, story }, fetchedAt: (/* @__PURE__ */ new Date()).toISOString() }, CACHE_STORM_OK);
  } catch {
    return send(res, 200, { storm: null }, CACHE_FAIL);
  }
}
async function sunNowHandler(req, res) {
  if (!onlyGet(req, res)) return;
  try {
    const sun = await fetchSunNow(7e3);
    return send(res, 200, { sun: sun ?? null }, sun ? CACHE_SUN_OK : CACHE_FAIL);
  } catch {
    return send(res, 200, { sun: null }, CACHE_FAIL);
  }
}
export {
  CACHE_FAIL,
  CACHE_STORM_OK,
  CACHE_SUN_OK,
  liveStormHandler,
  nasaKey,
  sunNowHandler
};
