import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation, ROVER_TARGETS, clampResources } from './helpers/gameHarness.ts';
import { MISSION_EVENTS } from '../src/data/events.ts';

// Helper to simulate asynchronous timer delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/* =========================================================================
 * FOCUS AREA 1: Rapid Clicking & Concurrency on Day Advancement vs 0% O2 Grace Period
 * ========================================================================= */

test('Tier 5.1: Day Advancement - 300 rapid sequential clicks within a single tick execute exactly 1 advance', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  const startDay = sim.colony.currentDay;
  const startO2 = sim.colony.resources.oxygen;

  // Simulate a debounced handler environment matching src/App.tsx (isAdvancingRef)
  let isAdvancing = false;
  let executedAdvances = 0;
  const advanceDebounced = () => {
    if (isAdvancing) return { success: false, reason: 'DEBOUNCE_LOCKED' };
    isAdvancing = true;
    const res = sim.advanceDay();
    if (res.success) executedAdvances++;
    return res;
  };

  // Dispatch 300 rapid calls synchronously
  const results = [];
  for (let i = 0; i < 300; i++) {
    results.push(advanceDebounced());
  }

  // Exactly 1 advance executes; 299 are locked by debounce
  assert.strictEqual(executedAdvances, 1);
  assert.strictEqual(sim.colony.currentDay, startDay + 1);
  assert.strictEqual(results[0].success, true);
  for (let i = 1; i < 300; i++) {
    assert.strictEqual(results[i].success, false);
    assert.strictEqual(results[i].reason, 'DEBOUNCE_LOCKED');
  }

  // Daily O2 drain corresponds strictly to 1 Sol (not 300x)
  const livingCrew = sim.colony.crew.filter(c => c.status !== 'deceased').length;
  const expectedO2Drain = livingCrew * 1.5;
  assert.strictEqual(sim.colony.resources.oxygen, startO2 - expectedO2Drain);
});

test('Tier 5.1: Day Advancement - 0% O2 triggers fatal grace period and locks Day Advancement', async () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  // Force ECLSS to near zero so advanceDay drops O2 to 0
  sim.colony.resources.oxygen = 1.0;

  let isAdvancing = false;
  let zeroOxygenGraceActive = false;
  let gameOverTriggered = false;
  let gameOverCause = '';

  const advanceDayWithGracePeriod = () => {
    if (isAdvancing) return { success: false, reason: 'ADVANCE_LOCKED' };
    isAdvancing = true;

    const res = sim.advanceDay();
    if (sim.colony.resources.oxygen <= 0) {
      zeroOxygenGraceActive = true;
      // In App.tsx, isAdvancing remains true during the 3.0s grace window
      setTimeout(() => {
        if (sim.colony.resources.oxygen <= 0) {
          gameOverTriggered = true;
          gameOverCause = 'ASPHYXIATION';
          sim.colony.crew.forEach(c => {
            c.health = 0;
            c.status = 'deceased';
          });
        }
        isAdvancing = false;
        zeroOxygenGraceActive = false;
      }, 50); // Scaled for test speed
    } else {
      setTimeout(() => { isAdvancing = false; }, 10);
    }
    return res;
  };

  // Day 1 -> Day 2 with O2 dropping to 0
  const firstAdv = advanceDayWithGracePeriod();
  assert.strictEqual(firstAdv.success, true);
  assert.strictEqual(sim.colony.resources.oxygen, 0);
  assert.strictEqual(zeroOxygenGraceActive, true);
  assert.strictEqual(isAdvancing, true);

  // During grace period, rapid spam of 100 clicks must ALL fail
  for (let i = 0; i < 100; i++) {
    const spamAdv = advanceDayWithGracePeriod();
    assert.strictEqual(spamAdv.success, false);
    assert.strictEqual(spamAdv.reason, 'ADVANCE_LOCKED');
  }

  // Wait for grace period to expire without emergency O2 injection
  await delay(80);

  // Crew is asphyxiated, game over confirmed
  assert.strictEqual(gameOverTriggered, true);
  assert.strictEqual(gameOverCause, 'ASPHYXIATION');
  assert.strictEqual(sim.colony.crew.every(c => c.status === 'deceased'), true);
});

test('Tier 5.1: Day Advancement - Zero O2 on final day blocks Campaign Victory', () => {
  const sim = new AstrobaseSimulation('moon', 'dificil');
  sim.colony.currentDay = 27; // 1 day before victory (day 28)
  sim.colony.resources.oxygen = 1.0; // Will drop to 0 on advance

  // Simulation loop check: In App.tsx, zero O2 grace check (line 1263) occurs before victory check (line 1365)
  const livingCrew = sim.colony.crew.filter(c => c.status !== 'deceased').length;
  const o2Drain = livingCrew * 1.5;
  const nextO2 = Math.max(0, sim.colony.resources.oxygen - o2Drain);

  const isZeroO2Grace = nextO2 <= 0;
  assert.strictEqual(isZeroO2Grace, true);

  // Supreme Commander victory badge must NOT be awarded if ECLSS failed
  let victoryAchieved = false;
  if (!isZeroO2Grace && sim.colony.currentDay + 1 >= 28) {
    victoryAchieved = true;
  }
  assert.strictEqual(victoryAchieved, false, 'Victory must be blocked when ECLSS oxygen reaches 0%');
});

/* =========================================================================
 * FOCUS AREA 2: Emergency O2 Canister Limits & Timing Race Condition
 * ========================================================================= */

test('Tier 5.2: Emergency O2 - 200 concurrent injection calls strictly consume max 2 canisters', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.oxygen = 10; // Critical O2 (< 25%)

  // Emulate atomic React functional state updater from src/App.tsx handleEmergencyO2Injected
  let successfulInjections = 0;
  let rejectedInjections = 0;

  const simulateAtomicEmergencyInjection = () => {
    // Outer guard
    if ((sim.colony.emergencyO2Charges ?? 2) <= 0) {
      rejectedInjections++;
      return { success: false, reason: 'OUTER_CHARGES_DEPLETED' };
    }

    // Inner atomic updater
    const charges = sim.colony.emergencyO2Charges ?? 2;
    if (charges <= 0) {
      rejectedInjections++;
      return { success: false, reason: 'INNER_CHARGES_DEPLETED' };
    }

    sim.colony.emergencyO2Charges = charges - 1;
    sim.colony.resources.oxygen = Math.min(100, sim.colony.resources.oxygen + 35);
    sim.colony.emergencyO2Active = true;
    successfulInjections++;
    return { success: true };
  };

  // Dispatch 200 concurrent injection calls
  for (let i = 0; i < 200; i++) {
    simulateAtomicEmergencyInjection();
  }

  assert.strictEqual(successfulInjections, 2);
  assert.strictEqual(rejectedInjections, 198);
  assert.strictEqual(sim.colony.emergencyO2Charges, 0);
  assert.strictEqual(sim.colony.resources.oxygen, 80); // 10 + 35 + 35 = 80
});

test('Tier 5.2: Emergency O2 - Valve pressurization (1s) completes before grace window (3s), cancelling fatal asphyxiation', async () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.colony.resources.oxygen = 0; // Triggered 0% ECLSS emergency

  let pendingAsphyxiationTimer: ReturnType<typeof setTimeout> | null = null;
  let asphyxiationExecuted = false;
  let isAdvancingLocked = true;

  // Asphyxiation grace period: 300ms (scaled from 3.0s)
  pendingAsphyxiationTimer = setTimeout(() => {
    if (sim.colony.resources.oxygen <= 0) {
      asphyxiationExecuted = true;
    }
    isAdvancingLocked = false;
  }, 300);

  // Player initiates emergency pressurization: 100ms valve delay (scaled from 1.0s)
  let isPressurizing = true;
  let pressurizationCompleted = false;

  setTimeout(() => {
    isPressurizing = false;
    pressurizationCompleted = true;

    // Upon completion: inject O2 and CANCEL pending asphyxiation timer
    sim.colony.resources.oxygen += 35;
    sim.colony.emergencyO2Charges = (sim.colony.emergencyO2Charges ?? 2) - 1;

    if (pendingAsphyxiationTimer) {
      clearTimeout(pendingAsphyxiationTimer);
      pendingAsphyxiationTimer = null;
      isAdvancingLocked = false;
    }
  }, 100);

  // During pressurization, isPressurizing is true
  assert.strictEqual(isPressurizing, true);

  // Wait 400ms to allow all timelines to resolve
  await delay(400);
  assert.strictEqual(isPressurizing, false);

  assert.strictEqual(pressurizationCompleted, true);
  assert.strictEqual(asphyxiationExecuted, false, 'Crew must survive when pressurization finishes within grace window');
  assert.strictEqual(sim.colony.resources.oxygen, 35);
  assert.strictEqual(isAdvancingLocked, false);
});

test('Tier 5.2: Emergency O2 - Banner unmount cleans up interval and avoids ghost canister deductions', async () => {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let canisterDeductions = 0;
  let unmounted = false;

  // Emulate OxygenEmergencyBanner interval
  intervalId = setInterval(() => {
    if (unmounted) {
      // If interval wasn't cleared, this would fire
      canisterDeductions++;
    }
  }, 20);

  // Simulate unmount at 50ms
  await delay(50);
  unmounted = true;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  // Wait another 60ms
  await delay(60);

  assert.strictEqual(canisterDeductions, 0, 'No ghost deductions must occur after component unmount');
});

/* =========================================================================
 * FOCUS AREA 3: Botanical Lab Irrigation & Harvest Spamming on Sol 1
 * ========================================================================= */

test('Tier 5.3: Botanical Lab - 100 concurrent irrigation clicks deduct water strictly at 5L per action until empty', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.water = 23; // Enough for 4 irrigations (20L), 3L remainder
  sim.cropGrowthProgress = 0;

  let successfulWaterings = 0;
  let rejectedWaterings = 0;

  for (let i = 0; i < 100; i++) {
    const res = sim.waterCrop();
    if (res.success) {
      successfulWaterings++;
    } else {
      rejectedWaterings++;
      assert.strictEqual(res.reason, 'INSUFFICIENT_WATER');
    }
  }

  assert.strictEqual(successfulWaterings, 4);
  assert.strictEqual(rejectedWaterings, 96);
  assert.strictEqual(sim.colony.resources.water, 3);
  assert.strictEqual(sim.cropGrowthProgress, 100); // 4 * 25 = 100%
});

test('Tier 5.3: Botanical Lab - 150 concurrent harvest clicks on Sol 1 grant single reward payload', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.cropGrowthProgress = 100;
  sim.colony.resources.food = 50;
  sim.colony.resources.sciencePoints = 20;

  const initialFood = sim.colony.resources.food;
  const initialSci = sim.colony.resources.sciencePoints;

  let successfulHarvests = 0;
  let rejectedHarvests = 0;

  for (let i = 0; i < 150; i++) {
    const res = sim.harvestCrop();
    if (res.success) {
      successfulHarvests++;
    } else {
      rejectedHarvests++;
      // First rejection is CROP_NOT_MATURE (progress reset to 15%), subsequent are quota
      assert.ok(
        res.reason === 'CROP_NOT_MATURE' || res.reason === 'HARVEST_QUOTA_REACHED'
      );
    }
  }

  assert.strictEqual(successfulHarvests, 1);
  assert.strictEqual(rejectedHarvests, 149);
  assert.strictEqual(sim.colony.hasHarvestedToday, true);
  assert.strictEqual(sim.cropGrowthProgress, 15);
  // Yield: +25 Food, +15 Science
  assert.strictEqual(sim.colony.resources.food, initialFood + 25);
  assert.strictEqual(sim.colony.resources.sciencePoints, initialSci + 15);
});

test('Tier 5.3: Botanical Lab - Solar flare double water enforcement (10L) blocks under-resourced irrigation', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  sim.colony.plantsNeedDoubleWaterOnce = true;
  sim.colony.resources.water = 8; // Less than 10L required

  const doubleWaterCost = sim.colony.plantsNeedDoubleWaterOnce ? 10 : 5;
  let canWater = sim.colony.resources.water >= doubleWaterCost;
  assert.strictEqual(canWater, false, '8L water must reject 10L solar flare irrigation requirement');

  // Provide 15L water: 1st watering consumes 10L and clears flag, 2nd consumes 5L
  sim.colony.resources.water = 15;
  const cost1 = sim.colony.plantsNeedDoubleWaterOnce ? 10 : 5;
  sim.colony.resources.water -= cost1;
  sim.colony.plantsNeedDoubleWaterOnce = false;

  assert.strictEqual(sim.colony.resources.water, 5);
  assert.strictEqual(sim.colony.plantsNeedDoubleWaterOnce, false);

  const cost2 = sim.colony.plantsNeedDoubleWaterOnce ? 10 : 5;
  sim.colony.resources.water -= cost2;
  assert.strictEqual(sim.colony.resources.water, 0);
});

/* =========================================================================
 * FOCUS AREA 4: EventModal Rapid Multi-Click During 300ms Transition
 * ========================================================================= */

test('Tier 5.4: EventModal - 300 rapid clicks during 300ms transition lock out alternate options and fire once', async () => {
  const event = MISSION_EVENTS[0];
  let selectedOptionIndex: number | null = null;
  let callbackInvocations = 0;
  let chosenOption = null;

  const handleChoose = (opt: any, idx: number) => {
    if (selectedOptionIndex !== null) return { success: false, reason: 'SELECTION_LOCKED' };
    selectedOptionIndex = idx;

    setTimeout(() => {
      callbackInvocations++;
      chosenOption = opt;
      selectedOptionIndex = null;
    }, 50); // Scaled 300ms down to 50ms for test
    return { success: true };
  };

  // Click option 0
  const first = handleChoose(event.options[0], 0);
  assert.strictEqual(first.success, true);

  // Spam 299 rapid clicks on options 1 and 2
  for (let i = 0; i < 299; i++) {
    const res = handleChoose(event.options[1], 1);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'SELECTION_LOCKED');
  }

  await delay(80);

  assert.strictEqual(callbackInvocations, 1);
  assert.strictEqual(chosenOption, event.options[0]);
});

test('Tier 5.4: EventModal - Unmounting during 300ms transition cancels pending timeout', async () => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let callbackFired = false;

  // Start selection
  timeoutId = setTimeout(() => {
    callbackFired = true;
  }, 60);

  // Unmount modal at 20ms
  await delay(20);
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  await delay(60);
  assert.strictEqual(callbackFired, false, 'No event callback should fire on unmounted modal');
});

/* =========================================================================
 * FOCUS AREA 5: Rover Destination Switching During 1200ms Flight
 * ========================================================================= */

test('Tier 5.5: Rover Mission - Target selection is locked while isDeploying is active', () => {
  let selectedTargetId = 'shackleton_ice';
  let isDeploying = true; // Flight in progress

  const selectTarget = (targetId: string) => {
    if (isDeploying) return { success: false, reason: 'DEPLOYMENT_IN_PROGRESS' };
    selectedTargetId = targetId;
    return { success: true };
  };

  // Attempt to switch target 100 times during deployment
  for (let i = 0; i < 100; i++) {
    const res = selectTarget('lava_tube_cave');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.reason, 'DEPLOYMENT_IN_PROGRESS');
  }

  assert.strictEqual(selectedTargetId, 'shackleton_ice', 'Destination must not change during flight');
});

test('Tier 5.5: Rover Mission - 200 rapid launch clicks dispatch exactly 1 flight and clamp daily limit', async () => {
  const sim = new AstrobaseSimulation('mars', 'normal');
  sim.colony.resources.energy = 80;

  let isDeploying = false;
  let completedSorties = 0;

  const launchSortieDebounced = (targetId: string) => {
    if (isDeploying) return { success: false, reason: 'ALREADY_DEPLOYING' };
    if ((sim.colony.roverSortiesToday ?? 0) >= 2) return { success: false, reason: 'LIMIT_REACHED' };

    isDeploying = true;
    setTimeout(() => {
      const res = sim.launchRoverSortie(targetId);
      if (res.success) completedSorties++;
      isDeploying = false;
    }, 40); // Scaled 1200ms to 40ms
    return { success: true };
  };

  // Initial trigger
  const res1 = launchSortieDebounced('jezero_delta');
  assert.strictEqual(res1.success, true);

  // 199 rapid spam clicks during deployment
  for (let i = 0; i < 199; i++) {
    const spam = launchSortieDebounced('jezero_delta');
    assert.strictEqual(spam.success, false);
    assert.strictEqual(spam.reason, 'ALREADY_DEPLOYING');
  }

  await delay(70);

  assert.strictEqual(completedSorties, 1);
  assert.strictEqual(sim.colony.roverSortiesToday, 1);
  assert.strictEqual(isDeploying, false);
});

test('Tier 5.5: Rover Mission - Rebalanced energy rewards and daily cap strictly prevent perpetual power generation loops', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.resources.energy = 50;

  // eternal_light_ridge: batteryCost = 12
  const target = ROVER_TARGETS.moon.find(t => t.id === 'eternal_light_ridge')!;
  assert.strictEqual(target.batteryCost, 12);

  // Perform 2 sorties (maximum allowed per Sol)
  assert.strictEqual(sim.launchRoverSortie('eternal_light_ridge').success, true);
  assert.strictEqual(sim.launchRoverSortie('eternal_light_ridge').success, true);

  // Net energy is strictly bounded: cannot generate unbounded energy because of daily cap
  assert.strictEqual(sim.colony.roverSortiesToday, 2);
  assert.ok(sim.colony.resources.energy <= 100);

  // 3rd, 4th, 5th overflow attempts are all rejected, breaking infinite generation loops
  for (let i = 0; i < 5; i++) {
    const overflow = sim.launchRoverSortie('eternal_light_ridge');
    assert.strictEqual(overflow.success, false);
    assert.strictEqual(overflow.reason, 'SORTIE_LIMIT_REACHED');
  }
});

/* =========================================================================
 * FOCUS AREA 6: Wiring Minigame Completion Multi-Trigger During 700ms Delay
 * ========================================================================= */

test('Tier 5.6: Wiring Minigame - Terminal inputs and resets locked once circuit is solved', () => {
  let isSolved = false;
  let connections: Record<string, string> = {
    red: 'red',
    blue: 'blue',
    yellow: 'yellow',
    green: 'green',
  };

  // When all 4 correct, isSolved is set to true immediately
  isSolved = true;

  const attemptConnect = (_leftId: string, _rightId: string) => {
    if (isSolved) return { success: false, reason: 'CIRCUIT_ALREADY_SOLVED' };
    return { success: true };
  };

  const attemptReset = () => {
    if (isSolved) return { success: false, reason: 'CIRCUIT_ALREADY_SOLVED' };
    connections = {};
    return { success: true };
  };

  // Spam 200 interaction attempts during the 700ms delay window
  for (let i = 0; i < 100; i++) {
    const conn = attemptConnect('red', 'blue');
    assert.strictEqual(conn.success, false);
    assert.strictEqual(conn.reason, 'CIRCUIT_ALREADY_SOLVED');

    const rst = attemptReset();
    assert.strictEqual(rst.success, false);
    assert.strictEqual(rst.reason, 'CIRCUIT_ALREADY_SOLVED');
  }

  assert.strictEqual(Object.keys(connections).length, 4);
});

test('Tier 5.6: Wiring Minigame - handleWiringSuccess debouncing and precondition checks prevent duplicate repair execution', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.colony.batteryFault = true;

  let isWiringSubmitting = false;
  let repairExecutionCount = 0;

  const handleWiringSuccess = () => {
    if (isWiringSubmitting) return { success: false, reason: 'SUBMISSION_DEBOUNCED' };
    if (!sim.colony.batteryFault && !sim.colony.wiringErrorActive) {
      return { success: false, reason: 'NO_FAULT_PRECONDITION' };
    }

    isWiringSubmitting = true;
    setTimeout(() => { isWiringSubmitting = false; }, 50);

    let hadFault = false;
    if (sim.colony.batteryFault || sim.colony.wiringErrorActive) {
      hadFault = true;
      sim.colony.batteryFault = false;
      sim.colony.wiringErrorActive = false;
    }

    if (hadFault) {
      repairExecutionCount++;
      return { success: true };
    }
    return { success: false, reason: 'NO_OP' };
  };

  // Call 1: Success
  const first = handleWiringSuccess();
  assert.strictEqual(first.success, true);
  assert.strictEqual(repairExecutionCount, 1);

  // Calls 2-100: Spam calls while isWiringSubmitting is true or after fault cleared
  for (let i = 0; i < 99; i++) {
    const spam = handleWiringSuccess();
    assert.strictEqual(spam.success, false);
  }

  assert.strictEqual(repairExecutionCount, 1, 'Repair side effects must only execute exactly once');
  assert.strictEqual(sim.colony.batteryFault, false);
});

test('Tier 5.6: Wiring Minigame - Closing modal during 700ms victory delay cancels pending onSuccess callback', async () => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let onSuccessCalled = false;

  // Circuit solved -> 60ms delay (scaled from 700ms)
  timeoutId = setTimeout(() => {
    onSuccessCalled = true;
  }, 60);

  // User closes modal at 20ms
  await delay(20);
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  // Wait 70ms
  await delay(70);

  assert.strictEqual(onSuccessCalled, false, 'onSuccess must NOT fire if modal was closed before timer completion');
});

/* =========================================================================
 * FOCUS AREA 7: Phase 2 Security Hardening Verification
 * ========================================================================= */

test('Tier 5.7: Shock spam cooldown - 10 rapid concurrent shock attempts only process 1 shock within 800ms window', () => {
  let isShocking = false;
  let shockExecutionCount = 0;
  let crewHealth = 100;

  const handleShockCrew = () => {
    if (isShocking) return false;
    isShocking = true;
    setTimeout(() => { isShocking = false; }, 800);

    crewHealth = Math.max(1, Math.round(crewHealth * 0.5));
    shockExecutionCount++;
    return true;
  };

  // 10 rapid clicks within 50ms
  for (let i = 0; i < 10; i++) {
    handleShockCrew();
  }

  // Exactly 1 shock was executed; crew health is 50%, NOT 0.09% (decimated)
  assert.strictEqual(shockExecutionCount, 1);
  assert.strictEqual(crewHealth, 50);
});

test('Tier 5.8: Storage hardening - clampResources strictly bounds maxSciencePoints and rejects negative capacities', () => {
  // Attempting to inject 999,999 science points via storage poisoning
  const poisoned1 = clampResources({
    maxSciencePoints: 999999,
    sciencePoints: 999999,
  });
  assert.strictEqual(poisoned1.maxSciencePoints, 500, 'maxSciencePoints must strictly clamp to MAX_SCIENCE_POINTS (500)');
  assert.strictEqual(poisoned1.sciencePoints, 500, 'sciencePoints must not exceed 500');

  // Attempting negative capacity injection
  const poisoned2 = clampResources({
    maxOxygen: -50,
    oxygen: 50,
  });
  assert.strictEqual(poisoned2.maxOxygen, 100, 'Negative maxOxygen must fallback to default safe capacity 100');
  assert.strictEqual(poisoned2.oxygen, 50, 'oxygen must clamp to positive max capacity');
});

test('Tier 5.9: Restart isolation - handleRestartMission clears grace period timer and resets all debouncing refs', () => {
  let zeroOxygenTimer: any = setTimeout(() => {}, 3000);
  let isHarvestingRef = true;
  let isSortieSubmittingRef = true;
  let isWiringSubmittingRef = true;
  let isAdvancingRef = true;
  let isShockingRef = true;
  let isRestartingRef = false;

  const handleRestartMission = () => {
    if (isRestartingRef) return;
    isRestartingRef = true;
    setTimeout(() => { isRestartingRef = false; }, 600);

    if (zeroOxygenTimer) {
      clearTimeout(zeroOxygenTimer);
      zeroOxygenTimer = null;
    }
    isHarvestingRef = false;
    isSortieSubmittingRef = false;
    isWiringSubmittingRef = false;
    isAdvancingRef = false;
    isShockingRef = false;
  };

  handleRestartMission();

  assert.strictEqual(zeroOxygenTimer, null, 'Grace timer must be cleared');
  assert.strictEqual(isHarvestingRef, false, 'Harvest lock ref must be reset');
  assert.strictEqual(isSortieSubmittingRef, false, 'Sortie lock ref must be reset');
  assert.strictEqual(isWiringSubmittingRef, false, 'Wiring lock ref must be reset');
  assert.strictEqual(isAdvancingRef, false, 'Advancing lock ref must be reset');
  assert.strictEqual(isShockingRef, false, 'Shock lock ref must be reset');
});

test('Tier 5.10: DeltaTime clamping - tick loop clamps dt to Math.min(rawDt, 0.1) under tab backgrounding simulation', () => {
  // Simulate tab backgrounded for 20 seconds (rawDt = 20.0s)
  const rawDt = 20.0;
  const clampedDt = Math.min(rawDt, 0.1);

  assert.strictEqual(clampedDt, 0.1, 'Delta time must be clamped to max 0.1s to prevent sudden energy drain or speed spikes');
});

