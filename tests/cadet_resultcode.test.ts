import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeResult, encodeResult, verifyResult } from '../src/cadet/resultCode.ts';
import { choose, createGame, mulberry32, stormFromSwpc } from '../src/cadet/engine.ts';
import type { CadetState } from '../src/cadet/engine.ts';

const play = (g: CadetState, rng: () => number) => { while (g.status === 'playing') g = choose(g, rng() < 0.5 ? 0 : 1); return g; };

describe('Cadet verifiable result codes (anti-cheat)', () => {
  it('replaying the code gives EXACTLY the real ending, for hundreds of games', () => {
    const rng = mulberry32(99);
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const live = i % 3 === 0 ? stormFromSwpc([{ max_class: ['C2.0', 'M3.5', 'X9.3', 'B7.0'][i % 4], max_time: '2026-11-05T00:00Z' }]) : undefined;
      const g = play(createGame(i % 2 ? 'mars' : 'moon', 10000 + Math.floor(rng() * 90000), live, i % 5 ? 'normal' : 'easy'), rng);
      const code = encodeResult(g)!;
      assert.match(code, /^R-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
      const v = verifyResult(code)!;
      assert.ok(v, code);
      assert.deepEqual([v.status, v.health, v.air, v.stars, v.doseMSv, v.daysPlayed], [g.status, g.health, g.air, g.stars, g.doseMSv, g.history.length], code);
      n++;
    }
    assert.equal(n, 400);
  });

  it('a game whose saved numbers were edited still verifies to the REAL result', () => {
    const g = play(createGame('moon', 31415), mulberry32(3));
    const cheated = { ...g, health: 100, stars: 9, status: 'won' as const };
    const v = verifyResult(encodeResult(cheated)!)!;
    assert.equal(v.health, g.health);
    assert.equal(v.stars, g.stars);
    assert.equal(v.status, g.status);
  });

  it('typos and made-up codes are rejected', () => {
    const code = encodeResult(play(createGame('mars', 27182), mulberry32(5)))!;
    const chars = code.replace(/-/g, '').slice(1).split('');
    let rejected = 0;
    for (let i = 0; i < chars.length; i++) {
      const c = [...chars];
      c[i] = c[i] === '0' ? '1' : '0';
      if (!verifyResult('R' + c.join(''))) rejected++;
    }
    assert.ok(rejected >= chars.length - 1, `${rejected}/${chars.length}`);
    for (const bad of ['', 'hola', 'R-0000-0000-0000', 'LN-48213', 'R-ZZZZ-ZZZZ-ZZZZ']) assert.equal(verifyResult(bad), null, bad);
  });

  it('random codes almost never pass (checksum + replay), so guessing a win does not work', () => {
    const rng = mulberry32(7);
    const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let pass = 0;
    for (let i = 0; i < 5000; i++) if (verifyResult(Array.from({ length: 12 }, () => A[Math.floor(rng() * 32)]).join(''))) pass++;
    assert.ok(pass < 25, `${pass}/5000`);
  });

  it('is forgiving with how teachers type it', () => {
    const code = encodeResult(play(createGame('moon', 12345), mulberry32(9)))!;
    const v1 = verifyResult(code)!;
    for (const variant of [code.toLowerCase(), code.replace(/-/g, ' '), code.replace(/^R-/, ''), code.replace(/0/g, 'O').replace(/1/g, 'I')]) {
      assert.equal(verifyResult(variant)?.health, v1.health, variant);
    }
  });

  it('games in progress, old saves without picks or huge seeds give no code', () => {
    assert.equal(encodeResult(createGame('moon', 1)), undefined);
    const g = play(createGame('moon', 2), mulberry32(1));
    assert.equal(encodeResult({ ...g, history: g.history.map(({ pick: _p, ...h }) => h) }), undefined);
    assert.equal(encodeResult({ ...g, seed: 2 ** 30 }), undefined);
  });

  it('decodes site, level, mission and live flare', () => {
    const live = stormFromSwpc([{ max_class: 'M3.5', max_time: '2026-11-05T00:00Z' }]);
    const g = play(createGame('mars', 48213, live, 'easy'), mulberry32(2));
    const d = decodeResult(encodeResult(g)!)!;
    assert.deepEqual([d.site, d.level, d.seed, d.liveClass], ['mars', 'easy', 48213, 'M3.5']);
    assert.equal(verifyResult(encodeResult(g)!)!.missionCode, 'MF-48213');
  });
});
