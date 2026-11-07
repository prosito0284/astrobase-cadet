// Empaqueta el puente (api/_proxy.ts + el motor del juego que usa) en UN solo archivo
// JavaScript sin imports internos: Vercel ejecuta las funciones como módulos ES, y
// esos módulos no aceptan imports sin extensión ("./_proxy", "./data").
//   npm run build:api      → regenera api/_proxy.bundle.mjs (se sube al repo)
//   npm run build:api -- --check → falla si el archivo subido está desactualizado (CI)
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const out = 'api/_proxy.bundle.mjs';
const before = (() => { try { return readFileSync(out, 'utf8'); } catch { return ''; } })();
await build({
  entryPoints: ['api/_proxy.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: out,
  legalComments: 'none',
  banner: { js: '// ⚠️ Archivo generado por scripts/bundle-api.mjs a partir de api/_proxy.ts. No editar a mano.' },
});
const after = readFileSync(out, 'utf8');
if (process.argv.includes('--check') && before !== after) {
  console.error('api/_proxy.bundle.mjs estaba desactualizado: corre "npm run build:api" y súbelo.');
  process.exit(1);
}
console.log(`api empaquetada: ${out} (${(after.length / 1024).toFixed(1)} KB)`);
