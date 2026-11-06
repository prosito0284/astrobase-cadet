import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { glossarySegments } from '../src/cadet/glossaryText.ts';
import { DECISION_CARDS, GLOSSARY } from '../src/cadet/data.ts';

describe('Cadet tappable tricky words', () => {
  it('joining the segments always gives back the exact text', () => {
    for (const c of DECISION_CARDS) {
      for (const lang of ['es', 'en'] as const) {
        for (const t of [c.text[lang], c.fact[lang], ...c.options.map(o => o.detail[lang])]) {
          assert.equal(glossarySegments(t, lang).map(s => s.text).join(''), t);
        }
      }
    }
  });

  it('marks known words once, with real glossary keys', () => {
    const segs = glossarySegments('La radiación sube. Más radiación y una llamarada solar X; el escudo ayuda (0.6 mSv).', 'es');
    const terms = segs.filter(s => s.term);
    assert.deepEqual(terms.map(s => s.term), ['radiacion', 'llamarada', 'escudo', 'msv']);
    assert.equal(terms[1].text, 'llamarada solar');
    for (const t of terms) assert.ok(GLOSSARY[t.term!], t.term);
  });

  it('works in English and ignores words inside longer words', () => {
    const segs = glossarySegments('Raise the shield before the solar flare. Shieldwall is not a word here.', 'en');
    assert.deepEqual(segs.filter(s => s.term).map(s => s.text), ['shield', 'solar flare']);
  });

  it('returns the plain text when there is nothing to mark', () => {
    assert.deepEqual(glossarySegments('Hola equipo', 'es'), [{ text: 'Hola equipo' }]);
    assert.deepEqual(glossarySegments('', 'es'), []);
  });
});
