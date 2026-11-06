import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { earthMarsDistanceKm, lightDelaySeconds, marsDelayMinutes, MOON_KM } from '../src/cadet/orbit';

const near = (got: number, want: number, tolerance: number) =>
  assert.ok(Math.abs(got - want) / want <= tolerance, `got ${got.toFixed(0)}, want ≈ ${want} (±${tolerance * 100}%)`);

describe('Cadet orbit: Earth–Mars distance', () => {
  it('matches the 2020 close approach (~62.07 million km on 2020-10-06)', () => {
    near(earthMarsDistanceKm(Date.UTC(2020, 9, 6)), 62_070_000, 0.05);
  });

  it('matches the 2025 close approach (~96.08 million km on 2025-01-12)', () => {
    near(earthMarsDistanceKm(Date.UTC(2025, 0, 12)), 96_080_000, 0.05);
  });

  it('matches the 2003 record approach (~55.76 million km on 2003-08-27)', () => {
    near(earthMarsDistanceKm(Date.UTC(2003, 7, 27)), 55_760_000, 0.05);
  });

  it('stays within the physical range for every week of 2020–2035', () => {
    for (let t = Date.UTC(2020, 0, 1); t < Date.UTC(2035, 0, 1); t += 7 * 86_400_000) {
      const km = earthMarsDistanceKm(t);
      assert.ok(km > 54_000_000 && km < 402_000_000, `out of range: ${km}`);
    }
  });

  it('gives the 3–23 minute one-way delay range kids see in the game', () => {
    let min = Infinity;
    let max = 0;
    for (let t = Date.UTC(2020, 0, 1); t < Date.UTC(2035, 0, 1); t += 86_400_000) {
      const m = marsDelayMinutes(t);
      min = Math.min(min, m);
      max = Math.max(max, m);
    }
    assert.ok(min >= 3 && min <= 4.5, `min ${min}`);
    assert.ok(max >= 21 && max <= 23, `max ${max}`);
  });

  it('Moon delay is about 1.3 seconds', () => {
    near(lightDelaySeconds(MOON_KM), 1.28, 0.02);
  });
});
