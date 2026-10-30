import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 1.3: Rover Sorties - Sortie execution deducts batteryCost from colony energy bus', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.energy = 60;
  // Shackleton crater batteryCost is 15
  const res = sim.launchRoverSortie('shackleton_rim');
  assert.strictEqual(res.success, true);
  // Energy deducted: 60 - 15 = 45
  assert.strictEqual(sim.colony.resources.energy, 45);
  assert.strictEqual(sim.colony.roverSortiesToday, 1);
  assert.strictEqual(sim.unlockedAchievements.has('rover_sortie'), true);
});

test('Tier 1.3: Rover Sorties - Rejects sortie when energy < batteryCost', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.energy = 10; // Shackleton requires 15
  const res = sim.launchRoverSortie('shackleton_rim');
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'INSUFFICIENT_ENERGY');
  // Energy preserved
  assert.strictEqual(sim.colony.resources.energy, 10);
  assert.strictEqual(sim.colony.roverSortiesToday, 0);
});

test('Tier 1.3: Rover Sorties - Daily sortie cap of 2 per Sol strictly enforced', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.colony.resources.energy = 90;

  // Sortie 1
  const s1 = sim.launchRoverSortie('jezero_delta');
  assert.strictEqual(s1.success, true);
  assert.strictEqual(sim.colony.roverSortiesToday, 1);

  // Sortie 2
  const s2 = sim.launchRoverSortie('dune_field_clean');
  assert.strictEqual(s2.success, true);
  assert.strictEqual(sim.colony.roverSortiesToday, 2);

  // Sortie 3 (Blocked on same Sol)
  const s3 = sim.launchRoverSortie('hydrated_sulfates');
  assert.strictEqual(s3.success, false);
  assert.strictEqual(s3.reason, 'SORTIE_LIMIT_REACHED');
  assert.strictEqual(sim.colony.roverSortiesToday, 2);
});

test('Tier 1.3: Rover Sorties - Advancing Sol resets daily sortie counter', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.colony.resources.energy = 90;
  sim.launchRoverSortie('jezero_delta');
  sim.launchRoverSortie('dune_field_clean');
  assert.strictEqual(sim.colony.roverSortiesToday, 2);

  // Advance Sol
  sim.advanceDay();
  assert.strictEqual(sim.colony.roverSortiesToday, 0);

  // New sortie now succeeds
  sim.colony.resources.energy = 90;
  const nextSolSortie = sim.launchRoverSortie('jezero_delta');
  assert.strictEqual(nextSolSortie.success, true);
  assert.strictEqual(sim.colony.roverSortiesToday, 1);
});

test('Tier 1.3: Rover Sorties - Net energy rewards do not grant perpetual power loops', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.energy = 20;
  // eternal_light_ridge costs 12, gives 15 (+3 net)
  const res = sim.launchRoverSortie('eternal_light_ridge');
  assert.strictEqual(res.success, true);
  // Net energy: 20 - 12 + 15 = 23
  assert.strictEqual(sim.colony.resources.energy, 23);

  // Second sortie
  const res2 = sim.launchRoverSortie('eternal_light_ridge');
  assert.strictEqual(res2.success, true);
  // Net energy: 23 - 12 + 15 = 26
  assert.strictEqual(sim.colony.resources.energy, 26);

  // Third attempt blocked by daily cap, breaking any perpetual energy generation loop
  const res3 = sim.launchRoverSortie('eternal_light_ridge');
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.reason, 'SORTIE_LIMIT_REACHED');
});
