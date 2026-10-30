import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 1.2: Botanical Lab - Irrigation consumes 5L water and advances growth by 25%', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.cropGrowthProgress = 50;
  const initialWater = sim.colony.resources.water;

  const res = sim.waterCrop();
  assert.strictEqual(res.success, true);
  assert.strictEqual(sim.colony.resources.water, initialWater - 5);
  assert.strictEqual(sim.cropGrowthProgress, 75);
});

test('Tier 1.2: Botanical Lab - Irrigation rejected when water < 5L (0-cost irrigation prevented)', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.water = 4; // Below required 5L
  sim.cropGrowthProgress = 50;

  const res = sim.waterCrop();
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'INSUFFICIENT_WATER');
  // Water balance and growth untouched
  assert.strictEqual(sim.colony.resources.water, 4);
  assert.strictEqual(sim.cropGrowthProgress, 50);
});

test('Tier 1.2: Botanical Lab - Harvest gated by 100% maturity requirement', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.cropGrowthProgress = 85; // Immature

  const res = sim.harvestCrop();
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'CROP_NOT_MATURE');
});

test('Tier 1.2: Botanical Lab - Harvest yields nutrients, science, morale, and resets growth', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.cropGrowthProgress = 100;
  sim.colony.resources.food = 50;
  sim.colony.crew[0].morale = 70;
  const initialFood = sim.colony.resources.food;
  const initialSci = sim.colony.resources.sciencePoints;
  const initialMorale = sim.colony.crew[0].morale;

  const res = sim.harvestCrop();
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.yield?.food, 25);
  assert.strictEqual(res.yield?.science, 15);
  assert.strictEqual(res.yield?.morale, 12);

  assert.strictEqual(sim.colony.resources.food, initialFood + 25);
  assert.strictEqual(sim.colony.resources.sciencePoints, initialSci + 15);
  assert.strictEqual(sim.colony.crew[0].morale, Math.min(100, initialMorale + 12));
  assert.strictEqual(sim.cropGrowthProgress, 15);
  assert.strictEqual(sim.unlockedAchievements.has('veggie_harvest'), true);
});

test('Tier 1.2: Botanical Lab - Daily harvest limit of 1 per Sol (infinite harvest spam prevented)', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.cropGrowthProgress = 100;

  const firstHarvest = sim.harvestCrop();
  assert.strictEqual(firstHarvest.success, true);
  assert.strictEqual(sim.colony.hasHarvestedToday, true);

  // Cheat attempt: immediately force maturity back to 100% on same Sol
  sim.cropGrowthProgress = 100;
  const secondHarvest = sim.harvestCrop();
  assert.strictEqual(secondHarvest.success, false);
  assert.strictEqual(secondHarvest.reason, 'HARVEST_QUOTA_REACHED');

  // Advancing Sol resets the harvest quota
  sim.advanceDay();
  assert.strictEqual(sim.colony.hasHarvestedToday, false);
  const nextSolHarvest = sim.harvestCrop();
  assert.strictEqual(nextSolHarvest.success, true);
});
