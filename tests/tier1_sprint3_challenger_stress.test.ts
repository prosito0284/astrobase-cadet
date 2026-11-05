import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createDamageParticleSystems,
  DamageParticleSystem,
} from '../src/components/3d/damageParticles';

describe('Sprint 3 Empirical Challenger Stress Suite (Adversarial Verification)', () => {
  // =========================================================================
  // Challenge 1: High-Frequency Tick Stress (1,000 continuous cycles)
  // =========================================================================
  describe('Challenge 1: High-Frequency Tick Stress (1,000 continuous cycles)', () => {
    it('STRESS-1: 1,000 continuous cycles with randomized dt (0.001s to 0.5s) and alternating alert flags maintains 0 NaNs and strictly bounded coordinates', () => {
      const customPositions = {
        solar_farm: new THREE.Vector3(-10, 0, -5),
        regolith_shield: new THREE.Vector3(2, 0, 3),
        magnetic_shield: new THREE.Vector3(0, 0, 0),
      };

      const system = createDamageParticleSystems(customPositions);

      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      const smoke = system.group.getObjectByName('battery_smoke') as THREE.Points;
      const vapor = system.group.getObjectByName('o2_vapor_jet') as THREE.Points;
      const shield = system.group.getObjectByName('crisis_magnetic_shield_sphere') as THREE.Mesh;

      assert.ok(sparks && smoke && vapor && shield, 'All core crisis meshes must be present');

      // Run 1,000 cycles with pseudorandom variations
      for (let cycle = 0; cycle < 1000; cycle++) {
        // Random dt between 0.001s and 0.5s
        const dt = 0.001 + Math.random() * 0.499;

        // Alternating alerts in pseudorandom configurations
        const alerts = {
          batteryFailure: (cycle % 3 === 0) || (cycle % 7 === 0),
          o2Leak: (cycle % 2 === 0) || (cycle % 5 === 0),
          solarStorm: (cycle % 4 === 0) || (cycle % 9 === 0),
        };

        system.update(dt, alerts);

        // Periodically verify position arrays and bounding spheres every 50 cycles
        if (cycle % 50 === 0) {
          // 1. Check Sparks
          const sparkPos = sparks.geometry.getAttribute('position') as THREE.BufferAttribute;
          const sparkArr = sparkPos.array as Float32Array;
          for (let i = 0; i < sparkArr.length; i++) {
            assert.ok(!Number.isNaN(sparkArr[i]), `Spark pos[${i}] must not be NaN at cycle ${cycle}`);
            assert.ok(Number.isFinite(sparkArr[i]), `Spark pos[${i}] must be finite at cycle ${cycle}`);
          }
          sparks.geometry.computeBoundingSphere();
          const sparkSphere = sparks.geometry.boundingSphere!;
          assert.ok(Number.isFinite(sparkSphere.radius), 'Spark bounding sphere radius must be finite');
          assert.ok(sparkSphere.radius < 30, `Spark sphere radius must remain bounded, got ${sparkSphere.radius}`);

          // 2. Check Smoke
          const smokePos = smoke.geometry.getAttribute('position') as THREE.BufferAttribute;
          const smokeArr = smokePos.array as Float32Array;
          for (let i = 0; i < smokeArr.length; i++) {
            assert.ok(!Number.isNaN(smokeArr[i]), `Smoke pos[${i}] must not be NaN at cycle ${cycle}`);
            assert.ok(Number.isFinite(smokeArr[i]), `Smoke pos[${i}] must be finite at cycle ${cycle}`);
          }
          smoke.geometry.computeBoundingSphere();
          const smokeSphere = smoke.geometry.boundingSphere!;
          assert.ok(Number.isFinite(smokeSphere.radius), 'Smoke bounding sphere radius must be finite');
          assert.ok(smokeSphere.radius < 30, `Smoke sphere radius must remain bounded, got ${smokeSphere.radius}`);

          // 3. Check Vapor
          const vaporPos = vapor.geometry.getAttribute('position') as THREE.BufferAttribute;
          const vaporArr = vaporPos.array as Float32Array;
          for (let i = 0; i < vaporArr.length; i++) {
            assert.ok(!Number.isNaN(vaporArr[i]), `Vapor pos[${i}] must not be NaN at cycle ${cycle}`);
            assert.ok(Number.isFinite(vaporArr[i]), `Vapor pos[${i}] must be finite at cycle ${cycle}`);
          }
          vapor.geometry.computeBoundingSphere();
          const vaporSphere = vapor.geometry.boundingSphere!;
          assert.ok(Number.isFinite(vaporSphere.radius), 'Vapor bounding sphere radius must be finite');
          assert.ok(vaporSphere.radius < 35, `Vapor sphere radius must remain bounded, got ${vaporSphere.radius}`);

          // 4. Check Shield scale
          assert.ok(Number.isFinite(shield.scale.x), 'Shield scale.x must be finite');
          assert.ok(shield.scale.x > 0.9 && shield.scale.x < 1.1, `Shield scale must stay within [0.9, 1.1], got ${shield.scale.x}`);
        }
      }

      system.dispose();
    });
  });

  // =========================================================================
  // Challenge 2: Zero-Allocation 60 FPS Verification (Runtime Spies & Heap Inspection)
  // =========================================================================
  describe('Challenge 2: Zero-Allocation Verification in Animation Loop', () => {
    it('ZERO-1: update(dt) maintains strict reference identity across all Buffers, Materials, and Scene Graph objects', () => {
      const system = createDamageParticleSystems();
      system.setAlertState!({ batteryFailure: true, o2Leak: true, solarStorm: true });

      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      const smoke = system.group.getObjectByName('battery_smoke') as THREE.Points;
      const vapor = system.group.getObjectByName('o2_vapor_jet') as THREE.Points;
      const fissure = system.group.getObjectByName('o2_fissure_crack') as THREE.Line;
      const shield = system.group.getObjectByName('crisis_magnetic_shield_sphere') as THREE.Mesh;

      // Retain initial reference pointers
      const origSparkGeom = sparks.geometry;
      const origSparkPosAttr = sparks.geometry.getAttribute('position');
      const origSparkPosArr = origSparkPosAttr.array;
      const origSparkColorArr = sparks.geometry.getAttribute('color').array;
      const origSparkMat = sparks.material;

      const origSmokeGeom = smoke.geometry;
      const origSmokePosArr = smoke.geometry.getAttribute('position').array;
      const origSmokeMat = smoke.material;

      const origVaporGeom = vapor.geometry;
      const origVaporPosArr = vapor.geometry.getAttribute('position').array;
      const origVaporMat = vapor.material;

      const origFissureGeom = fissure.geometry;
      const origFissurePosArr = fissure.geometry.getAttribute('position').array;

      const origShieldGeom = shield.geometry;
      const origShieldMat = shield.material;

      // Collect initial scene graph object IDs
      const initialObjectIds = new Set<number>();
      system.group.traverse((obj) => initialObjectIds.add(obj.id));

      // Run 1,000 frames of animation loop
      for (let i = 0; i < 1000; i++) {
        system.update(0.016, { batteryFailure: true, o2Leak: true, solarStorm: true });
      }

      // Verify that NO geometries, typed arrays, materials, or objects were reallocated
      assert.strictEqual(sparks.geometry, origSparkGeom, 'Spark geometry reference must remain identical');
      assert.strictEqual(sparks.geometry.getAttribute('position'), origSparkPosAttr, 'Spark position attribute must remain identical');
      assert.strictEqual(sparks.geometry.getAttribute('position').array, origSparkPosArr, 'Spark Float32Array must remain identical');
      assert.strictEqual(sparks.geometry.getAttribute('color').array, origSparkColorArr, 'Spark color Float32Array must remain identical');
      assert.strictEqual(sparks.material, origSparkMat, 'Spark material reference must remain identical');

      assert.strictEqual(smoke.geometry, origSmokeGeom, 'Smoke geometry reference must remain identical');
      assert.strictEqual(smoke.geometry.getAttribute('position').array, origSmokePosArr, 'Smoke Float32Array must remain identical');
      assert.strictEqual(smoke.material, origSmokeMat, 'Smoke material reference must remain identical');

      assert.strictEqual(vapor.geometry, origVaporGeom, 'Vapor geometry reference must remain identical');
      assert.strictEqual(vapor.geometry.getAttribute('position').array, origVaporPosArr, 'Vapor Float32Array must remain identical');
      assert.strictEqual(vapor.material, origVaporMat, 'Vapor material reference must remain identical');

      assert.strictEqual(fissure.geometry, origFissureGeom, 'Fissure geometry reference must remain identical');
      assert.strictEqual(fissure.geometry.getAttribute('position').array, origFissurePosArr, 'Fissure Float32Array must remain identical');

      assert.strictEqual(shield.geometry, origShieldGeom, 'Shield geometry reference must remain identical');
      assert.strictEqual(shield.material, origShieldMat, 'Shield material reference must remain identical');

      // Verify scene graph size has strictly zero additions or removals
      const finalObjectIds = new Set<number>();
      system.group.traverse((obj) => finalObjectIds.add(obj.id));
      assert.strictEqual(finalObjectIds.size, initialObjectIds.size, 'Scene graph object count must remain strictly constant');
      for (const id of initialObjectIds) {
        assert.ok(finalObjectIds.has(id), `Object ID ${id} must persist across updates`);
      }

      system.dispose();
    });

    it('ZERO-2: update(dt) implementation contains strictly zero new object instantiations in source code', () => {
      const system = createDamageParticleSystems();
      const updateFnStr = system.update.toString();

      // Verify that no 'new ' instantiations occur inside update()
      assert.strictEqual(
        updateFnStr.includes('new '),
        false,
        'update(dt) function source must not contain any "new " expressions'
      );

      // Verify no dynamic Array creations
      assert.strictEqual(
        updateFnStr.includes('new Array') || updateFnStr.includes('Array.from'),
        false,
        'update(dt) must not create dynamic Array instances'
      );

      // Verify no dynamic Object.assign or Object.create
      assert.strictEqual(
        updateFnStr.includes('Object.assign') || updateFnStr.includes('Object.create'),
        false,
        'update(dt) must not invoke Object.assign or Object.create'
      );

      system.dispose();
    });

    it('ZERO-3: 500 continuous simulation ticks exhibit stable memory usage without runaway growth', () => {
      const system = createDamageParticleSystems();
      system.setAlertState!({ batteryFailure: true, o2Leak: true, solarStorm: true });

      // Warm up JIT compiler
      for (let i = 0; i < 200; i++) {
        system.update(0.016);
      }
      if (global.gc) {
        global.gc();
      }

      const memStart = process.memoryUsage().heapUsed;

      // Run 500 frames
      for (let i = 0; i < 500; i++) {
        system.update(0.016);
      }
      if (global.gc) {
        global.gc();
      }

      const memEnd = process.memoryUsage().heapUsed;
      const memDeltaKb = (memEnd - memStart) / 1024;

      // When global.gc() is exposed, delta is <= 10 KB (-3.5 KB observed).
      // Without explicit GC, V8 young generation nursery uncollected buffer allows up to 1,500 KB.
      const maxAllowedKb = global.gc ? 50 : 1500;
      assert.ok(
        memDeltaKb < maxAllowedKb,
        `Heap delta over 500 ticks should be < ${maxAllowedKb} KB, observed ${memDeltaKb.toFixed(1)} KB`
      );

      system.dispose();
    });
  });

  // =========================================================================
  // Challenge 3: Rapid Toggle Stress (500 On/Off Flips & Opacity Clamping)
  // =========================================================================
  describe('Challenge 3: Rapid Toggle Stress (500 on/off flips)', () => {
    it('TOGGLE-1: Flipping alerts on and off 500 times preserves strict [0, 1] opacity bounds without underflow or overflow', () => {
      const system = createDamageParticleSystems();

      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      const smoke = system.group.getObjectByName('battery_smoke') as THREE.Points;
      const fissure = system.group.getObjectByName('o2_fissure_crack') as THREE.Line;
      const vapor = system.group.getObjectByName('o2_vapor_jet') as THREE.Points;
      const shield = system.group.getObjectByName('crisis_magnetic_shield_sphere') as THREE.Mesh;

      const sparkMat = sparks.material as THREE.PointsMaterial;
      const smokeMat = smoke.material as THREE.PointsMaterial;
      const fissureMat = fissure.material as THREE.LineBasicMaterial;
      const vaporMat = vapor.material as THREE.PointsMaterial;
      const shieldMat = shield.material as THREE.MeshBasicMaterial;

      for (let flip = 0; flip < 500; flip++) {
        const state = flip % 2 === 1;

        // Perform 1 to 3 ticks per flip
        const ticksInStep = 1 + (flip % 3);
        for (let t = 0; t < ticksInStep; t++) {
          system.update(0.016, {
            batteryFailure: state,
            o2Leak: !state,
            solarStorm: state,
          });
        }

        // Verify all opacities are strictly bounded in [0, 1]
        assert.ok(
          sparkMat.opacity >= 0 && sparkMat.opacity <= 1.0,
          `Spark opacity out of bounds: ${sparkMat.opacity} at flip ${flip}`
        );
        assert.ok(
          smokeMat.opacity >= 0 && smokeMat.opacity <= 1.0,
          `Smoke opacity out of bounds: ${smokeMat.opacity} at flip ${flip}`
        );
        assert.ok(
          fissureMat.opacity >= 0 && fissureMat.opacity <= 1.0,
          `Fissure opacity out of bounds: ${fissureMat.opacity} at flip ${flip}`
        );
        assert.ok(
          vaporMat.opacity >= 0 && vaporMat.opacity <= 1.0,
          `Vapor opacity out of bounds: ${vaporMat.opacity} at flip ${flip}`
        );
        assert.ok(
          shieldMat.opacity >= 0 && shieldMat.opacity <= 1.0,
          `Shield opacity out of bounds: ${shieldMat.opacity} at flip ${flip}`
        );

        // Verify visibility consistency with opacity
        assert.strictEqual(
          sparks.visible,
          sparkMat.opacity > 0.01,
          `Spark visibility mismatch with opacity ${sparkMat.opacity}`
        );
        assert.strictEqual(
          smoke.visible,
          smokeMat.opacity > 0.01,
          `Smoke visibility mismatch with opacity ${smokeMat.opacity}`
        );
        assert.strictEqual(
          vapor.visible,
          vaporMat.opacity > 0.01,
          `Vapor visibility mismatch with opacity ${vaporMat.opacity}`
        );
      }

      // Now deactivate all and run 80 ticks to confirm clean zero clamp
      for (let i = 0; i < 80; i++) {
        system.update(0.016, { batteryFailure: false, o2Leak: false, solarStorm: false });
      }

      assert.strictEqual(sparkMat.opacity, 0, 'Spark opacity must clamp strictly to 0 when inactive');
      assert.strictEqual(sparks.visible, false, 'Sparks must be hidden when inactive');
      assert.strictEqual(smokeMat.opacity, 0, 'Smoke opacity must clamp strictly to 0 when inactive');
      assert.strictEqual(smoke.visible, false, 'Smoke must be hidden when inactive');
      assert.strictEqual(vaporMat.opacity, 0, 'Vapor opacity must clamp strictly to 0 when inactive');
      assert.strictEqual(vapor.visible, false, 'Vapor must be hidden when inactive');
      assert.strictEqual(shield.visible, false, 'Shield must be hidden when inactive');

      system.dispose();
    });
  });

  // =========================================================================
  // Challenge 4: Edge Case Mining (dt Extremes & Pathological Inputs)
  // =========================================================================
  describe('Challenge 4: Edge Case Mining (dt Extremes & Malformed Calls)', () => {
    it('EDGE-1: Handles dt = 0 gracefully without NaN or division by zero', () => {
      const system = createDamageParticleSystems();
      assert.doesNotThrow(() => {
        system.update(0, { batteryFailure: true, o2Leak: true, solarStorm: true });
      });

      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      const posAttr = sparks.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < 10; i++) {
        assert.ok(!Number.isNaN(arr[i]), `Array[${i}] must not be NaN on dt=0`);
      }

      system.dispose();
    });

    it('EDGE-2: Handles microscopic dt = 1e-9 safely', () => {
      const system = createDamageParticleSystems();
      for (let i = 0; i < 100; i++) {
        system.update(1e-9, { batteryFailure: true });
      }

      const sparks = system.group.getObjectByName('battery_sparks') as THREE.Points;
      const sparkMat = sparks.material as THREE.PointsMaterial;
      assert.ok(sparkMat.opacity >= 0 && sparkMat.opacity <= 1.0);

      system.dispose();
    });

    it('EDGE-3: Handles extreme clock jumps (dt = 3600s) through dt clamping', () => {
      const system = createDamageParticleSystems();
      // Hour jump simulation
      system.update(3600.0, { batteryFailure: true, o2Leak: true, solarStorm: true });

      const vapor = system.group.getObjectByName('o2_vapor_jet') as THREE.Points;
      const posAttr = vapor.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i++) {
        assert.ok(Number.isFinite(arr[i]), `Position[${i}] must remain finite after hour jump`);
      }

      system.dispose();
    });

    it('EDGE-4: Handles undefined alerts and partial alerts without error', () => {
      const system = createDamageParticleSystems();

      assert.doesNotThrow(() => {
        system.update(0.016); // undefined alerts
        system.update(0.016, {}); // empty alerts
        system.update(0.016, { batteryFailure: true }); // partial alerts
        system.update(0.016, { o2Leak: true });
        system.update(0.016, { solarStorm: true });
      });

      system.dispose();
    });

    it('EDGE-5: Successive creation and disposal of 50 instances does not throw or leak scene objects', () => {
      for (let i = 0; i < 50; i++) {
        const sys = createDamageParticleSystems();
        sys.update(0.016, { batteryFailure: true });
        sys.dispose();
        assert.strictEqual(sys.group.children.length, 0);
      }
    });
  });

  // =========================================================================
  // Challenge 5: Raycast Collision Gating & Concurrency Stress
  // =========================================================================
  describe('Challenge 5: Raycasting Gating & Concurrency Stress', () => {
    it('RAY-STRESS-1: Raycast hit detection strictly gates against inactive crisis state during rapid switching', () => {
      const system = createDamageParticleSystems();
      const meshes = system.getDamagedModuleMeshes();

      const raycaster = new THREE.Raycaster();
      // Target battery hitbox at (-8.5, 2.5, -5.5)
      raycaster.set(new THREE.Vector3(-8.5, 2.5, 10), new THREE.Vector3(0, 0, -1).normalize());

      for (let i = 0; i < 200; i++) {
        const isBatteryActive = i % 2 === 1;
        system.update(0.016, { batteryFailure: isBatteryActive });

        const hits = raycaster.intersectObjects(meshes, true);
        if (isBatteryActive) {
          assert.ok(hits.length > 0, `Raycaster should hit battery hitbox at step ${i}`);
          assert.strictEqual(hits[0].object.userData.crisisType, 'battery');
        } else {
          assert.strictEqual(hits.length, 0, `Raycaster must NOT hit battery hitbox when inactive at step ${i}`);
        }
      }

      system.dispose();
    });

    it('RAY-STRESS-2: Shield sphere raycast only intercepts when solarStorm is true', () => {
      const system = createDamageParticleSystems();
      const meshes = system.getDamagedModuleMeshes();

      const raycaster = new THREE.Raycaster();
      raycaster.set(new THREE.Vector3(0, 5, 25), new THREE.Vector3(0, 0, -1).normalize());

      for (let i = 0; i < 100; i++) {
        const isStormActive = i % 2 === 0;
        system.update(0.016, { solarStorm: isStormActive });

        const hits = raycaster.intersectObjects(meshes, true);
        if (isStormActive) {
          assert.ok(hits.length > 0, `Shield sphere must be hittable when solar storm is active at step ${i}`);
          assert.strictEqual(hits[0].object.userData.crisisType, 'solar_storm');
        } else {
          assert.strictEqual(hits.length, 0, `Shield sphere must NOT intercept rays when inactive at step ${i}`);
        }
      }

      system.dispose();
    });
  });
});
