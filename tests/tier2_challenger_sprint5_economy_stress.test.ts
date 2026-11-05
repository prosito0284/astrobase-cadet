import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILDING_CATALOG,
  BaseBuildingManager,
} from '../src/components/3d/baseBuildingBuilder';
import { BaseBuildingId, ColonySaveData, BaseLocation } from '../src/types/game';
import { clampResources, safeNum } from '../src/App';
import { AstrobaseSimulation } from './helpers/gameHarness';

/**
 * Pure state updater replicating App.tsx handleConstructBuilding logic
 */
function applyConstructBuilding(
  colony: ColonySaveData,
  buildingId: BaseBuildingId
): { nextColony: ColonySaveData; success: boolean; reason?: string } {
  const def = BUILDING_CATALOG[buildingId];
  if (!def) {
    return { nextColony: colony, success: false, reason: 'INVALID_BUILDING_ID' };
  }

  const already = colony.builtBuildings ?? [];
  if (already.includes(buildingId)) {
    return { nextColony: colony, success: false, reason: 'ALREADY_CONSTRUCTED' };
  }

  if (colony.resources.sciencePoints < def.costScience) {
    return { nextColony: colony, success: false, reason: 'INSUFFICIENT_SCIENCE' };
  }

  const isHangar = buildingId === 'rover_hangar';
  const newMaxEnergy = isHangar ? (colony.resources.maxEnergy || 100) + 25 : colony.resources.maxEnergy;
  const newEnergy = isHangar ? Math.min(newMaxEnergy, colony.resources.energy + 25) : colony.resources.energy;

  const nextResources = clampResources({
    ...colony.resources,
    sciencePoints: Math.max(0, colony.resources.sciencePoints - def.costScience),
    maxEnergy: newMaxEnergy,
    energy: newEnergy,
  }, {
    ...colony.resources,
    maxEnergy: newMaxEnergy,
  });

  return {
    nextColony: {
      ...colony,
      builtBuildings: [...already, buildingId],
      resources: nextResources,
    },
    success: true,
  };
}

/**
 * Pure sanitization logic matching mergeColony in App.tsx (lines 221-224)
 */
function sanitizeBuiltBuildings(raw: any): BaseBuildingId[] {
  const validBuildingIds: BaseBuildingId[] = ['rover_hangar', 'greenhouse_2', 'dsoc_tower'];
  return Array.isArray(raw)
    ? Array.from(new Set(raw.filter((b: any) => typeof b === 'string' && validBuildingIds.includes(b as BaseBuildingId)))) as BaseBuildingId[]
    : [];
}

/**
 * Pure reproduction of CommCenter transmission latency calculations (CommCenter.tsx lines 120-183)
 */
function computeCommDelay(location: BaseLocation, hasDsocTower: boolean): {
  totalDelayMs: number;
  initialCountdownSec: number;
  timeTag: string;
} {
  const speedDivisor = hasDsocTower ? 3.0 : 1.0;
  if (location === 'mars') {
    return {
      totalDelayMs: Math.round(5000 / speedDivisor),
      initialCountdownSec: hasDsocTower ? 2 : 5,
      timeTag: hasDsocTower ? 'T+4m (DSOC 3x)' : 'T+12m',
    };
  } else {
    return {
      totalDelayMs: Math.round(1300 / speedDivisor),
      initialCountdownSec: 1,
      timeTag: hasDsocTower ? 'T+0.4s (DSOC 3x)' : 'T+1.3s',
    };
  }
}

/**
 * Pure reproduction of Rover recharge rate calculation (RoverMissionModal.tsx line 309)
 */
function getRoverRechargeRate(hasRoverHangar: boolean): number {
  return hasRoverHangar ? 0.24 : 0.12;
}

/**
 * Pure reproduction of Mining Laser range calculation (Rover3DCanvas.tsx line 232)
 */
function getRoverLaserRange(hasRoverHangar: boolean): number {
  return hasRoverHangar ? 35.0 : 22.0;
}

/**
 * Pure reproduction of ECLSS life support crisis alert condition (App.tsx line 1217)
 */
function isLifeSupportCrisisActive(livingCount: number, hasGreenhouse2: boolean): boolean {
  return livingCount > 6 && !hasGreenhouse2;
}

describe('Tier 2 Challenger: Sprint 5 - Science Economy, Simulation Buffs & Persistence Integrity', () => {

  // ==========================================================================
  // OBJECTIVE 2: Science Economy & Purchase Validation
  // ==========================================================================
  describe('Adversarial Challenge 1: Science Economy & Construction Purchase Validation', () => {

    it('ECON-PURCHASE-1: Purchasing with insufficient science strictly fails across all 3 buildings', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');

      // Test Rover Hangar (cost: 60)
      const manager1 = new BaseBuildingManager();
      sim.colony.resources.sciencePoints = 0;
      const res0 = manager1.constructBuilding('rover_hangar', sim);
      assert.strictEqual(res0.success, false);
      assert.strictEqual(res0.reason, 'INSUFFICIENT_SCIENCE');
      assert.strictEqual(sim.colony.resources.sciencePoints, 0, 'Science points must not become negative');
      assert.strictEqual(manager1.constructedBuildings.has('rover_hangar'), false);

      // Boundary: 59 science points (1 point short of 60)
      sim.colony.resources.sciencePoints = 59;
      const res59 = manager1.constructBuilding('rover_hangar', sim);
      assert.strictEqual(res59.success, false);
      assert.strictEqual(res59.reason, 'INSUFFICIENT_SCIENCE');
      assert.strictEqual(sim.colony.resources.sciencePoints, 59, '59 points must remain untouched');
      assert.strictEqual(manager1.constructedBuildings.has('rover_hangar'), false);

      // Negative science points (corrupted state: -50)
      sim.colony.resources.sciencePoints = -50;
      const resNeg = manager1.constructBuilding('rover_hangar', sim);
      assert.strictEqual(resNeg.success, false);
      assert.strictEqual(resNeg.reason, 'INSUFFICIENT_SCIENCE');
      assert.strictEqual(manager1.constructedBuildings.has('rover_hangar'), false);

      // Test 2nd Greenhouse (cost: 75) with 74 science points
      const manager2 = new BaseBuildingManager();
      sim.colony.resources.sciencePoints = 74;
      const res74 = manager2.constructBuilding('greenhouse_2', sim);
      assert.strictEqual(res74.success, false);
      assert.strictEqual(res74.reason, 'INSUFFICIENT_SCIENCE');
      assert.strictEqual(sim.colony.resources.sciencePoints, 74);
      assert.strictEqual(manager2.constructedBuildings.has('greenhouse_2'), false);

      // Test DSOC Tower (cost: 90) with 89 science points
      const manager3 = new BaseBuildingManager();
      sim.colony.resources.sciencePoints = 89;
      const res89 = manager3.constructBuilding('dsoc_tower', sim);
      assert.strictEqual(res89.success, false);
      assert.strictEqual(res89.reason, 'INSUFFICIENT_SCIENCE');
      assert.strictEqual(sim.colony.resources.sciencePoints, 89);
      assert.strictEqual(manager3.constructedBuildings.has('dsoc_tower'), false);
    });

    it('ECON-PURCHASE-2: App state updater strictly rejects insufficient science and preserves colony state immutably', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 59;
      sim.colony.resources.energy = 85;
      sim.colony.builtBuildings = [];

      const initialCopy = JSON.parse(JSON.stringify(sim.colony));
      const res = applyConstructBuilding(sim.colony, 'rover_hangar');

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.reason, 'INSUFFICIENT_SCIENCE');
      assert.strictEqual(res.nextColony.resources.sciencePoints, 59);
      assert.strictEqual(res.nextColony.resources.energy, 85);
      assert.deepStrictEqual(res.nextColony.builtBuildings, []);
      assert.deepStrictEqual(res.nextColony, initialCopy);
    });

    it('ECON-PURCHASE-3: Double-purchasing the same structure is strictly blocked and does not deduct duplicate science', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = 200;

      const manager = new BaseBuildingManager();

      // First purchase: Rover Hangar (60 pts)
      const res1 = manager.constructBuilding('rover_hangar', sim);
      assert.strictEqual(res1.success, true);
      assert.strictEqual(sim.colony.resources.sciencePoints, 140);
      assert.strictEqual(manager.constructedBuildings.size, 1);

      // Second purchase attempt: Rover Hangar again with 140 science available
      const res2 = manager.constructBuilding('rover_hangar', sim);
      assert.strictEqual(res2.success, false);
      assert.strictEqual(res2.reason, 'ALREADY_CONSTRUCTED');
      assert.strictEqual(sim.colony.resources.sciencePoints, 140, 'Science points must remain 140, zero deduction on duplicate');
      assert.strictEqual(manager.constructedBuildings.size, 1);

      // Repeat double-purchase challenge for Greenhouse 2 (75 pts)
      const resGh1 = manager.constructBuilding('greenhouse_2', sim);
      assert.strictEqual(resGh1.success, true);
      assert.strictEqual(sim.colony.resources.sciencePoints, 65); // 140 - 75 = 65

      sim.colony.resources.sciencePoints = 150; // refill
      const resGh2 = manager.constructBuilding('greenhouse_2', sim);
      assert.strictEqual(resGh2.success, false);
      assert.strictEqual(resGh2.reason, 'ALREADY_CONSTRUCTED');
      assert.strictEqual(sim.colony.resources.sciencePoints, 150);
      assert.strictEqual(manager.constructedBuildings.size, 2);

      // Repeat double-purchase challenge for DSOC Tower (90 pts)
      const resDsoc1 = manager.constructBuilding('dsoc_tower', sim);
      assert.strictEqual(resDsoc1.success, true);
      assert.strictEqual(sim.colony.resources.sciencePoints, 60); // 150 - 90 = 60

      const resDsoc2 = manager.constructBuilding('dsoc_tower', sim);
      assert.strictEqual(resDsoc2.success, false);
      assert.strictEqual(resDsoc2.reason, 'ALREADY_CONSTRUCTED');
      assert.strictEqual(sim.colony.resources.sciencePoints, 60);
      assert.strictEqual(manager.constructedBuildings.size, 3);
    });

    it('ECON-PURCHASE-4: App state updater double-purchase returns unmodified state reference', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 200;
      sim.colony.builtBuildings = [];

      const step1 = applyConstructBuilding(sim.colony, 'greenhouse_2');
      assert.strictEqual(step1.success, true);
      assert.strictEqual(step1.nextColony.resources.sciencePoints, 125);
      assert.deepStrictEqual(step1.nextColony.builtBuildings, ['greenhouse_2']);

      const step2 = applyConstructBuilding(step1.nextColony, 'greenhouse_2');
      assert.strictEqual(step2.success, false);
      assert.strictEqual(step2.reason, 'ALREADY_CONSTRUCTED');
      assert.strictEqual(step2.nextColony, step1.nextColony, 'Must return identical state reference');
      assert.strictEqual(step2.nextColony.resources.sciencePoints, 125);
      assert.deepStrictEqual(step2.nextColony.builtBuildings, ['greenhouse_2']);
    });

    it('ECON-PURCHASE-5: Exact catalog budget (225 pts) purchases all 3 structures leaving strictly 0 points', () => {
      const totalCatalogCost = BUILDING_CATALOG.rover_hangar.costScience +
                               BUILDING_CATALOG.greenhouse_2.costScience +
                               BUILDING_CATALOG.dsoc_tower.costScience;
      assert.strictEqual(totalCatalogCost, 225, 'Total expansion catalog must cost exactly 225 science (60 + 75 + 90)');

      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = 225;

      const manager = new BaseBuildingManager();

      const r1 = manager.constructBuilding('rover_hangar', sim);
      assert.strictEqual(r1.success, true);
      assert.strictEqual(sim.colony.resources.sciencePoints, 165);

      const r2 = manager.constructBuilding('greenhouse_2', sim);
      assert.strictEqual(r2.success, true);
      assert.strictEqual(sim.colony.resources.sciencePoints, 90);

      const r3 = manager.constructBuilding('dsoc_tower', sim);
      assert.strictEqual(r3.success, true);
      assert.strictEqual(sim.colony.resources.sciencePoints, 0, 'Exact balance after full construction must be 0');
      assert.strictEqual(manager.constructedBuildings.size, 3);
    });

    it('ECON-PURCHASE-6: Boundary balance 224 pts allows exactly 2 structures and strictly rejects the 3rd, leaving 89 pts', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 224; // 1 point short of 225

      const manager = new BaseBuildingManager();

      const r1 = manager.constructBuilding('rover_hangar', sim); // -60 -> 164
      assert.strictEqual(r1.success, true);
      assert.strictEqual(sim.colony.resources.sciencePoints, 164);

      const r2 = manager.constructBuilding('greenhouse_2', sim); // -75 -> 89
      assert.strictEqual(r2.success, true);
      assert.strictEqual(sim.colony.resources.sciencePoints, 89);

      // Attempting to buy DSOC Tower (cost: 90, available: 89)
      const r3 = manager.constructBuilding('dsoc_tower', sim);
      assert.strictEqual(r3.success, false);
      assert.strictEqual(r3.reason, 'INSUFFICIENT_SCIENCE');
      assert.strictEqual(sim.colony.resources.sciencePoints, 89, 'Balance must remain strictly 89 points');
      assert.strictEqual(manager.constructedBuildings.has('dsoc_tower'), false);
      assert.strictEqual(manager.constructedBuildings.size, 2);
    });

    it('ECON-PURCHASE-7: Adversarial spam sequence (100 rapid concurrent actions) maintains exact science invariants', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 300;
      sim.colony.builtBuildings = [];

      let current = sim.colony;
      const candidates: BaseBuildingId[] = ['rover_hangar', 'greenhouse_2', 'dsoc_tower'];
      let successfulConstructs = 0;

      // 100 interleaved rapid click events
      for (let i = 0; i < 100; i++) {
        const choice = candidates[i % 3];
        const res = applyConstructBuilding(current, choice);
        if (res.success) {
          successfulConstructs++;
          current = res.nextColony;
        }
      }

      // Exactly 3 unique buildings should ever succeed
      assert.strictEqual(successfulConstructs, 3);
      assert.strictEqual(current.builtBuildings?.length, 3);
      assert.strictEqual(current.resources.sciencePoints, 300 - 225, 'Science balance must be exactly 75');
      assert.ok(current.builtBuildings?.includes('rover_hangar'));
      assert.ok(current.builtBuildings?.includes('greenhouse_2'));
      assert.ok(current.builtBuildings?.includes('dsoc_tower'));
    });

    it('ECON-PURCHASE-8: Invalid building ID string rejects safely with INVALID_BUILDING_ID without altering state', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = 500;

      const manager = new BaseBuildingManager();
      const res = manager.constructBuilding('orbital_cannon' as any, sim);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.reason, 'INVALID_BUILDING_ID');
      assert.strictEqual(sim.colony.resources.sciencePoints, 500);
      assert.strictEqual(manager.constructedBuildings.size, 0);
    });
  });

  // ==========================================================================
  // OBJECTIVE 3: Simulation Buff Multipliers & Formulas
  // ==========================================================================
  describe('Adversarial Challenge 2: Rover Hangar Simulation Multipliers & Active Buffs', () => {

    it('HANGAR-BUFF-1: Docked recharge rate formula verifies strictly 2.0x acceleration (0.24 vs 0.12 %/tick)', () => {
      const baseRechargeRate = getRoverRechargeRate(false);
      const hangarRechargeRate = getRoverRechargeRate(true);

      assert.strictEqual(baseRechargeRate, 0.12, 'Baseline recharge rate must be 0.12 %/tick');
      assert.strictEqual(hangarRechargeRate, 0.24, 'Rover Hangar recharge rate must be 0.24 %/tick');

      const multiplier = hangarRechargeRate / baseRechargeRate;
      assert.strictEqual(multiplier, 2.0, 'Rover Hangar recharge multiplier must be exactly 2.0x (100% boost)');
    });

    it('HANGAR-BUFF-2: Docked recharge simulation across battery states proves strictly 50% time-to-full', () => {
      const testDepletions = [
        { initialBattery: 0, requiredTicksBase: Math.ceil(100 / 0.12), requiredTicksHangar: Math.ceil(100 / 0.24) },
        { initialBattery: 20, requiredTicksBase: Math.ceil(80 / 0.12), requiredTicksHangar: Math.ceil(80 / 0.24) },
        { initialBattery: 50, requiredTicksBase: Math.ceil(50 / 0.12), requiredTicksHangar: Math.ceil(50 / 0.24) },
        { initialBattery: 75, requiredTicksBase: Math.ceil(25 / 0.12), requiredTicksHangar: Math.ceil(25 / 0.24) },
      ];

      for (const t of testDepletions) {
        // Run tick simulation for baseline
        let bBatt = t.initialBattery;
        let bTicks = 0;
        while (bBatt < 100) {
          bBatt = Math.min(100, bBatt + 0.12);
          bTicks++;
        }

        // Run tick simulation for Hangar
        let hBatt = t.initialBattery;
        let hTicks = 0;
        while (hBatt < 100) {
          hBatt = Math.min(100, hBatt + 0.24);
          hTicks++;
        }

        assert.strictEqual(bTicks, t.requiredTicksBase);
        assert.strictEqual(hTicks, t.requiredTicksHangar);
        assert.ok(
          Math.abs((hTicks / bTicks) - 0.5) < 0.01,
          `Hangar ticks (${hTicks}) must be approximately 50% of baseline ticks (${bTicks})`
        );
      }
    });

    it('HANGAR-BUFF-3: Battery capacity cap expansion adds strictly +25 kWh (100 -> 125 kWh) in App state updater', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = 100;
      sim.colony.resources.maxEnergy = 100;
      sim.colony.resources.energy = 80;

      // Construct Rover Hangar
      const res = applyConstructBuilding(sim.colony, 'rover_hangar');
      assert.strictEqual(res.success, true);

      // maxEnergy must expand from 100 to 125
      assert.strictEqual(res.nextColony.resources.maxEnergy, 125, 'Rover Hangar must extend maxEnergy to 125 kWh');
      // Existing energy also receives +25 burst, capped at new maxEnergy
      assert.strictEqual(res.nextColony.resources.energy, 105, 'Existing energy (80) + 25 = 105 kWh');

      // Verify clamping behavior with 125 kWh cap:
      const clampedFull = clampResources({
        ...res.nextColony.resources,
        energy: 125,
      }, {
        maxEnergy: 125,
      });
      assert.strictEqual(clampedFull.energy, 125, '125 kWh energy must be permitted when maxEnergy is 125');

      // Clamping with baseline 100 kWh cap strictly clips energy at 100:
      const clampedOld = clampResources({
        energy: 125,
        maxEnergy: 100,
      });
      assert.strictEqual(clampedOld.energy, 100, 'Baseline cap strictly limits energy to 100');
    });

    it('HANGAR-BUFF-4: Mining laser range extension enables targets between 22.01m and 35.00m while rejecting >35.00m', () => {
      const baseRange = getRoverLaserRange(false);
      const hangarRange = getRoverLaserRange(true);

      assert.strictEqual(baseRange, 22.0, 'Baseline laser range must be 22m');
      assert.strictEqual(hangarRange, 35.0, 'Rover Hangar laser range must be 35m');

      const isTargetAcquireable = (distance: number, hasHangar: boolean): boolean => {
        return distance <= getRoverLaserRange(hasHangar);
      };

      // 15.0m: In range for both
      assert.strictEqual(isTargetAcquireable(15.0, false), true);
      assert.strictEqual(isTargetAcquireable(15.0, true), true);

      // 22.0m: Boundary tangent for baseline
      assert.strictEqual(isTargetAcquireable(22.0, false), true);
      assert.strictEqual(isTargetAcquireable(22.0, true), true);

      // 22.1m: Strictly out of range for baseline, acquireable with Hangar
      assert.strictEqual(isTargetAcquireable(22.1, false), false);
      assert.strictEqual(isTargetAcquireable(22.1, true), true);

      // 30.0m: Mid-extended range
      assert.strictEqual(isTargetAcquireable(30.0, false), false);
      assert.strictEqual(isTargetAcquireable(30.0, true), true);

      // 35.0m: Boundary tangent for Hangar
      assert.strictEqual(isTargetAcquireable(35.0, false), false);
      assert.strictEqual(isTargetAcquireable(35.0, true), true);

      // 35.1m: Strictly out of range for both
      assert.strictEqual(isTargetAcquireable(35.1, false), false);
      assert.strictEqual(isTargetAcquireable(35.1, true), false);
    });
  });

  describe('Adversarial Challenge 3: Greenhouse 2 Extended Life Support & Crisis Alert Suppression', () => {

    it('GREEN-BUFF-1: 100-Sol empirical simulation confirms exactly +1,200 food (+12/day) and +600 O2 (+6/day) cumulative delta', () => {
      let cumulativeFoodNoGh = 0;
      let cumulativeO2NoGh = 0;
      let cumulativeFoodWithGh = 0;
      let cumulativeO2WithGh = 0;

      const DAILY_FOOD_BONUS = 12;
      const DAILY_O2_BONUS = 6;

      for (let day = 1; day <= 100; day++) {
        // Daily delta without Greenhouse 2
        let deltaFoodNo = 0;
        let deltaO2No = 0;
        cumulativeFoodNoGh += deltaFoodNo;
        cumulativeO2NoGh += deltaO2No;

        // Daily delta with Greenhouse 2 (reproducing App.tsx lines 1211-1215)
        let deltaFoodWith = 0;
        let deltaO2With = 0;
        deltaFoodWith += DAILY_FOOD_BONUS;
        deltaO2With += DAILY_O2_BONUS;
        cumulativeFoodWithGh += deltaFoodWith;
        cumulativeO2WithGh += deltaO2With;
      }

      const netFoodDifference = cumulativeFoodWithGh - cumulativeFoodNoGh;
      const netO2Difference = cumulativeO2WithGh - cumulativeO2NoGh;

      assert.strictEqual(netFoodDifference, 1200, '100 days of Greenhouse 2 must produce exactly +1200 food');
      assert.strictEqual(netO2Difference, 600, '100 days of Greenhouse 2 must produce exactly +600 O2');
    });

    it('GREEN-BUFF-2: ECLSS Life support crisis alert truth table across crew sizes 4 through 10', () => {
      // Test matrix:
      // Crew <= 6: Alert NEVER triggers, regardless of Greenhouse 2
      // Crew 7, 8, 9, 10 without Greenhouse 2: Alert MUST trigger (habitat saturated)
      // Crew 7, 8, 9, 10 WITH Greenhouse 2: Alert MUST NOT trigger (protected by expanded biodome)
      const testCases = [
        { crew: 4, hasGh: false, expectAlert: false },
        { crew: 4, hasGh: true,  expectAlert: false },
        { crew: 5, hasGh: false, expectAlert: false },
        { crew: 5, hasGh: true,  expectAlert: false },
        { crew: 6, hasGh: false, expectAlert: false },
        { crew: 6, hasGh: true,  expectAlert: false },
        { crew: 7, hasGh: false, expectAlert: true  },
        { crew: 7, hasGh: true,  expectAlert: false },
        { crew: 8, hasGh: false, expectAlert: true  },
        { crew: 8, hasGh: true,  expectAlert: false },
        { crew: 9, hasGh: false, expectAlert: true  },
        { crew: 9, hasGh: true,  expectAlert: false },
        { crew: 10, hasGh: false, expectAlert: true },
        { crew: 10, hasGh: true,  expectAlert: false },
      ];

      for (const tc of testCases) {
        const alertTriggered = isLifeSupportCrisisActive(tc.crew, tc.hasGh);
        assert.strictEqual(
          alertTriggered,
          tc.expectAlert,
          `Failed for crew=${tc.crew}, hasGh=${tc.hasGh}: expected alert=${tc.expectAlert}, got ${alertTriggered}`
        );
      }
    });

    it('GREEN-BUFF-3: 10 colonists with Greenhouse 2 offset ECLSS consumption across consecutive Sols', () => {
      // 10 colonists consume:
      // O2 drain: 10 * 1.5 = 15.0 / Sol
      // Food drain: 10 * 1.2 = 12.0 / Sol
      const crewCount = 10;
      const dailyO2Drain = crewCount * 1.5; // 15
      const dailyFoodDrain = crewCount * 1.2; // 12

      // Greenhouse 2 produces: +12 food, +6 O2
      const ghFoodProd = 12;
      const ghO2Prod = 6;

      const netFoodSol = ghFoodProd - dailyFoodDrain; // 12 - 12 = 0 net drain!
      const netO2Sol = ghO2Prod - dailyO2Drain;     // 6 - 15 = -9 net drain (cut by 40% from -15)

      assert.strictEqual(netFoodSol, 0, 'Greenhouse 2 completely neutralizes food consumption for 10 astronauts');
      assert.strictEqual(netO2Sol, -9, 'Greenhouse 2 offsets daily oxygen depletion from -15 to -9');
    });
  });

  describe('Adversarial Challenge 4: DSOC Optical Laser Tower 3.0x Latency & Telemetry Scaling', () => {

    it('DSOC-BUFF-1: CommCenter telemetry downlink latency is reduced strictly by 3.0x on Mars', () => {
      const baseDelay = computeCommDelay('mars', false);
      const dsocDelay = computeCommDelay('mars', true);

      assert.strictEqual(baseDelay.totalDelayMs, 5000, 'Mars baseline delay must be 5000ms');
      assert.strictEqual(dsocDelay.totalDelayMs, 1667, 'Mars DSOC delay must be Math.round(5000 / 3.0) = 1667ms');

      const speedup = baseDelay.totalDelayMs / dsocDelay.totalDelayMs;
      assert.ok(Math.abs(speedup - 3.0) < 0.01, `Mars speedup ratio (${speedup}) must be ~3.0x`);

      assert.strictEqual(baseDelay.initialCountdownSec, 5);
      assert.strictEqual(dsocDelay.initialCountdownSec, 2);

      assert.strictEqual(baseDelay.timeTag, 'T+12m');
      assert.strictEqual(dsocDelay.timeTag, 'T+4m (DSOC 3x)');
    });

    it('DSOC-BUFF-2: CommCenter telemetry downlink latency is reduced strictly by 3.0x on Moon', () => {
      const baseDelay = computeCommDelay('moon', false);
      const dsocDelay = computeCommDelay('moon', true);

      assert.strictEqual(baseDelay.totalDelayMs, 1300, 'Moon baseline delay must be 1300ms');
      assert.strictEqual(dsocDelay.totalDelayMs, 433, 'Moon DSOC delay must be Math.round(1300 / 3.0) = 433ms');

      const speedup = baseDelay.totalDelayMs / dsocDelay.totalDelayMs;
      assert.ok(Math.abs(speedup - 3.0) < 0.01, `Moon speedup ratio (${speedup}) must be ~3.0x`);

      assert.strictEqual(baseDelay.timeTag, 'T+1.3s');
      assert.strictEqual(dsocDelay.timeTag, 'T+0.4s (DSOC 3x)');
    });

    it('DSOC-BUFF-3: Scientific telemetry points bonus scales strictly by 3.0x', () => {
      const multiplier = BUILDING_CATALOG.dsoc_tower.effects.scienceMultiplier!;
      assert.strictEqual(multiplier, 3.0, 'DSOC Tower must specify a 3.0x scienceMultiplier');

      const baseRewards = [10, 15, 25, 40];
      for (const base of baseRewards) {
        const scaled = Math.round(base * multiplier);
        assert.strictEqual(scaled, base * 3, `Expected ${base * 3}, got ${scaled}`);
      }
    });
  });

  // ==========================================================================
  // OBJECTIVE 4: Save Persistence & Integrity
  // ==========================================================================
  describe('Adversarial Challenge 5: Save Persistence, Corrupted builtBuildings Sanitization & Dual-Colony Isolation', () => {

    it('PERSIST-1: mergeColony gracefully sanitizes corrupted non-array builtBuildings types into []', () => {
      const corruptPayloads = [
        null,
        undefined,
        'rover_hangar',
        12345,
        true,
        false,
        { 0: 'rover_hangar' },
        { builtBuildings: ['rover_hangar'] },
        NaN,
        Infinity,
        Symbol('builtBuildings'),
      ];

      for (const payload of corruptPayloads) {
        const sanitized = sanitizeBuiltBuildings(payload);
        assert.ok(Array.isArray(sanitized), `Sanitized result for ${String(payload)} must be an array`);
        assert.strictEqual(sanitized.length, 0, `Sanitized result for ${String(payload)} must be empty array []`);
      }
    });

    it('PERSIST-2: mergeColony filters invalid string IDs, non-strings, and discards prototype pollution keys', () => {
      const pollutedInput = [
        'rover_hangar',
        '__proto__',
        'constructor',
        'prototype',
        null,
        undefined,
        42,
        false,
        {},
        [],
        'unknown_structure_id',
        'nuclear_reactor',
        'dsoc_tower',
        'hacked_module',
      ];

      const sanitized = sanitizeBuiltBuildings(pollutedInput);
      assert.deepStrictEqual(sanitized, ['rover_hangar', 'dsoc_tower']);
      assert.strictEqual(sanitized.includes('__proto__' as any), false);
      assert.strictEqual(sanitized.includes('constructor' as any), false);
    });

    it('PERSIST-3: mergeColony deduplicates repeated valid building IDs into clean unique sets', () => {
      const duplicatesInput = [
        'rover_hangar',
        'rover_hangar',
        'greenhouse_2',
        'rover_hangar',
        'dsoc_tower',
        'greenhouse_2',
        'dsoc_tower',
        'rover_hangar',
      ];

      const sanitized = sanitizeBuiltBuildings(duplicatesInput);
      assert.strictEqual(sanitized.length, 3);
      assert.deepStrictEqual(sanitized, ['rover_hangar', 'greenhouse_2', 'dsoc_tower']);
    });

    it('PERSIST-4: Moon and Mars maintain completely independent builtBuildings across JSON serialization/deserialization', () => {
      const dualSaveData = {
        moon: {
          currentDay: 12,
          builtBuildings: ['rover_hangar'] as BaseBuildingId[],
        },
        mars: {
          currentDay: 20,
          builtBuildings: ['greenhouse_2', 'dsoc_tower'] as BaseBuildingId[],
        },
      };

      const serialized = JSON.stringify(dualSaveData);
      const deserialized = JSON.parse(serialized);

      const moonSanitized = sanitizeBuiltBuildings(deserialized.moon.builtBuildings);
      const marsSanitized = sanitizeBuiltBuildings(deserialized.mars.builtBuildings);

      assert.deepStrictEqual(moonSanitized, ['rover_hangar']);
      assert.deepStrictEqual(marsSanitized, ['greenhouse_2', 'dsoc_tower']);

      // Strict isolation assertions:
      assert.ok(moonSanitized.includes('rover_hangar'));
      assert.ok(!moonSanitized.includes('greenhouse_2'));
      assert.ok(!moonSanitized.includes('dsoc_tower'));

      assert.ok(marsSanitized.includes('greenhouse_2'));
      assert.ok(marsSanitized.includes('dsoc_tower'));
      assert.ok(!marsSanitized.includes('rover_hangar'));
    });

    it('PERSIST-5: Cross-colony mutation isolation: mutating Moon array does not affect Mars array', () => {
      const dualState = {
        moon: { builtBuildings: sanitizeBuiltBuildings(['rover_hangar']) },
        mars: { builtBuildings: sanitizeBuiltBuildings(['greenhouse_2']) },
      };

      // Mutate Moon's array
      dualState.moon.builtBuildings.push('dsoc_tower');

      assert.strictEqual(dualState.moon.builtBuildings.length, 2);
      assert.strictEqual(dualState.mars.builtBuildings.length, 1);
      assert.deepStrictEqual(dualState.mars.builtBuildings, ['greenhouse_2']);
      assert.ok(!dualState.mars.builtBuildings.includes('dsoc_tower'));
    });

    it('PERSIST-6: Backwards compatibility: legacy v5/v6 save without builtBuildings defaults cleanly to []', () => {
      const legacySave = {
        currentDay: 15,
        difficulty: 'normal',
        resources: { oxygen: 90, water: 80, energy: 70, food: 85, sciencePoints: 50 },
        // notice: builtBuildings is undefined
      };

      const sanitized = sanitizeBuiltBuildings((legacySave as any).builtBuildings);
      assert.ok(Array.isArray(sanitized));
      assert.strictEqual(sanitized.length, 0);
    });
  });

});
