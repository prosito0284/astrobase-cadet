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
  EvaControllerState
} from '../src/components/3d/evaControls';
import { getTerrainHeight } from '../src/components/3d/base3DBuilder';

describe('Tier 1 Sprint 1: EVA Astronaut First-Person Kinematics & Visor Systems', () => {

  describe('1. EVA Movement Kinematics (WASD, Sprint, Speeds & Vectors)', () => {
    it('Forward movement (KeyW) advances position along camera look direction', () => {
      // Facing North: yaw = 0 -> look direction is (0, 0, -1) in open terrain (25, 25)
      const state: EvaControllerState = {
        x: 25,
        y: 1.7,
        z: 25,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };

      const dt = 0.1; // 0.1s at walk speed (3.2 m/s) -> 0.32m forward (-Z)
      updateEvaMovement(dt, state, { KeyW: true }, 'moon');

      assert.ok(state.isMoving, 'State must indicate active movement');
      assert.strictEqual(state.isSprinting, false, 'Sprint should be false without shift');
      assert.strictEqual(state.x, 25, 'X position should remain 25 when moving pure forward facing North');
      // Moving North (-Z) from 25:
      const expectedZ = 25 - EVA_WALK_SPEED * dt;
      assert.ok(Math.abs(state.z - expectedZ) < 0.01, `Z should be ${expectedZ}, got ${state.z}`);
    });

    it('Backward movement (KeyS) retreats opposite to camera look direction', () => {
      const state: EvaControllerState = {
        x: 25,
        y: 1.7,
        z: 25,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };

      const dt = 0.1;
      updateEvaMovement(dt, state, { KeyS: true }, 'moon');

      assert.ok(state.isMoving, 'State must indicate active movement');
      const expectedZ = 25 + EVA_WALK_SPEED * dt;
      assert.ok(Math.abs(state.z - expectedZ) < 0.01, `Z should retreat to ${expectedZ}, got ${state.z}`);
    });

    it('Strafe Left (KeyA) and Strafe Right (KeyD) move along perpendicular right vector', () => {
      // Facing North (yaw = 0): Right vector is (+1, 0, 0)
      const stateRight: EvaControllerState = {
        x: 25,
        y: 1.7,
        z: 25,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };

      updateEvaMovement(0.1, stateRight, { KeyD: true }, 'moon');
      assert.ok(stateRight.x > 25, 'Strafe right facing North must increase X (East)');

      const stateLeft: EvaControllerState = {
        x: 25,
        y: 1.7,
        z: 25,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };

      updateEvaMovement(0.1, stateLeft, { KeyA: true }, 'moon');
      assert.ok(stateLeft.x < 25, 'Strafe left facing North must decrease X (West)');
    });

    it('Sprint mode (Shift) activates higher speed (5.8 m/s vs 3.2 m/s)', () => {
      const walkState: EvaControllerState = {
        x: 25,
        y: 1.7,
        z: 25,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };
      const sprintState: EvaControllerState = {
        x: 25,
        y: 1.7,
        z: 25,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };

      const dt = 0.1;
      updateEvaMovement(dt, walkState, { KeyW: true }, 'moon');
      updateEvaMovement(dt, sprintState, { KeyW: true, ShiftLeft: true }, 'moon');

      assert.ok(sprintState.isSprinting, 'Sprint state must be active');
      const walkDist = Math.abs(walkState.z - 25);
      const sprintDist = Math.abs(sprintState.z - 25);

      assert.ok(sprintDist > walkDist, 'Sprint distance must exceed walk distance');
      assert.ok(Math.abs(walkDist - EVA_WALK_SPEED * dt) < 0.01, `Walk distance must match EVA_WALK_SPEED * dt`);
      assert.ok(Math.abs(sprintDist - EVA_SPRINT_SPEED * dt) < 0.01, `Sprint distance must match EVA_SPRINT_SPEED * dt`);
    });

    it('DeltaTime safety clamping restricts lag spikes and background tab resumption', () => {
      const state: EvaControllerState = {
        x: 0,
        y: 1.7,
        z: -10,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };

      // Simulate a massive 5-second background tab pause
      updateEvaMovement(5.0, state, { KeyW: true }, 'moon');

      // Clamped dt is max 0.1s -> max movement is 0.1 * 3.2 = 0.32m
      const distTraveled = Math.abs(state.z - (-10));
      assert.ok(distTraveled <= EVA_WALK_SPEED * 0.1 + 0.01, `Movement must be clamped to safe dt max 0.1s, traveled ${distTraveled}`);
    });

    it('Mouse look rotates yaw and pitch with vertical pitch angle limits', () => {
      const state: EvaControllerState = {
        x: 0,
        y: 1.7,
        z: 0,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };

      // Turn right: movementX > 0 decreases yaw (in Three.js)
      updateEvaMouseLook(state, 100, 0, 0.002);
      assert.ok(state.yaw < 0, 'Turning mouse right must decrease yaw in Three.js coordinates');

      // Look up / down with pitch clamping
      updateEvaMouseLook(state, 0, -2000, 0.002); // extreme upward glance
      assert.ok(state.pitch <= 1.4, 'Pitch must be clamped to max +1.4 rad (~80 deg)');

      updateEvaMouseLook(state, 0, 4000, 0.002); // extreme downward glance
      assert.ok(state.pitch >= -1.4, 'Pitch must be clamped to min -1.4 rad (~-80 deg)');
    });
  });

  describe('2. Eye-Height Elevation Following & Walking Bob', () => {
    it('Eye height strictly tracks getTerrainHeight + 1.70m on Moon flat plateau', () => {
      const state: EvaControllerState = {
        x: 0,
        y: 0,
        z: 5.5,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };

      updateEvaMovement(0.1, state, {}, 'moon');

      const expectedElevation = getTerrainHeight(state.x, state.z, 'moon');
      assert.strictEqual(expectedElevation, 0, 'Central plateau elevation must be 0');
      assert.strictEqual(state.y, EYE_HEIGHT_OFFSET, `Eye height must equal ${EYE_HEIGHT_OFFSET}m on flat terrain`);
    });

    it('Eye height adapts accurately to Shackleton crater rim elevation (Moon)', () => {
      const state: EvaControllerState = {
        x: 30,
        y: 0,
        z: 30,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };

      updateEvaMovement(0.1, state, {}, 'moon');

      const terrainH = getTerrainHeight(30, 30, 'moon');
      assert.ok(terrainH > 0, 'Shackleton crater rim must have positive elevation');
      assert.ok(Math.abs(state.y - (terrainH + EYE_HEIGHT_OFFSET)) < 0.001, 'Eye height must follow crater rim elevation');
    });

    it('Eye height adapts accurately to Jezero delta terraces and dunes (Mars)', () => {
      const state: EvaControllerState = {
        x: -25,
        y: 0,
        z: -25,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
      };

      updateEvaMovement(0.1, state, {}, 'mars');

      const terrainH = getTerrainHeight(-25, -25, 'mars');
      assert.ok(Math.abs(state.y - (terrainH + EYE_HEIGHT_OFFSET)) < 0.001, 'Eye height must follow Mars terrain elevation');
    });

    it('Subtle walking bob oscillates while moving and resets when idle', () => {
      const state: EvaControllerState = {
        x: 0,
        y: 1.7,
        z: -10,
        yaw: 0,
        pitch: 0,
        isMoving: false,
        isSprinting: false,
        walkBobPhase: 0,
      };

      // Idle update: bob phase remains 0, eye height exactly 1.70
      updateEvaMovement(0.1, state, {}, 'moon');
      assert.strictEqual(state.walkBobPhase, 0, 'Idle state bob phase must be 0');
      assert.strictEqual(state.y, EYE_HEIGHT_OFFSET, 'Idle height must be exactly EYE_HEIGHT_OFFSET');

      // Moving update: bob phase advances and causes subtle height variation (< 0.06m)
      updateEvaMovement(0.2, state, { KeyW: true }, 'moon');
      assert.ok(state.walkBobPhase! > 0, 'Moving state bob phase must advance');
      assert.ok(Math.abs(state.y - EYE_HEIGHT_OFFSET) <= 0.06, 'Bob amplitude must remain subtle (< 0.06m)');
    });
  });

  describe('3. Dome & Tunnel Collision Detection & World Boundary', () => {
    it('All 6 Base Modules are registered with valid positions and radii', () => {
      assert.strictEqual(MODULE_COLLIDERS.length, 6, 'Must define exactly 6 base modules');

      const expectedIds = [
        'regolith_shield',
        'greenhouse',
        'solar_farm',
        'comm_array',
        'water_ice_extractor',
        'storm_bunker',
      ];

      for (const id of expectedIds) {
        const found = MODULE_COLLIDERS.find(m => m.id === id);
        assert.ok(found, `Module collider '${id}' must exist`);
        assert.ok(found!.radius > 0, `Module '${id}' must have positive radius`);
      }
    });

    it('All 5 Corrugated Tunnels are registered with valid segment coordinates', () => {
      assert.strictEqual(TUNNEL_COLLIDERS.length, 5, 'Must define exactly 5 tunnels');

      const expectedTunnels = [
        'tunnel_greenhouse',
        'tunnel_solar',
        'tunnel_comms',
        'tunnel_ice',
        'tunnel_bunker',
      ];

      for (const id of expectedTunnels) {
        const found = TUNNEL_COLLIDERS.find(t => t.id === id);
        assert.ok(found, `Tunnel collider '${id}' must exist`);
        assert.ok(found!.radius > 0, `Tunnel '${id}' must have positive radius`);
        const length = Math.hypot(found!.x2 - found!.x1, found!.z2 - found!.z1);
        assert.ok(length > 1.0, `Tunnel '${id}' must have meaningful segment length`);
      }
    });

    it('Collision resolution pushes player outward from dome cylinder obstacle', () => {
      // Greenhouse module is at (8.5, -4.5) with radius 3.6
      const gh = MODULE_COLLIDERS.find(m => m.id === 'greenhouse')!;
      
      // Place player inside the greenhouse dome perimeter
      const insideX = gh.x + 1.0;
      const insideZ = gh.z + 1.0;

      const resolved = resolveCollisions(insideX, insideZ, PLAYER_COLLISION_RADIUS);
      assert.ok(resolved.collided, 'Collision must be detected');

      // Distance from greenhouse center after resolution
      const distAfter = Math.hypot(resolved.x - gh.x, resolved.z - gh.z);
      const minSafeDist = gh.radius + PLAYER_COLLISION_RADIUS;
      assert.ok(distAfter >= minSafeDist - 0.001, `Player must be pushed outside greenhouse (dist: ${distAfter} >= min: ${minSafeDist})`);
    });

    it('Collision resolution pushes player outward from tunnel capsule / line segment', () => {
      // Tunnel solar is from (-3.5, -2.26) to (-6.5, -4.21) with radius 0.75
      const tunnel = TUNNEL_COLLIDERS.find(t => t.id === 'tunnel_solar')!;
      
      // Place player directly on the tunnel midpoint line
      const midX = (tunnel.x1 + tunnel.x2) / 2;
      const midZ = (tunnel.z1 + tunnel.z2) / 2;

      const resolved = resolveCollisions(midX, midZ, PLAYER_COLLISION_RADIUS);
      assert.ok(resolved.collided, 'Collision against tunnel segment must be detected');

      // Distance from closest point on tunnel segment after resolution
      const minSafeDist = tunnel.radius + PLAYER_COLLISION_RADIUS;
      const segDx = tunnel.x2 - tunnel.x1;
      const segDz = tunnel.z2 - tunnel.z1;
      const t = ((resolved.x - tunnel.x1) * segDx + (resolved.z - tunnel.z1) * segDz) / (segDx * segDx + segDz * segDz);
      const cx = tunnel.x1 + Math.max(0, Math.min(1, t)) * segDx;
      const cz = tunnel.z1 + Math.max(0, Math.min(1, t)) * segDz;
      const distFromSeg = Math.hypot(resolved.x - cx, resolved.z - cz);

      assert.ok(distFromSeg >= minSafeDist - 0.001, `Player must be pushed outside tunnel (dist: ${distFromSeg} >= min: ${minSafeDist})`);
    });

    it('Safe exploration boundary clamps player position to hypot <= 52.0m', () => {
      // Place player at far distance r = 70m
      const farX = 50.0;
      const farZ = 50.0; // hypot ~ 70.71m

      const resolved = resolveCollisions(farX, farZ, PLAYER_COLLISION_RADIUS);
      assert.ok(resolved.collided, 'Boundary collision must trigger');

      const distClamped = Math.hypot(resolved.x, resolved.z);
      assert.ok(Math.abs(distClamped - MAX_EXPLORATION_RADIUS) < 0.01, `Position must be clamped to ${MAX_EXPLORATION_RADIUS}m, got ${distClamped}`);
    });

    it('Airlock portal spawn point (0, 5.5) is stable with zero collision ejection', () => {
      // At spawn (0, 5.5), player must stand freely outside airlock door without being pushed
      const spawn = EVA_SPAWN_POINT;
      const resolved = resolveCollisions(spawn.x, spawn.z, PLAYER_COLLISION_RADIUS);

      assert.strictEqual(resolved.collided, false, 'Airlock spawn point must have zero collision');
      assert.strictEqual(resolved.x, spawn.x, 'Spawn X must remain intact');
      assert.strictEqual(resolved.z, spawn.z, 'Spawn Z must remain intact');
    });
  });

  describe('4. Compass Yaw Angle Normalization & Cardinal Directions', () => {
    it('Normalizes standard radian angles to 0° - 360° heading degrees', () => {
      // 0 rad = North (0°)
      assert.strictEqual(Math.round(normalizeCompassDegrees(0)), 0, '0 rad must map to 0 deg');

      // -pi/2 rad = East (90°) in Three.js
      assert.strictEqual(Math.round(normalizeCompassDegrees(-Math.PI / 2)), 90, '-pi/2 rad must map to 90 deg (East)');

      // -pi rad = South (180°)
      assert.strictEqual(Math.round(normalizeCompassDegrees(-Math.PI)), 180, '-pi rad must map to 180 deg (South)');

      // -3pi/2 rad = West (270°)
      assert.strictEqual(Math.round(normalizeCompassDegrees(-3 * Math.PI / 2)), 270, '-3pi/2 rad must map to 270 deg (West)');

      // -2pi rad = Full turn (0°)
      assert.strictEqual(Math.round(normalizeCompassDegrees(-2 * Math.PI)), 0, '-2pi rad must normalize to 0 deg');
    });

    it('Handles negative, positive and multiple full rotations cleanly', () => {
      // Multiple positive rotations
      const posWrap = normalizeCompassDegrees(Math.PI * 6.5); // equivalent to 0.5 pi = 270 deg
      assert.ok(posWrap >= 0 && posWrap < 360, 'Heading must remain in [0, 360)');

      // Multiple negative rotations
      const negWrap = normalizeCompassDegrees(-Math.PI * 9.0);
      assert.ok(negWrap >= 0 && negWrap < 360, 'Heading must remain in [0, 360)');
    });

    it('Maps heading degrees accurately to 8 cardinal points', () => {
      assert.strictEqual(getCardinalDirection(0), 'N');
      assert.strictEqual(getCardinalDirection(10), 'N');
      assert.strictEqual(getCardinalDirection(350), 'N');
      assert.strictEqual(getCardinalDirection(45), 'NE');
      assert.strictEqual(getCardinalDirection(90), 'E');
      assert.strictEqual(getCardinalDirection(135), 'SE');
      assert.strictEqual(getCardinalDirection(180), 'S');
      assert.strictEqual(getCardinalDirection(225), 'SW');
      assert.strictEqual(getCardinalDirection(270), 'W');
      assert.strictEqual(getCardinalDirection(315), 'NW');
    });
  });

});
