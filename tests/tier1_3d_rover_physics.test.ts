import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  createInitialRoverState, 
  stepRoverPhysics, 
  getHeadingVector, 
  getRightVector, 
  getDistanceToBase, 
  getBearingToBase, 
  MOON_PHYSICS_CONFIG, 
  MARS_PHYSICS_CONFIG,
  ObstacleCollision 
} from '../src/components/rover3d/roverPhysics.ts';
import { 
  getRoverTerrainY, 
  getRoverTerrainNormal, 
  generateRoverObstacles, 
  generateRoverResourceNodes 
} from '../src/components/rover3d/roverTerrain.ts';
import { 
  buildVIPERModel, 
  buildPerseveranceModel, 
  buildBaseBeacon, 
  updateRoverModelVisuals 
} from '../src/components/rover3d/roverModels.ts';

test('Tier 1.12: Rover Physics - Initial state initialization and heading vectors', () => {
  const state = createInitialRoverState(10, 15, Math.PI / 4);
  assert.strictEqual(state.x, 10);
  assert.strictEqual(state.z, 15);
  assert.strictEqual(state.yaw, Math.PI / 4);
  assert.strictEqual(state.speed, 0);
  assert.strictEqual(state.steeringAngle, 0);
  assert.strictEqual(state.pitch, 0);
  assert.strictEqual(state.roll, 0);
  assert.strictEqual(state.isColliding, false);

  // Heading vector at yaw = 0 points along -Z: (0, -1)
  const [fwdX0, fwdZ0] = getHeadingVector(0);
  assert.ok(Math.abs(fwdX0 - 0) < 1e-6);
  assert.ok(Math.abs(fwdZ0 - (-1)) < 1e-6);

  // Right vector at yaw = 0 points along +X: (1, 0)
  const [rightX0, rightZ0] = getRightVector(0);
  assert.ok(Math.abs(rightX0 - 1) < 1e-6);
  assert.ok(Math.abs(rightZ0 - 0) < 1e-6);
});

test('Tier 1.12: Rover Physics - DeltaTime clamping against tab backgrounding and clock jumps', () => {
  const probe = () => ({ y: 0, normal: [0, 1, 0] as [number, number, number], slopeAlongHeading: 0 });
  const obstacles: ObstacleCollision[] = [];
  const state = createInitialRoverState(0, 0, 0);

  // Massive raw dt (10.0 seconds) must be clamped to max 0.1 seconds
  const res1 = stepRoverPhysics(state, { throttle: 1, steer: 0 }, probe, obstacles, 10.0, MOON_PHYSICS_CONFIG);
  // Max accel = 5.5 m/s^2 * 0.1s = 0.55 m/s
  assert.ok(res1.state.speed <= 0.65, `Speed ${res1.state.speed} exceeded max single-step clamp limit`);

  // Negative raw dt should not accelerate backward or throw
  const res2 = stepRoverPhysics(state, { throttle: 1, steer: 0 }, probe, obstacles, -2.5, MOON_PHYSICS_CONFIG);
  assert.strictEqual(res2.state.speed, 0);
});

test('Tier 1.12: Rover Physics - Acceleration, braking and maximum speed limits', () => {
  const probe = () => ({ y: 0, normal: [0, 1, 0] as [number, number, number], slopeAlongHeading: 0 });
  const obstacles: ObstacleCollision[] = [];
  let current = createInitialRoverState(0, 0, 0);

  // Accelerate forward for 30 steps of 0.1s (3 seconds)
  for (let step = 0; step < 30; step++) {
    const res = stepRoverPhysics(current, { throttle: 1.0, steer: 0 }, probe, obstacles, 0.1, MOON_PHYSICS_CONFIG);
    current = res.state;
  }

  // Must reach and clamp strictly at maxSpeedForward (7.0 m/s for Moon)
  assert.strictEqual(current.speed, MOON_PHYSICS_CONFIG.maxSpeedForward);

  // Active braking must reduce speed quickly
  for (let step = 0; step < 10; step++) {
    const res = stepRoverPhysics(current, { throttle: 0, steer: 0, brake: true }, probe, obstacles, 0.1, MOON_PHYSICS_CONFIG);
    current = res.state;
  }
  assert.ok(current.speed < 1.0, `Speed after braking should be near zero, got ${current.speed}`);

  // Reverse drive must clamp at maxSpeedReverse
  for (let step = 0; step < 30; step++) {
    const res = stepRoverPhysics(current, { throttle: -1.0, steer: 0 }, probe, obstacles, 0.1, MOON_PHYSICS_CONFIG);
    current = res.state;
  }
  assert.strictEqual(current.speed, -MOON_PHYSICS_CONFIG.maxSpeedReverse);
});

test('Tier 1.12: Rover Physics - Steering kinematics and yaw angular integration', () => {
  const probe = () => ({ y: 0, normal: [0, 1, 0] as [number, number, number], slopeAlongHeading: 0 });
  const obstacles: ObstacleCollision[] = [];
  let current = createInitialRoverState(0, 0, 0);
  current.speed = 4.0; // Moving forward

  // Steer hard right for 10 steps
  for (let step = 0; step < 10; step++) {
    const res = stepRoverPhysics(current, { throttle: 1.0, steer: 1.0 }, probe, obstacles, 0.1, MARS_PHYSICS_CONFIG);
    current = res.state;
  }

  // Steering angle must be positive and bounded by maxSteeringAngle
  assert.ok(current.steeringAngle > 0);
  assert.ok(current.steeringAngle <= MARS_PHYSICS_CONFIG.maxSteeringAngle);
  // Yaw must have turned right (positive delta)
  assert.ok(current.yaw > 0);
});

test('Tier 1.12: Rover Physics - Slope resistance opposes uphill motion', () => {
  const flatProbe = () => ({ y: 0, normal: [0, 1, 0] as [number, number, number], slopeAlongHeading: 0 });
  const uphillProbe = () => ({ y: 5, normal: [0, 0.8, -0.6] as [number, number, number], slopeAlongHeading: 0.35 }); // 35% incline
  const obstacles: ObstacleCollision[] = [];

  const stateFlat = createInitialRoverState(0, 0, 0);
  const stateUphill = createInitialRoverState(0, 0, 0);

  const resFlat = stepRoverPhysics(stateFlat, { throttle: 0.8, steer: 0 }, flatProbe, obstacles, 0.1, MARS_PHYSICS_CONFIG);
  const resUphill = stepRoverPhysics(stateUphill, { throttle: 0.8, steer: 0 }, uphillProbe, obstacles, 0.1, MARS_PHYSICS_CONFIG);

  assert.ok(
    resUphill.state.speed < resFlat.state.speed,
    `Uphill speed (${resUphill.state.speed}) must be less than flat speed (${resFlat.state.speed}) due to gravity resistance`
  );
});

test('Tier 1.12: Rover Physics - Obstacle collision with elastic pushback and -50% rebound', () => {
  const probe = () => ({ y: 0, normal: [0, 1, 0] as [number, number, number], slopeAlongHeading: 0 });
  // Place boulder right in front of rover at (0, -5) with radius 2.0m
  const obstacles: ObstacleCollision[] = [
    { x: 0, z: -5.0, radius: 2.0, id: 'boulder_alpha' }
  ];

  // Rover starting at (0, -2.5) with forward velocity of 6.0 m/s toward boulder
  const rover = createInitialRoverState(0, -2.5, 0);
  rover.speed = 6.0;

  const res = stepRoverPhysics(rover, { throttle: 1.0, steer: 0 }, probe, obstacles, 0.1, MOON_PHYSICS_CONFIG);

  assert.strictEqual(res.collisionOccurred, true);
  assert.strictEqual(res.collisionObjectId, 'boulder_alpha');
  assert.strictEqual(res.speedPenaltyApplied, true);
  assert.strictEqual(res.state.isColliding, true);

  // Speed should be negative (rebound) and reduced by approximately 50%
  assert.ok(res.state.speed < 0, `Speed should rebound negative, got ${res.state.speed}`);
  assert.ok(Math.abs(res.state.speed) <= 3.5, `Rebounded speed magnitude should be approx -50% penalty`);

  // Distance must now satisfy clearance: hypot(rover.x - obs.x, rover.z - obs.z) >= minDist
  const clearance = Math.hypot(res.state.x - obstacles[0].x, res.state.z - obstacles[0].z);
  const minDist = MOON_PHYSICS_CONFIG.roverRadius + obstacles[0].radius;
  assert.ok(clearance >= minDist - 0.01, `Clearance ${clearance} was less than required minimum ${minDist}`);
});

test('Tier 1.12: Rover Physics - World boundary enforcement', () => {
  const probe = () => ({ y: 0, normal: [0, 1, 0] as [number, number, number], slopeAlongHeading: 0 });
  const obstacles: ObstacleCollision[] = [];
  // Rover starts past the 85m boundary at (90, 0)
  const rover = createInitialRoverState(90, 0, 0);
  rover.speed = 5.0;

  const res = stepRoverPhysics(rover, { throttle: 1.0, steer: 0 }, probe, obstacles, 0.1, MOON_PHYSICS_CONFIG);

  assert.strictEqual(res.collisionOccurred, true);
  assert.strictEqual(res.speedPenaltyApplied, true);
  const finalDist = Math.hypot(res.state.x, res.state.z);
  assert.ok(finalDist <= MOON_PHYSICS_CONFIG.maxWorldRadius + 0.1);
});

test('Tier 1.12: Rover Terrain - Heightmap guarantees flat base landing plateau and continuous topography', () => {
  // Test Base landing plateau (radius < 8m)
  for (let r = 0; r < 7.5; r += 1.5) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const moonY = getRoverTerrainY(x, z, 'moon');
      const marsY = getRoverTerrainY(x, z, 'mars');
      assert.strictEqual(moonY, 0, `Moon landing zone at (${x}, ${z}) must be 0`);
      assert.strictEqual(marsY, 0, `Mars landing zone at (${x}, ${z}) must be 0`);
    }
  }

  // Outside base perimeter (r > 30m), terrain has non-zero natural altitude
  const moonOutside = getRoverTerrainY(40, 40, 'moon');
  const marsOutside = getRoverTerrainY(40, 40, 'mars');
  assert.notStrictEqual(moonOutside, 0);
  assert.notStrictEqual(marsOutside, 0);

  // Normal vector calculation returns normalized unit vector
  const normMoon = getRoverTerrainNormal(25, 25, 'moon');
  const lenMoon = Math.hypot(normMoon[0], normMoon[1], normMoon[2]);
  assert.ok(Math.abs(lenMoon - 1.0) < 1e-4, `Moon normal length should be 1.0, got ${lenMoon}`);

  const normMars = getRoverTerrainNormal(30, -20, 'mars');
  const lenMars = Math.hypot(normMars[0], normMars[1], normMars[2]);
  assert.ok(Math.abs(lenMars - 1.0) < 1e-4, `Mars normal length should be 1.0, got ${lenMars}`);
});

test('Tier 1.12: Rover Terrain - Obstacle generator preserves base zone clearance', () => {
  const moonObs = generateRoverObstacles('moon', 30);
  const marsObs = generateRoverObstacles('mars', 30);

  assert.strictEqual(moonObs.length, 30);
  assert.strictEqual(marsObs.length, 30);

  // All obstacles must be at least 12 meters away from origin (0, 0)
  for (const obs of [...moonObs, ...marsObs]) {
    const dist = Math.hypot(obs.x, obs.z);
    assert.ok(
      dist >= 12.0,
      `Obstacle ${obs.id} at dist ${dist} violates the 12m base clearing safety buffer`
    );
    assert.ok(obs.radius >= 1.0 && obs.radius <= 3.5);
  }
});

test('Tier 1.12: Rover Terrain - Resource nodes generate with valid hitpoints and types', () => {
  const moonNodes = generateRoverResourceNodes('moon');
  const marsNodes = generateRoverResourceNodes('mars');

  assert.ok(moonNodes.length >= 8);
  assert.ok(marsNodes.length >= 8);

  for (const node of [...moonNodes, ...marsNodes]) {
    assert.ok(['water', 'shield', 'science'].includes(node.type));
    assert.strictEqual(node.currentHp, 3);
    assert.strictEqual(node.isDestroyed, false);
    assert.ok(Math.hypot(node.x, node.z) >= 14.0, 'Nodes must be outside base landing zone');
  }
});

test('Tier 1.12: Rover Navigation - Bearing and distance to base calculations', () => {
  // Rover at (0, 10) facing forward (-Z): Base at (0, 0) is directly ahead!
  // Vector to base: (0, -10). Yaw 0 is along -Z. Bearing = 0 rad.
  const dist = getDistanceToBase(0, 10);
  assert.strictEqual(dist, 10);

  const bearing = getBearingToBase(0, 10, 0);
  assert.ok(Math.abs(bearing) < 1e-4, `Bearing straight ahead should be 0, got ${bearing}`);

  // Rover at (10, 0) facing forward (-Z): Base at (0, 0) is to the left (-X).
  // Relative bearing should be -PI/2 radians (-90 deg).
  const bearingLeft = getBearingToBase(10, 0, 0);
  assert.ok(Math.abs(bearingLeft - (-Math.PI / 2)) < 1e-4, `Bearing to left should be -PI/2, got ${bearingLeft}`);
});

test('Tier 1.12: Rover Models - Procedural model builders instantiate valid scene graphs', () => {
  // VIPER Model (Moon)
  const viper = buildVIPERModel();
  assert.ok(viper.root.children.length > 5, 'VIPER must have chassis, wheels, mast, drill, and headlights');
  assert.strictEqual(viper.steerableWheels.length, 2, 'VIPER must have 2 steerable front wheel pivots');
  assert.strictEqual(viper.allWheels.length, 4, 'VIPER must have 4 wheels total');
  assert.ok(viper.laserEmitter !== undefined);

  // Perseverance Model (Mars)
  const percy = buildPerseveranceModel();
  assert.ok(percy.root.children.length > 5, 'Perseverance must have chassis, 6 wheels, mast, MMRTG');
  assert.strictEqual(percy.allWheels.length, 6, 'Perseverance must have 6 wheels total');
  assert.ok(percy.steerableWheels.length >= 2);
  assert.ok(percy.laserEmitter !== undefined);

  // Base Beacon
  const beacon = buildBaseBeacon('moon');
  assert.ok(beacon.getObjectByName('BeaconLightPillar') !== undefined, 'Base beacon must have sky-high light pillar');

  // Model animation update
  updateRoverModelVisuals(viper, 4.0, 0.3, 0.05, 'moon');
  // Confirm steering angle applied to steerable wheels
  assert.strictEqual(viper.steerableWheels[0].rotation.y, 0.3);
});
