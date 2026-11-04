/**
 * Standalone Real-Time Rover Vehicle Physics Engine
 * Astrobase Cadet - NASA Planetary Exploration Minigame
 * Pure TypeScript implementation for deterministic testability and zero-DOM dependencies.
 */

export interface RoverPhysicsState {
  x: number;
  y: number;
  z: number;
  yaw: number;           // Heading angle in radians (0 = forward along -Z)
  speed: number;         // Current linear velocity (m/s)
  steeringAngle: number; // Current steering angle in radians
  pitch: number;         // Pitch angle in radians (slope front-to-back)
  roll: number;          // Roll angle in radians (slope side-to-side)
  angularVelocity: number;
  isColliding: boolean;
  collisionImpulse: number;
}

export interface RoverControlInput {
  throttle: number; // -1 (reverse) to +1 (forward)
  steer: number;    // -1 (left) to +1 (right)
  brake?: boolean;
  reset?: boolean;
}

export interface ObstacleCollision {
  x: number;
  z: number;
  radius: number;
  id?: string;
}

export interface RoverPhysicsConfig {
  maxSpeedForward: number;     // m/s (e.g., 7.5 m/s)
  maxSpeedReverse: number;     // m/s (e.g., 3.5 m/s)
  acceleration: number;        // m/s^2 forward thrust
  brakingDecel: number;        // m/s^2 brake friction
  naturalFriction: number;     // m/s^2 rolling resistance
  maxSteeringAngle: number;    // radians (e.g., ~32 degrees)
  steeringSpeed: number;       // rad/s steering responsiveness
  wheelBase: number;           // meters
  gravity: number;             // m/s^2 (Moon: 1.62, Mars: 3.72)
  slopeResistanceFactor: number;
  roverRadius: number;         // meters for circular collision hull
  maxWorldRadius: number;      // meters boundary limit
}

export const MOON_PHYSICS_CONFIG: RoverPhysicsConfig = {
  maxSpeedForward: 7.0,
  maxSpeedReverse: 3.2,
  acceleration: 5.5,
  brakingDecel: 10.0,
  naturalFriction: 1.8,
  maxSteeringAngle: Math.PI / 5.5, // ~32.7 deg
  steeringSpeed: 3.2,
  wheelBase: 1.8,
  gravity: 1.62,
  slopeResistanceFactor: 3.8,
  roverRadius: 1.5,
  maxWorldRadius: 85.0,
};

export const MARS_PHYSICS_CONFIG: RoverPhysicsConfig = {
  maxSpeedForward: 8.5,
  maxSpeedReverse: 3.8,
  acceleration: 6.8,
  brakingDecel: 12.0,
  naturalFriction: 2.2,
  maxSteeringAngle: Math.PI / 5.2, // ~34.6 deg
  steeringSpeed: 3.6,
  wheelBase: 2.2,
  gravity: 3.72,
  slopeResistanceFactor: 4.5,
  roverRadius: 1.7,
  maxWorldRadius: 85.0,
};

/**
 * Creates an initial vehicle state vector.
 */
export function createInitialRoverState(spawnX = 0, spawnZ = 8, initialYaw = 0): RoverPhysicsState {
  return {
    x: spawnX,
    y: 0,
    z: spawnZ,
    yaw: initialYaw,
    speed: 0,
    steeringAngle: 0,
    pitch: 0,
    roll: 0,
    angularVelocity: 0,
    isColliding: false,
    collisionImpulse: 0,
  };
}

/**
 * Computes forward vector from yaw angle.
 * Heading convention: 0 rad points along -Z, PI/2 points along -X.
 */
export function getHeadingVector(yaw: number): [number, number] {
  return [-Math.sin(yaw), -Math.cos(yaw)];
}

/**
 * Computes rightward lateral vector from yaw angle.
 */
export function getRightVector(yaw: number): [number, number] {
  return [Math.cos(yaw), -Math.sin(yaw)];
}

export interface TerrainProbe {
  (x: number, z: number): {
    y: number;
    normal: [number, number, number];
    slopeAlongHeading: number;
  };
}

export interface RoverPhysicsStepResult {
  state: RoverPhysicsState;
  collisionOccurred: boolean;
  collisionObjectId?: string;
  speedPenaltyApplied: boolean;
}

/**
 * Steps vehicle physics forward by dt seconds with deterministic clamping and collision resolution.
 */
export function stepRoverPhysics(
  currentState: RoverPhysicsState,
  input: RoverControlInput,
  probeTerrain: TerrainProbe,
  obstacles: ObstacleCollision[],
  rawDt: number,
  config: RoverPhysicsConfig = MOON_PHYSICS_CONFIG
): RoverPhysicsStepResult {
  // DeltaTime strictly clamped to Math.min(rawDt, 0.1) to prevent physics explosion
  const dt = Math.max(0, Math.min(rawDt, 0.1));
  if (dt <= 0) {
    return {
      state: { ...currentState },
      collisionOccurred: false,
      speedPenaltyApplied: false,
    };
  }

  const nextState: RoverPhysicsState = { ...currentState };
  let collisionOccurred = false;
  let collisionObjectId: string | undefined = undefined;
  let speedPenaltyApplied = false;

  // 1. Vehicle re-centering / recovery if reset is requested
  if (input.reset) {
    nextState.speed = 0;
    nextState.pitch = 0;
    nextState.roll = 0;
    nextState.steeringAngle = 0;
    nextState.angularVelocity = 0;
    nextState.collisionImpulse = 0;
    nextState.isColliding = false;
    const terrain = probeTerrain(nextState.x, nextState.z);
    nextState.y = terrain.y;
    return {
      state: nextState,
      collisionOccurred: false,
      speedPenaltyApplied: false,
    };
  }

  // 2. Steering angle interpolation
  const targetSteering = Math.max(-1, Math.min(1, input.steer)) * config.maxSteeringAngle;
  const steerDelta = targetSteering - nextState.steeringAngle;
  const maxSteerStep = config.steeringSpeed * dt;
  if (Math.abs(steerDelta) <= maxSteerStep) {
    nextState.steeringAngle = targetSteering;
  } else {
    nextState.steeringAngle += Math.sign(steerDelta) * maxSteerStep;
  }

  // 3. Slope gradient and terrain normal at current position
  const currentTerrain = probeTerrain(nextState.x, nextState.z);
  const slopeForce = -config.gravity * currentTerrain.slopeAlongHeading * config.slopeResistanceFactor;

  // 4. Acceleration and braking dynamics
  const throttle = Math.max(-1, Math.min(1, input.throttle));
  let accel = 0;

  if (input.brake) {
    // Active braking
    if (Math.abs(nextState.speed) > 0.05) {
      accel = -Math.sign(nextState.speed) * config.brakingDecel;
    } else {
      nextState.speed = 0;
    }
  } else if (throttle > 0) {
    // Forward drive
    accel = throttle * config.acceleration + slopeForce;
  } else if (throttle < 0) {
    // Reverse drive
    accel = throttle * (config.acceleration * 0.7) + slopeForce;
  } else {
    // Coasting / natural rolling resistance
    if (Math.abs(nextState.speed) > 0.05) {
      accel = -Math.sign(nextState.speed) * config.naturalFriction + slopeForce;
    } else if (Math.abs(slopeForce) > config.naturalFriction) {
      // Steep slope can cause vehicle to slide when stationary
      accel = slopeForce;
    } else {
      nextState.speed = 0;
    }
  }

  // Integrate speed
  nextState.speed += accel * dt;

  // Clamp speed bounds
  if (nextState.speed > config.maxSpeedForward) {
    nextState.speed = config.maxSpeedForward;
  } else if (nextState.speed < -config.maxSpeedReverse) {
    nextState.speed = -config.maxSpeedReverse;
  }

  // Deadband around zero to prevent infinite jitter
  if (throttle === 0 && !input.brake && Math.abs(nextState.speed) < 0.03 && Math.abs(slopeForce) <= config.naturalFriction) {
    nextState.speed = 0;
  }

  // 5. Yaw & Angular velocity integration
  // Ackermann kinematic steering model with pivot capability at very low speed
  const speedSign = nextState.speed >= 0 ? 1 : -1;
  const effectiveSpeed = Math.abs(nextState.speed) < 0.8 && Math.abs(throttle) > 0.1 
    ? 0.8 * speedSign 
    : nextState.speed;

  const yawRate = (effectiveSpeed / config.wheelBase) * Math.sin(nextState.steeringAngle);
  nextState.angularVelocity = yawRate;
  nextState.yaw += yawRate * dt;

  // Normalize yaw between -PI and PI
  while (nextState.yaw > Math.PI) nextState.yaw -= 2 * Math.PI;
  while (nextState.yaw < -Math.PI) nextState.yaw += 2 * Math.PI;

  // 6. Linear displacement integration
  const [fwdX, fwdZ] = getHeadingVector(nextState.yaw);
  nextState.x += fwdX * nextState.speed * dt;
  nextState.z += fwdZ * nextState.speed * dt;

  // 7. Elastic Obstacle Collision Resolution
  nextState.isColliding = false;
  nextState.collisionImpulse = 0;

  for (const obs of obstacles) {
    const dx = nextState.x - obs.x;
    const dz = nextState.z - obs.z;
    const dist = Math.hypot(dx, dz);
    const minDist = config.roverRadius + obs.radius;

    if (dist < minDist && dist > 0.0001) {
      collisionOccurred = true;
      collisionObjectId = obs.id;
      nextState.isColliding = true;

      // Elastic pushback along collision normal
      const nx = dx / dist;
      const nz = dz / dist;
      const penetration = minDist - dist;
      nextState.x += nx * penetration * 1.05;
      nextState.z += nz * penetration * 1.05;

      // Speed penalty: -50% rebound
      if (Math.abs(nextState.speed) > 0.2) {
        nextState.speed = -nextState.speed * 0.5;
        speedPenaltyApplied = true;
        nextState.collisionImpulse = Math.abs(nextState.speed);
      }
    }
  }

  // 8. World Boundary Constraint
  const distFromCenter = Math.hypot(nextState.x, nextState.z);
  if (distFromCenter > config.maxWorldRadius) {
    const nx = nextState.x / distFromCenter;
    const nz = nextState.z / distFromCenter;
    nextState.x = nx * config.maxWorldRadius;
    nextState.z = nz * config.maxWorldRadius;
    nextState.speed = -nextState.speed * 0.5;
    collisionOccurred = true;
    speedPenaltyApplied = true;
    nextState.isColliding = true;
  }

  // 9. Terrain Height and Normal Alignment (Pitch & Roll)
  const probe = probeTerrain(nextState.x, nextState.z);
  nextState.y = probe.y;

  const [headX, headZ] = getHeadingVector(nextState.yaw);
  const [sideX, sideZ] = getRightVector(nextState.yaw);
  const [normX, normY, normZ] = probe.normal;

  // Pitch: alignment along forward vector
  const forwardTilt = -(normX * headX + normZ * headZ) / Math.max(0.2, normY);
  const targetPitch = Math.atan(forwardTilt);

  // Roll: alignment along lateral vector
  const lateralTilt = -(normX * sideX + normZ * sideZ) / Math.max(0.2, normY);
  const targetRoll = Math.atan(lateralTilt);

  // Smooth terrain orientation damping (prevents sharp twitching)
  const alignmentDamping = Math.min(1.0, 10.0 * dt);
  nextState.pitch += (targetPitch - nextState.pitch) * alignmentDamping;
  nextState.roll += (targetRoll - nextState.roll) * alignmentDamping;

  return {
    state: nextState,
    collisionOccurred,
    collisionObjectId,
    speedPenaltyApplied,
  };
}

/**
 * Calculates straight-line horizontal distance to base origin (0, 0).
 */
export function getDistanceToBase(x: number, z: number): number {
  return Math.hypot(x, z);
}

/**
 * Computes bearing angle in radians from rover to Base (0, 0).
 * Relative to the rover's current yaw.
 */
export function getBearingToBase(x: number, z: number, roverYaw: number): number {
  // Vector pointing to base: dx = -x, dz = -z.
  // With 0 rad heading pointing along -Z: forward projection is z, right projection is -x.
  const angleToBaseWorld = Math.atan2(-x, z);
  let relativeAngle = angleToBaseWorld - roverYaw;
  while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
  while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
  return relativeAngle;
}
