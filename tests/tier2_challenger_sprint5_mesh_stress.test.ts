import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  BUILDING_CATALOG,
  BaseBuildingManager,
  buildRoverHangarMesh,
  build2ndGreenhouseMesh,
  buildDSOCTowerMesh,
  buildExpansionBuildingMesh,
  updateExpansionBuildings,
  disposeExpansionBuildings,
  EXPANSION_COLLIDER_RADII,
  EXPANSION_COLLIDER_DEFS,
  ExpansionCollider,
} from '../src/components/3d/baseBuildingBuilder';
import {
  setExpansionColliders,
  getExpansionColliders,
  clearExpansionColliders,
  resolveCollisions,
  updateEvaMovement,
  MODULE_COLLIDERS,
  DEFAULT_EXPANSION_COLLIDER_MAP,
  MAX_EXPLORATION_RADIUS,
  PLAYER_COLLISION_RADIUS,
  EVA_WALK_SPEED,
  EVA_SPRINT_SPEED,
  EvaControllerState,
  DomeCollider,
} from '../src/components/3d/evaControls';
import { getTerrainHeight } from '../src/components/3d/base3DBuilder';
import { BaseBuildingId } from '../src/types/game';

describe('Tier 2 Challenger: Sprint 5 - 3D Base Expansion Mesh Lifecycle, Collisions & Adversarial Stress', () => {

  beforeEach(() => {
    clearExpansionColliders();
  });

  afterEach(() => {
    clearExpansionColliders();
  });

  // ==========================================================================
  // CHALLENGE SECTION 1: Three.js Expansion Mesh Lifecycle & Memory Cleanliness
  // ==========================================================================
  describe('Adversarial Challenge 1: Mesh Lifecycle, Recursive Disposal & Memory Cleanliness', () => {

    it('LIFECYCLE-1: Rapid sequential instantiation and disposal (250 iterations) disposes all geometries and materials with heap stability', () => {
      const ITERATIONS = 250;
      const buildingIds: BaseBuildingId[] = ['rover_hangar', 'greenhouse_2', 'dsoc_tower'];

      const uniqueGeometries = new Set<THREE.BufferGeometry>();
      const uniqueMaterials = new Set<THREE.Material>();
      const disposedGeometries = new Set<THREE.BufferGeometry>();
      const disposedMaterials = new Set<THREE.Material>();

      // Force garbage collection if exposed (e.g. node --expose-gc), otherwise snapshot
      if (typeof global.gc === 'function') {
        global.gc();
      }
      const initialHeap = process.memoryUsage().heapUsed;

      for (let i = 0; i < ITERATIONS; i++) {
        const parent = new THREE.Group();
        parent.name = `expansion_root_iter_${i}`;

        for (const bId of buildingIds) {
          const mesh = buildExpansionBuildingMesh(bId);
          parent.add(mesh);

          // Track geometries and materials on creation
          mesh.traverse(child => {
            const childAny = child as unknown as {
              geometry?: THREE.BufferGeometry;
              material?: THREE.Material | THREE.Material[];
            };

            if (childAny.geometry) {
              const geom = childAny.geometry;
              uniqueGeometries.add(geom);
              geom.addEventListener('dispose', () => {
                disposedGeometries.add(geom);
              });
            }

            if (childAny.material) {
              const mats = Array.isArray(childAny.material) ? childAny.material : [childAny.material];
              for (const m of mats) {
                uniqueMaterials.add(m);
                m.addEventListener('dispose', () => {
                  disposedMaterials.add(m);
                });
              }
            }
          });
        }

        assert.strictEqual(parent.children.length, 3, `Iteration ${i}: Root group must contain 3 buildings`);

        // Execute strict recursive disposal
        disposeExpansionBuildings(parent);

        // Assert parent has zero remaining children
        assert.strictEqual(
          parent.children.length,
          0,
          `Iteration ${i}: All children must be removed from parent group after disposal`
        );
      }

      // Assert that every created geometry and material was disposed
      assert.ok(uniqueGeometries.size > 0, 'Must have created geometries during stress test');
      assert.strictEqual(
        disposedGeometries.size,
        uniqueGeometries.size,
        `All unique geometries must be disposed (created: ${uniqueGeometries.size}, disposed: ${disposedGeometries.size})`
      );

      assert.ok(uniqueMaterials.size > 0, 'Must have created materials during stress test');
      assert.strictEqual(
        disposedMaterials.size,
        uniqueMaterials.size,
        `All unique materials must be disposed (created: ${uniqueMaterials.size}, disposed: ${disposedMaterials.size})`
      );

      // Verify no orphaned PointLights or Object3Ds survive
      if (typeof global.gc === 'function') {
        global.gc();
      }
      const finalHeap = process.memoryUsage().heapUsed;
      const heapGrowthMB = (finalHeap - initialHeap) / (1024 * 1024);

      // Bounded heap growth check (< 80 MB across 250 cycles of 3 buildings = 750 mesh trees)
      assert.ok(
        heapGrowthMB < 80,
        `Heap growth must remain bounded across 250 iterations (growth was ${heapGrowthMB.toFixed(2)} MB)`
      );
    });

    it('LIFECYCLE-2: High-density batch instantiation (60 buildings simultaneously) cleanly disposes without residue', () => {
      const parent = new THREE.Group();
      parent.name = 'stress_density_group';

      const buildingIds: BaseBuildingId[] = ['rover_hangar', 'greenhouse_2', 'dsoc_tower'];
      const TOTAL_BUILDINGS = 60;
      let pointLightCount = 0;

      for (let i = 0; i < TOTAL_BUILDINGS; i++) {
        const id = buildingIds[i % buildingIds.length];
        const mesh = buildExpansionBuildingMesh(id);
        mesh.position.set((i % 10) * 4 - 20, 0, Math.floor(i / 10) * 4 - 12);
        parent.add(mesh);

        mesh.traverse(c => {
          if (c instanceof THREE.PointLight) pointLightCount++;
        });
      }

      assert.strictEqual(parent.children.length, TOTAL_BUILDINGS);
      assert.strictEqual(pointLightCount, 20, '20 Greenhouse buildings must instantiate exactly 20 PointLights');

      // Dispose all at once
      disposeExpansionBuildings(parent);

      assert.strictEqual(parent.children.length, 0);

      // Verify all child references inside detached meshes were also stripped
      let remainingChildrenInSubtrees = 0;
      parent.traverse(c => {
        if (c !== parent) remainingChildrenInSubtrees++;
      });
      assert.strictEqual(remainingChildrenInSubtrees, 0, 'No surviving nodes in parent graph');
    });

    it('LIFECYCLE-3: Defensive disposal handles empty groups, foreign nodes, and repeated calls safely', () => {
      const emptyGroup = new THREE.Group();
      assert.doesNotThrow(() => {
        disposeExpansionBuildings(emptyGroup);
      }, 'Disposing an empty group must not throw');

      // Group containing alien / unexpected nodes (e.g. Line, Points, DirectionalLight)
      const mixedGroup = new THREE.Group();
      mixedGroup.add(new THREE.DirectionalLight());
      mixedGroup.add(new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial()));
      mixedGroup.add(new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial()));

      assert.doesNotThrow(() => {
        disposeExpansionBuildings(mixedGroup);
      }, 'Disposing group with non-mesh nodes must not throw');

      assert.strictEqual(mixedGroup.children.length, 0);

      // Repeated disposal (double-free resilience)
      assert.doesNotThrow(() => {
        disposeExpansionBuildings(mixedGroup);
      }, 'Second call to disposeExpansionBuildings must be idempotent and not throw');
    });

  });

  // ==========================================================================
  // CHALLENGE SECTION 2: Animation Update Loop Adversarial Stress
  // ==========================================================================
  describe('Adversarial Challenge 2: Animation Loop (updateExpansionBuildings) dt & Time Invariants', () => {

    it('ANIM-1: Handles zero, negative, extreme, and rapid dt/timeSeconds without throwing or creating NaNs', () => {
      const group = new THREE.Group();
      const hangar = buildRoverHangarMesh();
      const greenhouse = build2ndGreenhouseMesh();
      const dsoc = buildDSOCTowerMesh();
      group.add(hangar);
      group.add(greenhouse);
      group.add(dsoc);

      const adversarialInputs: [number, number][] = [
        [0, 0],
        [-0.016, -100],
        [-1000, -50000],
        [1e-9, 1e-9],
        [1e6, 1e6],
        [Number.MIN_VALUE, 100],
        [Number.MAX_VALUE, 100],
        [-Number.MAX_VALUE, -100],
        [0.016, 0.0],
        [0.016, Math.PI * 1000],
        [0.016, 1e8],
      ];

      for (const [dt, timeSec] of adversarialInputs) {
        assert.doesNotThrow(() => {
          updateExpansionBuildings(group, dt, timeSec);
        }, `updateExpansionBuildings threw with dt=${dt}, timeSec=${timeSec}`);

        // Traverse all meshes and verify no NaN in positions, rotations, or scales
        group.traverse(child => {
          if (child instanceof THREE.Mesh) {
            assert.strictEqual(Number.isFinite(child.position.x), true, `Child ${child.name} pos.x must be finite`);
            assert.strictEqual(Number.isFinite(child.position.y), true, `Child ${child.name} pos.y must be finite`);
            assert.strictEqual(Number.isFinite(child.position.z), true, `Child ${child.name} pos.z must be finite`);

            assert.strictEqual(Number.isFinite(child.rotation.x), true, `Child ${child.name} rot.x must be finite`);
            assert.strictEqual(Number.isFinite(child.rotation.y), true, `Child ${child.name} rot.y must be finite`);
            assert.strictEqual(Number.isFinite(child.rotation.z), true, `Child ${child.name} rot.z must be finite`);

            assert.strictEqual(Number.isFinite(child.scale.x), true, `Child ${child.name} scale.x must be finite`);
            assert.strictEqual(Number.isFinite(child.scale.y), true, `Child ${child.name} scale.y must be finite`);
            assert.strictEqual(Number.isFinite(child.scale.z), true, `Child ${child.name} scale.z must be finite`);
          }
        });

        // Inspect animated materials
        const bulb = group.getObjectByName('hangar_beacon_bulb') as THREE.Mesh;
        assert.ok(bulb, 'Beacon bulb must exist');
        const bulbMat = bulb.material as THREE.MeshBasicMaterial;
        const hex = bulbMat.color.getHex();
        assert.ok(hex === 0xf59e0b || hex === 0x78350f, 'Beacon color must be either high or low amber hex');

        const ring1 = group.getObjectByName('greenhouse_glow_ring1') as THREE.Mesh;
        const ring1Mat = ring1.material as THREE.MeshStandardMaterial;
        assert.ok(
          Number.isFinite(ring1Mat.emissiveIntensity),
          `Ring 1 emissiveIntensity must be finite, got ${ring1Mat.emissiveIntensity}`
        );
        assert.ok(
          ring1Mat.emissiveIntensity >= 0.1 && ring1Mat.emissiveIntensity <= 1.0,
          `Ring 1 emissiveIntensity out of expected range: ${ring1Mat.emissiveIntensity}`
        );

        const beam = group.getObjectByName('dsoc_laser_beam') as THREE.Mesh;
        const beamMat = beam.material as THREE.MeshBasicMaterial;
        assert.ok(
          Number.isFinite(beamMat.opacity),
          `Laser beam opacity must be finite, got ${beamMat.opacity}`
        );
        assert.ok(
          beamMat.opacity >= 0.05 && beamMat.opacity <= 0.95,
          `Laser beam opacity out of expected bounds: ${beamMat.opacity}`
        );
      }

      disposeExpansionBuildings(group);
    });

    it('ANIM-2: Simulates 2,000 rapid consecutive animation frames without performance degradation or leak', () => {
      const group = new THREE.Group();
      group.add(buildRoverHangarMesh());
      group.add(build2ndGreenhouseMesh());
      group.add(buildDSOCTowerMesh());

      const t0 = performance.now();
      let simTime = 0;
      const FRAMES = 2000;
      const dt = 1 / 60;

      for (let f = 0; f < FRAMES; f++) {
        simTime += dt;
        updateExpansionBuildings(group, dt, simTime);
      }

      const elapsedMs = performance.now() - t0;
      // 2,000 updates should take well under 250ms on modern hardware
      assert.ok(
        elapsedMs < 500,
        `2000 animation frames took ${elapsedMs.toFixed(2)}ms, exceeding 500ms budget`
      );

      disposeExpansionBuildings(group);
    });

    it('ANIM-3: updateExpansionBuildings executes gracefully on empty groups or partial building sets', () => {
      const emptyGroup = new THREE.Group();
      assert.doesNotThrow(() => {
        updateExpansionBuildings(emptyGroup, 0.016, 1.0);
      });

      // Partial: only rover hangar
      const hangarOnly = new THREE.Group();
      hangarOnly.add(buildRoverHangarMesh());
      assert.doesNotThrow(() => {
        updateExpansionBuildings(hangarOnly, 0.016, 2.5);
      });
      disposeExpansionBuildings(hangarOnly);

      // Partial: only greenhouse
      const ghOnly = new THREE.Group();
      ghOnly.add(build2ndGreenhouseMesh());
      assert.doesNotThrow(() => {
        updateExpansionBuildings(ghOnly, 0.016, 3.5);
      });
      disposeExpansionBuildings(ghOnly);

      // Partial: only dsoc tower
      const dsocOnly = new THREE.Group();
      dsocOnly.add(buildDSOCTowerMesh());
      assert.doesNotThrow(() => {
        updateExpansionBuildings(dsocOnly, 0.016, 4.5);
      });
      disposeExpansionBuildings(dsocOnly);
    });

  });

  // ==========================================================================
  // CHALLENGE SECTION 3: Terrain Height Alignment & Bounding Box Invariants
  // ==========================================================================
  describe('Adversarial Challenge 3: Terrain Elevation Alignment & Non-Zero Bounding Boxes', () => {

    it('TERRAIN-1: Default building coordinates align with plateau heightmap on Moon and Mars', () => {
      const locations = ['moon', 'mars'] as const;
      const buildings: BaseBuildingId[] = ['rover_hangar', 'greenhouse_2', 'dsoc_tower'];

      for (const loc of locations) {
        for (const bId of buildings) {
          const def = BUILDING_CATALOG[bId];
          const [x, , z] = def.defaultPosition;

          const height = getTerrainHeight(x, z, loc);
          assert.strictEqual(
            Number.isFinite(height),
            true,
            `Terrain height for ${bId} at (${x}, ${z}) on ${loc} must be finite`
          );

          const distFromCenter = Math.hypot(x, z);
          assert.ok(distFromCenter <= 25.0, `Building ${bId} must be within 25m base plateau radius`);

          // Height is computed by terrain elevation functions (crater slope / terraces)
          assert.strictEqual(
            isNaN(height),
            false,
            `Building ${bId} on ${loc} must have non-NaN height`
          );
        }
      }
    });

    it('TERRAIN-2: All 3 expansion building meshes produce non-zero, realistic 3D bounding boxes', () => {
      const buildingTests: { id: BaseBuildingId; minW: number; minH: number; minD: number }[] = [
        { id: 'rover_hangar', minW: 6.0, minH: 4.0, minD: 7.0 },
        { id: 'greenhouse_2', minW: 8.0, minH: 4.5, minD: 8.0 },
        { id: 'dsoc_tower', minW: 3.0, minH: 12.0, minD: 3.0 },
      ];

      for (const { id, minW, minH, minD } of buildingTests) {
        const mesh = buildExpansionBuildingMesh(id);
        const def = BUILDING_CATALOG[id];
        const [x, , z] = def.defaultPosition;
        const terrainY = getTerrainHeight(x, z, 'moon');
        mesh.position.set(x, terrainY, z);
        mesh.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(mesh);
        assert.strictEqual(box.isEmpty(), false, `${id} bounding box must not be empty`);

        const size = box.getSize(new THREE.Vector3());
        assert.ok(
          size.x >= minW,
          `${id} width (${size.x.toFixed(2)}) must be >= ${minW}`
        );
        assert.ok(
          size.y >= minH,
          `${id} height (${size.y.toFixed(2)}) must be >= ${minH}`
        );
        assert.ok(
          size.z >= minD,
          `${id} depth (${size.z.toFixed(2)}) must be >= ${minD}`
        );

        // Grounding assertion: bottom of building must sit near terrain height level
        // (tolerance of 0.5m accounts for vehicular ramp embed into regolith)
        assert.ok(
          box.min.y >= terrainY - 0.5,
          `${id} bottom (${box.min.y.toFixed(2)}) must not sink deeply below terrain (${terrainY.toFixed(2)})`
        );

        disposeExpansionBuildings(mesh);
      }
    });

  });

  // ==========================================================================
  // CHALLENGE SECTION 4: EVA Collision Math Under Edge Cases
  // ==========================================================================
  describe('Adversarial Challenge 4: EVA Collision Math & Boundary Physics', () => {

    it('COLLIDE-1: Registry APIs (setExpansionColliders, getExpansionColliders, clearExpansionColliders) maintain contract', () => {
      clearExpansionColliders();
      assert.deepStrictEqual(getExpansionColliders(), []);

      // Register by string building IDs
      setExpansionColliders(['rover_hangar', 'greenhouse_2', 'dsoc_tower']);
      const colliders = getExpansionColliders();
      assert.strictEqual(colliders.length, 3);

      const hangar = colliders.find(c => c.id === 'exp_rover_hangar');
      assert.ok(hangar);
      assert.strictEqual(hangar.x, 0);
      assert.strictEqual(hangar.z, -15);
      assert.strictEqual(hangar.radius, 4.5);

      const gh = colliders.find(c => c.id === 'exp_greenhouse_2');
      assert.ok(gh);
      assert.strictEqual(gh.x, 18);
      assert.strictEqual(gh.z, 8);
      assert.strictEqual(gh.radius, 4.0);

      const dsoc = colliders.find(c => c.id === 'exp_dsoc_tower');
      assert.ok(dsoc);
      assert.strictEqual(dsoc.x, -8);
      assert.strictEqual(dsoc.z, 18);
      assert.strictEqual(dsoc.radius, 3.0);

      // Register custom DomeCollider objects directly
      const customCollider: DomeCollider = {
        id: 'exp_custom',
        name: 'Custom Structure',
        x: 10,
        z: 10,
        radius: 5.0,
      };
      setExpansionColliders([customCollider]);
      assert.strictEqual(getExpansionColliders().length, 1);
      assert.deepStrictEqual(getExpansionColliders()[0], customCollider);

      // Clear registry
      clearExpansionColliders();
      assert.strictEqual(getExpansionColliders().length, 0);
    });

    it('COLLIDE-2: Walking directly into building centers from all radial angles pushes player back outside perimeter', () => {
      setExpansionColliders(['rover_hangar', 'greenhouse_2', 'dsoc_tower']);
      const colliders = getExpansionColliders();
      const playerRadius = PLAYER_COLLISION_RADIUS; // 0.45m

      for (const col of colliders) {
        const minDistExpected = col.radius + playerRadius;

        // 1. Direct dead center test
        const centerRes = resolveCollisions(col.x, col.z, playerRadius);
        assert.strictEqual(centerRes.collided, true, `Dead center at ${col.name} must collide`);
        assert.strictEqual(Number.isFinite(centerRes.x), true, 'Resolved x must be finite');
        assert.strictEqual(Number.isFinite(centerRes.z), true, 'Resolved z must be finite');

        const centerDist = Math.hypot(centerRes.x - col.x, centerRes.z - col.z);
        assert.ok(
          centerDist >= minDistExpected - 1e-4,
          `Dead center pushback distance (${centerDist.toFixed(3)}) must be >= minDist (${minDistExpected.toFixed(3)})`
        );

        // 2. 16 Radial angles at varying penetration depths
        const angles = 16;
        const penetrationFactors = [0.01, 0.25, 0.5, 0.75, 0.99];

        for (let a = 0; a < angles; a++) {
          const theta = (a / angles) * Math.PI * 2;

          for (const factor of penetrationFactors) {
            const penetDist = col.radius * factor;
            const testX = col.x + Math.cos(theta) * penetDist;
            const testZ = col.z + Math.sin(theta) * penetDist;

            const res = resolveCollisions(testX, testZ, playerRadius);
            assert.strictEqual(
              res.collided,
              true,
              `Point at angle ${theta.toFixed(2)} penet ${penetDist.toFixed(2)} must collide with ${col.name}`
            );

            const resolvedDist = Math.hypot(res.x - col.x, res.z - col.z);
            assert.ok(
              resolvedDist >= minDistExpected - 1e-4,
              `Resolved distance (${resolvedDist.toFixed(3)}) must be >= expected (${minDistExpected.toFixed(3)})`
            );

            assert.strictEqual(Number.isFinite(res.x), true);
            assert.strictEqual(Number.isFinite(res.z), true);
          }
        }
      }
    });

    it('COLLIDE-3: High-velocity movements and lag spikes do not penetrate structures or create NaNs', () => {
      setExpansionColliders(['rover_hangar', 'greenhouse_2', 'dsoc_tower']);
      const colliders = getExpansionColliders();

      for (const col of colliders) {
        // Position astronaut 10m away pointing directly at the building
        const startX = col.x;
        const startZ = col.z + 10.0;

        // Facing North (yaw = 0): forward is (0, 0, -1), towards col.z
        const state: EvaControllerState = {
          x: startX,
          y: 1.7,
          z: startZ,
          yaw: 0,
          pitch: 0,
          isMoving: false,
          isSprinting: false,
          walkBobPhase: 0,
        };

        const keys = { KeyW: true, ShiftLeft: true }; // Sprinting forward into building

        // Test with normal dt and extreme lag spike dt values
        const deltaTimes = [0.016, 0.05, 0.1, 0.5, 1.0, 10.0, 100.0];

        for (const dt of deltaTimes) {
          // Reset position to just outside boundary
          state.x = col.x;
          state.z = col.z + (col.radius + PLAYER_COLLISION_RADIUS + 0.1);

          // Step movement forward
          updateEvaMovement(dt, state, keys, 'moon');

          assert.strictEqual(Number.isFinite(state.x), true, `state.x must be finite with dt=${dt}`);
          assert.strictEqual(Number.isFinite(state.y), true, `state.y must be finite with dt=${dt}`);
          assert.strictEqual(Number.isFinite(state.z), true, `state.z must be finite with dt=${dt}`);

          const dist = Math.hypot(state.x - col.x, state.z - col.z);
          const minDist = col.radius + PLAYER_COLLISION_RADIUS;

          assert.ok(
            dist >= minDist - 1e-4,
            `Lag spike dt=${dt} caused penetration into ${col.name}! dist=${dist.toFixed(4)}, min=${minDist}`
          );
        }

        // Stress run: 300 continuous frames sprinting directly into building
        state.x = col.x;
        state.z = col.z + 6.0;

        for (let frame = 0; frame < 300; frame++) {
          updateEvaMovement(0.016, state, keys, 'moon');

          const dist = Math.hypot(state.x - col.x, state.z - col.z);
          const minDist = col.radius + PLAYER_COLLISION_RADIUS;
          assert.ok(
            dist >= minDist - 1e-4,
            `Continuous run frame ${frame} breached perimeter: dist=${dist.toFixed(4)}, min=${minDist}`
          );
        }
      }
    });

    it('COLLIDE-4: Extreme teleportation beyond maximum exploration boundary is clamped safely', () => {
      const farCoords: [number, number][] = [
        [100, 100],
        [-100, -100],
        [0, 500],
        [10000, 0],
      ];

      for (const [x, z] of farCoords) {
        const res = resolveCollisions(x, z, PLAYER_COLLISION_RADIUS);
        assert.strictEqual(res.collided, true, `Far coordinate (${x}, ${z}) must be clamped`);

        const dist = Math.hypot(res.x, res.z);
        assert.ok(
          dist <= MAX_EXPLORATION_RADIUS + 1e-4,
          `Resolved dist (${dist.toFixed(2)}) must be <= MAX_EXPLORATION_RADIUS (${MAX_EXPLORATION_RADIUS})`
        );
        assert.strictEqual(Number.isFinite(res.x), true);
        assert.strictEqual(Number.isFinite(res.z), true);
      }
    });

    it('COLLIDE-5: Tangential sliding along collider perimeters and dynamic unregistration clearance', () => {
      setExpansionColliders(['rover_hangar']);
      const colliders = getExpansionColliders();
      const hangar = colliders[0];
      const playerRadius = PLAYER_COLLISION_RADIUS;
      const contactDist = hangar.radius + playerRadius;

      // Slide astronaut horizontally past the north tangent of the hangar
      for (let offset = -5; offset <= 5; offset += 0.5) {
        const testX = hangar.x + offset;
        const testZ = hangar.z - (contactDist - 0.05); // Near the tangent line

        const distBefore = Math.hypot(testX - hangar.x, testZ - hangar.z);
        const res = resolveCollisions(testX, testZ, playerRadius);

        if (distBefore < contactDist) {
          assert.strictEqual(res.collided, true, `Must report collision when within contactDist (${distBefore.toFixed(2)} < ${contactDist})`);
        }

        const resolvedDist = Math.hypot(res.x - hangar.x, res.z - hangar.z);
        assert.ok(
          resolvedDist >= contactDist - 1e-4,
          `Sliding at offset ${offset} failed to maintain radius: ${resolvedDist}`
        );
      }

      // Dynamic unregistration test with rover_hangar at (0, -15) (now completely free of base modules)
      setExpansionColliders(['rover_hangar']);
      const rhResBefore = resolveCollisions(0, -15, playerRadius);
      assert.strictEqual(rhResBefore.collided, true, 'Active rover_hangar must block position (0, -15)');

      clearExpansionColliders();
      const clearedRes = resolveCollisions(0, -15, playerRadius);
      assert.strictEqual(clearedRes.collided, false, 'Cleared collider should allow astronaut at (0, -15)');
      assert.strictEqual(clearedRes.x, 0);
      assert.strictEqual(clearedRes.z, -15);
    });

  });

  // ==========================================================================
  // CHALLENGE SECTION 5: BaseBuildingManager Boundary & Concurrency Stress
  // ==========================================================================
  describe('Adversarial Challenge 5: Base Building Manager Boundary & State Consistency', () => {

    it('ECON-1: Construction boundary conditions on science points and coordinates', () => {
      const manager = new BaseBuildingManager();
      const mockSim = { colony: { resources: { sciencePoints: 60 } } };

      // Exact science points matches cost
      const resExact = manager.constructBuilding('rover_hangar', mockSim);
      assert.strictEqual(resExact.success, true);
      assert.strictEqual(mockSim.colony.resources.sciencePoints, 0);

      // Negative or NaN science points
      assert.strictEqual(manager.canBuild('greenhouse_2', -10).allowed, false);
      assert.strictEqual(manager.canBuild('greenhouse_2', NaN).allowed, false);
      assert.strictEqual(manager.canBuild('greenhouse_2', undefined as unknown as number).allowed, false);

      // Plateau radial boundary check: exactly r = 25m vs r = 25.01m
      mockSim.colony.resources.sciencePoints = 200;
      const resBorderline = manager.constructBuilding('greenhouse_2', mockSim, [25, 0, 0]);
      assert.strictEqual(resBorderline.success, true, 'Position at r = 25.0 must be accepted');

      const resOutside = manager.constructBuilding('dsoc_tower', mockSim, [25.01, 0, 0]);
      assert.strictEqual(resOutside.success, false, 'Position at r = 25.01 must be rejected');
      assert.strictEqual(resOutside.reason, 'POSITION_OUTSIDE_BASE_PLATEAU');
    });

    it('ECON-2: Active effects aggregation is commutative and robust under all building combinations', () => {
      const allBuildings: BaseBuildingId[] = ['rover_hangar', 'greenhouse_2', 'dsoc_tower'];

      // Test all 2^3 = 8 subsets
      for (let mask = 0; mask < (1 << allBuildings.length); mask++) {
        const subset: BaseBuildingId[] = [];
        for (let i = 0; i < allBuildings.length; i++) {
          if ((mask & (1 << i)) !== 0) {
            subset.push(allBuildings[i]);
          }
        }

        const manager = new BaseBuildingManager(subset);
        const effects = manager.getActiveEffects();

        const expectedBattery = subset.includes('rover_hangar') ? 50 : 0;
        const expectedLaser = subset.includes('rover_hangar') ? 30 : 0;
        const expectedBatteryCap = subset.includes('rover_hangar') ? 25 : 0;
        const expectedCrew = subset.includes('greenhouse_2') ? 4 : 0;
        const expectedFood = subset.includes('greenhouse_2') ? 12 : 0;
        const expectedO2 = subset.includes('greenhouse_2') ? 6 : 0;
        const expectedScienceMult = subset.includes('dsoc_tower') ? 3.0 : 1.0;

        assert.strictEqual(effects.batteryBonusPct, expectedBattery);
        assert.strictEqual(effects.laserRangeBonus, expectedLaser);
        assert.strictEqual(effects.batteryCapacityBonus, expectedBatteryCap);
        assert.strictEqual(effects.extraCrewCapacity, expectedCrew);
        assert.strictEqual(effects.foodDelta, expectedFood);
        assert.strictEqual(effects.o2Delta, expectedO2);
        assert.strictEqual(effects.scienceMultiplier, expectedScienceMult);

        // Verify colliders match subset
        const colliders = manager.getColliders();
        assert.strictEqual(colliders.length, subset.length);
      }
    });

  });

});
