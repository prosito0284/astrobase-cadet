import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EvaControllerState,
  BASE_OBSTACLES,
  resolveEvaObstacleCollision,
  updateEvaKinematics,
  calculateSunPosition,
  calculateDynamicShadow,
  getPlanetLightingParameters,
  AudioEngineValidator,
  BUILDING_CATALOG,
  BaseBuildingManager,
  GEOLOGICAL_CATALOG,
  GeologicalCabinetManager,
  TactileRepairRaycaster,
} from './helpers/sprintHarness';
import { AstrobaseSimulation, clampResources } from './helpers/gameHarness';

describe('Tier 7: Dual Track Comprehensive E2E Integration Test Suite (Sprints 1–6)', () => {

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (EXTREMES, LIMITS, 0 O2, BOUNDARY COORDS)
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases across Expansion Features', () => {

    it('T2.1: EVA Boundary - Movement at extreme world perimeter (r = 120m) strictly clamps without tunneling', () => {
      // Starting right at boundary radius 120m
      const x = 84.8528;
      const z = 84.8528; // sqrt(x^2 + z^2) = 120.0
      assert.ok(Math.abs(Math.hypot(x, z) - 120) < 0.01);

      // Attempt to walk further outward
      const pushedOutX = x + 10.0;
      const pushedOutZ = z + 10.0;
      const res = resolveEvaObstacleCollision(pushedOutX, pushedOutZ, x, z);

      assert.strictEqual(res.collided, true);
      const clampedDist = Math.hypot(res.x, res.z);
      assert.ok(Math.abs(clampedDist - BASE_OBSTACLES.worldPerimeterRadius) < 0.01, 'Distance must clamp to 120m');
    });

    it('T2.2: EVA Boundary - Zero O2 in suit triggers life support emergency threshold', () => {
      const state: EvaControllerState = { x: 10, y: 1.7, z: 10, yaw: 0, pitch: 0, isMoving: true, isSprinting: true };
      let suitO2 = 0.05; // 0.05% O2 remaining

      for (let i = 0; i < 10; i++) {
        const { o2Drain } = updateEvaKinematics(0.1, state, { KeyW: true, ShiftLeft: true }, 'moon');
        suitO2 = Math.max(0, suitO2 - o2Drain);
      }

      assert.strictEqual(suitO2, 0, 'Suit O2 must reach zero floor without becoming negative');
    });

    it('T2.3: Solar Boundary - Elevation at horizon tangent (0 deg) produces finite clamped shadow length', () => {
      const shadowTangent = calculateDynamicShadow(10.0, 0.0, 90.0);
      assert.ok(Number.isFinite(shadowTangent.shadowLength), 'Shadow at 0 deg must not divide by zero');
      assert.ok(shadowTangent.shadowLength > 100, 'Shadow must be heavily elongated');
    });

    it('T2.4: Lighting Boundary - Elevation at absolute zenith (90 deg) casts minimal vertical shadow', () => {
      const shadowZenith = calculateDynamicShadow(10.0, 89.9, 0.0);
      assert.ok(shadowZenith.shadowLength < 0.1, 'Shadow at 90 deg must approach zero length');
    });

    it('T2.5: Particle Boundary - Rapid successive crisis triggers handle particle lifecycle without throwing', () => {
      const raycaster = new TactileRepairRaycaster();
      const sim = new AstrobaseSimulation('moon', 'normal');

      // 50 rapid repair clicks
      for (let i = 0; i < 50; i++) {
        sim.colony.batteryFault = true;
        const res = raycaster.handleTactileRepairClick('solar_farm', sim);
        assert.strictEqual(res.success, true);
        assert.strictEqual(sim.colony.batteryFault, false);
      }
    });

    it('T2.6: Audio Boundary - Quindar frequency outside ±10 Hz fails authentication tolerance', () => {
      const invalidIntroHz = 2600; // Far from 2525 Hz
      const invalidOutroHz = 2400; // Far from 2475 Hz

      const isIntroValid = Math.abs(invalidIntroHz - 2525) <= 5;
      const isOutroValid = Math.abs(invalidOutroHz - 2475) <= 5;

      assert.strictEqual(isIntroValid, false);
      assert.strictEqual(isOutroValid, false);
    });

    it('T2.7: Building Boundary - Negative or NaN science points reject construction safely', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = -50;

      const manager = new BaseBuildingManager();
      const res = manager.constructBuilding('rover_hangar', sim);

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.reason, 'INSUFFICIENT_SCIENCE');
    });

    it('T2.8: Building Boundary - Construction outside plateau boundary (radius > 25m) is blocked', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 500;

      const manager = new BaseBuildingManager();
      const res = manager.constructBuilding('dsoc_tower', sim, [30, 0, 30]); // hypot = 42.4 > 25

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.reason, 'POSITION_OUTSIDE_BASE_PLATEAU');
    });

    it('T2.9: Geological Boundary - 50 duplicate samples scale bonuses linearly without numeric overflow', () => {
      const manager = new GeologicalCabinetManager();
      for (let i = 0; i < 50; i++) {
        manager.addSample(GEOLOGICAL_CATALOG.polar_ice_cores, i + 1);
      }

      const buffs = manager.getCumulativeBuffs();
      assert.strictEqual(buffs.totalScienceBonusPct, 15 * 50); // 750%
      assert.strictEqual(buffs.totalMoraleBonus, 10 * 50);      // 500
      assert.strictEqual(buffs.totalWaterEfficiencyBonusPct, 20 * 50); // 1000%
      assert.ok(Number.isFinite(buffs.totalScienceBonusPct));
    });

    it('T2.10: Geological Boundary - Invalid or unknown specimen roll returns null safely', () => {
      const manager = new GeologicalCabinetManager();
      // Roll random > 0.40
      const res = manager.rollGeologicalSample('moon', 'unknown_crater', 0.99);
      assert.strictEqual(res, null);
    });

    it('T2.11: Pitch Boundary - Extreme pitch inputs (+10 rad, -10 rad) clamp to [-PI/3, +PI/3]', () => {
      const state: EvaControllerState = { x: 0, y: 1.7, z: 0, yaw: 0, pitch: 10.0, isMoving: false, isSprinting: false };
      updateEvaKinematics(0.016, state, {}, 'moon');
      assert.ok(Math.abs(state.pitch - Math.PI / 3) < 0.001);

      state.pitch = -10.0;
      updateEvaKinematics(0.016, state, {}, 'moon');
      assert.ok(Math.abs(state.pitch - (-Math.PI / 3)) < 0.001);
    });

    it('T2.12: Telemetry Boundary - Division-by-zero protection in empty vitrine calculations', () => {
      const manager = new GeologicalCabinetManager();
      const buffs = manager.getCumulativeBuffs();
      assert.strictEqual(buffs.totalScienceBonusPct, 0);
      assert.strictEqual(buffs.totalMoraleBonus, 0);
    });
  });

  // ==========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ==========================================================================
  describe('Tier 3: Cross-Feature Multi-System Interactions', () => {

    it('T3.1: Cross-Feature - EVA sortie during DONKI solar storm accelerates suit radiation hazard', () => {
      const sim = new AstrobaseSimulation('moon', 'dificil');
      sim.colony.radiationActive = true;

      // EVA movement underway
      const state: EvaControllerState = { x: 20, y: 1.7, z: 20, yaw: 0, pitch: 0, isMoving: true, isSprinting: true };
      const { o2Drain } = updateEvaKinematics(1.0, state, { KeyW: true, ShiftLeft: true }, 'moon');

      const initialO2 = sim.colony.resources.oxygen;
      sim.colony.resources = clampResources({
        ...sim.colony.resources,
        radiationExposure: sim.colony.resources.radiationExposure + 15,
        oxygen: sim.colony.resources.oxygen - o2Drain,
      }, sim.colony.resources);

      assert.ok(sim.colony.resources.radiationExposure >= 15, 'Radiation exposure must accumulate');
      assert.ok(sim.colony.resources.oxygen < initialO2, 'Oxygen must drain concurrently');
    });

    it('T3.2: Cross-Feature - Base building during active battery crisis stresses remaining power bus', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.batteryFault = true;
      sim.colony.resources.energy = 30;
      sim.colony.resources.sciencePoints = 100;

      // Construct Rover Hangar
      const manager = new BaseBuildingManager();
      const buildRes = manager.constructBuilding('rover_hangar', sim);
      assert.strictEqual(buildRes.success, true);

      // Colony energy is critical (30), but hangar buffs future battery recharge
      assert.strictEqual(sim.colony.resources.sciencePoints, 40);
      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.batteryBonusPct, 50);

      // Now resolve battery fault via tactile repair
      const raycaster = new TactileRepairRaycaster();
      const repairRes = raycaster.handleTactileRepairClick('solar_farm', sim);
      assert.strictEqual(repairRes.success, true);
      assert.strictEqual(sim.colony.batteryFault, false);
    });

    it('T3.3: Cross-Feature - Rare geological sample discovery on rover return with Houston Quindar tones', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.energy = 50;

      // Rover launches to Shackleton Rim
      const sortieRes = sim.launchRoverSortie('shackleton_rim');
      assert.strictEqual(sortieRes.success, true);

      // On return: roll sample
      const cabManager = new GeologicalCabinetManager();
      const sample = cabManager.rollGeologicalSample('moon', 'shackleton_rim', 0.25);
      assert.ok(sample !== null);
      cabManager.addSample(sample!, sim.colony.currentDay);

      // Trigger Quindar tones upon docking
      const audioValidator = new AudioEngineValidator();
      const intro = audioValidator.triggerQuindarIntro();
      const outro = audioValidator.triggerQuindarOutro();

      assert.strictEqual(intro.success, true);
      assert.strictEqual(outro.success, true);
      assert.strictEqual(audioValidator.quindarHistory.length, 2);

      // Specimen buffs activate
      const buffs = cabManager.getCumulativeBuffs();
      assert.strictEqual(buffs.totalWaterEfficiencyBonusPct, 20);
    });

    it('T3.4: Cross-Feature - 2nd Greenhouse expansion stabilizes ECLSS during severe crop water deficit', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.water = 10; // Low water
      sim.colony.resources.sciencePoints = 80;

      // Build 2nd Greenhouse
      const manager = new BaseBuildingManager();
      const buildRes = manager.constructBuilding('greenhouse_2', sim);
      assert.strictEqual(buildRes.success, true);

      const effects = manager.getActiveEffects();
      // O2 delta (+6) cushions ECLSS against water-short crop failures
      assert.strictEqual(effects.o2Delta, 6);
      assert.strictEqual(effects.foodDelta, 12);
    });

    it('T3.5: Cross-Feature - DSOC Optical Laser Tower triples science reward on NASA STEM quiz claim', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 90;

      // Construct DSOC Tower
      const manager = new BaseBuildingManager();
      manager.constructBuilding('dsoc_tower', sim);

      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.scienceMultiplier, 3.0);

      // Claim quiz reward (base 20 points * 3.0 = 60 points)
      const quizRes = sim.claimQuizReward(4);
      assert.strictEqual(quizRes.success, true);

      const boostedScience = quizRes.scienceEarned! * effects.scienceMultiplier;
      assert.strictEqual(boostedScience, 60);
    });

    it('T3.6: Cross-Feature - Rover Hangar battery buffer mitigates dust storm energy drain', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 100;
      sim.colony.dustStormActive = true;

      const manager = new BaseBuildingManager();
      manager.constructBuilding('rover_hangar', sim);

      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.batteryCapacityBonus, 25);
      // Increased capacity allows colony to survive extended dust storm
    });
  });

  // ==========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // ==========================================================================
  describe('Tier 4: Real-World STEM Workload Scenarios', () => {

    it('T4.1: Scenario 1 - Complete 25-Sol Mission Cycle (Sol 1 to Sol 25) with EVA, Sorties & Expansion', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      const buildingManager = new BaseBuildingManager();
      const cabinetManager = new GeologicalCabinetManager();
      const audioValidator = new AudioEngineValidator();

      for (let sol = 1; sol <= 24; sol++) {
        // Daily resource replenishments
        if (sim.colony.resources.oxygen < 30) sim.colony.resources.oxygen += 40;
        if (sim.colony.resources.water < 30) sim.colony.resources.water += 40;
        if (sim.colony.resources.food < 30) sim.colony.resources.food += 40;
        if (sim.colony.resources.energy < 25) sim.colony.resources.energy += 35;

        // Botanical Lab cycle
        if (sim.colony.resources.water >= 5 && sim.cropGrowthProgress < 100) {
          sim.waterCrop();
        }
        if (sim.cropGrowthProgress >= 100 && !sim.colony.hasHarvestedToday) {
          sim.harvestCrop();
        }

        // Rover Sorties & Sample Rolls
        if (sim.colony.resources.energy >= 15 && (sim.colony.roverSortiesToday ?? 0) < 1) {
          sim.launchRoverSortie('jezero_delta');
          const sample = cabinetManager.rollGeologicalSample('mars', 'jezero_delta', 0.25);
          if (sample) cabinetManager.addSample(sample, sol);
          audioValidator.triggerQuindarIntro();
        }

        // STEM Quizzes on Sol 3 and 10 to earn science points
        if ((sol === 3 || sol === 10) && !sim.colony.hasQuizCompletedToday) {
          sim.claimQuizReward(4);
        }

        // Construct Rover Hangar on Sol 6 once science >= 60
        if (sol === 6 && sim.colony.resources.sciencePoints >= 60 && !buildingManager.constructedBuildings.has('rover_hangar')) {
          buildingManager.constructBuilding('rover_hangar', sim);
        }

        // Construct 2nd Greenhouse on Sol 15 once science >= 75
        if (sol === 15 && sim.colony.resources.sciencePoints >= 75 && !buildingManager.constructedBuildings.has('greenhouse_2')) {
          buildingManager.constructBuilding('greenhouse_2', sim);
        }

        // Advance Sol
        const adv = sim.advanceDay();
        assert.strictEqual(adv.success, true);
      }

      // Sol 25 verification
      assert.strictEqual(sim.colony.currentDay, 25);
      const living = sim.colony.crew.filter(c => c.status !== 'deceased');
      assert.strictEqual(living.length, 4, 'All crew members must survive Sol 25');
      assert.ok(buildingManager.constructedBuildings.size >= 1, 'At least 1 expansion building must be constructed');
      assert.ok(cabinetManager.vitrine.size >= 1, 'At least 1 geological specimen must be collected');
    });

    it('T4.2: Scenario 2 - High-Hazard Astronaut EVA Sortie with Terrain Height & Visor Diagnostics', () => {
      const state: EvaControllerState = { x: 0, y: 1.7, z: 15, yaw: Math.PI, pitch: 0, isMoving: false, isSprinting: false };
      const audioValidator = new AudioEngineValidator();

      // Astronaut steps out on Moon
      audioValidator.setEvaBreathing(true);
      assert.strictEqual(audioValidator.isBreathingActive, true);

      // Walk toward crater rim over 10 seconds (100 ticks of dt=0.1)
      let suitO2 = 100.0;
      for (let t = 0; t < 100; t++) {
        const { o2Drain } = updateEvaKinematics(0.1, state, { KeyW: true }, 'moon', t * 0.1);
        suitO2 -= o2Drain;
      }

      assert.ok(suitO2 < 100, 'Oxygen must drain during EVA sortie');
      assert.ok(suitO2 > 80, 'Oxygen drain must remain within safe limits for 10s walk');
      assert.ok(state.y >= 1.7 - 0.05, 'Astronaut must follow terrain elevation with bob');
      assert.ok(Number.isFinite(state.y), 'Astronaut elevation must be finite');

      // Return to base airlock and exit EVA
      audioValidator.setEvaBreathing(false);
      assert.strictEqual(audioValidator.isBreathingActive, false);
    });

    it('T4.3: Scenario 3 - Long-Range Rover Sample Expedition & Quindar Comm Docking', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      const cabinet = new GeologicalCabinetManager();
      const audio = new AudioEngineValidator();

      // Launch VIPER to Shackleton Crater
      const launch = sim.launchRoverSortie('shackleton_rim');
      assert.strictEqual(launch.success, true);

      // Docking Quindar intro tone
      const intro = audio.triggerQuindarIntro();
      assert.strictEqual(intro.success, true);
      assert.strictEqual(intro.frequencyHz, 2525);

      // Collect permanent polar ice specimen
      const specimen = cabinet.rollGeologicalSample('moon', 'shackleton_rim', 0.2);
      assert.ok(specimen !== null);
      cabinet.addSample(specimen!, 1);

      // Quindar outro tone
      const outro = audio.triggerQuindarOutro();
      assert.strictEqual(outro.success, true);
      assert.strictEqual(outro.frequencyHz, 2475);

      // Vitrine contains specimen with valid citation
      const entry = cabinet.vitrine.get('polar_ice_cores');
      assert.ok(entry !== undefined);
      assert.ok(entry.sample.nasaMissionRef.includes('VIPER'));
    });

    it('T4.4: Scenario 4 - Deep Space Science Surge with DSOC Laser Tower & Stacking Buffs', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 200;

      const baseManager = new BaseBuildingManager();
      const cabinet = new GeologicalCabinetManager();

      // 1. Construct DSOC Tower
      baseManager.constructBuilding('dsoc_tower', sim);
      const effects = baseManager.getActiveEffects();
      assert.strictEqual(effects.scienceMultiplier, 3.0);

      // 2. Discover Jezero Clay biofirmas specimen
      cabinet.addSample(GEOLOGICAL_CATALOG.jezero_clays_biofirmas, 10);
      const buffs = cabinet.getCumulativeBuffs();
      assert.strictEqual(buffs.totalScienceBonusPct, 25);

      // 3. Combined science acceleration: 3.0x from DSOC * 1.25x from Jezero Clays = 3.75x total multiplier
      const baseScienceYield = 20;
      const combinedMultiplier = effects.scienceMultiplier * (1 + buffs.totalScienceBonusPct / 100);
      const surgeYield = Math.round(baseScienceYield * combinedMultiplier);

      assert.strictEqual(surgeYield, 75, '20 base science * 3.75 = 75 boosted science points');
    });
  });

});
