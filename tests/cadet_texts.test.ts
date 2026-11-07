// Calidad de los textos para niñas y niños de 7–12 años, en los dos idiomas.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../src/cadet/data.ts';
import * as strings from '../src/cadet/strings.ts';
import * as quiz from '../src/cadet/quiz.ts';
import * as badges from '../src/cadet/badges.ts';

type T = { es: string; en: string };
const texts: [string, T][] = [];
const walk = (x: unknown, path: string) => {
  if (!x || typeof x !== 'object') return;
  const o = x as Record<string, unknown>;
  if (typeof o.es === 'string' && typeof o.en === 'string') { texts.push([path, o as T]); return; }
  for (const [k, v] of Object.entries(o)) if (typeof v !== 'function') walk(v, `${path}.${k}`);
};
walk(data, 'data'); walk(strings, 'strings'); walk(quiz, 'quiz'); walk(badges, 'badges');

const MAX_WORDS = 22;
const sentences = (s: string) => s.split(/(?<=[.!?…])\s+/).filter(x => x.trim());

describe('Cadet texts (plain language, both languages)', () => {
  it('finds all the bilingual texts', () => {
    assert.ok(texts.length > 400, `${texts.length}`);
  });

  it('every text exists in Spanish AND English', () => {
    for (const [p, t] of texts) {
      assert.ok(t.es.trim(), `falta español: ${p}`);
      assert.ok(t.en.trim(), `missing English: ${p}`);
    }
  });

  it('English texts have no Spanish characters left over', () => {
    for (const [p, t] of texts) assert.ok(!/[¿¡ñáéíóú]/.test(t.en), `${p}: ${t.en}`);
  });

  it('{placeholders} match between languages', () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
    for (const [p, t] of texts) assert.equal(vars(t.es), vars(t.en), p);
  });

  it(`cards, quiz and game messages use sentences of at most ${MAX_WORDS} words`, () => {
    for (const [p, t] of texts) {
      if (!/^(data\.DECISION_CARDS|quiz|strings\.UI|strings\.TIPS)/.test(p)) continue;
      for (const lang of ['es', 'en'] as const) {
        for (const s of sentences(t[lang])) {
          const n = s.split(/\s+/).filter(Boolean).length;
          assert.ok(n <= MAX_WORDS, `${p} (${lang}, ${n} palabras): ${s}`);
        }
      }
    }
  });
});
