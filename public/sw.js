// ASTROBASE CADET — Service worker para jugar sin internet.
//
// - Páginas (navegación): primero la red; si no hay conexión, la última copia guardada.
// - assets/* (archivos con hash, nunca cambian): primero la copia guardada.
// - Fuentes de Google: primero la copia guardada.
// - Datos en vivo (NASA DONKI, NOAA SWPC) NUNCA se guardan: si no hay red, el juego
//   lo dice y usa sus llamaradas guardadas.
//
// Todas las rutas son relativas a donde vive este archivo, así funciona igual en la
// raíz de Vercel que dentro de una carpeta (vite.config usa base: './').
const VERSION = 'astrobase-v1';
const ROOT = new URL('./', self.location.href);          // p. ej. https://sitio/  o  https://sitio/carpeta/
const PAGE = ROOT.href;
const ASSETS_PATH = new URL('assets/', ROOT).pathname;
const SHELL = ['favicon.svg', 'manifest.webmanifest'].map(p => new URL(p, ROOT).href);

// Guarda la página y los archivos que ella pide (JS y CSS con hash), para que el
// juego funcione sin internet desde la PRIMERA visita, no solo desde la segunda.
async function precache() {
  const cache = await caches.open(VERSION);
  const page = await fetch(PAGE, { cache: 'no-cache' });
  if (!page.ok) return;
  const html = await page.clone().text();
  const assets = [...new Set(html.match(/(?:\.\/|\/)?assets\/[^"'\s>]+/g) || [])].map(a => new URL(a, ROOT).href);
  await cache.put(PAGE, page);
  await cache.addAll([...SHELL, ...assets]);
}

self.addEventListener('install', event => {
  event.waitUntil(precache().catch(() => undefined));
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

async function networkFirstPage(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(PAGE, response.clone());
    return response;
  } catch {
    return (await cache.match(PAGE)) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate' && sameOrigin) {
    event.respondWith(networkFirstPage(request));
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
