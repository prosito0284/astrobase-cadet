import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { choose, createGame, isValidSave } from '../src/cadet/engine.ts';
import type { CadetState } from '../src/cadet/engine.ts';
import { stormFromSwpc } from '../src/cadet/engine.ts';

const roundTrip = (s: CadetState) => JSON.parse(JSON.stringify(s)) as unknown;

describe('Cadet saved game validation', () => {
  it('accepts every real game state, start to finish, on both sites and levels', () => {
    for (const site of ['moon', 'mars'] as const) {
      for (const level of ['easy', 'normal'] as const) {
        let s = createGame(site, 11, stormFromSwpc([{ max_class: 'M3.5', max_time: '2026-11-05T12:33:00Z' }]), level);
        assert.ok(isValidSave(roundTrip(s)));
        while (s.status === 'playing') {
          s = choose(s, (s.day % 2) as 0 | 1);
          assert.ok(isValidSave(roundTrip(s)), `${site} ${level} day ${s.day}`);
        }
      }
    }
  });

  it('accepts old saves without a level', () => {
    const s = roundTrip(createGame('moon', 3)) as Record<string, unknown>;
    delete s.level;
    assert.ok(isValidSave(s));
  });

  it('rejects broken, outdated or hand-edited saves', () => {
    const good = roundTrip(createGame('mars', 5)) as CadetState;
    const bad: unknown[] = [
      null, 42, 'x', [], {},
      { ...good, site: 'venus' },
      { ...good, air: 150 },
      { ...good, health: -1 },
      { ...good, energy: Number.NaN },
      { ...good, day: 0 },
      { ...good, day: 11 },
      { ...good, status: 'paused' },
      { ...good, level: 'hard' },
      { ...good, deck: good.deck.slice(0, 9) },
      { ...good, deck: good.deck.map(e => (e.kind === 'card' ? { ...e, cardId: 'card_that_was_removed' } : e)) },
      { ...good, deck: good.deck.map(e => (e.kind === 'card' ? { ...e, cardId: 'moon_ice' } : e)) }, // carta de la Luna en Marte
      { ...good, deck: good.deck.map(e => (e.kind === 'storm' ? { kind: 'storm', storm: {} } : e)) },
      { ...good, history: 'nope' },
    ];
    bad.forEach((b, i) => assert.equal(isValidSave(b), false, `case ${i}`));
  });
});
