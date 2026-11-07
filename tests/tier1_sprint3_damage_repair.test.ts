import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createDamageParticleSystems,
  DamageParticleSystem,
} from '../src/components/3d/damageParticles';

describe('Tier 1: Sprint 3 - Visible 3D Damage Particles & Tactile Raycast Repair', () => {
  // ==========================================
  // Group 1: Particle System Instantiation & Anchor Positioning
  // ==========================================
  describe('Group 1: Instantiation & Anchor Positioning', () => {
    it('SYS-1: Instantiates default damage particle system with correct scene graph structure', () => {
      const system = createDamageParticleSystems();
      assert.ok(system.group instanceof THREE.Group, 'System group must be a THREE.Group');
      assert.strictEqual(system.group.name, 'damage_particle_systems_root');

      // Check sub-groups
      const batteryGroup = system.group.getObjectByName('crisis_battery_failure');
      const o2Group = system.group.getObjectByName('crisis_o2_leak');
      const stormGroup = system.group.getObjectByName('crisis_solar_storm');

      assert.ok(batteryGroup, 'Battery failure crisis group must exist');
      assert.ok(o2Group, 'O2 leak crisis group must exist');
      assert.ok(stormGroup, 'Solar storm crisis group must exist');

      system.dispose();
    });

    it('SYS-2: Uses fallback default module positions when no argument is supplied', () => {
      const system = createDamageParticleSystems();
      const meshes = system.getDamagedModuleMeshes();
      assert.strictEqual(meshes.length, 3, 'Must register exactly 3 interactive hit meshes');

      const batteryHitbox = system.group.getObjectByName('hitbox_damage_battery');
      assert.ok(batteryHitbox);
      // Default solar farm at x = -8.5, y = 2.5, z = -5.5
      assert.strictEqual(batteryHitbox.position.x, -8.5);
      assert.strictEqual(batteryHitbox.position.y, 2.5);
      assert.strictEqual(batteryHitbox.position.z, -5.5);

      system.dispose();
    });

    it('SYS-3: Respects custom modulePositions parameter dictionary', () => {
      const customPositions = {
        solar_farm: new THREE.Vector3(-12.0, 1.0, -8.0),
        regolith_shield: new THREE.Vector3(2.0, 0.5, 3.0),
        magnetic_shield: new THREE.Vector3(0.0, 5.0, 0.0),
      };

      const system = createDamageParticleSystems(customPositions);
      const batteryHitbox = system.group.getObjectByName('hitbox_damage_battery') as THREE.Mesh;
      const o2Hitbox = system.group.getObjectByName('hitbox_damage_o2') as THREE.Mesh;
      const stormSphere = system.group.getObjectByName('crisis_magnetic_shield_sphere') as THREE.Mesh;

      assert.strictEqual(batteryHitbox.position.x, -12.0);
      assert.strictEqual(batteryHitbox.position.y, 3.5); // 1.0 + 2.5
      assert.strictEqual(batteryHitbox.position.z, -8.0);

      assert.strictEqual(o2Hitbox.position.x, 2.2); // 2.0 + 0.2
      assert.strictEqual(o2Hitbox.position.y, 4.3); // 0.5 + 3.8

      assert.strictEqual(stormSphere.position.x, 0.0);
      assert.strictEqual(stormSphere.position.y, 5.0);

      system.dispose();
    });

    it('SYS-4: getDamagedModuleMeshes returns valid hit targets with accurate userData', () => {
      const system = createDamageParticleSystems();
      const meshes = system.getDamagedModuleMeshes();

      assert.strictEqual(meshes.length, 3);
      const types = meshes.map((m) => m.userData.crisisType).sort();
      assert.deepStrictEqual(types, ['battery', 'o2', 'solar_storm']);

      for (const mesh of meshes) {
        assert.strictEqual(mesh.userData.isDamagedModule, true);
        assert.ok(typeof mesh.userData.moduleId === 'string');
      }

      system.dispose();
    });
  });

  // ==========================================
  // Group 2: Battery Failure Particle Effects
  // ==========================================
  describe('Group 2: Battery Failure Sparks & Smoke (solar_farm)', () => {
    it('BAT-1: Sparks and smoke particles start hidden and opacity is 0 when inactive', () => {
      const system = createDamageParticleSystems();
      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      const smoke = system.group.getObjectByName('battery_smoke') as THREE.Points;

      assert.strictEqual(sparks.visible, false);
      assert.strictEqual(smoke.visible, false);

      const sparkMat = sparks.material as THREE.PointsMaterial;
      const smokeMat = smoke.material as THREE.PointsMaterial;
      assert.strictEqual(sparkMat.opacity, 0);
      assert.strictEqual(smokeMat.opacity, 0);

      system.dispose();
    });

    it('BAT-2: Battery failure activation makes electrical spark points visible with high opacity', () => {
      const system = createDamageParticleSystems();
      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      const sparkMat = sparks.material as THREE.PointsMaterial;

      // Run multiple ticks with batteryFailure = true
      for (let i = 0; i < 20; i++) {
        system.update(0.016, { batteryFailure: true });
      }

      assert.strictEqual(sparks.visible, true);
      assert.ok(sparkMat.opacity > 0.5, `Spark opacity should ramp up, got ${sparkMat.opacity}`);

      system.dispose();
    });

    it('BAT-3: Electrical sparks contain yellow and cyan vertex colors', () => {
      const system = createDamageParticleSystems();
      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      const colorAttr = sparks.geometry.getAttribute('color') as THREE.BufferAttribute;
      assert.ok(colorAttr, 'Sparks geometry must have a color attribute');

      const colors = colorAttr.array as Float32Array;
      // Index 0: Yellow (R ~ 0.98, G ~ 0.8, B ~ 0.08)
      assert.ok(Math.abs(colors[0] - 0.98) < 0.05);
      assert.ok(Math.abs(colors[1] - 0.8) < 0.05);
      // Index 1 (offset 3): Cyan (R ~ 0.22, G ~ 0.74, B ~ 0.97)
      assert.ok(Math.abs(colors[3] - 0.22) < 0.05);
      assert.ok(Math.abs(colors[4] - 0.74) < 0.05);

      system.dispose();
    });

    it('BAT-4: Rising black smoke becomes visible and smoke positions move vertically upward', () => {
      const system = createDamageParticleSystems();
      const smoke = system.group.getObjectByName('battery_smoke') as THREE.Points;
      const smokeMat = smoke.material as THREE.PointsMaterial;

      const posAttr = smoke.geometry.getAttribute('position') as THREE.BufferAttribute;
      const initialY = (posAttr.array as Float32Array)[1];

      for (let i = 0; i < 30; i++) {
        system.update(0.016, { batteryFailure: true });
      }

      assert.strictEqual(smoke.visible, true);
      assert.ok(smokeMat.opacity > 0.4, `Smoke opacity should increase, got ${smokeMat.opacity}`);

      const updatedY = (posAttr.array as Float32Array)[1];
      assert.ok(updatedY !== initialY, 'Smoke particle position should have updated on tick');

      system.dispose();
    });

    it('BAT-5: Deactivating battery failure smoothly fades sparks and smoke to 0 opacity', () => {
      const system = createDamageParticleSystems();
      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      const smoke = system.group.getObjectByName('battery_smoke') as THREE.Points;
      const sparkMat = sparks.material as THREE.PointsMaterial;
      const smokeMat = smoke.material as THREE.PointsMaterial;

      // Activate first
      for (let i = 0; i < 20; i++) {
        system.update(0.016, { batteryFailure: true });
      }
      assert.strictEqual(sparks.visible, true);

      // Deactivate
      for (let i = 0; i < 60; i++) {
        system.update(0.016, { batteryFailure: false });
      }

      assert.ok(sparkMat.opacity < 0.02, `Sparks should fade out, got ${sparkMat.opacity}`);
      assert.ok(smokeMat.opacity < 0.05, `Smoke should fade out, got ${smokeMat.opacity}`);

      system.dispose();
    });
  });

  // ==========================================
  // Group 3: O2 Leak Fissure & Directional White Vapor Jet
  // ==========================================
  describe('Group 3: O2 Leak Fissure & White Vapor Jet (regolith_shield)', () => {
    it('O2-1: Fissure line and vapor jet are invisible when o2Leak is false', () => {
      const system = createDamageParticleSystems();
      const fissure = system.group.getObjectByName('o2_fissure_crack') as THREE.Line;
      const vapor = system.group.getObjectByName('o2_vapor_jet') as THREE.Points;

      assert.strictEqual(fissure.visible, false);
      assert.strictEqual(vapor.visible, false);

      system.dispose();
    });

    it('O2-2: O2 leak activation illuminates fissure crack with cyan glow', () => {
      const system = createDamageParticleSystems();
      const fissure = system.group.getObjectByName('o2_fissure_crack') as THREE.Line;
      const fissureMat = fissure.material as THREE.LineBasicMaterial;

      for (let i = 0; i < 25; i++) {
        system.update(0.016, { o2Leak: true });
      }

      assert.strictEqual(fissure.visible, true);
      assert.ok(fissureMat.opacity > 0.2, `Fissure opacity should be non-zero, got ${fissureMat.opacity}`);
      assert.strictEqual(fissureMat.color.getHex(), 0x7dd3fc);

      system.dispose();
    });

    it('O2-3: O2 leak activation starts directional white vapor jet blasting into vacuum', () => {
      const system = createDamageParticleSystems();
      const vapor = system.group.getObjectByName('o2_vapor_jet') as THREE.Points;
      const vaporMat = vapor.material as THREE.PointsMaterial;

      for (let i = 0; i < 20; i++) {
        system.update(0.016, { o2Leak: true });
      }

      assert.strictEqual(vapor.visible, true);
      assert.ok(vaporMat.opacity > 0.5, `Vapor opacity should ramp up, got ${vaporMat.opacity}`);
      assert.strictEqual(vaporMat.color.getHex(), 0xffffff);

      system.dispose();
    });

    it('O2-4: Vapor jet particles advance along outward trajectory away from dome anchor', () => {
      const system = createDamageParticleSystems();
      const vapor = system.group.getObjectByName('o2_vapor_jet') as THREE.Points;
      const posAttr = vapor.geometry.getAttribute('position') as THREE.BufferAttribute;
      const initialPos = new Float32Array(posAttr.array);

      for (let i = 0; i < 15; i++) {
        system.update(0.016, { o2Leak: true });
      }

      const updatedPos = posAttr.array as Float32Array;
      let movedCount = 0;
      for (let i = 0; i < posAttr.count; i++) {
        const i3 = i * 3;
        if (
          Math.abs(updatedPos[i3] - initialPos[i3]) > 0.001 ||
          Math.abs(updatedPos[i3 + 1] - initialPos[i3 + 1]) > 0.001
        ) {
          movedCount++;
        }
      }

      assert.ok(movedCount > posAttr.count * 0.5, 'Majority of particles should advance along trajectory');

      system.dispose();
    });

    it('O2-5: Deactivating O2 leak fades vapor jet and fissure back to 0 opacity', () => {
      const system = createDamageParticleSystems();
      const fissure = system.group.getObjectByName('o2_fissure_crack') as THREE.Line;
      const vapor = system.group.getObjectByName('o2_vapor_jet') as THREE.Points;
      const vaporMat = vapor.material as THREE.PointsMaterial;

      for (let i = 0; i < 20; i++) {
        system.update(0.016, { o2Leak: true });
      }
      assert.strictEqual(vapor.visible, true);

      for (let i = 0; i < 50; i++) {
        system.update(0.016, { o2Leak: false });
      }

      assert.ok(vaporMat.opacity < 0.05, `Vapor should fade out, got ${vaporMat.opacity}`);
      assert.strictEqual(fissure.visible, false);

      system.dispose();
    });
  });

  // ==========================================
  // Group 4: Solar Storm Magnetic Shield Sphere & Plasma Arcs
  // ==========================================
  describe('Group 4: Solar Storm Magnetic Shield & Plasma Arcs (magnetic_shield)', () => {
    it('STM-1: Magnetic shield sphere and plasma arcs are hidden when solarStorm is false', () => {
      const system = createDamageParticleSystems();
      const shield = system.group.getObjectByName('crisis_magnetic_shield_sphere') as THREE.Mesh;
      const arc1 = system.group.getObjectByName('plasma_arc_1') as THREE.Mesh;

      assert.strictEqual(shield.visible, false);
      assert.strictEqual(arc1.visible, false);

      system.dispose();
    });

    it('STM-2: Solar storm activation makes crimson-red magnetic shield sphere visible with pulsing opacity', () => {
      const system = createDamageParticleSystems();
      const shield = system.group.getObjectByName('crisis_magnetic_shield_sphere') as THREE.Mesh;
      const shieldMat = shield.material as THREE.MeshBasicMaterial;

      for (let i = 0; i < 25; i++) {
        system.update(0.016, { solarStorm: true });
      }

      assert.strictEqual(shield.visible, true);
      assert.ok(shieldMat.opacity > 0.2, `Shield opacity should be active, got ${shieldMat.opacity}`);
      assert.strictEqual(shieldMat.color.getHex(), 0xef4444); // Crimson red

      system.dispose();
    });

    it('STM-3: Magnetic shield sphere scale pulsates under solar storm energetic stress', () => {
      const system = createDamageParticleSystems();
      const shield = system.group.getObjectByName('crisis_magnetic_shield_sphere') as THREE.Mesh;

      for (let i = 0; i < 30; i++) {
        system.update(0.016, { solarStorm: true });
      }

      // Check scale pulsation is non-static
      const scale1 = shield.scale.x;
      system.update(0.1, { solarStorm: true });
      const scale2 = shield.scale.x;

      assert.notStrictEqual(scale1, scale2, 'Shield sphere scale should pulsate dynamically');

      system.dispose();
    });

    it('STM-4: Rotating plasma arcs rotate their orientation angles across ticks during solar storm', () => {
      const system = createDamageParticleSystems();
      const arc1 = system.group.getObjectByName('plasma_arc_1') as THREE.Mesh;
      const arc2 = system.group.getObjectByName('plasma_arc_2') as THREE.Mesh;
      const arc3 = system.group.getObjectByName('plasma_arc_3') as THREE.Mesh;

      const initRot1 = arc1.rotation.y;
      const initRot2 = arc2.rotation.x;
      const initRot3 = arc3.rotation.z;

      for (let i = 0; i < 20; i++) {
        system.update(0.016, { solarStorm: true });
      }

      assert.strictEqual(arc1.visible, true);
      assert.strictEqual(arc2.visible, true);
      assert.strictEqual(arc3.visible, true);

      assert.notStrictEqual(arc1.rotation.y, initRot1, 'Plasma arc 1 should rotate');
      assert.notStrictEqual(arc2.rotation.x, initRot2, 'Plasma arc 2 should rotate');
      assert.notStrictEqual(arc3.rotation.z, initRot3, 'Plasma arc 3 should rotate');

      system.dispose();
    });

    it('STM-5: Deactivating solar storm smoothly returns magnetic shield and plasma arcs to invisible', () => {
      const system = createDamageParticleSystems();
      const shield = system.group.getObjectByName('crisis_magnetic_shield_sphere') as THREE.Mesh;
      const arc1 = system.group.getObjectByName('plasma_arc_1') as THREE.Mesh;

      for (let i = 0; i < 20; i++) {
        system.update(0.016, { solarStorm: true });
      }
      assert.strictEqual(shield.visible, true);

      for (let i = 0; i < 60; i++) {
        system.update(0.016, { solarStorm: false });
      }

      assert.strictEqual(shield.visible, false);
      assert.strictEqual(arc1.visible, false);

      system.dispose();
    });
  });

  // ==========================================
  // Group 5: Zero-Allocation 60 FPS Rule & Performance Integrity
  // ==========================================
  describe('Group 5: Zero-Allocation 60 FPS & Numerical Stability', () => {
    it('PERF-1: 100 simulation ticks with all active crises execute without allocating new Three.js objects or heap leakage', () => {
      const system = createDamageParticleSystems();

      // Configure active crises and warm up JIT compiler
      system.setAlertState!({ batteryFailure: true, o2Leak: true, solarStorm: true });
      for (let i = 0; i < 200; i++) {
        system.update(0.016);
      }

      const memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        system.update(0.016);
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memDeltaKb = (memAfter - memBefore) / 1024;

      // In 100 ticks at 60 FPS, zero allocations ensures heap growth is minimal
      assert.ok(
        // Sin forzar la recolección de basura, heapUsed varía según la máquina: en las
        // máquinas compartidas de GitHub Actions se permite más (una fuga real de objetos
        // Three.js en cada tick superaría ese límite de sobra).
        memDeltaKb < (process.env.CI ? 1024 : 200),
        `Heap growth over 100 simulation ticks should be negligible, grew by ${memDeltaKb.toFixed(1)} KB`
      );

      system.dispose();
    });

    it('PERF-2: DeltaTime clamping prevents particle explosion on massive clock jumps', () => {
      const system = createDamageParticleSystems();

      // Simulate a tab backgrounding jump of 10.0 seconds
      system.update(10.0, { batteryFailure: true, o2Leak: true, solarStorm: true });

      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      const posAttr = sparks.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      // Verify no NaN or Infinity values exist in position arrays
      for (let i = 0; i < arr.length; i++) {
        assert.ok(Number.isFinite(arr[i]), `Position array index ${i} must be finite, got ${arr[i]}`);
      }

      system.dispose();
    });

    it('PERF-3: setAlertState updates active alerts and reflects in particle behavior', () => {
      const system = createDamageParticleSystems();
      assert.ok(typeof system.setAlertState === 'function', 'setAlertState should be defined');

      system.setAlertState!({ batteryFailure: true });

      for (let i = 0; i < 20; i++) {
        system.update(0.016);
      }

      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      assert.strictEqual(sparks.visible, true);

      system.dispose();
    });
  });

  // ==========================================
  // Group 6: Tactile Raycasting & Repair Trigger Integration
  // ==========================================
  describe('Group 6: Tactile Raycasting & Interactive Hit Detection', () => {
    it('RAY-1: Raycast directly intersecting battery damage hitbox detects battery crisis', () => {
      const system = createDamageParticleSystems();
      system.setAlertState!({ batteryFailure: true });
      const meshes = system.getDamagedModuleMeshes();

      // Battery hitbox is at (-8.5, 2.5, -5.5)
      const raycaster = new THREE.Raycaster();
      const origin = new THREE.Vector3(-8.5, 2.5, 10);
      const direction = new THREE.Vector3(0, 0, -1).normalize();
      raycaster.set(origin, direction);

      const hits = raycaster.intersectObjects(meshes, true);
      assert.ok(hits.length > 0, 'Raycaster should intersect battery damage collider');

      const hit = hits[0].object;
      assert.strictEqual(hit.userData.crisisType, 'battery');
      assert.strictEqual(hit.userData.moduleId, 'solar_farm');

      system.dispose();
    });

    it('RAY-2: Raycast directly intersecting O2 fissure hitbox detects o2 crisis', () => {
      const system = createDamageParticleSystems();
      system.setAlertState!({ o2Leak: true });
      const meshes = system.getDamagedModuleMeshes();

      // O2 collider is at (0.2, 3.8, 1.4)
      const raycaster = new THREE.Raycaster();
      const origin = new THREE.Vector3(0.2, 3.8, 10);
      const direction = new THREE.Vector3(0, 0, -1).normalize();
      raycaster.set(origin, direction);

      const hits = raycaster.intersectObjects(meshes, true);
      assert.ok(hits.length > 0, 'Raycaster should intersect O2 damage collider');

      const hit = hits[0].object;
      assert.strictEqual(hit.userData.crisisType, 'o2');
      assert.strictEqual(hit.userData.moduleId, 'regolith_shield');

      system.dispose();
    });

    it('RAY-3: Raycast intersecting magnetic shield sphere detects solar storm crisis', () => {
      const system = createDamageParticleSystems();
      system.setAlertState!({ solarStorm: true });
      const meshes = system.getDamagedModuleMeshes();

      // Magnetic shield sphere has radius ~15.8 centered at (0, 0, 0)
      const raycaster = new THREE.Raycaster();
      const origin = new THREE.Vector3(0, 5.0, 25);
      const direction = new THREE.Vector3(0, 0, -1).normalize();
      raycaster.set(origin, direction);

      const hits = raycaster.intersectObjects(meshes, true);
      assert.ok(hits.length > 0, 'Raycaster should intersect magnetic shield sphere');

      const hit = hits[0].object;
      assert.strictEqual(hit.userData.crisisType, 'solar_storm');
      assert.strictEqual(hit.userData.moduleId, 'magnetic_shield');

      system.dispose();
    });

    it('RAY-4: Click dispatch simulation routes active repair callback correctly', () => {
      const system = createDamageParticleSystems();
      system.setAlertState!({ batteryFailure: true });
      const meshes = system.getDamagedModuleMeshes();

      let triggeredCrisis: string | null = null;
      let triggeredModule: string | null = null;

      const onTriggerRepair = (crisis: 'battery' | 'o2' | 'solar_storm', modId: string) => {
        triggeredCrisis = crisis;
        triggeredModule = modId;
      };

      // Raycast to solar farm
      const raycaster = new THREE.Raycaster();
      raycaster.set(new THREE.Vector3(-8.5, 2.5, 10), new THREE.Vector3(0, 0, -1).normalize());
      const hits = raycaster.intersectObjects(meshes, true);

      assert.ok(hits.length > 0);
      const hit = hits[0].object;

      // Active crisis condition
      if (hit.userData.crisisType === 'battery') {
        onTriggerRepair(hit.userData.crisisType, hit.userData.moduleId);
      }

      assert.strictEqual(triggeredCrisis, 'battery');
      assert.strictEqual(triggeredModule, 'solar_farm');

      system.dispose();
    });

    it('RAY-5: Inactive crisis click ignores repair trigger invocation', () => {
      const system = createDamageParticleSystems();
      system.setAlertState!({ batteryFailure: false });
      const meshes = system.getDamagedModuleMeshes();

      let callbackInvoked = false;
      const onTriggerRepair = () => {
        callbackInvoked = true;
      };

      const raycaster = new THREE.Raycaster();
      raycaster.set(new THREE.Vector3(-8.5, 2.5, 10), new THREE.Vector3(0, 0, -1).normalize());
      const hits = raycaster.intersectObjects(meshes, true);

      if (hits.length > 0) {
        callbackInvoked = true;
      }

      assert.strictEqual(callbackInvoked, false, 'Repair callback must not fire when crisis is inactive');

      system.dispose();
    });
  });

  // ==========================================
  // Group 7: Resource Disposal & WebGL Cleanup
  // ==========================================
  describe('Group 7: Resource Disposal & Lifecycle Cleanup', () => {
    it('DISP-1: dispose() safely releases all geometries and materials recursively', () => {
      const system = createDamageParticleSystems();

      // Collect references before disposal
      const geometries: THREE.BufferGeometry[] = [];
      const materials: THREE.Material[] = [];

      system.group.traverse((obj) => {
        const anyObj = obj as any;
        if (anyObj.geometry) geometries.push(anyObj.geometry);
        if (anyObj.material) {
          if (Array.isArray(anyObj.material)) {
            materials.push(...anyObj.material);
          } else {
            materials.push(anyObj.material);
          }
        }
      });

      assert.ok(geometries.length >= 6, 'Must have at least 6 geometries to clean up');
      assert.ok(materials.length >= 6, 'Must have at least 6 materials to clean up');

      // Dispose
      assert.doesNotThrow(() => {
        system.dispose();
      });
    });

    it('DISP-2: After dispose(), root group children are emptied to prevent scene graph retention', () => {
      const system = createDamageParticleSystems();
      assert.ok(system.group.children.length > 0);

      system.dispose();
      assert.strictEqual(system.group.children.length, 0, 'Children must be completely detached');
    });
  });
});
