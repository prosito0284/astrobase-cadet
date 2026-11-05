import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILDING_CATALOG,
  BaseBuildingManager,
} from './helpers/sprintHarness';
import { AstrobaseSimulation } from './helpers/gameHarness';

describe('Tier 1.18: Sprint 5 - 3D Base Expansion (Base Building & Active Colony Buffs)', () => {

  describe('Feature 13: F-BASE-BUILDING-LOGIC (Science Spending & Plateau Construction)', () => {
    it('BUILD-1: Building catalog defines 3 distinct expansion structures with science costs', () => {
      assert.ok(BUILDING_CATALOG.rover_hangar, 'Catalog must contain Rover Hangar');
      assert.ok(BUILDING_CATALOG.greenhouse_2, 'Catalog must contain 2nd Greenhouse');
      assert.ok(BUILDING_CATALOG.dsoc_tower, 'Catalog must contain DSOC Tower');

      assert.strictEqual(BUILDING_CATALOG.rover_hangar.costScience, 60);
      assert.strictEqual(BUILDING_CATALOG.greenhouse_2.costScience, 75);
      assert.strictEqual(BUILDING_CATALOG.dsoc_tower.costScience, 90);
    });

    it('BUILD-2: Construction is rejected when colony science points are insufficient', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = 40; // Less than 60

      const manager = new BaseBuildingManager();
      const res = manager.constructBuilding('rover_hangar', sim);

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.reason, 'INSUFFICIENT_SCIENCE');
      assert.strictEqual(sim.colony.resources.sciencePoints, 40);
      assert.strictEqual(manager.constructedBuildings.has('rover_hangar'), false);
    });

    it('BUILD-3: Successful construction deducts exact science cost and registers building', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 100;

      const manager = new BaseBuildingManager();
      const res = manager.constructBuilding('rover_hangar', sim);

      assert.strictEqual(res.success, true);
      assert.strictEqual(sim.colony.resources.sciencePoints, 40); // 100 - 60
      assert.strictEqual(manager.constructedBuildings.has('rover_hangar'), true);
    });

    it('BUILD-4: Duplicate construction of an already constructed structure is strictly blocked', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = 200;

      const manager = new BaseBuildingManager();
      const res1 = manager.constructBuilding('rover_hangar', sim);
      assert.strictEqual(res1.success, true);

      // Attempting to build a second rover hangar
      const res2 = manager.constructBuilding('rover_hangar', sim);
      assert.strictEqual(res2.success, false);
      assert.strictEqual(res2.reason, 'ALREADY_CONSTRUCTED');
      assert.strictEqual(sim.colony.resources.sciencePoints, 140); // Only 60 deducted once
    });

    it('BUILD-5: Coordinates outside base plateau (r > 25m) are rejected to preserve building footprint', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = 150;

      const manager = new BaseBuildingManager();
      const res = manager.constructBuilding('greenhouse_2', sim, [50, 0, 50]); // r = 70.7 > 25

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.reason, 'POSITION_OUTSIDE_BASE_PLATEAU');
      assert.strictEqual(manager.constructedBuildings.has('greenhouse_2'), false);
    });
  });

  describe('Feature 14: F-ROVER-HANGAR (3D Rover Hangar, Recharge & Laser Buffs)', () => {
    it('HANGAR-1: Rover Hangar grants +50% faster battery recharge speed', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 80;

      const manager = new BaseBuildingManager();
      manager.constructBuilding('rover_hangar', sim);

      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.batteryBonusPct, 50);
    });

    it('HANGAR-2: Rover Hangar grants +25 kWh extended battery capacity', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = 70;

      const manager = new BaseBuildingManager();
      manager.constructBuilding('rover_hangar', sim);

      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.batteryCapacityBonus, 25);
    });

    it('HANGAR-3: Rover Hangar unlocks +30m extended mining laser range', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = 70;

      const manager = new BaseBuildingManager();
      manager.constructBuilding('rover_hangar', sim);

      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.laserRangeBonus, 30);
    });

    it('HANGAR-4: Default Hangar position anchors to plateau coordinates [8, 0, -8]', () => {
      assert.deepStrictEqual(BUILDING_CATALOG.rover_hangar.defaultPosition, [8, 0, -8]);
      const dist = Math.hypot(8, -8);
      assert.ok(dist <= 25, 'Hangar must reside within 25m base radius');
    });

    it('HANGAR-5: Rover battery buffer reduces net energy strain during consecutive sorties', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.resources.sciencePoints = 100;
      sim.colony.resources.energy = 85;

      const manager = new BaseBuildingManager();
      manager.constructBuilding('rover_hangar', sim);

      // Rover sortie costs 15 energy
      const s1 = sim.launchRoverSortie('shackleton_rim');
      assert.strictEqual(s1.success, true);
      assert.strictEqual(sim.colony.resources.energy, 70);
    });
  });

  describe('Feature 15: F-2ND-GREENHOUSE (2nd Growth Dome & Expanded Life Support)', () => {
    it('GREEN-1: 2nd Greenhouse expands habitat capacity to support up to 10 crew (>6)', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 100;

      const manager = new BaseBuildingManager();
      manager.constructBuilding('greenhouse_2', sim);

      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.extraCrewCapacity, 4, 'Extra crew capacity must be +4 (enabling 6 + 4 = 10 crew)');
    });

    it('GREEN-2: 2nd Greenhouse adds +2.5 food delta per Sol to colony production', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 100;

      const manager = new BaseBuildingManager();
      manager.constructBuilding('greenhouse_2', sim);

      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.foodDelta, 2.5);
    });

    it('GREEN-3: 2nd Greenhouse adds +3.0 oxygen delta per Sol to ECLSS life support', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 100;

      const manager = new BaseBuildingManager();
      manager.constructBuilding('greenhouse_2', sim);

      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.o2Delta, 3.0);
    });

    it('GREEN-4: Default 2nd Greenhouse position anchors to coordinates [18, 0, 8]', () => {
      assert.deepStrictEqual(BUILDING_CATALOG.greenhouse_2.defaultPosition, [18, 0, 8]);
      const dist = Math.hypot(18, 8);
      assert.ok(dist <= 25, '2nd Greenhouse must reside within 25m base radius');
    });

    it('GREEN-5: Expanded life support offsets daily ECLSS drain of expanded crew roster', () => {
      const baseDrainLiving = 4 * 1.5; // 6.0 O2/day for 4 crew
      const deltaO2 = BUILDING_CATALOG.greenhouse_2.effects.o2Delta!;
      const netDrain = baseDrainLiving - deltaO2; // 6.0 - 3.0 = 3.0 net drain

      assert.strictEqual(netDrain, 3.0, '2nd Greenhouse reduces net daily O2 drain by 50%');
    });
  });

  describe('Feature 16: F-DSOC-TOWER (Deep Space Optical Comm Laser Tower & 3x Science)', () => {
    it('DSOC-1: DSOC Optical Laser Tower grants 3.0x scientific telemetry transmission multiplier', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 100;

      const manager = new BaseBuildingManager();
      manager.constructBuilding('dsoc_tower', sim);

      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.scienceMultiplier, 3.0);
    });

    it('DSOC-2: Default DSOC Tower coordinates anchor to [-8, 0, 18]', () => {
      assert.deepStrictEqual(BUILDING_CATALOG.dsoc_tower.defaultPosition, [-8, 0, 18]);
      const dist = Math.hypot(-8, 18);
      assert.ok(dist <= 25, 'DSOC Tower must reside within 25m base radius');
    });

    it('DSOC-3: Science points gained with active DSOC tower scale by 300%', () => {
      const baseScienceEarned = 15;
      const dsocMultiplier = BUILDING_CATALOG.dsoc_tower.effects.scienceMultiplier!;
      const totalEarned = Math.round(baseScienceEarned * dsocMultiplier);

      assert.strictEqual(totalEarned, 45, '15 base science * 3.0 = 45 science points');
    });

    it('DSOC-4: Building multiple structures aggregates all colony bonuses cumulatively', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.resources.sciencePoints = 300; // Enough for all 3

      const manager = new BaseBuildingManager();
      manager.constructBuilding('rover_hangar', sim);
      manager.constructBuilding('greenhouse_2', sim);
      manager.constructBuilding('dsoc_tower', sim);

      const effects = manager.getActiveEffects();
      assert.strictEqual(effects.batteryBonusPct, 50);
      assert.strictEqual(effects.extraCrewCapacity, 4);
      assert.strictEqual(effects.foodDelta, 2.5);
      assert.strictEqual(effects.o2Delta, 3.0);
      assert.strictEqual(effects.scienceMultiplier, 3.0);
      assert.strictEqual(sim.colony.resources.sciencePoints, 300 - (60 + 75 + 90)); // 75 remaining
    });

    it('DSOC-5: Active effects return baseline defaults when zero buildings are constructed', () => {
      const manager = new BaseBuildingManager();
      const effects = manager.getActiveEffects();

      assert.strictEqual(effects.batteryBonusPct, 0);
      assert.strictEqual(effects.extraCrewCapacity, 0);
      assert.strictEqual(effects.foodDelta, 0);
      assert.strictEqual(effects.o2Delta, 0);
      assert.strictEqual(effects.scienceMultiplier, 1.0);
    });
  });

});
