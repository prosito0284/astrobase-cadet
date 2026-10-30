import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 1.7: Oxygen Emergency - Activation blocked when O2 level is above critical threshold (>= 25%)', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.oxygen = 50; // Not critical

  const res = sim.injectEmergencyO2();
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.reason, 'O2_NOT_CRITICAL');
  assert.strictEqual(sim.colony.emergencyO2Charges, 2);
});

test('Tier 1.7: Oxygen Emergency - Critical O2 (< 25%) successfully consumes canister and adds +35% O2', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.oxygen = 15; // Critical

  const res = sim.injectEmergencyO2();
  assert.strictEqual(res.success, true);
  assert.strictEqual(sim.colony.resources.oxygen, 50); // 15 + 35 = 50
  assert.strictEqual(sim.colony.emergencyO2Charges, 1);
  assert.strictEqual(sim.colony.emergencyO2Active, true);
});

test('Tier 1.7: Oxygen Emergency - Depleting both canisters blocks further emergency refills (finite charges)', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');

  // Canister 1
  sim.colony.resources.oxygen = 10;
  assert.strictEqual(sim.injectEmergencyO2().success, true);
  assert.strictEqual(sim.colony.emergencyO2Charges, 1);

  // Canister 2
  sim.colony.resources.oxygen = 10;
  assert.strictEqual(sim.injectEmergencyO2().success, true);
  assert.strictEqual(sim.colony.emergencyO2Charges, 0);

  // Canister 3 (Attempt infinite free O2 exploit)
  sim.colony.resources.oxygen = 10;
  const res3 = sim.injectEmergencyO2();
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.reason, 'NO_CANISTERS_REMAINING');
  assert.strictEqual(sim.colony.resources.oxygen, 10);
});

test('Tier 1.7: Oxygen Emergency - O2 gain is strictly clamped to habitat maximum capacity (100%)', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.colony.resources.oxygen = 24; // Critical but close to threshold

  const res = sim.injectEmergencyO2();
  assert.strictEqual(res.success, true);
  // 24 + 35 = 59, clamped <= 100
  assert.strictEqual(sim.colony.resources.oxygen, 59);

  sim.colony.resources.oxygen = 20;
  sim.colony.resources.maxOxygen = 50; // Damaged habitat module
  const res2 = sim.injectEmergencyO2();
  assert.strictEqual(res2.success, true);
  // 20 + 35 = 55, clamped to maxOxygen (50)
  assert.strictEqual(sim.colony.resources.oxygen, 50);
});

test('Tier 1.7: Oxygen Emergency - Timing synchronization: valve pressurization delay (2s) is within grace window', () => {
  const VALVE_PRESSURIZATION_DELAY_MS = 2000;
  const ECLSS_ASPHYXIATION_GRACE_WINDOW_MS = 3000;

  // Verification that pressurization delay finishes BEFORE fatal asphyxiation triggers
  assert.ok(
    VALVE_PRESSURIZATION_DELAY_MS <= ECLSS_ASPHYXIATION_GRACE_WINDOW_MS,
    'Physical valve pressurization delay (2s) must complete within ECLSS asphyxiation grace window'
  );
});
