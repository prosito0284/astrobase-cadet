import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 1.9: Habitat Modules - Upgrading module increments level and deducts science points', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.sciencePoints = 25;
  const mod = sim.colony.modules.find(m => m.id === 'solar_farm')!;
  assert.strictEqual(mod.level, 1);

  const res = sim.upgradeModule('solar_farm');
  assert.strictEqual(res.success, true);
  assert.strictEqual(mod.level, 2);
  // Cost on normal is 10: 25 - 10 = 15
  assert.strictEqual(sim.colony.resources.sciencePoints, 15);
});

test('Tier 1.9: Habitat Modules - Rejects upgrade when science points < required cost', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.sciencePoints = 8; // Less than 10
  const mod = sim.colony.modules.find(m => m.id === 'solar_farm')!;

  const res = sim.upgradeModule('solar_farm');
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'INSUFFICIENT_SCIENCE');
  // State untouched
  assert.strictEqual(mod.level, 1);
  assert.strictEqual(sim.colony.resources.sciencePoints, 8);
});

test('Tier 1.9: Habitat Modules - Prevents exceeding maxLevel cap', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.sciencePoints = 100;
  const mod = sim.colony.modules.find(m => m.id === 'life_support')!;
  assert.strictEqual(mod.maxLevel, 3);

  // Upgrade to level 2
  assert.strictEqual(sim.upgradeModule('life_support').success, true);
  assert.strictEqual(mod.level, 2);

  // Upgrade to level 3 (maxLevel)
  assert.strictEqual(sim.upgradeModule('life_support').success, true);
  assert.strictEqual(mod.level, 3);

  // Upgrade past maxLevel is rejected
  const resMax = sim.upgradeModule('life_support');
  assert.strictEqual(resMax.success, false);
  assert.strictEqual(resMax.reason, 'MAX_LEVEL_REACHED');
  assert.strictEqual(mod.level, 3);
});

test('Tier 1.9: Habitat Modules - Hard mode Storm Bunker requires 20 science points', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  sim.colony.resources.sciencePoints = 15; // Enough for normal (10), but not Hard Bunker (20)

  const res = sim.upgradeModule('storm_bunker');
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'INSUFFICIENT_SCIENCE');

  // Provide 20 science
  sim.colony.resources.sciencePoints = 20;
  const res2 = sim.upgradeModule('storm_bunker');
  assert.strictEqual(res2.success, true);
  assert.strictEqual(sim.colony.resources.sciencePoints, 0);
});

test('Tier 1.9: Habitat Modules - Non-negative science points invariant under simulated rapid calls', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.sciencePoints = 10; // Exactly 1 upgrade worth

  // First call consumes 10
  const r1 = sim.upgradeModule('greenhouse');
  assert.strictEqual(r1.success, true);
  assert.strictEqual(sim.colony.resources.sciencePoints, 0);

  // Second rapid call blocked, prevents negative science points
  const r2 = sim.upgradeModule('greenhouse');
  assert.strictEqual(r2.success, false);
  assert.strictEqual(r2.reason, 'INSUFFICIENT_SCIENCE');
  assert.strictEqual(sim.colony.resources.sciencePoints, 0);
});
