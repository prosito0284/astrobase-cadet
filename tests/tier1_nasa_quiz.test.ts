import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 1.8: NASA Quiz - Failing score (< 3/5) rejects bonus reward', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  const initialSci = sim.colony.resources.sciencePoints;

  const res = sim.claimQuizReward(2); // 2/5 (Fail)
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'SCORE_BELOW_PASSING_GRADE');
  assert.strictEqual(sim.colony.resources.sciencePoints, initialSci);
  assert.strictEqual(sim.colony.hasQuizCompletedToday, false);
});

test('Tier 1.8: NASA Quiz - 0/5 score fails and gives 0 bonus rewards', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  const initialSci = sim.colony.resources.sciencePoints;
  const initialMorale = sim.colony.crew[0].morale;

  const res = sim.claimQuizReward(0);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'SCORE_BELOW_PASSING_GRADE');
  assert.strictEqual(sim.colony.resources.sciencePoints, initialSci);
  assert.strictEqual(sim.colony.crew[0].morale, initialMorale);
});

test('Tier 1.8: NASA Quiz - Passing grade (>= 3/5) awards single unified reward (no double scoring)', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  const initialSci = sim.colony.resources.sciencePoints;
  const initialMorale = sim.colony.crew[0].morale;

  const res = sim.claimQuizReward(4); // 4/5 (Pass)
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.scienceEarned, 20);

  // Verifies exactly +20 Science points (preventing double scoring exploit of +40 or +60)
  assert.strictEqual(sim.colony.resources.sciencePoints, initialSci + 20);
  assert.strictEqual(sim.colony.crew[0].morale, Math.min(100, initialMorale + 20));
  assert.strictEqual(sim.colony.hasQuizCompletedToday, true);
  assert.strictEqual(sim.unlockedAchievements.has('stem_genius'), true);
});

test('Tier 1.8: NASA Quiz - Daily attempt cap of 1 reward per Sol (unlimited retry spam prevented)', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');

  // Attempt 1 (Pass)
  const r1 = sim.claimQuizReward(5);
  assert.strictEqual(r1.success, true);
  assert.strictEqual(sim.colony.hasQuizCompletedToday, true);

  // Attempt 2 on same Sol (Cheat attempt: retry spam for +70 science)
  const r2 = sim.claimQuizReward(5);
  assert.strictEqual(r2.success, false);
  assert.strictEqual(r2.reason, 'QUIZ_ALREADY_COMPLETED_TODAY');
});

test('Tier 1.8: NASA Quiz - Advancing Sol unlocks quiz challenge for the new day', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.claimQuizReward(3);
  assert.strictEqual(sim.colony.hasQuizCompletedToday, true);

  // Advance Sol
  sim.advanceDay();
  assert.strictEqual(sim.colony.hasQuizCompletedToday, false);

  // New Sol attempt succeeds
  const nextSolReward = sim.claimQuizReward(4);
  assert.strictEqual(nextSolReward.success, true);
});
