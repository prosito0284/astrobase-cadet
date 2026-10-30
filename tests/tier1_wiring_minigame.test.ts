import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 1.4: Wiring Minigame - Requires active electrical fault precondition', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.batteryFault = false;
  sim.colony.wiringErrorActive = false;

  const validConns = { red: 'red', blue: 'blue', yellow: 'yellow', green: 'green' };
  const res = sim.solveWiringCircuit(validConns);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'NO_ACTIVE_WIRING_FAULT');
});

test('Tier 1.4: Wiring Minigame - Successful repair on active fault clears error and awards badge', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.batteryFault = true;
  sim.colony.batteryFaultCount = 1;

  const validConns = { red: 'red', blue: 'blue', yellow: 'yellow', green: 'green' };
  const res = sim.solveWiringCircuit(validConns);
  assert.strictEqual(res.success, true);
  assert.strictEqual(sim.colony.batteryFault, false);
  assert.strictEqual(sim.colony.batteryFaultCount, 0);
  assert.strictEqual(sim.unlockedAchievements.has('wire_master'), true);
});

test('Tier 1.4: Wiring Minigame - Rejects non-injective mapping (terminal collisions)', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.wiringErrorActive = true;

  // Collision: Both 'red' and 'blue' wired to 'red' terminal
  const collConns = { red: 'red', blue: 'red', yellow: 'yellow', green: 'green' };
  const res = sim.solveWiringCircuit(collConns);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'NON_INJECTIVE_MAPPING_COLLISION');
  assert.strictEqual(sim.colony.wiringErrorActive, true);
});

test('Tier 1.4: Wiring Minigame - Hard mode requires 2 available uninjured technicians', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  sim.colony.batteryFault = true;

  // Disable 3 of 4 crew members (shocked or assigned to mine)
  sim.colony.crew[0].isShockDisabledDays = 1;
  sim.colony.crew[1].isShockDisabledDays = 1;
  sim.colony.crew[2].isShockDisabledDays = 1;
  // Only 1 available crew member left

  const validConns = { red: 'red', blue: 'blue', yellow: 'yellow', green: 'green' };
  const res = sim.solveWiringCircuit(validConns);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'INSUFFICIENT_CREW');
  assert.strictEqual(sim.colony.batteryFault, true);
});

test('Tier 1.4: Wiring Minigame - Battery overload lockout prevents repair attempts', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.batteryFault = true;
  sim.colony.batteryLockoutSeconds = 5; // Bus locked out

  const validConns = { red: 'red', blue: 'blue', yellow: 'yellow', green: 'green' };
  const res = sim.solveWiringCircuit(validConns);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'BATTERY_BUS_LOCKED_OUT');
  assert.strictEqual(sim.colony.batteryFault, true);
});
