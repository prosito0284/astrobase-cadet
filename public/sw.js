// ASTROBASE CADET — Service worker para jugar sin internet.
//
// - Páginas (navegación): primero la red; si no hay conexión, la última copia guardada.
// - assets/* (archivos con hash, nunca cambian): primero la copia guardada.
// - Fuentes de Google: primero la copia guardada.
// - Datos en vivo (NASA DONKI, NOAA SWPC) NUNCA se guardan: si no hay red, el juego
//   lo dice y usa sus llamaradas guardadas.
//
// Cada vez que la página se descarga con internet, se guardan TODOS los archivos que
// necesita esa versión (incluido el Modo Experto) y se borran los de versiones viejas.
//
// Todas las rutas son relativas a donde vive este archivo, así funciona igual en la
// raíz de Vercel que dentro de una carpeta (vite.config usa base: './').
const VERSION = 'astrobase-v2';
const ROOT = new URL('./', self.location.href);          // p. ej. https://sitio/  o  https://sitio/carpeta/
const PAGE = ROOT.href;
const ASSETS_URL = new URL('assets/', ROOT);
const ASSETS_PATH = ASSETS_URL.pathname;
const SHELL = ['favicon.svg', 'manifest.webmanifest', 'og.png'].map(p => new URL(p, ROOT).href);

/** Lee un archivo de la caché o, si no está, de la red. */
async function readText(url) {
  const hit = await caches.match(url);
  return (hit || (await fetch(url))).text();
}

/**
 * Guarda la página y todo lo que pide: los JS/CSS del HTML y los trozos que esos JS
 * cargan con import() (p. ej. "./App-xxxx.js" del Modo Experto). Luego borra los
 * archivos de versiones anteriores para no llenar el navegador.
 */
async function syncFromPage(pageResponse) {
  const cache = await caches.open(VERSION);
  const html = await pageResponse.clone().text();
  const assets = new Set((html.match(/(?:\.\/|\/)?assets\/[^"'\s>]+/g) || []).map(a => new URL(a, ROOT).href));
  for (const js of [...assets].filter(a => a.endsWith('.js'))) {
    try {
      const text = await readText(js);
      for (const m of text.match(/["'`]\.\/[\w-]+\.(?:js|css)["'`]/g) || []) assets.add(new URL(m.slice(3, -1), ASSETS_URL).href);
    } catch { /* ese trozo se guardará la primera vez que se use */ }
  }

  await cache.put(PAGE, pageResponse);
  const have = new Set((await cache.keys()).map(r => r.url));
  await Promise.all([...SHELL, ...assets].filter(u => !have.has(u)).map(u => cache.add(u).catch(() => undefined)));

  for (const req of await cache.keys()) {
    const url = new URL(req.url);
    if (url.origin === self.location.origin && url.pathname.startsWith(ASSETS_PATH) && !assets.has(url.origin + url.pathname)) {
      await cache.delete(req);
    }
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    fetch(PAGE, { cache: 'no-cache' })
      .then(r => (r.ok ? syncFromPage(r) : undefined))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(VERSION);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstPage(event) {
  try {
    const response = await fetch(event.request);
    if (response.ok) event.waitUntil(syncFromPage(response.clone()).catch(() => undefined));
    return response;
  } catch {
    const cache = await caches.open(VERSION);
    return (await cache.match(PAGE)) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate' && sameOrigin) {
    event.respondWith(networkFirstPage(event));
    return;
  }
  if (sameOrigin && (url.pathname.startsWith(ASSETS_PATH) || SHELL.includes(url.origin + url.pathname))) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
  }
  // Todo lo demás (incluidas las APIs de NASA y NOAA) va directo a la red.
});
