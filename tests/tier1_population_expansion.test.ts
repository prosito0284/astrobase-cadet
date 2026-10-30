import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 1.10: Population Expansion - Preconditions require Hard difficulty and Sol >= 15', () => {
  // Normal mode attempt -> rejected
  const normalSim = new AstrobaseSimulation('mars', 'normal');
  normalSim.colony.currentDay = 15;
  const normalRes = normalSim.expandPopulation();
  assert.strictEqual(normalRes.success, false);
  assert.strictEqual(normalRes.reason, 'REQUIRES_HARD_DIFFICULTY');

  // Hard mode prior to Day 15 -> rejected
  const hardEarlySim = new AstrobaseSimulation('mars', 'dificil');
  hardEarlySim.colony.currentDay = 14;
  const earlyRes = hardEarlySim.expandPopulation();
  assert.strictEqual(earlyRes.success, false);
  assert.strictEqual(earlyRes.reason, 'REQUIRES_DAY_15');
});

test('Tier 1.10: Population Expansion - Rejects expansion when colony has near-zero supplies', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  sim.colony.currentDay = 15;
  // Depleted colony supplies
  sim.colony.resources.oxygen = 5;
  sim.colony.resources.water = 2;
  sim.colony.resources.energy = 0;
  sim.colony.resources.food = 10;

  const res = sim.expandPopulation();
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'INSUFFICIENT_SUPPLIES');
  assert.strictEqual(sim.colony.populationExpanded, false);
});

test('Tier 1.10: Population Expansion - Consumes 25% supply sacrifice and expands crew to 6 astronauts', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  sim.colony.currentDay = 15;
  sim.colony.resources.oxygen = 80;
  sim.colony.resources.water = 60;
  sim.colony.resources.energy = 100;
  sim.colony.resources.food = 40;
  assert.strictEqual(sim.colony.crew.length, 4);

  const res = sim.expandPopulation();
  assert.strictEqual(res.success, true);
  assert.strictEqual(sim.colony.populationExpanded, true);

  // 25% sacrifice
  assert.strictEqual(sim.colony.resources.oxygen, 60);  // 80 * 0.75
  assert.strictEqual(sim.colony.resources.water, 45);   // 60 * 0.75
  assert.strictEqual(sim.colony.resources.energy, 75);  // 100 * 0.75
  assert.strictEqual(sim.colony.resources.food, 30);    // 40 * 0.75

  // Roster expanded to 6 astronauts
  assert.strictEqual(sim.colony.crew.length, 6);
  assert.strictEqual(sim.unlockedAchievements.has('crew_expansion'), true);
});

test('Tier 1.10: Population Expansion - Re-expansion attempt blocked if already expanded', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  sim.colony.currentDay = 15;
  sim.colony.resources.oxygen = 80;
  sim.colony.resources.water = 80;
  sim.colony.resources.energy = 80;
  sim.colony.resources.food = 80;

  assert.strictEqual(sim.expandPopulation().success, true);

  // Second attempt blocked
  const res2 = sim.expandPopulation();
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.reason, 'ALREADY_EXPANDED');
  assert.strictEqual(sim.colony.crew.length, 6);
});

test('Tier 1.10: Mission Report Debrief - Telemetry average health returns 0% not NaN% for empty crew', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.crew = []; // Empty crew array

  const avgHealth = sim.getAverageCrewHealth();
  assert.strictEqual(isNaN(avgHealth), false);
  assert.strictEqual(avgHealth, 0);
});
