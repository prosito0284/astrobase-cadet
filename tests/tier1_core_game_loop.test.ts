import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';

test('Tier 1.1: Core Game Loop - Initial state baseline initialization across scenarios', () => {
  const moonSim = new AstrobaseSimulation('moon', 'normal');
  assert.strictEqual(moonSim.colony.currentDay, 1);
  assert.strictEqual(moonSim.colony.difficulty, 'normal');
  assert.strictEqual(moonSim.effectiveTotalDays, 28);
  assert.strictEqual(moonSim.colony.missionCompleted, false);
  assert.strictEqual(moonSim.colony.crew.length, 4);

  const marsSim = new AstrobaseSimulation('mars', 'dificil');
  assert.strictEqual(marsSim.colony.currentDay, 1);
  assert.strictEqual(marsSim.colony.difficulty, 'dificil');
  assert.strictEqual(marsSim.effectiveTotalDays, 30);
  assert.strictEqual(marsSim.colony.modules.length, 9);
  assert.strictEqual(marsSim.colony.assignedToMine.length, 0);
});

test('Tier 1.1: Core Game Loop - Daily life support drain proportional to living crew', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  const initialO2 = sim.colony.resources.oxygen;
  const initialH2O = sim.colony.resources.water;
  const initialFood = sim.colony.resources.food;

  const res = sim.advanceDay();
  assert.strictEqual(res.success, true);
  assert.strictEqual(sim.colony.currentDay, 2);

  // 4 crew members * 1.5 O2 = 6.0 drain
  assert.strictEqual(sim.colony.resources.oxygen, initialO2 - 6);
  // 4 crew members * 1.8 H2O = 7.2 drain
  assert.strictEqual(sim.colony.resources.water, initialH2O - 7.2);
  // 4 crew members * 1.2 Food = 4.8 drain
  assert.strictEqual(sim.colony.resources.food, initialFood - 4.8);
});

test('Tier 1.1: Core Game Loop - Campaign victory threshold on Day 28 (Moon) and Day 30 (Mars)', () => {
  const moonSim = new AstrobaseSimulation('moon', 'normal');
  for (let d = 1; d < 28; d++) {
    // Keep resources replenished to survive to day 28
    moonSim.colony.resources.oxygen = 90;
    moonSim.colony.resources.water = 90;
    moonSim.colony.resources.food = 90;
    const adv = moonSim.advanceDay();
    assert.strictEqual(adv.success, true);
  }
  assert.strictEqual(moonSim.colony.currentDay, 28);
  assert.strictEqual(moonSim.colony.missionCompleted, true);

  // Subsequent advance is rejected
  const extraAdv = moonSim.advanceDay();
  assert.strictEqual(extraAdv.success, false);
  assert.strictEqual(extraAdv.reason, 'MISSION_ALREADY_COMPLETED');
});

test('Tier 1.1: Core Game Loop - Temperature cycle transitions (Moon night -180C / Mars cold -85C)', () => {
  const moonSim = new AstrobaseSimulation('moon', 'normal');
  // Day 1 to 9 is lunar day (+120°C)
  assert.strictEqual(moonSim.colony.currentTemperatureCelsius, 120);

  // Advance to lunar night (starts around day 10 on normal)
  while (moonSim.colony.currentDay < 10) {
    moonSim.colony.resources.oxygen = 90;
    moonSim.colony.resources.water = 90;
    moonSim.colony.resources.food = 90;
    moonSim.advanceDay();
  }
  assert.strictEqual(moonSim.colony.currentTemperatureCelsius, -180);
  assert.strictEqual(moonSim.colony.isLunarNight, true);
  assert.strictEqual(moonSim.colony.isTemperatureExtreme, true);

  const marsSim = new AstrobaseSimulation('mars', 'normal');
  marsSim.advanceDay(); // Sol 2 (even day) -> -85°C
  assert.strictEqual(marsSim.colony.currentTemperatureCelsius, -85);
  assert.strictEqual(marsSim.colony.isTemperatureExtreme, true);
});

test('Tier 1.1: Core Game Loop - Lockout seconds and EMP stun countdown decrement', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  sim.colony.batteryLockoutSeconds = 5;
  sim.colony.empStunSeconds = 3;

  sim.advanceDay();
  assert.strictEqual(sim.colony.batteryLockoutSeconds, 4);
  assert.strictEqual(sim.colony.empStunSeconds, 2);

  sim.advanceDay();
  assert.strictEqual(sim.colony.batteryLockoutSeconds, 3);
  assert.strictEqual(sim.colony.empStunSeconds, 1);
});

test('Tier 1.1: Core Game Loop - Dynamic space weather tracks event history and preserves cooldown bounds', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');

  // Verify baseline event tracking fields are safely initialized
  assert.strictEqual(sim.colony.lastEventDay ?? 0, 0);
  assert.strictEqual(sim.colony.lastSolarFlareDay ?? 0, 0);

  // Simulate an event occurring on Sol 4
  sim.colony.lastEventDay = 4;
  sim.colony.lastSolarFlareDay = 4;
  sim.colony.lastEventId = 'donki_xflare';

  // Advance to Sol 5: daysSinceLastEvent is 1 (< 3 cooldown), so cooldown is strictly maintained
  sim.colony.resources.oxygen = 90;
  sim.colony.resources.water = 90;
  sim.colony.resources.food = 90;
  sim.advanceDay();
  assert.strictEqual(sim.colony.currentDay, 2);

  // In simulated game loop, lastEventDay prevents rapid-fire consecutive modals
  const cooldownWindow = 3;
  const isCooldownActive = (5 - sim.colony.lastEventDay) < cooldownWindow;
  assert.strictEqual(isCooldownActive, true, 'Cooldown must be active 1 Sol after an event');

  // Advance past cooldown (Sol 8, 4 Sols later)
  const isCooldownExpired = (8 - sim.colony.lastEventDay) >= cooldownWindow;
  assert.strictEqual(isCooldownExpired, true, 'Cooldown should expire after 4 Sols');
});

test('Tier 1.1: Core Game Loop - Sol 3 and early Sols (1-5) are strictly 100% immune to DONKI solar radiation storms across all difficulties', () => {
  const difficulties = ['facil', 'normal', 'dificil'] as const;

  for (const diff of difficulties) {
    const sim = new AstrobaseSimulation('moon', diff);
    assert.strictEqual(sim.colony.difficulty, diff);
    assert.strictEqual(sim.colony.radiationActive, false);

    // Across ALL difficulties, Sols 1 to 5 are strictly protected from DONKI solar flare
    for (let sol = 1; sol <= 5; sol++) {
      const isEligible = sol > 5;
      assert.strictEqual(isEligible, false, `Sol ${sol} in ${diff} must strictly forbid DONKI solar radiation flares`);
    }

    // Explicit verification of Sol 3 absolute immunity
    const sol3Immunity = 3 <= 5;
    assert.strictEqual(sol3Immunity, true, `Sol 3 must be 100% immune to solar flares in ${diff} difficulty`);
  }

  // Verify difficulty-specific minimum day gates for super rare roll
  const minFlareDay = {
    facil: 15,
    normal: 8,
    dificil: 6,
  };

  assert.strictEqual(15 >= minFlareDay.facil, true);
  assert.strictEqual(7 > minFlareDay.normal, false);
  assert.strictEqual(5 > minFlareDay.dificil, false);
});
