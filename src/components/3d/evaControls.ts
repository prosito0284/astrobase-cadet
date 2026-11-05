/**
 * EVA Astronaut First-Person Controller Kinematics & Collision Engine
 * Pure mathematical calculations for 60 FPS deterministic terrain following,
 * collision resolution against 6 base modules and 5 corrugated tunnels,
 * and compass yaw normalization.
 */

import { BaseLocation } from '../../types/game';
import { getTerrainHeight } from './base3DBuilder';

export interface EvaControllerState {
  x: number;
  y: number;
  z: number;
  yaw: number;       // Camera horizontal rotation in radians (Three.js Y-rotation)
  pitch: number;     // Camera vertical rotation in radians (Three.js X-rotation)
  isMoving: boolean;
  isSprinting: boolean;
  walkBobPhase?: number;
}

export interface DomeCollider {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
}

export interface TunnelCollider {
  id: string;
  name: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  radius: number;
}

// 6 Base Modules (radial cylinder colliders)
export const MODULE_COLLIDERS: readonly DomeCollider[] = [
  { id: 'regolith_shield', name: 'Hábitat Central', x: 0, z: 0, radius: 4.6 },
  { id: 'greenhouse', name: 'Invernadero Veggie', x: 8.5, z: -4.5, radius: 3.6 },
  { id: 'solar_farm', name: 'Paneles Solares', x: -8.5, z: -5.5, radius: 3.6 },
  { id: 'comm_array', name: 'Antena DSN', x: -8.0, z: 6.5, radius: 2.8 },
  { id: 'water_ice_extractor', name: 'Mina Criogénica', x: 8.0, z: 6.5, radius: 2.8 },
  { id: 'storm_bunker', name: 'Búnker de Tormentas', x: 0, z: 10.5, radius: 2.6 },
] as const;

// 5 Pressurized Corrugated Tunnels linking central dome to outer modules
// Tunnel segments are defined from outside the central dome staging area to the module entrance
export const TUNNEL_COLLIDERS: readonly TunnelCollider[] = [
  { id: 'tunnel_greenhouse', name: 'Túnel Invernadero', x1: 3.5, z1: -1.85, x2: 6.5, z2: -3.44, radius: 0.75 },
  { id: 'tunnel_solar', name: 'Túnel Solar', x1: -3.5, z1: -2.26, x2: -6.5, z2: -4.21, radius: 0.75 },
  { id: 'tunnel_comms', name: 'Túnel DSN', x1: -3.3, z1: 2.68, x2: -6.2, z2: 5.04, radius: 0.75 },
  { id: 'tunnel_ice', name: 'Túnel Mina Criogénica', x1: 3.3, z1: 2.68, x2: 6.2, z2: 5.04, radius: 0.75 },
  // Bunker tunnel starts at z=6.8 to preserve the airlock exit porch at (0, 5.5)
  { id: 'tunnel_bunker', name: 'Túnel Búnker', x1: 0, z1: 6.8, x2: 0, z2: 8.8, radius: 0.75 },
] as const;

// Constants
export const EVA_SPAWN_POINT = { x: 0, y: 1.7, z: 5.5, yaw: 0, pitch: 0 } as const;
export const MAX_EXPLORATION_RADIUS = 52.0; // Terrain mesh radius safe clamp
export const EVA_WALK_SPEED = 3.2;         // meters per second
export const EVA_SPRINT_SPEED = 5.8;       // meters per second
export const EYE_HEIGHT_OFFSET = 1.70;     // meters above local terrain
export const PLAYER_COLLISION_RADIUS = 0.45; // astronaut spacesuit collision capsule radius

/**
 * Normalizes camera yaw angle into 0° to 360° compass heading.
 * In Three.js coordinates, camera forward is (0, 0, -1) which corresponds to North (0°).
 * Rotating right decreases camera.rotation.y, corresponding to increasing clockwise heading (East = 90°).
 */
export function normalizeCompassDegrees(yawRad: number): number {
  let deg = (-yawRad * (180 / Math.PI)) % 360;
  if (deg < 0) {
    deg += 360;
  }
  // Prevent JavaScript -0 representation
  return Math.abs(deg) < 1e-9 ? 0 : deg;
}

/**
 * Returns cardinal compass point for a normalized degree heading.
 */
export function getCardinalDirection(deg: number): 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
}

/**
 * Updates mouse look angles (yaw and pitch) with pitch clamping to prevent gimbal flip.
 */
export function updateEvaMouseLook(
  state: EvaControllerState,
  movementX: number,
  movementY: number,
  sensitivity: number = 0.002
): void {
  state.yaw -= movementX * sensitivity;
  state.pitch -= movementY * sensitivity;

  // Clamp vertical pitch to ~[-80°, +80°]
  const MAX_PITCH = 1.4;
  state.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, state.pitch));
}

// Dynamic expansion building colliders registry (Rover Hangar, 2nd Greenhouse, DSOC Tower)
let activeExpansionColliders: DomeCollider[] = [];

export function setExpansionColliders(colliders: DomeCollider[]): void {
  activeExpansionColliders = [...colliders];
}

export function getExpansionColliders(): DomeCollider[] {
  return activeExpansionColliders;
}

export function clearExpansionColliders(): void {
  activeExpansionColliders = [];
}

/**
 * Resolves 2D collisions against all 6 module cylinders, expansion buildings, 5 tunnel line segments,
 * and the outer terrain perimeter boundary.
 *
 * Returns resolved coordinates and whether any collision was corrected.
 */
export function resolveCollisions(
  x: number,
  z: number,
  playerRadius: number = PLAYER_COLLISION_RADIUS,
  extraColliders?: readonly DomeCollider[]
): { x: number; z: number; collided: boolean } {
  let resX = x;
  let resZ = z;
  let collided = false;

  const allColliders = extraColliders 
    ? [...MODULE_COLLIDERS, ...extraColliders]
    : [...MODULE_COLLIDERS, ...activeExpansionColliders];

  // 1. Resolve Radial Dome Cylinder Collisions (6 modules + expansion structures)
  for (const module of allColliders) {
    const dx = resX - module.x;
    const dz = resZ - module.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = module.radius + playerRadius;

    if (dist < minDist) {
      collided = true;
      if (dist > 0.0001) {
        resX = module.x + (dx / dist) * minDist;
        resZ = module.z + (dz / dist) * minDist;
      } else {
        // Fallback if exactly at center
        resZ = module.z + minDist;
      }
    }
  }

  // 2. Resolve Tunnel Capsule / Line-Segment Collisions (5 tunnels)
  for (const tunnel of TUNNEL_COLLIDERS) {
    const segDx = tunnel.x2 - tunnel.x1;
    const segDz = tunnel.z2 - tunnel.z1;
    const segLenSq = segDx * segDx + segDz * segDz;

    if (segLenSq > 0) {
      // Project (resX, resZ) onto the segment
      const t = ((resX - tunnel.x1) * segDx + (resZ - tunnel.z1) * segDz) / segLenSq;
      const clampedT = Math.max(0, Math.min(1, t));

      const closestX = tunnel.x1 + clampedT * segDx;
      const closestZ = tunnel.z1 + clampedT * segDz;

      const sepDx = resX - closestX;
      const sepDz = resZ - closestZ;
      const sepDist = Math.sqrt(sepDx * sepDx + sepDz * sepDz);
      const minTunnelDist = tunnel.radius + playerRadius;

      if (sepDist < minTunnelDist) {
        collided = true;
        if (sepDist > 0.0001) {
          resX = closestX + (sepDx / sepDist) * minTunnelDist;
          resZ = closestZ + (sepDz / sepDist) * minTunnelDist;
        } else {
          // Perpendicular pushout
          const segLen = Math.sqrt(segLenSq);
          const perpX = -segDz / segLen;
          const perpZ = segDx / segLen;
          resX = closestX + perpX * minTunnelDist;
          resZ = closestZ + perpZ * minTunnelDist;
        }
      }
    }
  }

  // 3. Safe Terrain Boundary Clamp
  const currentDist = Math.sqrt(resX * resX + resZ * resZ);
  if (currentDist > MAX_EXPLORATION_RADIUS) {
    collided = true;
    const scale = MAX_EXPLORATION_RADIUS / currentDist;
    resX *= scale;
    resZ *= scale;
  }

  return { x: resX, z: resZ, collided };
}

/**
 * Updates first-person astronaut movement kinematics:
 * WASD directional vector, sprint modifier, eye-height terrain elevation following,
 * walking head bob, and collision resolution against domes/tunnels.
 */
export function updateEvaMovement(
  dt: number,
  state: EvaControllerState,
  keys: Record<string, boolean>,
  location: BaseLocation,
  extraColliders?: readonly DomeCollider[]
): void {
  // Delta time clamping against lag spikes / background tab jumps
  const safeDt = Math.max(0, Math.min(dt, 0.1));

  // Determine directional input keys
  const forward = !!(keys['KeyW'] || keys['keyw'] || keys['w'] || keys['W'] || keys['ArrowUp']);
  const backward = !!(keys['KeyS'] || keys['keys'] || keys['s'] || keys['S'] || keys['ArrowDown']);
  const strafeLeft = !!(keys['KeyA'] || keys['keya'] || keys['a'] || keys['A'] || keys['ArrowLeft']);
  const strafeRight = !!(keys['KeyD'] || keys['keyd'] || keys['d'] || keys['D'] || keys['ArrowRight']);
  const sprint = !!(keys['ShiftLeft'] || keys['ShiftRight'] || keys['Shift'] || keys['shift']);

  // Forward unit vector based on horizontal yaw
  // In Three.js standard coordinates:
  // Forward along camera look direction: (-sin(yaw), 0, -cos(yaw))
  // Right along camera right direction: (cos(yaw), 0, -sin(yaw))
  const fwdX = -Math.sin(state.yaw);
  const fwdZ = -Math.cos(state.yaw);
  const rightX = Math.cos(state.yaw);
  const rightZ = -Math.sin(state.yaw);

  let moveX = 0;
  let moveZ = 0;

  if (forward) {
    moveX += fwdX;
    moveZ += fwdZ;
  }
  if (backward) {
    moveX -= fwdX;
    moveZ -= fwdZ;
  }
  if (strafeRight) {
    moveX += rightX;
    moveZ += rightZ;
  }
  if (strafeLeft) {
    moveX -= rightX;
    moveZ -= rightZ;
  }

  const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
  const isMoving = moveLen > 0.001;

  state.isMoving = isMoving;
  state.isSprinting = isMoving && sprint;

  let nextX = state.x;
  let nextZ = state.z;

  if (isMoving) {
    // Normalize movement direction
    const normX = moveX / moveLen;
    const normZ = moveZ / moveLen;
    const currentSpeed = state.isSprinting ? EVA_SPRINT_SPEED : EVA_WALK_SPEED;

    nextX += normX * currentSpeed * safeDt;
    nextZ += normZ * currentSpeed * safeDt;

    // Advance walking bob phase
    const bobFrequency = state.isSprinting ? 12 : 8;
    state.walkBobPhase = (state.walkBobPhase || 0) + safeDt * bobFrequency;
  } else {
    // Decay bob phase smoothly back to 0
    state.walkBobPhase = 0;
  }

  // Resolve dome, tunnel, perimeter, and expansion building collisions
  const resolved = resolveCollisions(nextX, nextZ, PLAYER_COLLISION_RADIUS, extraColliders);
  state.x = resolved.x;
  state.z = resolved.z;

  // Calculate subtle walking vertical bobbing
  let walkBob = 0;
  if (state.isMoving && state.walkBobPhase !== undefined) {
    const bobAmplitude = state.isSprinting ? 0.05 : 0.03;
    walkBob = Math.sin(state.walkBobPhase) * bobAmplitude;
  }

  // Follow terrain elevation with eye height offset and walk bob
  const terrainElevation = getTerrainHeight(state.x, state.z, location);
  state.y = terrainElevation + EYE_HEIGHT_OFFSET + walkBob;
}
