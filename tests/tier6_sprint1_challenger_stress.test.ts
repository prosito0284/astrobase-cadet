import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  updateEvaMovement,
  updateEvaMouseLook,
  resolveCollisions,
  normalizeCompassDegrees,
  getCardinalDirection,
  MODULE_COLLIDERS,
  TUNNEL_COLLIDERS,
  EVA_SPAWN_POINT,
  MAX_EXPLORATION_RADIUS,
  EVA_WALK_SPEED,
  EVA_SPRINT_SPEED,
  EYE_HEIGHT_OFFSET,
  PLAYER_COLLISION_RADIUS,
  EvaControllerState,
} from '../src/components/3d/evaControls';
import { getTerrainHeight } from '../src/components/3d/base3DBuilder';

describe('Tier 6 Challenger Stress: Sprint 1 Empirical Verification & Adversarial Harness', () => {

  /* =========================================================================
   * SUITE 1: WASD Kinematics, Sprinting, and Diagonal Vector Normalization
   * ========================================================================= */
  describe('1. WASD Kinematics, Sprint Multiplier & Diagonal Vector Normalization', () => {
    
    it('Diagonal vector normalization eliminates diagonal speed boost across all 4 quadrants', () => {
      // In unnormalized WASD, diagonal speed is speed * sqrt(2) (~1.414x).
      // Normalized kinematics must preserve exactly 3.2 m/s walk and 5.8 m/s sprint.
      const dt = 0.1;
      const diagonals = [
        { keys: { KeyW: true, KeyD: true }, name: 'Forward-Right (NE)' },
        { keys: { KeyW: true, KeyA: true }, name: 'Forward-Left (NW)' },
        { keys: { KeyS: true, KeyD: true }, name: 'Backward-Right (SE)' },
        { keys: { KeyS: true, KeyA: true }, name: 'Backward-Left (SW)' },
      ];

      for (const diag of diagonals) {
        // Walk mode
        const walkState: EvaControllerState = {
          x: 25, y: 1.7, z: 25, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
        };
        updateEvaMovement(dt, walkState, diag.keys, 'moon');
        const walkDist = Math.hypot(walkState.x - 25, walkState.z - 25);
        const expectedWalkDist = EVA_WALK_SPEED * dt;
        assert.ok(
          Math.abs(walkDist - expectedWalkDist) < 1e-6,
          `Walk ${diag.name} diagonal distance must equal ${expectedWalkDist}, got ${walkDist}`
        );

        // Sprint mode
        const sprintState: EvaControllerState = {
          x: 25, y: 1.7, z: 25, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
        };
        updateEvaMovement(dt, sprintState, { ...diag.keys, ShiftLeft: true }, 'moon');
        const sprintDist = Math.hypot(sprintState.x - 25, sprintState.z - 25);
        const expectedSprintDist = EVA_SPRINT_SPEED * dt;
        assert.ok(
          Math.abs(sprintDist - expectedSprintDist) < 1e-6,
          `Sprint ${diag.name} diagonal distance must equal ${expectedSprintDist}, got ${sprintDist}`
        );

        // Verify diagonal speed ratio is exactly 1.0 (no sqrt(2) boost)
        const cardinalState: EvaControllerState = {
          x: 25, y: 1.7, z: 25, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
        };
        updateEvaMovement(dt, cardinalState, { KeyW: true }, 'moon');
        const cardinalDist = Math.hypot(cardinalState.x - 25, cardinalState.z - 25);
        assert.ok(
          Math.abs(walkDist - cardinalDist) < 1e-6,
          `Diagonal speed must match cardinal speed exactly (ratio 1.0), got ${walkDist / cardinalDist}`
        );
      }
    });

    it('Multi-key cancellation: opposing keys yield strictly zero velocity and isMoving === false', () => {
      const dt = 0.1;
      const cancellationScenarios = [
        { keys: { KeyW: true, KeyS: true }, name: 'W + S' },
        { keys: { KeyA: true, KeyD: true }, name: 'A + D' },
        { keys: { KeyW: true, KeyS: true, KeyA: true, KeyD: true }, name: 'W + A + S + D' },
        { keys: { KeyW: true, KeyS: true, ShiftLeft: true }, name: 'W + S + Shift' },
      ];

      for (const scenario of cancellationScenarios) {
        const state: EvaControllerState = {
          x: 25, y: 1.7, z: 25, yaw: 0.5, pitch: 0.2, isMoving: true, isSprinting: true
        };
        updateEvaMovement(dt, state, scenario.keys, 'moon');

        assert.strictEqual(state.x, 25, `${scenario.name} must produce zero displacement in X`);
        assert.strictEqual(state.z, 25, `${scenario.name} must produce zero displacement in Z`);
        assert.strictEqual(state.isMoving, false, `${scenario.name} must reset isMoving to false`);
        assert.strictEqual(state.isSprinting, false, `${scenario.name} must reset isSprinting to false`);
      }
    });

    it('Three-key combos correctly cancel the opposed axis and move purely along the uncancelled axis', () => {
      const dt = 0.1;
      // W + S + D -> W and S cancel, only D (Right) remains
      const state: EvaControllerState = {
        x: 25, y: 1.7, z: 25, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
      };
      updateEvaMovement(dt, state, { KeyW: true, KeyS: true, KeyD: true }, 'moon');

      assert.ok(state.isMoving, 'Should be moving along uncancelled axis');
      assert.strictEqual(state.z, 25, 'Z position must remain intact as W and S cancel');
      assert.ok(Math.abs(state.x - (25 + EVA_WALK_SPEED * dt)) < 1e-6, 'X position must advance by pure right movement');
    });

    it('Sprint speed multiplier is strictly 5.8 / 3.2 = 1.8125x and does not activate without movement', () => {
      // Shift pressed while stationary must NOT set isSprinting
      const idleShiftState: EvaControllerState = {
        x: 25, y: 1.7, z: 25, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
      };
      updateEvaMovement(0.1, idleShiftState, { ShiftLeft: true }, 'moon');
      assert.strictEqual(idleShiftState.isMoving, false, 'Stationary shift must not move');
      assert.strictEqual(idleShiftState.isSprinting, false, 'Stationary shift must not be sprinting');

      // Speed ratio check over 100 ticks
      const walkState: EvaControllerState = {
        x: 25, y: 1.7, z: 25, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
      };
      const sprintState: EvaControllerState = {
        x: 25, y: 1.7, z: 25, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
      };

      for (let i = 0; i < 100; i++) {
        updateEvaMovement(0.016, walkState, { KeyW: true }, 'moon');
        updateEvaMovement(0.016, sprintState, { KeyW: true, ShiftLeft: true }, 'moon');
      }

      const totalWalkDist = Math.abs(walkState.z - 25);
      const totalSprintDist = Math.abs(sprintState.z - 25);
      const measuredRatio = totalSprintDist / totalWalkDist;
      const expectedRatio = EVA_SPRINT_SPEED / EVA_WALK_SPEED;

      assert.ok(
        Math.abs(measuredRatio - expectedRatio) < 1e-5,
        `Sprint ratio must equal ${expectedRatio}, measured ${measuredRatio}`
      );
    });

    it('360° yaw angle sweep preserves exact displacement magnitude and camera look alignment', () => {
      const dt = 0.05;
      const speed = EVA_WALK_SPEED;
      const expectedStep = speed * dt;

      // Test 360 yaw angles in 1-degree steps
      for (let deg = 0; deg < 360; deg++) {
        const yaw = -(deg * Math.PI) / 180; // Three.js clockwise heading mapping
        const state: EvaControllerState = {
          x: 25, y: 1.7, z: 25, yaw, pitch: 0, isMoving: false, isSprinting: false
        };

        updateEvaMovement(dt, state, { KeyW: true }, 'moon');

        const dx = state.x - 25;
        const dz = state.z - 25;
        const stepDist = Math.hypot(dx, dz);

        // Magnitude check
        assert.ok(
          Math.abs(stepDist - expectedStep) < 1e-6,
          `Yaw ${deg}° step distance must equal ${expectedStep}, got ${stepDist}`
        );

        // Direction check: camera forward vector is (-sin(yaw), 0, -cos(yaw))
        const fwdX = -Math.sin(yaw);
        const fwdZ = -Math.cos(yaw);
        const dot = (dx * fwdX + dz * fwdZ) / (stepDist * 1.0);
        assert.ok(
          Math.abs(dot - 1.0) < 1e-6,
          `Displacement at yaw ${deg}° must align with camera look direction (dot product = ${dot})`
        );
      }
    });

    it('DeltaTime stress: clamps negative, zero, subnormal and massive lag spike inputs', () => {
      const state: EvaControllerState = {
        x: 25, y: 1.7, z: 25, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
      };

      // Negative dt
      updateEvaMovement(-0.5, state, { KeyW: true }, 'moon');
      assert.strictEqual(state.z, 25, 'Negative dt must clamp to 0 (no reverse movement)');

      // Zero dt
      updateEvaMovement(0, state, { KeyW: true }, 'moon');
      assert.strictEqual(state.z, 25, 'Zero dt must produce 0 movement');

      // Massive 100-second lag spike (tab backgrounding)
      updateEvaMovement(100.0, state, { KeyW: true, ShiftLeft: true }, 'moon');
      const maxAllowedStep = EVA_SPRINT_SPEED * 0.1; // clamped to 0.1s
      const actualStep = 25 - state.z;
      assert.ok(
        Math.abs(actualStep - maxAllowedStep) < 1e-6,
        `Massive dt must clamp to 0.1s max movement (${maxAllowedStep}m), got ${actualStep}m`
      );
    });
  });

  /* =========================================================================
   * SUITE 2: Obstacle Collision Pushback Math & Tunneling Prevention
   * ========================================================================= */
  describe('2. Obstacle Collision Pushback Math & Tunneling Prevention', () => {

    it('Exhaustive Radial Pushback Stress on all 6 Dome Cylinders (4,320 probes)', () => {
      // For each dome, probe 72 radial angles and 10 penetration depths from center to perimeter
      for (const dome of MODULE_COLLIDERS) {
        const minSafeDist = dome.radius + PLAYER_COLLISION_RADIUS;

        // Test probe directly at dome center (dx=0, dz=0)
        const centerRes = resolveCollisions(dome.x, dome.z, PLAYER_COLLISION_RADIUS);
        assert.ok(centerRes.collided, `Center of ${dome.id} must register collision`);
        const centerDist = Math.hypot(centerRes.x - dome.x, centerRes.z - dome.z);
        assert.ok(
          centerDist >= minSafeDist - 1e-6,
          `Center probe of ${dome.id} must be ejected to >= minSafeDist (${centerDist} >= ${minSafeDist})`
        );

        // 72 angles * 10 depths
        for (let angleDeg = 0; angleDeg < 360; angleDeg += 5) {
          const rad = (angleDeg * Math.PI) / 180;
          for (let depthFrac = 0.1; depthFrac <= 0.99; depthFrac += 0.1) {
            const probeR = dome.radius * depthFrac;
            const px = dome.x + probeR * Math.cos(rad);
            const pz = dome.z + probeR * Math.sin(rad);

            const res = resolveCollisions(px, pz, PLAYER_COLLISION_RADIUS);
            assert.ok(res.collided, `Deep probe in ${dome.id} at ${angleDeg}° must register collision`);

            const resolvedDist = Math.hypot(res.x - dome.x, res.z - dome.z);
            assert.ok(
              resolvedDist >= minSafeDist - 1e-6,
              `Probe in ${dome.id} at ${angleDeg}° must be pushed to safe radius (${resolvedDist} >= ${minSafeDist})`
            );
          }
        }

        // Just outside clearance test (radius + playerRadius + 0.01m)
        const clearX = dome.x + (minSafeDist + 0.01);
        const clearZ = dome.z;
        const clearRes = resolveCollisions(clearX, clearZ, PLAYER_COLLISION_RADIUS);
        assert.strictEqual(clearRes.collided, false, `Position outside ${dome.id} must not register collision`);
        assert.strictEqual(clearRes.x, clearX, 'Coordinates outside dome must be unperturbed');
      }
    });

    it('Exhaustive Capsule Segment Pushback Stress on all 5 Tunnels (1,600 probes)', () => {
      for (const tunnel of TUNNEL_COLLIDERS) {
        const minSafeDist = tunnel.radius + PLAYER_COLLISION_RADIUS;
        const segDx = tunnel.x2 - tunnel.x1;
        const segDz = tunnel.z2 - tunnel.z1;
        const segLen = Math.hypot(segDx, segDz);
        const normalX = -segDz / segLen;
        const normalZ = segDx / segLen;

        // Probe 20 points along the segment centerline
        for (let t = 0; t <= 1.0; t += 0.05) {
          const cx = tunnel.x1 + t * segDx;
          const cz = tunnel.z1 + t * segDz;

          // Probe directly on the centerline (sepDist = 0)
          const lineRes = resolveCollisions(cx, cz, PLAYER_COLLISION_RADIUS);
          assert.ok(lineRes.collided, `Centerline probe on ${tunnel.id} at t=${t} must collide`);

          // Compute distance from resolved point to the segment
          const projT = ((lineRes.x - tunnel.x1) * segDx + (lineRes.z - tunnel.z1) * segDz) / (segLen * segLen);
          const clampedT = Math.max(0, Math.min(1, projT));
          const closeX = tunnel.x1 + clampedT * segDx;
          const closeZ = tunnel.z1 + clampedT * segDz;
          const distToSeg = Math.hypot(lineRes.x - closeX, lineRes.z - closeZ);

          assert.ok(
            distToSeg >= minSafeDist - 1e-6,
            `Centerline probe on ${tunnel.id} must be pushed outside capsule (${distToSeg} >= ${minSafeDist})`
          );

          // Probe at various lateral penetration depths on both sides of tunnel
          for (let side of [-1, 1]) {
            for (let depthFrac = 0.2; depthFrac <= 0.95; depthFrac += 0.15) {
              const probeDist = (tunnel.radius + PLAYER_COLLISION_RADIUS) * depthFrac;
              const px = cx + side * normalX * probeDist;
              const pz = cz + side * normalZ * probeDist;

              const res = resolveCollisions(px, pz, PLAYER_COLLISION_RADIUS);
              assert.ok(res.collided, `Lateral probe on ${tunnel.id} must collide`);

              const pT = ((res.x - tunnel.x1) * segDx + (res.z - tunnel.z1) * segDz) / (segLen * segLen);
              const cT = Math.max(0, Math.min(1, pT));
              const rCloseX = tunnel.x1 + cT * segDx;
              const rCloseZ = tunnel.z1 + cT * segDz;
              const rDist = Math.hypot(res.x - rCloseX, res.z - rCloseZ);

              assert.ok(
                rDist >= minSafeDist - 1e-6,
                `Lateral probe on ${tunnel.id} must be pushed to safe radius (${rDist} >= ${minSafeDist})`
              );
            }
          }
        }
      }
    });

    it('Tunneling Prevention: Full-speed continuous sprint directly toward all 6 domes never breaches dome core', () => {
      // Approach each dome from 10 meters away at max sprint speed (5.8 m/s, dt=0.1s -> 0.58m/frame)
      // Run for 100 consecutive frames straight into the dome.
      const dt = 0.1;

      for (const dome of MODULE_COLLIDERS) {
        // Approach from 4 cardinal directions towards the dome
        const approaches = [
          { startX: dome.x, startZ: dome.z + 10, targetYaw: 0 },          // From South, heading North
          { startX: dome.x, startZ: dome.z - 10, targetYaw: -Math.PI },   // From North, heading South
          { startX: dome.x + 10, startZ: dome.z, targetYaw: Math.PI / 2 },// From East, heading West
          { startX: dome.x - 10, startZ: dome.z, targetYaw: -Math.PI / 2 },// From West, heading East
        ];

        for (const app of approaches) {
          const state: EvaControllerState = {
            x: app.startX,
            y: 1.7,
            z: app.startZ,
            yaw: app.targetYaw,
            pitch: 0,
            isMoving: false,
            isSprinting: false,
          };

          for (let frame = 0; frame < 100; frame++) {
            updateEvaMovement(dt, state, { KeyW: true, ShiftLeft: true }, 'moon');

            // Distance from dome center
            const dist = Math.hypot(state.x - dome.x, state.z - dome.z);
            const minSafeDist = dome.radius + PLAYER_COLLISION_RADIUS;

            // CRITICAL CHECK: Player must NEVER penetrate into dome core
            assert.ok(
              dist >= minSafeDist - 1e-4,
              `Tunneling breach detected on ${dome.id} at frame ${frame}! dist=${dist} < minSafeDist=${minSafeDist}`
            );
          }
        }
      }
    });

    it('Tunneling Prevention: Full-speed continuous sprint perpendicular to all 5 tunnels never passes through', () => {
      // Approach each tunnel midpoint along perpendicular normal from 4 meters away
      const dt = 0.1;

      for (const tunnel of TUNNEL_COLLIDERS) {
        const segDx = tunnel.x2 - tunnel.x1;
        const segDz = tunnel.z2 - tunnel.z1;
        const segLen = Math.hypot(segDx, segDz);
        const midX = (tunnel.x1 + tunnel.x2) / 2;
        const midZ = (tunnel.z1 + tunnel.z2) / 2;
        const normalX = -segDz / segLen;
        const normalZ = segDx / segLen;

        // Start 4m away along the normal
        const startX = midX + normalX * 4.0;
        const startZ = midZ + normalZ * 4.0;

        // Camera yaw pointed directly at the midpoint (-normalX, -normalZ)
        // Camera look vector is (-sin(yaw), -cos(yaw))
        const lookX = -normalX;
        const lookZ = -normalZ;
        const yaw = Math.atan2(-lookX, -lookZ);

        const state: EvaControllerState = {
          x: startX,
          y: 1.7,
          z: startZ,
          yaw,
          pitch: 0,
          isMoving: false,
          isSprinting: false,
        };

        const minSafeDist = tunnel.radius + PLAYER_COLLISION_RADIUS;

        for (let frame = 0; frame < 100; frame++) {
          updateEvaMovement(dt, state, { KeyW: true, ShiftLeft: true }, 'moon');

          // Compute distance to tunnel segment
          const projT = ((state.x - tunnel.x1) * segDx + (state.z - tunnel.z1) * segDz) / (segLen * segLen);
          const clampedT = Math.max(0, Math.min(1, projT));
          const closeX = tunnel.x1 + clampedT * segDx;
          const closeZ = tunnel.z1 + clampedT * segDz;
          const distToTunnel = Math.hypot(state.x - closeX, state.z - closeZ);

          // CRITICAL CHECK: Player must NEVER tunnel inside or through to the other side
          assert.ok(
            distToTunnel >= minSafeDist - 1e-4,
            `Tunneling breach detected on ${tunnel.id} at frame ${frame}! dist=${distToTunnel} < minSafeDist=${minSafeDist}`
          );

          // Verify the player remains on the same side of the tunnel (dot product with normal remains positive)
          const dotWithNormal = (state.x - midX) * normalX + (state.z - midZ) * normalZ;
          assert.ok(
            dotWithNormal >= minSafeDist - 1e-4,
            `Player tunneled across ${tunnel.id} to opposite side! dotWithNormal=${dotWithNormal}`
          );
        }
      }
    });

    it('World exploration boundary strictly bounds coordinates to hypot <= 52.0m under extreme leaps', () => {
      const extremeCoordinates = [
        { x: 1000, z: 1000 },
        { x: -50000, z: 0 },
        { x: 0, z: 100000 },
        { x: -300, z: -400 }, // 3-4-5 triangle hypot = 500
      ];

      for (const pt of extremeCoordinates) {
        const res = resolveCollisions(pt.x, pt.z, PLAYER_COLLISION_RADIUS);
        assert.ok(res.collided, `Point (${pt.x}, ${pt.z}) must trigger boundary collision`);
        const dist = Math.hypot(res.x, res.z);
        assert.ok(
          Math.abs(dist - MAX_EXPLORATION_RADIUS) < 1e-6,
          `Clamped distance must equal ${MAX_EXPLORATION_RADIUS}, got ${dist}`
        );
      }
    });

    it('Airlock spawn point (0, 5.5) remains perfectly stable over 1,000 idle ticks', () => {
      const state: EvaControllerState = {
        ...EVA_SPAWN_POINT,
        isMoving: false,
        isSprinting: false,
      };

      for (let i = 0; i < 1000; i++) {
        updateEvaMovement(0.016, state, {}, 'moon');
        assert.strictEqual(state.x, EVA_SPAWN_POINT.x, 'Spawn X must not drift');
        assert.strictEqual(state.z, EVA_SPAWN_POINT.z, 'Spawn Z must not drift');
        assert.strictEqual(state.y, EYE_HEIGHT_OFFSET, 'Spawn Y must match eye height offset');
      }
    });
  });

  /* =========================================================================
   * SUITE 3: 360° Compass Heading Wrapping & Cardinal Points
   * ========================================================================= */
  describe('3. 360° Compass Heading Wrapping & Cardinal Direction Points', () => {

    it('Compass angle normalization strictly satisfies 0 <= deg < 360 without JavaScript -0', () => {
      // Test exact 0 and boundary values
      assert.strictEqual(normalizeCompassDegrees(0), 0);
      assert.strictEqual(Object.is(normalizeCompassDegrees(0), -0), false, 'Must not return -0');
      assert.strictEqual(Object.is(normalizeCompassDegrees(-0), -0), false, 'Must not return -0 from -0 input');

      // Test multiple full revolutions
      assert.strictEqual(normalizeCompassDegrees(2 * Math.PI), 0);
      assert.strictEqual(normalizeCompassDegrees(-2 * Math.PI), 0);
      assert.strictEqual(normalizeCompassDegrees(40 * Math.PI), 0);
      assert.strictEqual(normalizeCompassDegrees(-40 * Math.PI), 0);

      // Infinitesimal offsets near 0/360 boundary
      const nearZeroPos = normalizeCompassDegrees(-1e-12);
      assert.strictEqual(nearZeroPos, 0, 'Sub-nano degree must round to 0, not -0');

      const nearZeroNeg = normalizeCompassDegrees(1e-9);
      assert.ok(nearZeroNeg > 359.99 && nearZeroNeg < 360, `Small positive yaw should map to ~359.99, got ${nearZeroNeg}`);
    });

    it('Fuzz testing: 10,000 random yaw angles across [-100pi, +100pi] all normalize strictly to [0, 360)', () => {
      for (let i = 0; i < 10000; i++) {
        const randomYaw = (Math.random() - 0.5) * 200 * Math.PI;
        const deg = normalizeCompassDegrees(randomYaw);

        assert.ok(deg >= 0, `Deg must be >= 0, got ${deg} for yaw ${randomYaw}`);
        assert.ok(deg < 360, `Deg must be < 360, got ${deg} for yaw ${randomYaw}`);
        assert.strictEqual(Number.isNaN(deg), false, 'Deg must not be NaN');
        assert.strictEqual(Number.isFinite(deg), true, 'Deg must be finite');
        assert.strictEqual(Object.is(deg, -0), false, 'Deg must never be -0');
      }
    });

    it('Cardinal direction boundary oracle: verifies exact sector transitions', () => {
      // 8 sectors of 45 degrees each:
      // N: [337.5, 360) and [0, 22.5)
      // NE: [22.5, 67.5)
      // E: [67.5, 112.5)
      // SE: [112.5, 157.5)
      // S: [157.5, 202.5)
      // SW: [202.5, 247.5)
      // W: [247.5, 292.5)
      // NW: [292.5, 337.5)

      const eps = 1e-4;
      const testCases: { deg: number; expected: string }[] = [
        // North sector
        { deg: 0, expected: 'N' },
        { deg: 22.499, expected: 'N' },
        { deg: 337.5, expected: 'N' },
        { deg: 359.999, expected: 'N' },

        // NE sector
        { deg: 22.5, expected: 'NE' },
        { deg: 45.0, expected: 'NE' },
        { deg: 67.499, expected: 'NE' },

        // E sector
        { deg: 67.5, expected: 'E' },
        { deg: 90.0, expected: 'E' },
        { deg: 112.499, expected: 'E' },

        // SE sector
        { deg: 112.5, expected: 'SE' },
        { deg: 135.0, expected: 'SE' },
        { deg: 157.499, expected: 'SE' },

        // S sector
        { deg: 157.5, expected: 'S' },
        { deg: 180.0, expected: 'S' },
        { deg: 202.499, expected: 'S' },

        // SW sector
        { deg: 202.5, expected: 'SW' },
        { deg: 225.0, expected: 'SW' },
        { deg: 247.499, expected: 'SW' },

        // W sector
        { deg: 247.5, expected: 'W' },
        { deg: 270.0, expected: 'W' },
        { deg: 292.499, expected: 'W' },

        // NW sector
        { deg: 292.5, expected: 'NW' },
        { deg: 315.0, expected: 'NW' },
        { deg: 337.499, expected: 'NW' },

        // Negative & oversized wrapping
        { deg: -90, expected: 'W' },
        { deg: -180, expected: 'S' },
        { deg: 450, expected: 'E' },
        { deg: 720, expected: 'N' },
      ];

      for (const tc of testCases) {
        const actual = getCardinalDirection(tc.deg);
        assert.strictEqual(
          actual,
          tc.expected,
          `Heading ${tc.deg}° should be '${tc.expected}', got '${actual}'`
        );
      }
    });
  });

  /* =========================================================================
   * SUITE 4: Camera Pitch Clamping Boundaries & Gimbal Inversion Prevention
   * ========================================================================= */
  describe('4. Camera Pitch Clamping Boundaries & Gimbal Inversion Prevention', () => {

    it('Pitch clamping strictly prevents gimbal lock (retains >= 9.7° safety margin from +/-PI/2)', () => {
      const state: EvaControllerState = {
        x: 0, y: 1.7, z: 0, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
      };

      // Massive upward look thrust (movementY = -1,000,000)
      updateEvaMouseLook(state, 0, -1000000, 0.002);
      assert.strictEqual(state.pitch, 1.4, 'Max upward pitch must clamp to exactly +1.4 rad');
      const marginUp = (Math.PI / 2) - state.pitch;
      assert.ok(marginUp > 0.17, `Gimbal lock safety margin up must exceed 0.17 rad (got ${marginUp})`);

      // Massive downward look thrust (movementY = +2,000,000)
      updateEvaMouseLook(state, 0, 2000000, 0.002);
      assert.strictEqual(state.pitch, -1.4, 'Max downward pitch must clamp to exactly -1.4 rad');
      const marginDown = state.pitch - (-Math.PI / 2);
      assert.ok(marginDown > 0.17, `Gimbal lock safety margin down must exceed 0.17 rad (got ${marginDown})`);
    });

    it('10,000 frame alternating vertical mouse jitter maintains strict pitch clamping without numerical drift', () => {
      const state: EvaControllerState = {
        x: 0, y: 1.7, z: 0, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
      };

      for (let i = 0; i < 10000; i++) {
        // High-frequency alternating thrusts
        const dy = (i % 2 === 0 ? 1 : -1) * (100 + Math.random() * 500);
        updateEvaMouseLook(state, 0, dy, 0.002);

        assert.ok(state.pitch <= 1.4, `Pitch exceeded +1.4 at frame ${i}: ${state.pitch}`);
        assert.ok(state.pitch >= -1.4, `Pitch subceeded -1.4 at frame ${i}: ${state.pitch}`);
        assert.strictEqual(Number.isNaN(state.pitch), false, 'Pitch became NaN');
      }
    });
  });

  /* =========================================================================
   * SUITE 5: Eye-Height Elevation Tracking & Head Bob Oscillations
   * ========================================================================= */
  describe('5. Eye-Height Elevation Tracking & Head Bob Oscillations', () => {

    it('Astronaut eye height tracks terrain elevation + 1.70m across 100 sample coordinates', () => {
      for (let i = 0; i < 100; i++) {
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;

        for (const loc of ['moon', 'mars'] as const) {
          const state: EvaControllerState = {
            x, y: 0, z, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
          };
          updateEvaMovement(0.1, state, {}, loc);

          const terrainH = getTerrainHeight(state.x, state.z, loc);
          const expectedY = terrainH + EYE_HEIGHT_OFFSET;
          assert.ok(
            Math.abs(state.y - expectedY) < 1e-4,
            `Eye height at (${state.x.toFixed(2)}, ${state.z.toFixed(2)}) on ${loc} must be ${expectedY}, got ${state.y}`
          );
        }
      }
    });

    it('Head bob amplitude is strictly bounded: walk <= 0.03m, sprint <= 0.05m, idle == 0', () => {
      const walkState: EvaControllerState = {
        x: 25, y: 1.7, z: 25, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
      };
      const sprintState: EvaControllerState = {
        x: 25, y: 1.7, z: 25, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
      };

      // Sample 100 frames
      for (let f = 0; f < 100; f++) {
        updateEvaMovement(0.016, walkState, { KeyW: true }, 'moon');
        updateEvaMovement(0.016, sprintState, { KeyW: true, ShiftLeft: true }, 'moon');

        const walkBob = Math.abs(walkState.y - (getTerrainHeight(walkState.x, walkState.z, 'moon') + EYE_HEIGHT_OFFSET));
        const sprintBob = Math.abs(sprintState.y - (getTerrainHeight(sprintState.x, sprintState.z, 'moon') + EYE_HEIGHT_OFFSET));

        assert.ok(walkBob <= 0.03001, `Walk bob exceeded 0.03m: ${walkBob}`);
        assert.ok(sprintBob <= 0.05001, `Sprint bob exceeded 0.05m: ${sprintBob}`);
      }

      // Reset to idle
      updateEvaMovement(0.016, walkState, {}, 'moon');
      assert.strictEqual(walkState.walkBobPhase, 0, 'Idle walkBobPhase must reset to 0');
      const idleBob = Math.abs(walkState.y - (getTerrainHeight(walkState.x, walkState.z, 'moon') + EYE_HEIGHT_OFFSET));
      assert.ok(idleBob < 1e-6, 'Idle bob must be 0');
    });
  });

});
