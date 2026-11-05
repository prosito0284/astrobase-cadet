import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CRISIS_EMITTERS,
  TactileRepairRaycaster,
} from './helpers/sprintHarness';
import { AstrobaseSimulation } from './helpers/gameHarness';

describe('Tier 1.16: Sprint 3 - Visible 3D Damage Particle VFX & Tactile Raycast Repair', () => {

  describe('Feature 8: F-DAMAGE-VFX (3D Real-Time Crisis Particle Systems)', () => {
    it('VFX-1: Solar farm battery fault spawns high-velocity sparks (#ffff00/#00e5ff) and dark smoke', () => {
      const emitter = CRISIS_EMITTERS.battery_fault;
      assert.strictEqual(emitter.moduleId, 'solar_farm');
      assert.strictEqual(emitter.count, 60);
      assert.ok(emitter.speedRange[0] >= 4.0 && emitter.speedRange[1] <= 8.0, 'Sparks speed must be 4.0 - 8.0 m/s');
      assert.ok(emitter.colorPalette.includes('#ffff00'), 'Palette must include yellow sparks');
      assert.ok(emitter.colorPalette.includes('#00e5ff'), 'Palette must include electric cyan sparks');
      assert.ok(emitter.colorPalette.includes('#222222'), 'Palette must include dark smoke');
    });

    it('VFX-2: Central dome O2 leak generates high-pressure directional vapor jet in vacuum', () => {
      const emitter = CRISIS_EMITTERS.o2_leak;
      assert.strictEqual(emitter.moduleId, 'regolith_shield');
      assert.strictEqual(emitter.count, 100);
      assert.ok(emitter.speedRange[0] >= 12.0, 'O2 escaping into vacuum must produce high-velocity jet (>= 12 m/s)');
      assert.ok(emitter.colorPalette.includes('#ffffff'), 'Vapor condensation must be white');
    });

    it('VFX-3: Solar storm DONKI radiation flare activates pulsing crimson plasma arcs (#ff1744)', () => {
      const emitter = CRISIS_EMITTERS.solar_storm;
      assert.strictEqual(emitter.moduleId, 'regolith_shield');
      assert.ok(emitter.colorPalette.includes('#ff1744'), 'Plasma arcs must be crimson red');
      assert.ok(emitter.lifetimeSec >= 1.5, 'Plasma arcs must persist across storm pulses');
    });

    it('VFX-4: Particle emitter origins strictly anchor to corresponding 3D module coordinates', () => {
      assert.deepStrictEqual(CRISIS_EMITTERS.battery_fault.origin, [-15, 2.5, 0], 'Anchored at solar farm');
      assert.deepStrictEqual(CRISIS_EMITTERS.o2_leak.origin, [0, 4.0, 0], 'Anchored at central dome apex');
      assert.deepStrictEqual(CRISIS_EMITTERS.solar_storm.origin, [0, 3.0, 0], 'Anchored at magnetic shield perimeter');
    });

    it('VFX-5: Particle lifetimes are strictly finite (<= 2.0s) preventing particle buildup memory leaks', () => {
      for (const key of Object.keys(CRISIS_EMITTERS) as (keyof typeof CRISIS_EMITTERS)[]) {
        const emitter = CRISIS_EMITTERS[key];
        assert.ok(emitter.lifetimeSec > 0 && emitter.lifetimeSec <= 2.5, `Lifetime for ${key} must be <= 2.5s`);
      }
    });
  });

  describe('Feature 9: F-TACTILE-REPAIR (Raycast Click & Emergency Protocol Trigger)', () => {
    it('REPAIR-1: Raycast intersection directly detects click on damaged solar farm module', () => {
      const raycaster = new TactileRepairRaycaster();
      const origin = new THREE.Vector3(-15, 20, 20);
      const dir = new THREE.Vector3(0, -20, -20); // Aiming at (-15, 0, 0)

      const hitId = raycaster.testRaycastIntersection(origin, dir);
      assert.strictEqual(hitId, 'solar_farm');
    });

    it('REPAIR-2: Off-target raycast click misses modules safely returning null', () => {
      const raycaster = new TactileRepairRaycaster();
      const origin = new THREE.Vector3(50, 50, 50);
      const dir = new THREE.Vector3(1, 1, 1); // Pointing away into sky

      const hitId = raycaster.testRaycastIntersection(origin, dir);
      assert.strictEqual(hitId, null);
    });

    it('REPAIR-3: Tactile click on damaged solar farm clears batteryFault and lockout timer', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      sim.colony.batteryFault = true;
      sim.colony.batteryLockoutSeconds = 60;

      const raycaster = new TactileRepairRaycaster();
      const result = raycaster.handleTactileRepairClick('solar_farm', sim);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.action, 'EMERGENCY_BATTERY_REPAIRED');
      assert.strictEqual(sim.colony.batteryFault, false);
      assert.strictEqual(sim.colony.batteryLockoutSeconds, 0);
    });

    it('REPAIR-4: Tactile click on leaking dome seals fissure and restores oxygen reserves', () => {
      const sim = new AstrobaseSimulation('mars', 'normal');
      sim.colony.emergencyO2Active = true;
      sim.colony.resources.oxygen = 20;

      const raycaster = new TactileRepairRaycaster();
      const result = raycaster.handleTactileRepairClick('regolith_shield', sim);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.action, 'O2_LEAK_SEALED');
      assert.strictEqual(sim.colony.emergencyO2Active, false);
      assert.ok(sim.colony.resources.oxygen > 20, 'Oxygen must be restored upon sealing fissure');
    });

    it('REPAIR-5: Tactile click on undamaged module returns NO_ACTIVE_REPAIR_NEEDED without side-effects', () => {
      const sim = new AstrobaseSimulation('moon', 'normal');
      // No active faults
      const raycaster = new TactileRepairRaycaster();
      const result = raycaster.handleTactileRepairClick('greenhouse', sim);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.action, 'NO_ACTIVE_REPAIR_NEEDED');
    });
  });

});
