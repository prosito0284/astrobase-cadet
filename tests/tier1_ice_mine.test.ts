import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 1.6: Ice Mine - Astronaut assignment and unassignment toggle', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  const astroId = sim.colony.crew[0].id;

  // Assign
  const assignRes = sim.toggleAssignMiner(astroId);
  assert.strictEqual(assignRes.success, true);
  assert.strictEqual(sim.colony.assignedToMine.includes(astroId), true);
  assert.strictEqual(sim.colony.crew[0].isAssignedToMine, true);

  // Unassign
  const unassignRes = sim.toggleAssignMiner(astroId);
  assert.strictEqual(unassignRes.success, true);
  assert.strictEqual(sim.colony.assignedToMine.includes(astroId), false);
  assert.strictEqual(sim.colony.crew[0].isAssignedToMine, false);
});

test('Tier 1.6: Ice Mine - Hard mode capacity capped at 1 miner prior to expansion', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  const astro1 = sim.colony.crew[0].id;
  const astro2 = sim.colony.crew[1].id;

  // First miner assigns
  const res1 = sim.toggleAssignMiner(astro1);
  assert.strictEqual(res1.success, true);
  assert.strictEqual(sim.colony.assignedToMine.length, 1);

  // Second miner attempt rejected (max 1 on Hard)
  const res2 = sim.toggleAssignMiner(astro2);
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.reason, 'MINE_CAPACITY_REACHED');
  assert.strictEqual(sim.colony.assignedToMine.length, 1);
});

test('Tier 1.6: Ice Mine - Atomic duplicate astronaut assignment rejection (no [id, id])', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  const astro1 = sim.colony.crew[0].id;

  sim.toggleAssignMiner(astro1);
  assert.strictEqual(sim.colony.assignedToMine.length, 1);

  // Attempt to assign same astronaut again simulates rapid concurrent toggle
  // Toggling an already assigned astronaut should unassign, NEVER create [id, id]
  sim.toggleAssignMiner(astro1);
  assert.strictEqual(sim.colony.assignedToMine.length, 0);

  // Re-assigning once creates single entry
  sim.toggleAssignMiner(astro1);
  assert.strictEqual(sim.colony.assignedToMine.length, 1);
  assert.strictEqual(new Set(sim.colony.assignedToMine).size, 1);
});

test('Tier 1.6: Ice Mine - Minimum habitat staffing safety rule enforces >= 1 base occupant', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  // Kill 2 of 4 crew members so only 2 living crew remain
  sim.colony.crew[2].status = 'deceased';
  sim.colony.crew[3].status = 'deceased';

  const livingCrew = sim.colony.crew.filter(c => c.status !== 'deceased');
  assert.strictEqual(livingCrew.length, 2);

  // Assign 1st of 2 living crew (leaves 1 in base) -> allowed
  const r1 = sim.toggleAssignMiner(livingCrew[0].id);
  assert.strictEqual(r1.success, true);

  // Assign 2nd living crew (would leave 0 in base) -> blocked by safety rule
  const r2 = sim.toggleAssignMiner(livingCrew[1].id);
  assert.strictEqual(r2.success, false);
  assert.strictEqual(r2.reason, 'BASE_MINIMUM_CREW_VIOLATION');
});

test('Tier 1.6: Ice Mine - Ghost miner eviction on astronaut death', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  const minerId = sim.colony.crew[0].id;
  sim.toggleAssignMiner(minerId);
  assert.strictEqual(sim.colony.assignedToMine.includes(minerId), true);

  // Simulate astronaut death in environmental event
  sim.colony.crew[0].status = 'deceased';
  sim.colony.crew[0].health = 0;

  // Eviction cleans up slot
  sim.evictDeceasedMiners();
  assert.strictEqual(sim.colony.assignedToMine.includes(minerId), false);
  assert.strictEqual(sim.colony.assignedToMine.length, 0);
});
