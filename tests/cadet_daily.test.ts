import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dailyMission, dayKey, formatMissionCode, MAX_SEED, MIN_SEED, parseMissionCode } from '../src/cadet/missionCode.ts';

describe('Cadet mission of the day', () => {
  it('same day + site + level gives the same mission for everyone', () => {
    const a = dailyMission('moon', 'normal', new Date(2026, 10, 7, 8, 0));
    const b = dailyMission('moon', 'normal', new Date(2026, 10, 7, 22, 59));
    assert.deepEqual(a, b);
  });

  it('changes by day, site and level, and stays in the code range', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 365; i++) {
      const d = new Date(2026, 0, 1 + i, 12);
      for (const site of ['moon', 'mars'] as const) for (const level of ['easy', 'normal'] as const) {
        const m = dailyMission(site, level, d);
        assert.ok(m.seed >= MIN_SEED && m.seed <= MAX_SEED);
        assert.deepEqual(parseMissionCode(formatMissionCode(m)), m);
        seen.add(formatMissionCode(m));
      }
    }
    assert.ok(seen.size > 1440, `${seen.size}`);
  });

  it('dayKey uses the local date', () => {
    assert.equal(dayKey(new Date(2026, 1, 3, 23, 30)), '2026-02-03');
  });
});
