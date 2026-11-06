import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatMissionCode, MAX_SEED, MIN_SEED, parseMissionCode, randomSeed } from '../src/cadet/missionCode.ts';
import { choose, createGame, mulberry32 } from '../src/cadet/engine.ts';

describe('Cadet mission codes (same mission for a whole class)', () => {
  it('round-trips every site and level', () => {
    for (const site of ['moon', 'mars'] as const) {
      for (const level of ['easy', 'normal'] as const) {
        const code = formatMissionCode({ site, level, seed: 48213 });
        assert.deepEqual(parseMissionCode(code), { site, level, seed: 48213 });
      }
    }
    assert.equal(formatMissionCode({ site: 'moon', level: 'normal', seed: 48213 }), 'LN-48213');
    assert.equal(formatMissionCode({ site: 'mars', level: 'easy', seed: 10000 }), 'MF-10000');
  });

  it('is forgiving with how kids type it', () => {
    for (const raw of ['ln-48213', ' LN 48213 ', 'Ln48213', 'l n - 48213']) {
      assert.deepEqual(parseMissionCode(raw), { site: 'moon', level: 'normal', seed: 48213 }, raw);
    }
  });

  it('rejects anything else', () => {
    for (const raw of ['', 'XN-48213', 'LX-48213', 'LN-4821', 'LN-482130', 'LN-09999', 'hola', 'LN-4821a']) {
      assert.equal(parseMissionCode(raw), null, raw);
    }
  });

  it('random seeds are always valid 5-digit codes', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 2000; i++) {
      const seed = randomSeed(rng);
      assert.ok(seed >= MIN_SEED && seed <= MAX_SEED);
      assert.ok(parseMissionCode(formatMissionCode({ site: 'mars', level: 'normal', seed })));
    }
    assert.equal(randomSeed(() => 0), MIN_SEED);
    assert.equal(randomSeed(() => 0.999999999), MAX_SEED);
  });

  it('the same code gives exactly the same mission to everyone', () => {
    const c = parseMissionCode('MF-31415')!;
    const a = createGame(c.site, c.seed, undefined, c.level);
    const b = createGame(c.site, c.seed, undefined, c.level);
    assert.deepEqual(a, b);
    let x = a, y = b;
    while (x.status === 'playing') { x = choose(x, 0); y = choose(y, 0); }
    assert.deepEqual(x, y);
  });
});
