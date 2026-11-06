// Prueba de humo del Modo Cadete en un Chrome real (sin dependencias extra).
//
//   npm run build && npm run smoke
//
// Levanta `vite preview`, abre Chrome headless por el protocolo DevTools y juega una
// misión completa como lo haría un niño: inicio → 10 días → reporte → final con
// cuestionario → diploma → guía para maestros → recargar SIN internet.
// Falla (exit 1) si algo no aparece o si hay errores en la consola.
//
// Chrome: se busca en las rutas típicas o en la variable CHROME_PATH.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find(p => p && existsSync(p));
if (!CHROME) { console.error('No encontré Chrome. Define CHROME_PATH.'); process.exit(2); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? '✔' : '✖'} ${name}${extra ? ` — ${extra}` : ''}`); };

const preview = spawn(process.execPath, [join('node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9336', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'astrobase-smoke-'))}`, 'about:blank'], { stdio: 'ignore' });

let ws, id = 0;
const pending = new Map();
const consoleErrors = [];
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const msg = { id: ++id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  pending.set(msg.id, { res, rej });
  ws.send(JSON.stringify(msg));
});

try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* aún no */ } await sleep(250); }
  let ver;
  for (let i = 0; i < 40; i++) { try { ver = await (await fetch('http://127.0.0.1:9336/json/version')).json(); break; } catch { await sleep(250); } }
  ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
    if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, s);
  await send('Runtime.enable', {}, s);
  await send('Network.enable', {}, s);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, s);
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, s)).result.value;
  const go = async url => { await send('Page.navigate', { url }, s); await sleep(2500); };
  // innerText respeta CSS (p. ej. `uppercase`), así que se compara sin mayúsculas.
  const has = text => ev(`document.body.innerText.toLocaleLowerCase().includes(${JSON.stringify(text.toLocaleLowerCase())})`);
  const click = text => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)}));if(b){b.click();return true}return false})()`);
  const noOverflow = () => ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth');

  await go(BASE + '?modo=cadete');
  check('Inicio: título y botón de empezar', (await has('ASTROBASE')) && (await has('Empezar misión')));
  check('Inicio: sin desborde horizontal en celular', await noOverflow());

  await click('Normal');
  await click('Empezar misión'); await sleep(300);
  check('Cuenta regresiva al despegar', (await ev(`!!document.querySelector('[role=dialog][aria-label="¡Despegue!"]')`)) === true);
  await sleep(5600);
  check('La cuenta regresiva se cierra sola', (await ev(`!document.querySelector('[role=dialog][aria-label="¡Despegue!"]')`)) === true);
  check('Tutorial aparece en la primera partida', await has('Estas 4 barras son tu base'));
  await click('Saltar'); await sleep(200);
  check('Tarjeta del día con dos opciones', (await ev(`[...document.querySelectorAll('button')].filter(b=>/🅰️|🅱️/.test(b.textContent)).length`)) === 2);

  let days = 0;
  for (let i = 0; i < 12; i++) {
    await sleep(500); // la guarda de doble toque ignora toques durante 450 ms
    if (!(await click('🅰️'))) break;
    days++;
    await sleep(300);
    if (i === 0) {
      check('Reporte del día con "Esto pasó de verdad"', await has('Esto pasó de verdad'));
      check('Barras muestran el cambio del día', (await ev(`[...document.querySelectorAll('button[aria-label]')].some(b=>/\\([+−]\\d+\\)/.test(b.getAttribute('aria-label')))`)) === true);
    }
    (await click('Siguiente día')) || (await click('Ver el final'));
  }
  await sleep(600);
  check('Se juegan los días hasta el final', days >= 1 && (await has('Tus decisiones')), `${days} días`);
  check('Final: gráfica de radiación día a día', await has('Tu radiación día a día'));
  check('Final: código de misión', (await ev(`[...document.querySelectorAll('p')].some(p=>/^[LM][FN]-\\d{5}$/.test(p.textContent.trim()))`)) === true);
  check('Final: cuestionario', (await ev(`document.querySelectorAll('fieldset').length`)) >= 1);
  await ev(`(async()=>{for(const f of document.querySelectorAll('fieldset')){f.querySelector('button').click();await new Promise(r=>setTimeout(r,50))}})()`);
  check('Cuestionario muestra el puntaje', await has('Acertaste'));
  check('Final: insignias', await has('Tus insignias'));
  check('Final: "¿Y si hubieras elegido otra cosa?"', await has('¿Y si hubieras elegido otra cosa?'));
  check('Final: sin desborde horizontal', await noOverflow());

  await click('Mi diploma'); await sleep(300);
  check('Diploma', (await ev(`!!document.getElementById('cadet-diploma')`)) === true);
  await click('Volver'); await sleep(200);

  await ev(`localStorage.removeItem('astrobase_cadet_game_v1')`);
  await go(BASE + '?modo=cadete');
  await click('Guía para maestros'); await sleep(300);
  check('Guía para maestros', await has('Preguntas para conversar'));
  await click('Misión en papel'); await sleep(300);
  check('Misión en papel (reglas, registro y tarjetas)', (await has('Hoja de registro')) && (await ev(`document.querySelectorAll('.paper-card').length`)) >= 10);

  await go(BASE + '?mision=MF-31415');
  await click('Jugar esa misión'); await sleep(500);
  check('Código de misión arranca Marte en Fácil', (await has('Fácil')) && (await ev(`!!document.querySelector('svg[aria-label*="Marte"]')`)));

  // Sin internet (después de una visita con internet).
  await go(BASE + '?modo=cadete'); await sleep(2500);
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, s);
  await send('Network.setCacheDisabled', { cacheDisabled: true }, s);
  await go(BASE + '?modo=cadete'); await sleep(1500);
  check('Funciona sin internet', await has('ASTROBASE'));
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, s);

  // Las APIs de NASA/NOAA pueden fallar de verdad (y el juego lo maneja): no cuentan como error.
  const real = consoleErrors.filter(e => !/Failed to load resource|net::ERR|api\.nasa\.gov|swpc\.noaa\.gov/i.test(e));
  check('Sin errores en la consola', real.length === 0, real.slice(0, 3).join(' | '));
} catch (err) {
  check('La prueba terminó sin excepciones', false, String(err));
} finally {
  try { ws?.close(); } catch { /* ignorar */ }
  chrome.kill();
  preview.kill();
}

const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} comprobaciones OK`);
process.exit(failed ? 1 : 0);
