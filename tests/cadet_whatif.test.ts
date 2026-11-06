import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bestWhatIf, choose, createGame, hint } from '../src/cadet/engine.ts';
import type { CadetState } from '../src/cadet/engine.ts';

const play = (s: CadetState, pick: (s: CadetState) => 0 | 1) => {
  while (s.status === 'playing') s = choose(s, pick(s));
  return s;
};

describe('Cadet "what if" replay', () => {
  it('replaying the same decisions reproduces the real ending exactly', () => {
    for (const site of ['moon', 'mars'] as const) {
      for (let seed = 1; seed <= 10; seed++) {
        const g = play(createGame(site, seed), s => (s.day % 3 === 0 ? 1 : 0));
        assert.ok(g.history.every(h => h.pick === 0 || h.pick === 1));
        const w = bestWhatIf(g);
        if (w) {
          assert.equal(w.actualEnd.status, g.status);
          assert.equal(w.actualEnd.health, g.health);
        }
      }
    }
  });

  it('ignoring every storm (always B) always has a better alternative, often on a storm day', () => {
    let stormDays = 0;
    for (const site of ['moon', 'mars'] as const) {
      for (let seed = 1; seed <= 15; seed++) {
        const g = play(createGame(site, seed), () => 1);
        const w = bestWhatIf(g)!;
        assert.ok(w, `${site} ${seed}`);
        assert.notDeepEqual(w.other, w.actual);
        const better = (w.otherEnd.status === 'won' ? 1 : 0) - (w.actualEnd.status === 'won' ? 1 : 0);
        assert.ok(better > 0 || w.otherEnd.day > w.actualEnd.day || w.otherEnd.health + 10 * w.otherEnd.stars > w.actualEnd.health + 10 * w.actualEnd.stars);
        if (w.title.es.includes('Llamarada')) stormDays++;
      }
    }
    assert.ok(stormDays > 0);
  });

  it('a perfect game (following Mission Control) never has a better single change', () => {
    for (const site of ['moon', 'mars'] as const) {
      for (let seed = 1; seed <= 8; seed++) {
        const g = play(createGame(site, seed), s => hint(s)!.option);
        assert.equal(bestWhatIf(g), undefined, `${site} ${seed}`);
      }
    }
  });

  it('returns nothing for games in progress or old saves without picks', () => {
    assert.equal(bestWhatIf(createGame('moon', 1)), undefined);
    const g = play(createGame('mars', 2), () => 1);
    assert.equal(bestWhatIf({ ...g, history: g.history.map(({ pick: _p, ...h }) => h) }), undefined);
  });
});
