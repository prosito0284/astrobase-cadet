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

test('Tier 1.4: Wiring Minigame - Terminal derangement generator guarantees crossed wires across 100 iterations', async () => {
  const { generateScrambledTerminals } = await import('../src/components/WiringMiniGameModal.tsx');
  const WIRE_IDS = ['red', 'blue', 'yellow', 'green'];

  for (let i = 0; i < 100; i++) {
    const scrambled = generateScrambledTerminals();
    assert.strictEqual(scrambled.length, 4, 'Must produce 4 terminals');
    
    // Check all IDs present
    const ids = scrambled.map(s => s.id);
    for (const expectedId of WIRE_IDS) {
      assert.ok(ids.includes(expectedId), `Must contain wire ${expectedId}`);
    }

    // Derangement check: No terminal matches original row index
    for (let idx = 0; idx < WIRE_IDS.length; idx++) {
      assert.notStrictEqual(scrambled[idx].id, WIRE_IDS[idx], `Index ${idx} must be deranged and not match ${WIRE_IDS[idx]}`);
    }
  }
});

test('Tier 1.4: Wiring Minigame - Multi-fault lifecycle on Mars requires fresh solve each time without pre-solved persistence', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');

  // First Fault: Sol 4
  sim.colony.batteryFault = true;
  sim.colony.batteryFaultCount = 1;
  const validConns = { red: 'red', blue: 'blue', yellow: 'yellow', green: 'green' };
  const firstSolve = sim.solveWiringCircuit(validConns);
  assert.strictEqual(firstSolve.success, true);
  assert.strictEqual(sim.colony.batteryFault, false);

  // Sol 7: Second fault occurs on Mars (subsequent short-circuit)
  sim.colony.batteryFault = true;
  sim.colony.batteryFaultCount = 1;

  // An empty/initial state before user acts must NOT be considered solved
  const emptyConns = {};
  const emptyCheck = sim.solveWiringCircuit(emptyConns);
  assert.strictEqual(emptyCheck.success, false, 'Unconnected circuit must not be solved');
  assert.strictEqual(sim.colony.batteryFault, true, 'Fault must remain active until player connects wires');

  // Player connects and solves second fault
  const secondSolve = sim.solveWiringCircuit(validConns);
  assert.strictEqual(secondSolve.success, true);
  assert.strictEqual(sim.colony.batteryFault, false);
});
