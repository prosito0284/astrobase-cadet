import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 1.5: Comm Minigame - Restoration requires active blackout precondition', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.isCommBlackout = false;

  const res = sim.restoreCommSignal(8.41, 45);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'NO_ACTIVE_BLACKOUT');
});

test('Tier 1.5: Comm Minigame - Correct carrier frequency (8.41 GHz) and azimuth (45 deg) achieves lock', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.colony.isCommBlackout = true;

  const res = sim.restoreCommSignal(8.41, 45);
  assert.strictEqual(res.success, true);
  assert.strictEqual(sim.colony.isCommBlackout, false);
  assert.strictEqual(sim.unlockedAchievements.has('dsn_restored'), true);
});

test('Tier 1.5: Comm Minigame - Detuned frequency (e.g., 8.10 GHz) fails signal lock', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.colony.isCommBlackout = true;

  const res = sim.restoreCommSignal(8.10, 45);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'SIGNAL_NOT_LOCKED');
  assert.strictEqual(sim.colony.isCommBlackout, true);
});

test('Tier 1.5: Comm Minigame - Misaligned azimuth angle (e.g., 10 deg) fails signal lock', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.colony.isCommBlackout = true;

  const res = sim.restoreCommSignal(8.41, 10);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'SIGNAL_NOT_LOCKED');
  assert.strictEqual(sim.colony.isCommBlackout, true);
});

test('Tier 1.5: Comm Minigame - Repeated multi-click spam rejected after initial restoration', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.isCommBlackout = true;

  const firstCall = sim.restoreCommSignal(8.41, 45);
  assert.strictEqual(firstCall.success, true);
  assert.strictEqual(sim.colony.isCommBlackout, false);

  // Second rapid click attempt is blocked because blackout was already cleared
  const secondCall = sim.restoreCommSignal(8.41, 45);
  assert.strictEqual(secondCall.success, false);
  assert.strictEqual(secondCall.reason, 'NO_ACTIVE_BLACKOUT');
});
