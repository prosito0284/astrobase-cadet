import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { awardBadges, awardManual, BADGES, parseBadges } from '../src/cadet/badges.ts';
import { choose, createGame, hint } from '../src/cadet/engine.ts';
import type { CadetState } from '../src/cadet/engine.ts';
import { addResult, emptyRecords } from '../src/cadet/records.ts';

const end = (over: Partial<CadetState>): CadetState => ({ ...createGame('moon', 2), status: 'won', health: 90, stars: 1, ...over });

describe('Cadet badges', () => {
  it('a game in progress earns nothing', () => {
    assert.deepEqual(awardBadges([], createGame('moon', 1), emptyRecords()).fresh, []);
  });

  it('a strong Normal win earns first mission, healthy crew and solo pilot', () => {
    const g = end({});
    const r = addResult(emptyRecords(), g);
    assert.deepEqual(awardBadges([], g, r).fresh.sort(), ['first_mission', 'healthy_crew', 'normal_pilot']);
  });

  it('an Easy win does not give the solo pilot badge; a loss can still give scientist', () => {
    const easy = end({ level: 'easy', health: 50 });
    assert.deepEqual(awardBadges([], easy, addResult(emptyRecords(), easy)).fresh, ['first_mission']);
    const lost = end({ status: 'lost', lostReason: 'air', stars: 3 });
    assert.deepEqual(awardBadges([], lost, addResult(emptyRecords(), lost)).fresh, ['scientist']);
  });

  it('two worlds needs a win on each site; persistent needs 5 games', () => {
    let r = emptyRecords();
    const moon = end({ site: 'moon' });
    const mars = end({ site: 'mars' });
    r = addResult(r, moon);
    assert.ok(!awardBadges([], moon, r).fresh.includes('two_worlds'));
    r = addResult(r, mars);
    assert.ok(awardBadges([], mars, r).fresh.includes('two_worlds'));
    for (let i = 0; i < 3; i++) r = addResult(r, end({ status: 'lost', lostReason: 'health' }));
    assert.ok(awardBadges([], moon, r).fresh.includes('persistent'));
  });

  it('never awards the same badge twice', () => {
    const g = end({});
    const r = addResult(emptyRecords(), g);
    const first = awardBadges([], g, r);
    assert.deepEqual(awardBadges(first.all, g, r).fresh, []);
  });

  it('every badge can really be earned in play (following Mission Control, scientist via search)', () => {
    let r = emptyRecords();
    const have = new Set<string>();
    for (const site of ['moon', 'mars'] as const) {
      for (let seed = 1; seed <= 3; seed++) {
        let s = createGame(site, seed);
        while (s.status === 'playing') s = choose(s, hint(s)!.option);
        r = addResult(r, s);
        for (const id of awardBadges([...have], s, r).fresh) have.add(id);
      }
    }
    // Scientist: busca una partida ganada con ≥ 3 descubrimientos.
    const most = (s: CadetState): number => (s.status !== 'playing' ? (s.status === 'won' ? s.stars : -1) : Math.max(most(choose(s, 0)), most(choose(s, 1))));
    let reachable = false;
    for (let seed = 1; seed <= 10 && !reachable; seed++) {
      reachable = most(createGame('moon', seed)) >= 3 || most(createGame('mars', seed)) >= 3;
    }
    assert.ok(reachable, 'scientist reachable');
    have.add('scientist');
    for (const id of awardManual([...have], 'quiz_master').fresh) have.add(id);
    for (const b of BADGES) assert.ok(have.has(b.id), `${b.id} not earned`);
  });

  it('manual badges are only given on purpose, once, and only if they are manual', () => {
    assert.deepEqual(awardManual([], 'quiz_master').fresh, ['quiz_master']);
    assert.deepEqual(awardManual(['quiz_master'], 'quiz_master').fresh, []);
    assert.deepEqual(awardManual([], 'first_mission').fresh, []);
    assert.deepEqual(awardManual([], 'nope').fresh, []);
    const g = end({ stars: 9 });
    assert.ok(!awardBadges([], g, addResult(emptyRecords(), g)).fresh.includes('quiz_master'));
  });

  it('survives corrupted saved data', () => {
    for (const raw of [null, '', '{', '{}', '5', '["first_mission","nope",3,"first_mission"]']) {
      const b = parseBadges(raw);
      assert.ok(b.every(id => BADGES.some(x => x.id === id)));
      assert.equal(new Set(b).size, b.length);
    }
  });
});
