import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/cadet/engine.ts';
import type { CadetState } from '../src/cadet/engine.ts';
import { addResult, emptyRecords, parseRecords } from '../src/cadet/records.ts';

const ended = (over: Partial<CadetState>): CadetState => ({ ...createGame('mars', 7), status: 'won', health: 80, stars: 2, doseMSv: 5, ...over });

describe('Cadet records', () => {
  it('ignores games still in progress', () => {
    const r = emptyRecords();
    assert.equal(addResult(r, createGame('moon', 1)), r);
  });

  it('counts wins, best medal, best discoveries and lowest dose per site', () => {
    let r = emptyRecords();
    r = addResult(r, ended({ doseMSv: 6.2, stars: 1 }));
    r = addResult(r, ended({ doseMSv: 4.1, stars: 3 }));
    r = addResult(r, ended({ status: 'lost', lostReason: 'air', doseMSv: 1, stars: 5 }));
    assert.deepEqual(r.mars, { plays: 3, wins: 2, bestMedal: 3, bestStars: 5, lowestDose: 4.1 });
    assert.deepEqual(r.moon, emptyRecords().moon);
  });

  it('a lost game never sets the lowest dose or the medal', () => {
    const r = addResult(emptyRecords(), ended({ status: 'lost', lostReason: 'health', doseMSv: 0.5 }));
    assert.equal(r.mars.lowestDose, null);
    assert.equal(r.mars.bestMedal, 0);
  });

  it('survives corrupted or hostile saved data', () => {
    for (const raw of [null, '', '{', '[]', 'null', '{"moon":5}', '{"mars":{"plays":-3,"wins":99,"bestMedal":9,"lowestDose":"x"}}']) {
      const r = parseRecords(raw);
      for (const site of ['moon', 'mars'] as const) {
        assert.ok(r[site].plays >= 0 && r[site].wins <= r[site].plays && r[site].bestMedal <= 3);
        assert.ok(r[site].lowestDose === null || r[site].lowestDose >= 0);
      }
    }
  });

  it('round-trips through JSON', () => {
    const r = addResult(emptyRecords(), ended({}));
    assert.deepEqual(parseRecords(JSON.stringify(r)), r);
  });
});
