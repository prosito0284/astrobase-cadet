import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 3.1: Cross-Feature - Rover sortie power drain during lunar night stresses colony energy', () => {
  const sim = new AstrobaseSimulation('moon', 'dificil');
  // Advance to lunar night
  while (sim.colony.currentDay < 10) {
    sim.colony.resources.oxygen = 90;
    sim.colony.resources.water = 90;
    sim.colony.resources.food = 90;
    sim.advanceDay();
  }
  assert.strictEqual(sim.colony.isLunarNight, true);

  // During lunar night, energy is critical
  sim.colony.resources.energy = 25;

  // Rover sortie consumes 15 energy
  const sortieRes = sim.launchRoverSortie('shackleton_rim');
  assert.strictEqual(sortieRes.success, true);
  assert.strictEqual(sim.colony.resources.energy, 10);

  // Second sortie requires 14 energy, but only 10 remain -> rejected
  const sortie2 = sim.launchRoverSortie('lava_tube_cave');
  assert.strictEqual(sortie2.success, false);
  assert.strictEqual(sortie2.reason, 'INSUFFICIENT_ENERGY');
  assert.strictEqual(sim.colony.resources.energy, 10);
});

test('Tier 3.2: Cross-Feature - Water depletion cascades into Botanical crop halt and life support stress', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  // Drain water to 2L
  sim.colony.resources.water = 2;

  // Irrigation fails
  const waterRes = sim.waterCrop();
  assert.strictEqual(waterRes.success, false);
  assert.strictEqual(waterRes.reason, 'INSUFFICIENT_WATER');

  // Daily advance with zero water causes crew health damage
  sim.colony.resources.water = 0;
  sim.advanceDay();

  // Crew took damage from life support failure
  const injuredCrew = sim.colony.crew.filter(c => c.health < 100);
  assert.ok(injuredCrew.length > 0, 'Crew health must degrade during zero water life-support failure');
});

test('Tier 3.3: Cross-Feature - Cryogenic miner mortality automatically frees assignment slot (no ghost miner)', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  const minerId = sim.colony.crew[0].id;
  assert.strictEqual(sim.toggleAssignMiner(minerId).success, true);
  assert.strictEqual(sim.colony.assignedToMine.includes(minerId), true);

  // Extreme event zeroes oxygen and water, causing mortality
  sim.colony.resources.oxygen = 0;
  sim.colony.resources.water = 0;
  sim.colony.resources.food = 0;

  // Advance 4 days of zero supplies to cause crew mortality
  for (let i = 0; i < 4; i++) {
    sim.colony.resources.oxygen = 0;
    sim.colony.resources.water = 0;
    sim.colony.resources.food = 0;
    sim.advanceDay();
  }

  // Deceased crew member must be removed from mine slots
  assert.strictEqual(sim.colony.crew[0].status, 'deceased');
  assert.strictEqual(sim.colony.assignedToMine.includes(minerId), false);
  assert.strictEqual(sim.colony.assignedToMine.length, 0);
});

test('Tier 3.4: Cross-Feature - Compounding crisis (Battery fault + DSN blackout) isolates base systems', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  sim.colony.batteryFault = true;
  sim.colony.isCommBlackout = true;

  // Ice mine assignment blocked during DSN comm blackout
  const astroId = sim.colony.crew[0].id;
  const mineRes = sim.toggleAssignMiner(astroId);
  assert.strictEqual(mineRes.success, false);
  assert.strictEqual(mineRes.reason, 'COMM_BLACKOUT_ACTIVE');

  // Repair comms first
  const commRes = sim.restoreCommSignal(8.41, 45);
  assert.strictEqual(commRes.success, true);
  assert.strictEqual(sim.colony.isCommBlackout, false);

  // Now ice mine assignment is unlocked
  const mineRes2 = sim.toggleAssignMiner(astroId);
  assert.strictEqual(mineRes2.success, true);

  // Electrical bus fault remains active until independently wired
  assert.strictEqual(sim.colony.batteryFault, true);
  const wiringRes = sim.solveWiringCircuit({ red: 'red', blue: 'blue', yellow: 'yellow', green: 'green' });
  assert.strictEqual(wiringRes.success, true);
  assert.strictEqual(sim.colony.batteryFault, false);
});

test('Tier 3.5: Cross-Feature - Population expansion accelerates daily ECLSS consumption proportionally', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  sim.colony.currentDay = 15;
  sim.colony.resources.oxygen = 90;
  sim.colony.resources.water = 90;
  sim.colony.resources.food = 90;
  sim.colony.resources.energy = 90;

  // Baseline consumption with 4 crew:
  // 4 crew * 1.5 O2 = 6 O2/day
  const initialO2 = sim.colony.resources.oxygen;
  sim.advanceDay();
  const drain4Crew = initialO2 - sim.colony.resources.oxygen;
  assert.strictEqual(drain4Crew, 6);

  // Reset to Day 15 and expand population to 6 crew
  sim.colony.currentDay = 15;
  sim.colony.resources.oxygen = 90;
  sim.colony.resources.water = 90;
  sim.colony.resources.food = 90;
  sim.colony.resources.energy = 90;

  const expandRes = sim.expandPopulation();
  assert.strictEqual(expandRes.success, true);
  assert.strictEqual(sim.colony.crew.length, 6);

  const postExpandO2 = sim.colony.resources.oxygen;
  sim.advanceDay();
  // 6 crew * 1.5 O2 = 9 O2/day (50% higher drain)
  const drain6Crew = postExpandO2 - sim.colony.resources.oxygen;
  assert.strictEqual(drain6Crew, 9);
});
