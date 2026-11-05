import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildSpaceBase3D } from '../src/components/3d/base3DBuilder';
import { createDamageParticleSystems } from '../src/components/3d/damageParticles';

/**
 * Helper to compute camera position from spherical presets
 */
function getCameraPosition(radius: number, theta: number, phi: number): THREE.Vector3 {
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
}

/**
 * Simulates BaseScene3D's complete two-tier raycasting & click dispatch logic:
 * 1. Checks damage hitboxes first (intersectObjects on damageParticles.getDamagedModuleMeshes())
 * 2. If no active damage hit handled, checks builder.interactiveObjects
 */
function simulateClickRaycast(
  raycaster: THREE.Raycaster,
  damageSystem: ReturnType<typeof createDamageParticleSystems>,
  builderInteractiveObjects: THREE.Object3D[],
  builderGroup: THREE.Group,
  crises: {
    batteryActive: boolean;
    o2Active: boolean;
    stormActive: boolean;
  },
  callbacks: {
    onTriggerRepair: (crisis: 'battery' | 'o2' | 'solar_storm', moduleId: string) => void;
    onSelectModule: (moduleId: string) => void;
  }
): {
  handledDamage: boolean;
  repairedCrisis: string | null;
  repairedModule: string | null;
  selectedModule: string | null;
} {
  let handledDamage = false;
  let repairedCrisis: string | null = null;
  let repairedModule: string | null = null;
  let selectedModule: string | null = null;

  // Tier 1: Check tactile damage meshes
  const damageHits = raycaster.intersectObjects(damageSystem.getDamagedModuleMeshes(), true);

  if (damageHits.length > 0) {
    const hitObj = damageHits[0].object;
    const { moduleId, crisisType } = hitObj.userData || {};
    const isCrisisActive =
      (crisisType === 'battery' && crises.batteryActive) ||
      (crisisType === 'o2' && crises.o2Active) ||
      (crisisType === 'solar_storm' && crises.stormActive);

    if (isCrisisActive && crisisType && moduleId) {
      callbacks.onTriggerRepair(crisisType, moduleId);
      callbacks.onSelectModule(moduleId);
      handledDamage = true;
      repairedCrisis = crisisType;
      repairedModule = moduleId;
      selectedModule = moduleId;
    }
  }

  // Tier 2: Check standard interactive base buildings if not handled by damage
  if (!handledDamage) {
    const hits = raycaster.intersectObjects(builderInteractiveObjects, true);

    if (hits.length > 0) {
      let topObj: THREE.Object3D | null = hits[0].object;
      let clickedModuleId: string | null = null;
      while (topObj && topObj !== builderGroup) {
        if (topObj.userData && topObj.userData.moduleId) {
          clickedModuleId = topObj.userData.moduleId;
          break;
        }
        topObj = topObj.parent;
      }

      if (clickedModuleId) {
        selectedModule = clickedModuleId;
        if (clickedModuleId === 'solar_farm' && crises.batteryActive) {
          callbacks.onTriggerRepair('battery', 'solar_farm');
          repairedCrisis = 'battery';
          repairedModule = 'solar_farm';
        } else if (clickedModuleId === 'regolith_shield' && crises.o2Active) {
          callbacks.onTriggerRepair('o2', 'regolith_shield');
          repairedCrisis = 'o2';
          repairedModule = 'regolith_shield';
        } else if (
          (clickedModuleId === 'magnetic_shield' || clickedModuleId === 'storm_bunker') &&
          crises.stormActive
        ) {
          callbacks.onTriggerRepair('solar_storm', clickedModuleId);
          repairedCrisis = 'solar_storm';
          repairedModule = clickedModuleId;
        }
        callbacks.onSelectModule(clickedModuleId);
      }
    }
  }

  return { handledDamage, repairedCrisis, repairedModule, selectedModule };
}

describe('Challenger Stress: Raycasting Occlusion & Tactile Interaction Mechanics', () => {
  // Preset camera coordinates matching BaseScene3D.tsx
  const CAMERA_PRESETS = {
    overview: { theta: 0.78, phi: 1.05, radius: 28 },
    regolith_shield: { theta: 0.0, phi: 1.15, radius: 18 },
    greenhouse: { theta: 2.1, phi: 1.1, radius: 20 },
    solar_farm: { theta: -2.3, phi: 1.1, radius: 20 },
    comm_array: { theta: -0.9, phi: 1.15, radius: 20 },
    water_ice_extractor: { theta: 0.9, phi: 1.15, radius: 20 },
  };

  const moduleCoordinates = {
    solar_farm: new THREE.Vector3(-8.5, 0, -5.5),
    regolith_shield: new THREE.Vector3(0, 0, 0),
    magnetic_shield: new THREE.Vector3(0, 0, 0),
    greenhouse: new THREE.Vector3(8.5, 0, -4.5),
    comm_array: new THREE.Vector3(-8.0, 0, 6.5),
    water_ice_extractor: new THREE.Vector3(8.0, 0, 6.5),
    storm_bunker: new THREE.Vector3(0, 0, 10.5),
  };

  // ==========================================
  // Suite 1: Raycasting Occlusion & Filtering
  // ==========================================
  describe('Suite 1: Shield Sphere Raycast Transparency vs Interception', () => {
    it('OCC-1: When solarStorm === false, ray through shield boundary reaches regolith_shield unblocked', () => {
      const builder = buildSpaceBase3D('moon');
      builder.group.updateMatrixWorld(true);
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ solarStorm: false, batteryFailure: false, o2Leak: false });

      const camPos = getCameraPosition(
        CAMERA_PRESETS.overview.radius,
        CAMERA_PRESETS.overview.theta,
        CAMERA_PRESETS.overview.phi
      );
      assert.ok(camPos.length() > 15.8, 'Camera must be outside the 15.8m shield sphere');

      const target = new THREE.Vector3(0, 1.5, 0); // Regolith dome center
      const dir = target.clone().sub(camPos).normalize();
      const raycaster = new THREE.Raycaster(camPos, dir);

      // Verify damage meshes return 0 hits (shield does not occlude)
      const damageHits = raycaster.intersectObjects(damage.getDamagedModuleMeshes(), true);
      assert.strictEqual(damageHits.length, 0, 'Inactive shield sphere must not intercept raycast');

      // Verify ray reaches builder interactive objects
      const hits = raycaster.intersectObjects(builder.interactiveObjects, true);
      assert.ok(hits.length > 0, 'Ray should reach base structures through transparent shield');
      assert.strictEqual(hits[0].object.userData.moduleId, 'regolith_shield');

      damage.dispose();
      builder.dispose();
    });

    it('OCC-2: When solarStorm === false, rays reach greenhouse and solar_farm unblocked', () => {
      const builder = buildSpaceBase3D('moon');
      builder.group.updateMatrixWorld(true);
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ solarStorm: false, batteryFailure: false, o2Leak: false });

      const camPos = getCameraPosition(
        CAMERA_PRESETS.overview.radius,
        CAMERA_PRESETS.overview.theta,
        CAMERA_PRESETS.overview.phi
      );

      // Test Greenhouse: (8.5, 1.0, -4.5)
      const ghTarget = new THREE.Vector3(8.5, 1.0, -4.5);
      const ghDir = ghTarget.clone().sub(camPos).normalize();
      const ghRay = new THREE.Raycaster(camPos, ghDir);

      const ghDamageHits = ghRay.intersectObjects(damage.getDamagedModuleMeshes(), true);
      assert.strictEqual(ghDamageHits.length, 0, 'Greenhouse ray must not be intercepted by inactive shield');

      const ghHits = ghRay.intersectObjects(builder.interactiveObjects, true);
      assert.ok(ghHits.length > 0, 'Greenhouse should be hit');
      assert.strictEqual(ghHits[0].object.userData.moduleId, 'greenhouse');

      // Test Solar Farm: (-8.5, 1.0, -5.5)
      const sfTarget = new THREE.Vector3(-8.5, 1.0, -5.5);
      const sfDir = sfTarget.clone().sub(camPos).normalize();
      const sfRay = new THREE.Raycaster(camPos, sfDir);

      const sfDamageHits = sfRay.intersectObjects(damage.getDamagedModuleMeshes(), true);
      assert.strictEqual(sfDamageHits.length, 0, 'Solar farm ray must not be intercepted by inactive shield');

      const sfHits = sfRay.intersectObjects(builder.interactiveObjects, true);
      assert.ok(sfHits.length > 0, 'Solar farm should be hit');
      assert.strictEqual(sfHits[0].object.userData.moduleId, 'solar_farm');

      damage.dispose();
      builder.dispose();
    });

    it('OCC-3: When solarStorm === true, ray intersecting shield sphere triggers solar_storm repair callback', () => {
      const builder = buildSpaceBase3D('moon');
      builder.group.updateMatrixWorld(true);
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ solarStorm: true, batteryFailure: false, o2Leak: false });

      const camPos = getCameraPosition(
        CAMERA_PRESETS.overview.radius,
        CAMERA_PRESETS.overview.theta,
        CAMERA_PRESETS.overview.phi
      );
      const target = new THREE.Vector3(0, 1.5, 0);
      const dir = target.clone().sub(camPos).normalize();
      const raycaster = new THREE.Raycaster(camPos, dir);

      let triggeredCrisis: string | null = null;
      let triggeredModule: string | null = null;
      let selectedModule: string | null = null;

      const result = simulateClickRaycast(
        raycaster,
        damage,
        builder.interactiveObjects,
        builder.group,
        { batteryActive: false, o2Active: false, stormActive: true },
        {
          onTriggerRepair: (c, m) => {
            triggeredCrisis = c;
            triggeredModule = m;
          },
          onSelectModule: (m) => {
            selectedModule = m;
          },
        }
      );

      assert.strictEqual(result.handledDamage, true, 'Active solar storm must intercept click');
      assert.strictEqual(triggeredCrisis, 'solar_storm');
      assert.strictEqual(triggeredModule, 'magnetic_shield');
      assert.strictEqual(selectedModule, 'magnetic_shield');

      damage.dispose();
      builder.dispose();
    });

    it('OCC-4: Multi-Angle verification: Shield intercepts rays from all 6 camera presets when solarStorm === true', () => {
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ solarStorm: true });

      const presetEntries = Object.entries(CAMERA_PRESETS);
      assert.strictEqual(presetEntries.length, 6, 'Must test all 6 camera presets');

      for (const [name, preset] of presetEntries) {
        const camPos = getCameraPosition(preset.radius, preset.theta, preset.phi);
        const target = new THREE.Vector3(0, 2.0, 0);
        const dir = target.clone().sub(camPos).normalize();
        const raycaster = new THREE.Raycaster(camPos, dir);

        const hits = raycaster.intersectObjects(damage.getDamagedModuleMeshes(), true);
        assert.ok(
          hits.length > 0,
          `Preset ${name} (radius ${preset.radius}) must intersect active shield sphere`
        );
        assert.strictEqual(hits[0].object.userData.crisisType, 'solar_storm');
        assert.strictEqual(hits[0].object.userData.moduleId, 'magnetic_shield');
      }

      damage.dispose();
    });
  });

  // ==========================================
  // Suite 2: Tactical Crisis Hitbox Hit & Repair Dispatch
  // ==========================================
  describe('Suite 2: Sparking Solar Farm & Leaking Fissure Hitbox Dispatches', () => {
    it('HIT-1: Clicking active sparking solar farm hitbox hits and dispatches battery crisis', () => {
      const builder = buildSpaceBase3D('moon');
      builder.group.updateMatrixWorld(true);
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ batteryFailure: true, o2Leak: false, solarStorm: false });

      // Aim directly at solar farm hitbox (-8.5, 2.5, -5.5) from camera preset
      const camPos = getCameraPosition(
        CAMERA_PRESETS.solar_farm.radius,
        CAMERA_PRESETS.solar_farm.theta,
        CAMERA_PRESETS.solar_farm.phi
      );
      const target = new THREE.Vector3(-8.5, 2.5, -5.5);
      const dir = target.clone().sub(camPos).normalize();
      const raycaster = new THREE.Raycaster(camPos, dir);

      let dispatchedCrisis: string | null = null;
      let dispatchedModule: string | null = null;

      const result = simulateClickRaycast(
        raycaster,
        damage,
        builder.interactiveObjects,
        builder.group,
        { batteryActive: true, o2Active: false, stormActive: false },
        {
          onTriggerRepair: (c, m) => {
            dispatchedCrisis = c;
            dispatchedModule = m;
          },
          onSelectModule: () => {},
        }
      );

      assert.strictEqual(result.handledDamage, true);
      assert.strictEqual(dispatchedCrisis, 'battery');
      assert.strictEqual(dispatchedModule, 'solar_farm');

      damage.dispose();
      builder.dispose();
    });

    it('HIT-2: Inactive battery failure click on solar farm selects module without repair dispatch', () => {
      const builder = buildSpaceBase3D('moon');
      builder.group.updateMatrixWorld(true);
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ batteryFailure: false, o2Leak: false, solarStorm: false });

      const camPos = getCameraPosition(
        CAMERA_PRESETS.solar_farm.radius,
        CAMERA_PRESETS.solar_farm.theta,
        CAMERA_PRESETS.solar_farm.phi
      );
      const target = new THREE.Vector3(-8.5, 2.5, -5.5);
      const dir = target.clone().sub(camPos).normalize();
      const raycaster = new THREE.Raycaster(camPos, dir);

      let dispatchedCrisis: string | null = null;
      let selectedModule: string | null = null;

      const result = simulateClickRaycast(
        raycaster,
        damage,
        builder.interactiveObjects,
        builder.group,
        { batteryActive: false, o2Active: false, stormActive: false },
        {
          onTriggerRepair: (c) => {
            dispatchedCrisis = c;
          },
          onSelectModule: (m) => {
            selectedModule = m;
          },
        }
      );

      assert.strictEqual(result.handledDamage, false, 'Inactive battery must not handle damage click');
      assert.strictEqual(dispatchedCrisis, null, 'No repair callback should fire');
      assert.strictEqual(selectedModule, 'solar_farm', 'Base building selection still occurs');

      damage.dispose();
      builder.dispose();
    });

    it('HIT-3: Clicking active leaking dome fissure hitbox hits and dispatches o2 crisis', () => {
      const builder = buildSpaceBase3D('moon');
      builder.group.updateMatrixWorld(true);
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ batteryFailure: false, o2Leak: true, solarStorm: false });

      // Aim at dome fissure hitbox (0.2, 3.8, 1.4)
      const camPos = getCameraPosition(
        CAMERA_PRESETS.regolith_shield.radius,
        CAMERA_PRESETS.regolith_shield.theta,
        CAMERA_PRESETS.regolith_shield.phi
      );
      const target = new THREE.Vector3(0.2, 3.8, 1.4);
      const dir = target.clone().sub(camPos).normalize();
      const raycaster = new THREE.Raycaster(camPos, dir);

      let dispatchedCrisis: string | null = null;
      let dispatchedModule: string | null = null;

      const result = simulateClickRaycast(
        raycaster,
        damage,
        builder.interactiveObjects,
        builder.group,
        { batteryActive: false, o2Active: true, stormActive: false },
        {
          onTriggerRepair: (c, m) => {
            dispatchedCrisis = c;
            dispatchedModule = m;
          },
          onSelectModule: () => {},
        }
      );

      assert.strictEqual(result.handledDamage, true);
      assert.strictEqual(dispatchedCrisis, 'o2');
      assert.strictEqual(dispatchedModule, 'regolith_shield');

      damage.dispose();
      builder.dispose();
    });

    it('HIT-4: Inactive O2 leak click on central dome selects module without repair dispatch', () => {
      const builder = buildSpaceBase3D('moon');
      builder.group.updateMatrixWorld(true);
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ batteryFailure: false, o2Leak: false, solarStorm: false });

      const camPos = getCameraPosition(
        CAMERA_PRESETS.regolith_shield.radius,
        CAMERA_PRESETS.regolith_shield.theta,
        CAMERA_PRESETS.regolith_shield.phi
      );
      const target = new THREE.Vector3(0.2, 3.8, 1.4);
      const dir = target.clone().sub(camPos).normalize();
      const raycaster = new THREE.Raycaster(camPos, dir);

      let dispatchedCrisis: string | null = null;
      let selectedModule: string | null = null;

      const result = simulateClickRaycast(
        raycaster,
        damage,
        builder.interactiveObjects,
        builder.group,
        { batteryActive: false, o2Active: false, stormActive: false },
        {
          onTriggerRepair: (c) => {
            dispatchedCrisis = c;
          },
          onSelectModule: (m) => {
            selectedModule = m;
          },
        }
      );

      assert.strictEqual(result.handledDamage, false);
      assert.strictEqual(dispatchedCrisis, null);
      assert.strictEqual(selectedModule, 'regolith_shield');

      damage.dispose();
      builder.dispose();
    });
  });

  // ==========================================
  // Suite 3: Adversarial Edge Cases & Spatial Boundaries
  // ==========================================
  describe('Suite 3: Adversarial Spatial Boundaries & Edge Cases', () => {
    it('ADV-1: Off-target raycast (grazing miss) does not trigger repair callback or false positives', () => {
      const builder = buildSpaceBase3D('moon');
      builder.group.updateMatrixWorld(true);
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ batteryFailure: true, o2Leak: true, solarStorm: true });

      // Ray aimed high into empty space (0, 35, 0)
      const raycaster = new THREE.Raycaster(
        new THREE.Vector3(0, 35, 50),
        new THREE.Vector3(0, 0, -1).normalize()
      );

      let dispatched = false;
      const result = simulateClickRaycast(
        raycaster,
        damage,
        builder.interactiveObjects,
        builder.group,
        { batteryActive: true, o2Active: true, stormActive: true },
        {
          onTriggerRepair: () => {
            dispatched = true;
          },
          onSelectModule: () => {},
        }
      );

      assert.strictEqual(result.handledDamage, false);
      assert.strictEqual(dispatched, false);
      assert.strictEqual(result.selectedModule, null);

      damage.dispose();
      builder.dispose();
    });

    it('ADV-2: Prioritization when Solar Storm and Battery Crisis are simultaneously active', () => {
      const builder = buildSpaceBase3D('moon');
      builder.group.updateMatrixWorld(true);
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ batteryFailure: true, solarStorm: true });

      // Camera is outside shield sphere (radius 28). Both storm and battery failure active.
      // Ray is aimed at solar farm (-8.5, 2.5, -5.5).
      const camPos = getCameraPosition(
        CAMERA_PRESETS.overview.radius,
        CAMERA_PRESETS.overview.theta,
        CAMERA_PRESETS.overview.phi
      );
      const target = new THREE.Vector3(-8.5, 2.5, -5.5);
      const dir = target.clone().sub(camPos).normalize();
      const raycaster = new THREE.Raycaster(camPos, dir);

      let dispatchedCrisis: string | null = null;
      const result = simulateClickRaycast(
        raycaster,
        damage,
        builder.interactiveObjects,
        builder.group,
        { batteryActive: true, o2Active: false, stormActive: true },
        {
          onTriggerRepair: (c) => {
            dispatchedCrisis = c;
          },
          onSelectModule: () => {},
        }
      );

      // The outer magnetic shield sphere intercepts the ray first before it can reach the internal solar farm
      assert.strictEqual(result.handledDamage, true);
      assert.strictEqual(
        dispatchedCrisis,
        'solar_storm',
        'Outer shield barrier must be clicked and repaired before solar farm'
      );

      damage.dispose();
      builder.dispose();
    });

    it('ADV-3: Inside EVA Viewpoint (r < 15.8m) DoubleSide shield mesh is hit during solar storm', () => {
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ solarStorm: true });

      // Inside astronaut position (0, 1.6, 5.5) - distance from center is ~5.73m < 15.8m
      const evaPos = new THREE.Vector3(0, 1.6, 5.5);
      // Ray aimed straight up through the shield dome
      const raycaster = new THREE.Raycaster(evaPos, new THREE.Vector3(0, 1, 0));

      const hits = raycaster.intersectObjects(damage.getDamagedModuleMeshes(), true);
      assert.ok(hits.length > 0, 'DoubleSide shield must intersect rays cast from within');
      assert.strictEqual(hits[0].object.userData.crisisType, 'solar_storm');

      damage.dispose();
    });

    it('ADV-4: Rapid 200x crisis toggling maintains raycast consistency and zero stale hit detection', () => {
      const builder = buildSpaceBase3D('moon');
      builder.group.updateMatrixWorld(true);
      const damage = createDamageParticleSystems(moduleCoordinates);

      const camPos = new THREE.Vector3(0, 5, 25);
      const dir = new THREE.Vector3(0, 0, -1);
      const raycaster = new THREE.Raycaster(camPos, dir);

      for (let i = 0; i < 200; i++) {
        const storm = i % 2 === 0;
        damage.setAlertState!({ solarStorm: storm });

        const hits = raycaster.intersectObjects(damage.getDamagedModuleMeshes(), true);
        if (storm) {
          assert.ok(hits.length > 0, `Iteration ${i}: storm === true should intersect shield`);
          assert.strictEqual(hits[0].object.userData.crisisType, 'solar_storm');
        } else {
          assert.strictEqual(hits.length, 0, `Iteration ${i}: storm === false must not intersect`);
        }
      }

      damage.dispose();
      builder.dispose();
    });

    it('ADV-5: Raycasting with extreme distances (1,000m) remains numerically stable without NaN', () => {
      const damage = createDamageParticleSystems(moduleCoordinates);
      damage.setAlertState!({ batteryFailure: true });

      const farPos = new THREE.Vector3(-8.5, 2.5, 1000);
      const dir = new THREE.Vector3(0, 0, -1);
      const raycaster = new THREE.Raycaster(farPos, dir, 0.1, 2000);

      const hits = raycaster.intersectObjects(damage.getDamagedModuleMeshes(), true);
      assert.ok(hits.length > 0, 'Ray from 1,000m should hit battery damage collider');
      assert.ok(Number.isFinite(hits[0].distance));
      assert.strictEqual(hits[0].object.userData.crisisType, 'battery');

      damage.dispose();
    });
  });
});
