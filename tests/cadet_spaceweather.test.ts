import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fluxToClass, moodOf, summarizeXrays } from '../src/cadet/spaceweather.ts';
import { flareRank } from '../src/cadet/engine.ts';

describe('Cadet space weather (GOES X-rays)', () => {
  it('converts flux to the official flare classes', () => {
    assert.equal(fluxToClass(1.6891e-6), 'C1.6');
    assert.equal(fluxToClass(2.3e-5), 'M2.3');
    assert.equal(fluxToClass(9.3e-4), 'X9.3');
    assert.equal(fluxToClass(1e-4), 'X1.0');
    assert.equal(fluxToClass(7.3e-7), 'B7.3');
    assert.equal(fluxToClass(5e-9), 'A0.5');
    assert.equal(fluxToClass(0), 'A0.0');
    assert.equal(fluxToClass(Number.NaN), 'A0.0');
  });

  it('classes from flux sort the same way as the game flare power ranking', () => {
    const fluxes = [3e-9, 2e-8, 5e-7, 4e-6, 6e-5, 2e-4];
    const ranks = fluxes.map(f => flareRank(fluxToClass(f)));
    assert.deepEqual([...ranks].sort((a, b) => a - b), ranks);
  });

  it('mood: calm below M, active for M, storm for X', () => {
    assert.equal(moodOf(9e-6), 'calm');
    assert.equal(moodOf(1e-5), 'active');
    assert.equal(moodOf(1e-4), 'storm');
  });

  it('summarizes 24 h into ≤ 96 points, ignores the other channel and junk', () => {
    const rows = [];
    const t0 = Date.UTC(2026, 10, 5, 4, 0);
    for (let m = 0; m < 24 * 60; m++) {
      const time_tag = new Date(t0 + m * 60_000).toISOString();
      rows.push({ time_tag, flux: m === 600 ? 3.5e-5 : 1e-6, energy: '0.1-0.8nm', satellite: 18 });
      rows.push({ time_tag, flux: 9e-3, energy: '0.05-0.4nm', satellite: 18 });
    }
    rows.push({ time_tag: 'garbage', flux: 1, energy: '0.1-0.8nm' }, { flux: -1, energy: '0.1-0.8nm' });
    const s = summarizeXrays(rows)!;
    assert.ok(s.points.length <= 96 && s.points.length >= 90, `${s.points.length}`);
    assert.equal(s.peak, 'M3.5');
    assert.equal(s.peakTime, t0 + 600 * 60_000);
    assert.equal(s.current, 'C1.0');
    assert.equal(s.mood, 'active');
    assert.ok(s.points.some(p => p.flux === 3.5e-5), 'bucket keeps the peak');
    for (let i = 1; i < s.points.length; i++) assert.ok(s.points[i].t > s.points[i - 1].t);
  });

  it('returns undefined when there is no usable data', () => {
    assert.equal(summarizeXrays([]), undefined);
    assert.equal(summarizeXrays([{ time_tag: 'x', flux: 1e-6, energy: '0.1-0.8nm' }]), undefined);
  });
});
