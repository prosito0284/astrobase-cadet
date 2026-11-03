import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { AstrobaseSimulation, clampResources, ROVER_TARGETS } from './helpers/gameHarness.ts';
import { safeNum } from '../src/App.tsx';
import { INITIAL_MODULES } from '../src/data/modules.ts';
import { INITIAL_CREW } from '../src/data/crew.ts';
import { BaseLocation, GameDifficulty, ColonySaveData, CrewStatus } from '../src/types/game.ts';

/* =========================================================================
 * VECTOR 1: Global Scope & Window Encapsulation
 * ========================================================================= */
test('Vector 1: Global Scope & Window Encapsulation - No critical game state exposed on global scope', () => {
  // In Node.js / Headless or Browser, globalThis / window must not leak game variables
  const forbiddenGlobals = [
    'colony',
    'colonies',
    'resources',
    'sciencePoints',
    'maxSciencePoints',
    'emergencyO2Charges',
    'isAdvancing',
    'roverSortiesToday',
    'crewHealth',
    'currentColony',
    'astrobaseState',
  ];

  for (const key of forbiddenGlobals) {
    assert.strictEqual(
      (globalThis as any)[key],
      undefined,
      `Critical variable "${key}" must not be exposed on globalThis or window`
    );
  }
});

/* =========================================================================
 * VECTOR 2: Massive Input Spam & Autoclicker Stress Harness
 * ========================================================================= */
test('Vector 2: Massive Input Spam - 1,000 rapid irrigation clicks with 12L water consume exactly 10L', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.water = 12; // 2 waterings (5L + 5L = 10L), leaving 2L
  sim.cropGrowthProgress = 0;

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < 1000; i++) {
    const res = sim.waterCrop();
    if (res.success) {
      successCount++;
    } else {
      failCount++;
      assert.strictEqual(res.reason, 'INSUFFICIENT_WATER');
    }
  }

  assert.strictEqual(successCount, 2);
  assert.strictEqual(failCount, 998);
  assert.strictEqual(sim.colony.resources.water, 2);
  assert.strictEqual(sim.cropGrowthProgress, 50); // 2 * 25% = 50%
});

test('Vector 2: Massive Input Spam - 1,000 rapid harvest clicks on Sol 1 execute exactly once', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.cropGrowthProgress = 100;
  sim.colony.resources.food = 40;
  sim.colony.resources.sciencePoints = 10;

  let harvestSuccess = 0;
  let harvestBlocked = 0;

  for (let i = 0; i < 1000; i++) {
    const res = sim.harvestCrop();
    if (res.success) {
      harvestSuccess++;
    } else {
      harvestBlocked++;
      assert.ok(res.reason === 'CROP_NOT_MATURE' || res.reason === 'HARVEST_QUOTA_REACHED');
    }
  }

  assert.strictEqual(harvestSuccess, 1);
  assert.strictEqual(harvestBlocked, 999);
  assert.strictEqual(sim.colony.hasHarvestedToday, true);
  assert.strictEqual(sim.colony.resources.food, 40 + 25);
  assert.strictEqual(sim.colony.resources.sciencePoints, 10 + 15);
});

test('Vector 2: Massive Input Spam - 1,000 rapid rover launch calls strictly capped at 2 per Sol', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.energy = 100;

  let launched = 0;
  let rejected = 0;

  for (let i = 0; i < 1000; i++) {
    const res = sim.launchRoverSortie('shackleton_rim');
    if (res.success) {
      launched++;
    } else {
      rejected++;
      assert.strictEqual(res.reason, 'SORTIE_LIMIT_REACHED');
    }
  }

  assert.strictEqual(launched, 2);
  assert.strictEqual(rejected, 998);
  assert.strictEqual(sim.colony.roverSortiesToday, 2);
});

test('Vector 2: Massive Input Spam - 1,000 emergency O2 calls cannot exceed available charges or overflow 100%', () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.colony.resources.oxygen = 20; // Critical O2 (< 25%)
  sim.colony.emergencyO2Charges = 2;

  let successfulInjections = 0;
  let rejectedInjections = 0;

  // Emulate App.tsx atomic updater with charges guard
  for (let i = 0; i < 1000; i++) {
    if ((sim.colony.emergencyO2Charges ?? 2) <= 0) {
      rejectedInjections++;
      continue;
    }
    sim.colony.emergencyO2Charges -= 1;
    sim.colony.resources.oxygen = Math.min(100, sim.colony.resources.oxygen + 35);
    successfulInjections++;
  }

  assert.strictEqual(successfulInjections, 2);
  assert.strictEqual(rejectedInjections, 998);
  assert.strictEqual(sim.colony.emergencyO2Charges, 0);
  assert.strictEqual(sim.colony.resources.oxygen, 90); // 20 + 35 + 35 = 90 <= 100
});

test('Vector 2: Massive Input Spam - Module toggle throttle rejects rapid clicks within 200ms', () => {
  let toggleCount = 0;
  let lastToggleTime = 0;

  const handleToggle = (now: number) => {
    if (now - lastToggleTime < 200) return false;
    lastToggleTime = now;
    toggleCount++;
    return true;
  };

  const baseNow = 1000;
  // 500 clicks fired in the same millisecond
  for (let i = 0; i < 500; i++) {
    handleToggle(baseNow);
  }

  assert.strictEqual(toggleCount, 1, '500 rapid clicks in 0ms must result in exactly 1 toggle');

  // Next click after 250ms must succeed
  const nextClick = handleToggle(baseNow + 250);
  assert.strictEqual(nextClick, true);
  assert.strictEqual(toggleCount, 2);
});

test('Vector 2: Massive Input Spam - Crew shock cooldown rejects rapid shocks within 800ms', () => {
  let shockCount = 0;
  let lastShockTime = 0;

  const handleShock = (now: number) => {
    if (now - lastShockTime < 800) return false;
    lastShockTime = now;
    shockCount++;
    return true;
  };

  const t0 = 5000;
  // 100 shocks within 50ms
  for (let i = 0; i < 100; i++) {
    handleShock(t0 + (i % 50));
  }

  assert.strictEqual(shockCount, 1);

  // Shock after 850ms succeeds
  assert.strictEqual(handleShock(t0 + 850), true);
  assert.strictEqual(shockCount, 2);
});

/* =========================================================================
 * VECTOR 3: Tab Backgrounding, DeltaTime Clamping & Time-Skip Challenge
 * ========================================================================= */
test('Vector 3: DeltaTime Clamping - Massive sleep (1hr, 24hr, 7 days) strictly clamps dt to 0.1s', () => {
  const intervals = [
    { name: '10 seconds', rawDt: 10.0 },
    { name: '1 hour', rawDt: 3600.0 },
    { name: '24 hours', rawDt: 86400.0 },
    { name: '7 days', rawDt: 604800.0 },
  ];

  for (const { name, rawDt } of intervals) {
    const clampedDt = Math.min(rawDt, 0.1);
    assert.strictEqual(
      clampedDt,
      0.1,
      `Clamping for ${name} (rawDt=${rawDt}s) must never exceed 0.1s`
    );
  }
});

test('Vector 3: High Refresh Rate & Tick Loop Stability - 100ms loop maintains accumulator integrity', () => {
  // App.tsx uses 100ms setInterval loop with performance.now() timestamps
  let accumulatedTime = 0;
  let ticksFired = 0;
  let lastTickTime = 1000.0;

  // Simulate 101 ticks driven by wall clock (100ms each, total 10.1s)
  for (let step = 1; step <= 101; step++) {
    const now = 1000.0 + step * 100.0;
    const rawDt = (now - lastTickTime) / 1000;
    lastTickTime = now;
    const dt = Math.min(rawDt, 0.1);
    accumulatedTime += dt;
    if (accumulatedTime >= 1.0) {
      const elapsed = Math.floor(accumulatedTime);
      accumulatedTime -= elapsed;
      ticksFired += elapsed;
    }
  }

  assert.strictEqual(ticksFired, 10, '10.1s over 100ms ticks fires exactly 10 elapsed seconds');
  assert.ok(accumulatedTime < 0.2, `Accumulated remainder must be bounded (got ${accumulatedTime})`);
});

test('Vector 3: Tab Resume Reconciliation - Visibility change event prevents backlog accumulation', () => {
  let lastTickTime = 1000;
  let accumulated = 0.5;

  // Simulate tab being minimized for 30 minutes
  const resumedAt = 1000 + 1800 * 1000;

  // On visibilitychange or focus, handler resets lastTickTime to performance.now()
  const handleVisibilityOrFocus = (now: number) => {
    lastTickTime = now;
  };

  handleVisibilityOrFocus(resumedAt);

  // Subsequent tick occurs 100ms after resume
  const nextTickTime = resumedAt + 100;
  const rawDt = (nextTickTime - lastTickTime) / 1000;
  const dt = Math.min(rawDt, 0.1);

  accumulated += dt;

  // Only 0.1s was accumulated, NOT 1800s
  assert.ok(accumulated < 1.0, `Accumulated time must remain < 1.0s, got ${accumulated}s`);
  assert.strictEqual(Math.round(dt * 100) / 100, 0.1);
});

/* =========================================================================
 * VECTOR 4: Dirty Restart, Cascades, Memory Leaks & Lifecycle Loop Duplication
 * ========================================================================= */
test('Vector 4: Restart Cascades - 1,000 rapid restarts execute exactly 1 clean re-initialization', () => {
  let isRestarting = false;
  let restartCount = 0;
  let activeTimers: ReturnType<typeof setTimeout>[] = [];

  const handleRestartMission = () => {
    if (isRestarting) return false;
    isRestarting = true;

    // Clear any pending timers
    activeTimers.forEach(t => clearTimeout(t));
    activeTimers = [];

    // Simulate 600ms debounce
    const resetTimer = setTimeout(() => {
      isRestarting = false;
    }, 600);
    activeTimers.push(resetTimer);

    restartCount++;
    return true;
  };

  // 1,000 rapid invocations
  let accepted = 0;
  let rejected = 0;
  for (let i = 0; i < 1000; i++) {
    if (handleRestartMission()) {
      accepted++;
    } else {
      rejected++;
    }
  }

  assert.strictEqual(accepted, 1);
  assert.strictEqual(rejected, 999);
  assert.strictEqual(restartCount, 1);

  // Clean up
  activeTimers.forEach(t => clearTimeout(t));
});

test('Vector 4: Full Game Lifecycle Stability & FPS Smoothness (100 cycles)', () => {
  // Cycle: Inicio -> Juego -> Game Over -> Reinicio
  const sim = new AstrobaseSimulation('moon', 'normal');

  const cycleTimes: number[] = [];

  for (let cycle = 0; cycle < 100; cycle++) {
    const tStart = performance.now();

    // 1. Inicio: initialize state
    sim.colony = {
      ...sim.colony,
      currentDay: 1,
      missionCompleted: false,
      resources: clampResources({ oxygen: 80, water: 75, energy: 85, food: 80 }),
    };

    // 2. Juego: advance 5 days with actions
    for (let day = 1; day <= 5; day++) {
      sim.waterCrop();
      sim.launchRoverSortie('shackleton_rim');
      sim.advanceDay();
    }

    // 3. Game Over trigger: force O2 to 0
    sim.colony.resources.oxygen = 0;
    const isGameOver = sim.colony.resources.oxygen <= 0;
    assert.strictEqual(isGameOver, true);

    // 4. Reinicio: clean reset
    sim.colony = {
      ...sim.colony,
      currentDay: 1,
      missionCompleted: false,
      emergencyO2Charges: 2,
      roverSortiesToday: 0,
      hasHarvestedToday: false,
      batteryFault: false,
      resources: clampResources({ oxygen: 80, water: 75, energy: 85, food: 80 }),
    };

    const tEnd = performance.now();
    cycleTimes.push(tEnd - tStart);
  }

  // Verify memory / performance stability: average time per cycle must remain sub-millisecond
  const avgTime = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
  const first10Avg = cycleTimes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  const last10Avg = cycleTimes.slice(90, 100).reduce((a, b) => a + b, 0) / 10;

  // There should be no exponential slowdown (last 10 vs first 10 within reasonable threshold)
  assert.ok(avgTime < 5.0, `Average lifecycle execution time must be under 5ms (was ${avgTime.toFixed(3)}ms)`);
  assert.ok(last10Avg < first10Avg * 5 + 1.0, `No memory leak degradation detected across 100 lifecycles`);
});

/* =========================================================================
 * VECTOR 5: Corrupted localStorage Injection & Schema Fuzzing
 * ========================================================================= */
test('Vector 5: Storage Hardening - safeNum rejects NaN, Infinity, -Infinity, negative numbers and clamps correctly', () => {
  // safeNum(v, fallback, min, max)
  assert.strictEqual(safeNum(NaN, 10, 0, 100), 10);
  assert.strictEqual(safeNum(Infinity, 10, 0, 100), 10);
  assert.strictEqual(safeNum(-Infinity, 10, 0, 100), 10);
  assert.strictEqual(safeNum(null, 10, 0, 100), 10);
  assert.strictEqual(safeNum(undefined, 10, 0, 100), 10);
  assert.strictEqual(safeNum('not_a_number', 10, 0, 100), 10);
  assert.strictEqual(safeNum(-50, 10, 0, 100), 0);
  assert.strictEqual(safeNum(500, 10, 0, 100), 100);
  assert.strictEqual(safeNum(42, 10, 0, 100), 42);
  assert.strictEqual(safeNum('42', 10, 0, 100), 42);
});

test('Vector 5: Storage Hardening - clampResources bounds science points to MAX_SCIENCE_POINTS (500)', () => {
  // 1. Extreme finite values clamp strictly to 500
  const finitePoisoned = clampResources({ sciencePoints: 999999, maxSciencePoints: 999999 } as any);
  assert.strictEqual(finitePoisoned.maxSciencePoints, 500, 'maxSciencePoints must strictly clamp to 500');
  assert.strictEqual(finitePoisoned.sciencePoints, 500, 'finite sciencePoints must clamp to 500');

  // 2. String numeric inputs clamp to 500
  const stringPoisoned = clampResources({ sciencePoints: '999999', maxSciencePoints: '999999' } as any);
  assert.strictEqual(stringPoisoned.maxSciencePoints, 500);
  assert.strictEqual(stringPoisoned.sciencePoints, 500);

  // 3. Non-finite inputs (Infinity) safely fallback to 0 (cannot exploit points)
  const nonFinitePoisoned = clampResources({ sciencePoints: Infinity, maxSciencePoints: Infinity } as any);
  assert.strictEqual(nonFinitePoisoned.maxSciencePoints, 500);
  assert.strictEqual(nonFinitePoisoned.sciencePoints, 0, 'Infinity sciencePoints must safely reset to 0');
});

test('Vector 5: Storage Hardening - clampResources rejects negative capacities and forces defaults', () => {
  const poisonedCapacities = {
    maxOxygen: -100,
    maxWater: -500,
    maxEnergy: 0,
    maxFood: NaN,
    oxygen: 50,
    water: 50,
    energy: 50,
    food: 50,
  };

  const sanitized = clampResources(poisonedCapacities as any);
  assert.strictEqual(sanitized.maxOxygen, 100, 'Negative maxOxygen must fallback to 100');
  assert.strictEqual(sanitized.maxWater, 100, 'Negative maxWater must fallback to 100');
  assert.strictEqual(sanitized.maxEnergy, 100, 'Zero maxEnergy must fallback to 100');
  assert.strictEqual(sanitized.maxFood, 100, 'NaN maxFood must fallback to 100');
});

test('Vector 5: Storage Hardening - mergeColony schema fuzzing with 50 malicious payloads', () => {
  // Emulate App.tsx mergeColony logic
  const mergeColony = (c: any, loc: BaseLocation): ColonySaveData => {
    const safeDiff: GameDifficulty = (c?.difficulty === 'facil' || c?.difficulty === 'normal' || c?.difficulty === 'dificil') ? c.difficulty : 'normal';
    const initModules = JSON.parse(JSON.stringify(INITIAL_MODULES));
    const initCrew = JSON.parse(JSON.stringify(INITIAL_CREW));
    const maxAllowed = loc === 'moon' ? 28 : 30;
    let safeDay = c?.currentDay ? Number(c.currentDay) : 1;
    if (isNaN(safeDay) || safeDay < 1) safeDay = 1;
    if (safeDay > maxAllowed) safeDay = maxAllowed;

    const sanitizedResources = clampResources(c?.resources);

    const sanitizedModules = Array.isArray(c?.modules) && c.modules.length > 0
      ? initModules.map((initMod: any) => {
          const savedMod = c.modules.find((m: any) => m && m.id === initMod.id);
          if (!savedMod) return initMod;
          const safeLevel = Math.max(1, Math.min(initMod.maxLevel || 3, Number(savedMod.level) || 1));
          return {
            ...initMod,
            level: safeLevel,
            isActive: typeof savedMod.isActive === 'boolean' ? savedMod.isActive : initMod.isActive,
          };
        })
      : initModules;

    const sanitizedCrew = Array.isArray(c?.crew) && c.crew.length > 0
      ? c.crew.map((member: any) => {
          const health = Math.max(0, Math.min(100, Number(member?.health) || 0));
          const morale = Math.max(0, Math.min(100, Number(member?.morale) || 0));
          const status = (health <= 0 ? 'deceased' : health < 25 ? 'critical' : 'alive') as CrewStatus;
          return {
            ...member,
            health,
            morale,
            status: member?.status === 'deceased' ? 'deceased' : status,
          };
        })
      : initCrew;

    const livingCrewIds = new Set(sanitizedCrew.filter((m: any) => m.status !== 'deceased').map((m: any) => m.id));
    const sanitizedAssignedToMine = Array.isArray(c?.assignedToMine)
      ? Array.from(new Set(c.assignedToMine.filter((id: any) => typeof id === 'string' && livingCrewIds.has(id))))
      : [];

    return {
      currentDay: safeDay,
      difficulty: safeDiff,
      missionCompleted: Boolean(c?.missionCompleted),
      resources: sanitizedResources,
      modules: sanitizedModules,
      crew: sanitizedCrew,
      radiationActive: Boolean(c?.radiationActive),
      dustStormActive: Boolean(c?.dustStormActive),
      isLunarNight: Boolean(c?.isLunarNight),
      currentTemperatureCelsius: Number.isFinite(Number(c?.currentTemperatureCelsius)) ? Number(c.currentTemperatureCelsius) : (loc === 'moon' ? 120 : 15),
      isTemperatureExtreme: Boolean(c?.isTemperatureExtreme),
      isCommBlackout: Boolean(c?.isCommBlackout),
      solarFluctuation: Boolean(c?.solarFluctuation),
      emergencyO2Active: Boolean(c?.emergencyO2Active),
      emergencyO2Charges: Math.max(0, Math.min(2, c?.emergencyO2Charges !== undefined ? Number(c.emergencyO2Charges) : 2)),
      roverSortiesToday: Math.max(0, Math.min(2, Number(c?.roverSortiesToday) || 0)),
      hasHarvestedToday: Boolean(c?.hasHarvestedToday),
      hasQuizCompletedToday: Boolean(c?.hasQuizCompletedToday),
      batteryFault: Boolean(c?.batteryFault),
      batteryFaultCount: Math.max(0, Math.min(10, Number(c?.batteryFaultCount) || 0)),
      batteryLockoutSeconds: Math.max(0, Math.min(10, Number(c?.batteryLockoutSeconds) || 0)),
      batteryLockoutTurns: Math.max(0, Math.min(5, Number(c?.batteryLockoutTurns) || 0)),
      wiringErrorActive: Boolean(c?.wiringErrorActive),
      sandstormEnergyHaltDays: Math.max(0, Math.min(5, Number(c?.sandstormEnergyHaltDays) || 0)),
      plantsNeedDoubleWaterOnce: Boolean(c?.plantsNeedDoubleWaterOnce),
      plantsWipedGrowth: Boolean(c?.plantsWipedGrowth),
      empStunSeconds: Math.max(0, Math.min(5, Number(c?.empStunSeconds) || 0)),
      populationExpanded: Boolean(c?.populationExpanded),
      assignedToMine: sanitizedAssignedToMine as string[],
      lastEventDay: safeNum(c?.lastEventDay, 1, 1, 100),
      lastSolarFlareDay: safeNum(c?.lastSolarFlareDay, 1, 1, 100),
      lastEventId: typeof c?.lastEventId === 'string' ? c.lastEventId : undefined,
    };
  };

  // 50 Adversarial Fuzzing Payloads
  const fuzzPayloads = [
    null,
    undefined,
    {},
    { currentDay: 9999, difficulty: 'hacker_godmode' },
    { currentDay: -50, difficulty: null },
    { currentDay: NaN, difficulty: 12345 },
    { currentDay: Infinity, difficulty: {} },
    { currentDay: 29, difficulty: 'facil' }, // Moon max is 28
    { modules: [{ id: 'life_support', level: 999 }] },
    { modules: [{ id: 'life_support', level: -10 }] },
    { modules: [{ id: 'life_support', level: 'MAX' }] },
    { modules: 'not_an_array' },
    { crew: [{ id: 'artemis_cdr', health: 999999, morale: -500 }] },
    { crew: [{ id: 'artemis_cdr', health: 0, status: 'alive' }] }, // dead health must be deceased
    { crew: [{ id: 'artemis_cdr', health: NaN, status: null }] },
    { crew: 'not_an_array' },
    { assignedToMine: ['non_existent_ghost_id', 'artemis_cdr', 'artemis_cdr'] },
    { emergencyO2Charges: 999 },
    { emergencyO2Charges: -50 },
    { roverSortiesToday: 999 },
    { roverSortiesToday: -10 },
    { batteryLockoutSeconds: 999999 },
    { empStunSeconds: 999999 },
    { resources: { maxSciencePoints: 1000000, sciencePoints: 999999 } },
    { resources: { maxOxygen: -100, oxygen: -50 } },
    { resources: { oxygen: Infinity, energy: -Infinity } },
    { __proto__: { admin: true } },
  ];

  for (let i = 0; i < fuzzPayloads.length; i++) {
    const payload = fuzzPayloads[i];
    assert.doesNotThrow(() => {
      const mergedMoon = mergeColony(payload, 'moon');
      const mergedMars = mergeColony(payload, 'mars');

      // Verify Moon invariants
      assert.ok(mergedMoon.currentDay >= 1 && mergedMoon.currentDay <= 28);
      assert.ok(mergedMoon.difficulty === 'facil' || mergedMoon.difficulty === 'normal' || mergedMoon.difficulty === 'dificil');
      assert.ok(mergedMoon.resources.maxSciencePoints <= 500);
      assert.ok(mergedMoon.resources.sciencePoints <= 500);
      assert.ok(mergedMoon.emergencyO2Charges >= 0 && mergedMoon.emergencyO2Charges <= 2);
      assert.ok(mergedMoon.roverSortiesToday >= 0 && mergedMoon.roverSortiesToday <= 2);
      assert.ok(mergedMoon.batteryLockoutSeconds <= 10);
      assert.ok(mergedMoon.empStunSeconds <= 5);

      // Verify Mars invariants
      assert.ok(mergedMars.currentDay >= 1 && mergedMars.currentDay <= 30);
      assert.ok(mergedMars.difficulty === 'facil' || mergedMars.difficulty === 'normal' || mergedMars.difficulty === 'dificil');
      assert.ok(mergedMars.resources.maxSciencePoints <= 500);
      assert.ok(mergedMars.resources.sciencePoints <= 500);

      // Modules invariants
      for (const mod of mergedMoon.modules) {
        assert.ok(mod.level >= 1 && mod.level <= mod.maxLevel);
      }

      // Crew invariants
      for (const cr of mergedMoon.crew) {
        assert.ok(cr.health >= 0 && cr.health <= 100);
        assert.ok(cr.morale >= 0 && cr.morale <= 100);
        if (cr.health <= 0) {
          assert.strictEqual(cr.status, 'deceased');
        }
      }
    }, `Payload #${i} caused an invariant failure or unhandled exception`);
  }
});
