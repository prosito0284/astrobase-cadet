import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, choose, createGame, hint, LEVELS, mulberry32, previewStormDamage } from '../src/cadet/engine.ts';
import type { CadetState, Level } from '../src/cadet/engine.ts';
import { DECISION_CARDS } from '../src/cadet/data.ts';

const SITES = ['moon', 'mars'] as const;
const play = (s: CadetState, pick: (s: CadetState) => 0 | 1): CadetState => {
  while (s.status === 'playing') s = choose(s, pick(s));
  return s;
};
const canWin = (s: CadetState): boolean =>
  s.status === 'won' || (s.status === 'playing' && (canWin(choose(s, 0)) || canWin(choose(s, 1))));

/** Porcentaje de partidas ganadas eligiendo al azar (como un niño que no lee las tarjetas). */
function randomWinRate(level: Level, games = 600): number {
  let wins = 0;
  for (let i = 0; i < games; i++) {
    const rng = mulberry32(1000 + i);
    const site = SITES[i % 2];
    if (play(createGame(site, 50 + i, undefined, level), () => (rng() < 0.5 ? 0 : 1)).status === 'won') wins++;
  }
  return wins / games;
}

describe('Cadet levels (Fácil 7–9 / Normal 10–12)', () => {
  it('easy starts with more energy and shield than normal, and only easy gives hints', () => {
    const e = createGame('moon', 1, undefined, 'easy');
    const n = createGame('moon', 1, undefined, 'normal');
    assert.ok(e.air >= n.air && e.energy > n.energy && e.shield > n.shield);
    assert.equal(e.level, 'easy');
    assert.equal(LEVELS.easy.hints, true);
    assert.equal(LEVELS.normal.hints, false);
  });

  it('following Mission Control hints always wins, on every site and level', () => {
    for (const level of Object.keys(LEVELS) as Level[]) {
      for (const site of SITES) {
        for (let seed = 1; seed <= 12; seed++) {
          const end = play(createGame(site, seed, undefined, level), s => hint(s)!.option);
          assert.equal(end.status, 'won', `${level} ${site} ${seed}`);
        }
      }
    }
  });

  it('a hint says honestly when the mission can no longer be won', () => {
    let s = createGame('moon', 3);
    while (s.status === 'playing' && hint(s)!.canWin) s = choose(s, 1);
    if (s.status === 'playing') assert.equal(hint(s)!.canWin, false);
    assert.equal(hint({ ...s, status: 'won' }), undefined);
  });

  it('old saved games without a level play exactly like normal', () => {
    const n = createGame('mars', 9);
    const old = { ...n };
    delete (old as Partial<CadetState>).level;
    const pick = (s: CadetState) => (s.day % 2 ? 0 : 1) as 0 | 1;
    assert.deepEqual({ ...play(old, pick), level: undefined }, { ...play(n, pick), level: undefined });
  });

  it('the storm preview matches the damage in the report on both levels', () => {
    for (const level of Object.keys(LEVELS) as Level[]) {
      for (const site of SITES) {
        for (const opt of [0, 1] as const) {
          const g = createGame(site, 4, undefined, level);
          const p = previewStormDamage(g, opt)!;
          const line = choose(g, opt).lastReport!.lines.find(l => (l.icon === '🛡️' || l.icon === '☢️') && l.tone !== 'neutral')!;
          assert.ok(line.text.es.includes(`−${p} de salud`), `${level} ${site} ${opt}: ${line.text.es} vs ${p}`);
        }
      }
    }
  });

  it('every level can always be won with perfect play (complete search)', () => {
    for (const level of Object.keys(LEVELS) as Level[]) {
      for (const site of SITES) {
        for (let seed = 1; seed <= 8; seed++) assert.ok(canWin(createGame(site, seed, undefined, level)), `${level} ${site} ${seed}`);
      }
    }
  });

  it('ignoring every storm still ends badly on both levels (the core lesson)', () => {
    for (const level of Object.keys(LEVELS) as Level[]) {
      for (const site of SITES) {
        for (let seed = 1; seed <= 25; seed++) {
          assert.equal(play(createGame(site, seed, undefined, level), () => 1).status, 'lost', `${level} ${site} ${seed}`);
        }
      }
    }
  });

  it('easy is easier than normal, and neither is trivial', () => {
    const easy = randomWinRate('easy');
    const normal = randomWinRate('normal');
    console.log(`random-play win rate: easy ${(easy * 100).toFixed(0)}%, normal ${(normal * 100).toFixed(0)}%`);
    assert.ok(easy > normal, `easy ${easy} vs normal ${normal}`);
    assert.ok(normal >= 0.3 && normal <= 0.9, `normal ${normal}`);
    assert.ok(easy <= 0.95, `easy ${easy}`);
  });

  it('every decision card shows up in some game (bigger deck = more replay)', () => {
    const seen = new Set<string>();
    for (const site of SITES) {
      for (let seed = 1; seed <= 60; seed++) {
        for (const e of buildDeck(site, seed)) if (e.kind === 'card') seen.add(e.cardId);
      }
    }
    for (const c of DECISION_CARDS) assert.ok(seen.has(c.id), `${c.id} never appears`);
    for (const site of SITES) assert.ok(DECISION_CARDS.filter(c => c.sites.includes(site)).length >= 10, `${site} needs ≥10 cards`);
  });
});
