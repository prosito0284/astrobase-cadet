import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { jumpTimes, weightOn } from '../src/cadet/compare.ts';

describe('Cadet Moon vs Mars compare', () => {
  it('matches the NASA examples', () => {
    assert.equal(weightOn('mars', 100), 38);      // NASA: 100 en la Tierra → 38 en Marte
    assert.equal(weightOn('moon', 60), 10);       // 1/6
    assert.equal(weightOn('moon', 30), 5);
  });

  it('handles odd inputs without breaking', () => {
    for (const bad of [0, -5, Number.NaN, Infinity]) assert.equal(weightOn('moon', bad), 0);
  });

  it('you could jump about 6 times higher on the Moon and ~2.6 times on Mars', () => {
    assert.equal(jumpTimes('moon'), 6);
    assert.equal(jumpTimes('mars'), 2.6);
  });
});
