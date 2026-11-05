import * as THREE from 'three';
import { getTerrainHeight } from '../../src/components/3d/base3DBuilder';
import { AstrobaseSimulation, clampResources } from './gameHarness';
import { BaseLocation } from '../../src/types/game';

// ============================================================================
// SPRINT 1: EVA Kinematics, Dome/Tunnel Collisions, HUD & Transitions
// ============================================================================

export interface EvaControllerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  isMoving: boolean;
  isSprinting: boolean;
}

export interface ObstacleDome {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface ObstacleTunnel {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
}

export const BASE_OBSTACLES = {
  domes: [
    { id: 'regolith_shield', x: 0, z: 0, radius: 6.0 },
    { id: 'greenhouse', x: 15, z: 0, radius: 4.2 },
    { id: 'solar_farm', x: -15, z: 0, radius: 5.0 },
    { id: 'comm_array', x: 0, z: 15, radius: 4.0 },
    { id: 'water_ice_extractor', x: 0, z: -15, radius: 4.5 },
    { id: 'storm_bunker', x: 10, z: 10, radius: 4.0 },
  ] as ObstacleDome[],
  tunnels: [
    { id: 'tun_greenhouse', x1: 0, z1: 0, x2: 15, z2: 0, width: 2.0 },
    { id: 'tun_solar', x1: 0, z1: 0, x2: -15, z2: 0, width: 2.0 },
    { id: 'tun_comm', x1: 0, z1: 0, x2: 0, z2: 15, width: 2.0 },
    { id: 'tun_ice', x1: 0, z1: 0, x2: 0, z2: -15, width: 2.0 },
    { id: 'tun_bunker', x1: 0, z1: 0, x2: 10, z2: 10, width: 2.0 },
  ] as ObstacleTunnel[],
  worldPerimeterRadius: 120.0,
};

export const EVA_CONSTANTS = {
  walkSpeedMoon: 3.5,
  walkSpeedMars: 4.0,
  sprintMultiplier: 1.6,
  eyeHeight: 1.7,
  bobFrequency: 8.0,
  bobAmplitude: 0.04,
  minPitch: -Math.PI / 3, // -60 degrees
  maxPitch: Math.PI / 3,  // +60 degrees
  baseO2DrainPerSec: 0.05,
  sprintO2DrainPerSec: 0.12,
};

export function resolveEvaObstacleCollision(
  x: number,
  z: number,
  prevX: number,
  prevZ: number,
  playerRadius: number = 0.5
): { x: number; z: number; collided: boolean } {
  let resolvedX = x;
  let resolvedZ = z;
  let collided = false;

  // 1. Dome collision (spherical/cylindrical pushback)
  for (const dome of BASE_OBSTACLES.domes) {
    const dx = resolvedX - dome.x;
    const dz = resolvedZ - dome.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = dome.radius + playerRadius;

    if (dist < minDist && dist > 0.0001) {
      collided = true;
      const normalX = dx / dist;
      const normalZ = dz / dist;
      resolvedX = dome.x + normalX * minDist;
      resolvedZ = dome.z + normalZ * minDist;
    }
  }

  // 2. Tunnel collision (line-capsule pushout)
  for (const tun of BASE_OBSTACLES.tunnels) {
    const segX = tun.x2 - tun.x1;
    const segZ = tun.z2 - tun.z1;
    const segLenSq = segX * segX + segZ * segZ;

    if (segLenSq > 0.001) {
      const u = Math.max(0, Math.min(1, ((resolvedX - tun.x1) * segX + (resolvedZ - tun.z1) * segZ) / segLenSq));
      const projX = tun.x1 + u * segX;
      const projZ = tun.z1 + u * segZ;

      const dx = resolvedX - projX;
      const dz = resolvedZ - projZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const halfWidth = tun.width * 0.5 + playerRadius;

      if (dist < halfWidth && dist > 0.0001) {
        collided = true;
        const pushX = dx / dist;
        const pushZ = dz / dist;
        resolvedX = projX + pushX * halfWidth;
        resolvedZ = projZ + pushZ * halfWidth;
      }
    }
  }

  // 3. World Perimeter Boundary Clamp
  const distFromCenter = Math.sqrt(resolvedX * resolvedX + resolvedZ * resolvedZ);
  if (distFromCenter > BASE_OBSTACLES.worldPerimeterRadius) {
    collided = true;
    const scale = BASE_OBSTACLES.worldPerimeterRadius / distFromCenter;
    resolvedX *= scale;
    resolvedZ *= scale;
  }

  return { x: resolvedX, z: resolvedZ, collided };
}

export function updateEvaKinematics(
  dt: number,
  state: EvaControllerState,
  keys: Record<string, boolean>,
  location: BaseLocation = 'moon',
  timeTotal: number = 0
): { o2Drain: number } {
  const clampedDt = Math.max(0.001, Math.min(0.1, dt));

  // Determine movement direction from WASD and yaw
  let moveX = 0;
  let moveZ = 0;

  if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

  const isMoving = moveX !== 0 || moveZ !== 0;
  const isSprinting = isMoving && Boolean(keys['ShiftLeft'] || keys['ShiftRight']);
  state.isMoving = isMoving;
  state.isSprinting = isSprinting;

  if (isMoving) {
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    const normX = moveX / len;
    const normZ = moveZ / len;

    const baseSpeed = location === 'moon' ? EVA_CONSTANTS.walkSpeedMoon : EVA_CONSTANTS.walkSpeedMars;
    const speed = baseSpeed * (isSprinting ? EVA_CONSTANTS.sprintMultiplier : 1.0);

    // Rotate local movement direction by yaw
    const forwardX = -Math.sin(state.yaw);
    const forwardZ = -Math.cos(state.yaw);
    const rightX = Math.cos(state.yaw);
    const rightZ = -Math.sin(state.yaw);

    const worldDx = (rightX * normX + forwardX * (-normZ)) * speed * clampedDt;
    const worldDz = (rightZ * normX + forwardZ * (-normZ)) * speed * clampedDt;

    const nextX = state.x + worldDx;
    const nextZ = state.z + worldDz;

    const collision = resolveEvaObstacleCollision(nextX, nextZ, state.x, state.z);
    state.x = collision.x;
    state.z = collision.z;
  }

  // Terrain height + eye height + bob
  const terrainY = getTerrainHeight(state.x, state.z, location);
  const bob = isMoving ? Math.sin(timeTotal * EVA_CONSTANTS.bobFrequency) * EVA_CONSTANTS.bobAmplitude : 0;
  state.y = terrainY + EVA_CONSTANTS.eyeHeight + bob;

  // Clamp pitch
  state.pitch = Math.max(EVA_CONSTANTS.minPitch, Math.min(EVA_CONSTANTS.maxPitch, state.pitch));

  // Calculate O2 drain
  const o2Drain = isSprinting
    ? EVA_CONSTANTS.sprintO2DrainPerSec * clampedDt
    : isMoving
      ? EVA_CONSTANTS.baseO2DrainPerSec * clampedDt
      : (EVA_CONSTANTS.baseO2DrainPerSec * 0.4) * clampedDt;

  return { o2Drain };
}

export function formatCompassTape(yawRadians: number): { degrees: number; headingLabel: string } {
  // Normalize yaw to [0, 2PI)
  let norm = yawRadians % (2 * Math.PI);
  if (norm < 0) norm += 2 * Math.PI;

  const degrees = Math.round((norm * 180) / Math.PI) % 360;

  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;

  return { degrees, headingLabel: points[index] };
}

export class EvaModeManager {
  public isEvaActive: boolean = false;
  public storedOrbitPosition: [number, number, number] = [0, 35, 45];
  public storedOrbitTarget: [number, number, number] = [0, 0, 0];
  public state: EvaControllerState = {
    x: 10,
    y: 1.7,
    z: 20,
    yaw: 0,
    pitch: 0,
    isMoving: false,
    isSprinting: false,
  };

  public enterEva(currentOrbitPos?: [number, number, number], currentOrbitTarget?: [number, number, number]): void {
    if (currentOrbitPos) this.storedOrbitPosition = [...currentOrbitPos];
    if (currentOrbitTarget) this.storedOrbitTarget = [...currentOrbitTarget];
    this.isEvaActive = true;
  }

  public exitEva(): { orbitPos: [number, number, number]; orbitTarget: [number, number, number] } {
    this.isEvaActive = false;
    return {
      orbitPos: [...this.storedOrbitPosition],
      orbitTarget: [...this.storedOrbitTarget],
    };
  }
}

// ============================================================================
// SPRINT 2: Solar Cycle, Dynamic Shadows & Moon/Mars Lighting
// ============================================================================

export function calculateSunPosition(
  timeSeconds: number,
  orbitPeriod: number = 120,
  orbitRadius: number = 150
): {
  position: [number, number, number];
  elevationDeg: number;
  azimuthDeg: number;
  isAboveHorizon: boolean;
} {
  const phase = (timeSeconds % orbitPeriod) / orbitPeriod;
  const azimuthRad = phase * 2 * Math.PI;
  // Elevation follows sinusoidal day/night cycle
  const elevationRad = Math.sin(azimuthRad) * (Math.PI / 2.2);

  const x = orbitRadius * Math.cos(azimuthRad) * Math.cos(elevationRad);
  const y = orbitRadius * Math.sin(elevationRad);
  const z = orbitRadius * Math.sin(azimuthRad) * Math.cos(elevationRad);

  const elevationDeg = (elevationRad * 180) / Math.PI;
  const azimuthDeg = ((azimuthRad * 180) / Math.PI) % 360;

  return {
    position: [x, y, z],
    elevationDeg,
    azimuthDeg,
    isAboveHorizon: y > 0,
  };
}

export function calculateDynamicShadow(
  objectHeight: number,
  elevationDeg: number,
  azimuthDeg: number
): { shadowLength: number; shadowAngleDeg: number } {
  const safeElevation = Math.max(1.0, elevationDeg);
  const elevationRad = (safeElevation * Math.PI) / 180;
  const shadowLength = objectHeight / Math.tan(elevationRad);
  const shadowAngleDeg = (azimuthDeg + 180) % 360;

  return { shadowLength, shadowAngleDeg };
}

export function getPlanetLightingParameters(location: BaseLocation, elevationDeg: number) {
  if (location === 'moon') {
    return {
      ambientIntensity: 0.05,
      directionalIntensity: 2.5,
      fogDensity: 0.0,
      shadowContrast: 'high_sharp',
      shadowBias: -0.0005,
      skyColor: '#000000',
    };
  } else {
    // Mars mode with Blue Sunset simulation (Curiosity & Perseverance ground truth)
    const isSunset = elevationDeg <= 18.0 && elevationDeg >= -5.0;
    return {
      ambientIntensity: 0.25,
      directionalIntensity: 1.8,
      fogDensity: 0.004,
      shadowContrast: 'diffuse_scattering',
      shadowBias: -0.0002,
      sunColor: isSunset ? '#4a90e2' : '#ffe4b5', // Blue sunset shift vs warm amber noon
      skyColor: isSunset ? '#5a4050' : '#d18d6e', // Dusky salmon twilight vs salmon daytime
      isBlueSunsetActive: isSunset,
    };
  }
}

// ============================================================================
// SPRINT 3: Crisis 3D Particles & Tactile Raycast Repair
// ============================================================================

export type CrisisParticleType = 'battery_fault' | 'o2_leak' | 'solar_storm';

export interface ParticleEmitterConfig {
  type: CrisisParticleType;
  moduleId: string;
  count: number;
  speedRange: [number, number];
  colorPalette: string[];
  lifetimeSec: number;
  origin: [number, number, number];
}

export const CRISIS_EMITTERS: Record<CrisisParticleType, ParticleEmitterConfig> = {
  battery_fault: {
    type: 'battery_fault',
    moduleId: 'solar_farm',
    count: 60,
    speedRange: [4.0, 8.0],
    colorPalette: ['#ffff00', '#00e5ff', '#222222'], // Electrical sparks + black smoke
    lifetimeSec: 1.5,
    origin: [-15, 2.5, 0],
  },
  o2_leak: {
    type: 'o2_leak',
    moduleId: 'regolith_shield',
    count: 100,
    speedRange: [12.0, 18.0],
    colorPalette: ['#ffffff', '#e0f7fa'], // High-pressure vapor jet in vacuum
    lifetimeSec: 0.8,
    origin: [0, 4.0, 0],
  },
  solar_storm: {
    type: 'solar_storm',
    moduleId: 'regolith_shield',
    count: 80,
    speedRange: [6.0, 10.0],
    colorPalette: ['#ff1744', '#d50000', '#ff5252'], // Pulsing crimson plasma arcs
    lifetimeSec: 2.0,
    origin: [0, 3.0, 0],
  },
};

export class TactileRepairRaycaster {
  private modules: { id: string; position: THREE.Vector3; radius: number }[];

  constructor() {
    this.modules = [
      { id: 'solar_farm', position: new THREE.Vector3(-15, 0, 0), radius: 5.0 },
      { id: 'regolith_shield', position: new THREE.Vector3(0, 0, 0), radius: 6.0 },
      { id: 'greenhouse', position: new THREE.Vector3(15, 0, 0), radius: 4.2 },
      { id: 'comm_array', position: new THREE.Vector3(0, 0, 15), radius: 4.0 },
      { id: 'water_ice_extractor', position: new THREE.Vector3(0, 0, -15), radius: 4.5 },
      { id: 'storm_bunker', position: new THREE.Vector3(10, 0, 10), radius: 4.0 },
    ];
  }

  public testRaycastIntersection(rayOrigin: THREE.Vector3, rayDirection: THREE.Vector3): string | null {
    const ray = new THREE.Ray(rayOrigin, rayDirection.clone().normalize());

    let closestHit: string | null = null;
    let closestDist = Infinity;

    for (const mod of this.modules) {
      const sphere = new THREE.Sphere(mod.position, mod.radius);
      const hitPoint = new THREE.Vector3();
      const intersects = ray.intersectSphere(sphere, hitPoint);

      if (intersects) {
        const dist = rayOrigin.distanceTo(hitPoint);
        if (dist < closestDist) {
          closestDist = dist;
          closestHit = mod.id;
        }
      }
    }

    return closestHit;
  }

  public handleTactileRepairClick(
    moduleId: string,
    sim: AstrobaseSimulation
  ): { success: boolean; action: string; clearedFault?: string } {
    if (moduleId === 'solar_farm' && sim.colony.batteryFault) {
      sim.colony.batteryFault = false;
      sim.colony.batteryFaultCount = 0;
      sim.colony.batteryLockoutSeconds = 0;
      return { success: true, action: 'EMERGENCY_BATTERY_REPAIRED', clearedFault: 'batteryFault' };
    }

    if (moduleId === 'regolith_shield' && sim.colony.emergencyO2Active) {
      sim.colony.emergencyO2Active = false;
      sim.colony.resources = clampResources({
        ...sim.colony.resources,
        oxygen: Math.min(100, sim.colony.resources.oxygen + 20),
      }, sim.colony.resources);
      return { success: true, action: 'O2_LEAK_SEALED', clearedFault: 'emergencyO2Active' };
    }

    if (moduleId === 'storm_bunker' && sim.colony.radiationActive) {
      sim.colony.radiationActive = false;
      return { success: true, action: 'RADIATION_SHIELD_OVERCHARGED', clearedFault: 'radiationActive' };
    }

    return { success: false, action: 'NO_ACTIVE_REPAIR_NEEDED' };
  }
}

// ============================================================================
// SPRINT 4: Procedural Web Audio Synth, Quindar Tones & EVA Breathing
// ============================================================================

export const AUDIO_SYNTH_SPEC = {
  chords: [
    { name: 'Em9', freqs: [82.41, 164.81, 246.94, 392.00] },
    { name: 'Cmaj7', freqs: [130.81, 196.00, 261.63, 329.63] },
    { name: 'G', freqs: [98.00, 146.83, 196.00, 293.66] },
    { name: 'Dsus4', freqs: [110.00, 146.83, 220.00, 293.66] },
  ],
  filterCenterHz: 550,
  filterSweepRange: [200, 800],
  quindarIntroHz: 2525,
  quindarOutroHz: 2475,
  quindarToleranceHz: 5,
  quindarDurationMs: 250,
  evaBreathingCycleSec: 6.6,
};

export class AudioEngineValidator {
  public isMuted: boolean = false;
  public isBreathingActive: boolean = false;
  public quindarHistory: { type: 'intro' | 'outro'; freq: number; timestamp: number }[] = [];

  public triggerQuindarIntro(): { success: boolean; frequencyHz: number; durationMs: number } {
    if (this.isMuted) return { success: false, frequencyHz: 0, durationMs: 0 };
    const freq = AUDIO_SYNTH_SPEC.quindarIntroHz;
    this.quindarHistory.push({ type: 'intro', freq, timestamp: Date.now() });
    return { success: true, frequencyHz: freq, durationMs: AUDIO_SYNTH_SPEC.quindarDurationMs };
  }

  public triggerQuindarOutro(): { success: boolean; frequencyHz: number; durationMs: number } {
    if (this.isMuted) return { success: false, frequencyHz: 0, durationMs: 0 };
    const freq = AUDIO_SYNTH_SPEC.quindarOutroHz;
    this.quindarHistory.push({ type: 'outro', freq, timestamp: Date.now() });
    return { success: true, frequencyHz: freq, durationMs: AUDIO_SYNTH_SPEC.quindarDurationMs };
  }

  public setEvaBreathing(active: boolean): void {
    this.isBreathingActive = active && !this.isMuted;
  }

  public getBreathingPhase(cycleProgressSec: number): 'inhalation' | 'pause1' | 'exhalation' | 'pause2' {
    const t = cycleProgressSec % AUDIO_SYNTH_SPEC.evaBreathingCycleSec;
    if (t < 2.8) return 'inhalation';
    if (t < 3.3) return 'pause1';
    if (t < 6.1) return 'exhalation';
    return 'pause2';
  }
}

// ============================================================================
// SPRINT 5: Base Building 3D, Hangar, 2nd Greenhouse & DSOC Tower
// ============================================================================

export interface BuildingDefinition {
  id: 'rover_hangar' | 'greenhouse_2' | 'dsoc_tower';
  nameEs: string;
  nameEn: string;
  costScience: number;
  defaultPosition: [number, number, number];
  effects: {
    batteryBonusPct?: number;
    laserRangeBonus?: number;
    extraCrewCapacity?: number;
    foodDelta?: number;
    o2Delta?: number;
    scienceMultiplier?: number;
    batteryCapacityBonus?: number;
  };
}

export const BUILDING_CATALOG: Record<string, BuildingDefinition> = {
  rover_hangar: {
    id: 'rover_hangar',
    nameEs: 'Hangar del Rover',
    nameEn: 'Rover Hangar',
    costScience: 60,
    defaultPosition: [8, 0, -8],
    effects: {
      batteryBonusPct: 50,
      laserRangeBonus: 30,
      batteryCapacityBonus: 25,
    },
  },
  greenhouse_2: {
    id: 'greenhouse_2',
    nameEs: '2º Invernadero (Domo de Crecimiento)',
    nameEn: '2nd Growth Greenhouse',
    costScience: 75,
    defaultPosition: [18, 0, 8],
    effects: {
      extraCrewCapacity: 4,
      foodDelta: 2.5,
      o2Delta: 3.0,
    },
  },
  dsoc_tower: {
    id: 'dsoc_tower',
    nameEs: 'Torre Láser Óptica (DSOC)',
    nameEn: 'Optical Laser Comm Tower (DSOC)',
    costScience: 90,
    defaultPosition: [-8, 0, 18],
    effects: {
      scienceMultiplier: 3.0,
    },
  },
};

export class BaseBuildingManager {
  public constructedBuildings: Set<string> = new Set();
  public buildingCoordinates: Map<string, [number, number, number]> = new Map();

  public canBuild(buildingId: string, currentScience: number): { allowed: boolean; reason?: string } {
    const def = BUILDING_CATALOG[buildingId];
    if (!def) return { allowed: false, reason: 'INVALID_BUILDING_ID' };
    if (this.constructedBuildings.has(buildingId)) return { allowed: false, reason: 'ALREADY_CONSTRUCTED' };
    if (currentScience < def.costScience) return { allowed: false, reason: 'INSUFFICIENT_SCIENCE' };
    return { allowed: true };
  }

  public constructBuilding(
    buildingId: string,
    sim: AstrobaseSimulation,
    coords?: [number, number, number]
  ): { success: boolean; reason?: string; effects?: any } {
    const check = this.canBuild(buildingId, sim.colony.resources.sciencePoints);
    if (!check.allowed) return { success: false, reason: check.reason };

    const def = BUILDING_CATALOG[buildingId];
    const position = coords || def.defaultPosition;

    // Validate plateau position (r <= 25)
    const distFromCenter = Math.sqrt(position[0] * position[0] + position[2] * position[2]);
    if (distFromCenter > 25.0) {
      return { success: false, reason: 'POSITION_OUTSIDE_BASE_PLATEAU' };
    }

    // Deduct science points
    sim.colony.resources = clampResources({
      ...sim.colony.resources,
      sciencePoints: sim.colony.resources.sciencePoints - def.costScience,
    }, sim.colony.resources);

    this.constructedBuildings.add(buildingId);
    this.buildingCoordinates.set(buildingId, position);

    return { success: true, effects: def.effects };
  }

  public getActiveEffects(): {
    batteryBonusPct: number;
    laserRangeBonus: number;
    batteryCapacityBonus: number;
    extraCrewCapacity: number;
    foodDelta: number;
    o2Delta: number;
    scienceMultiplier: number;
  } {
    let batteryBonusPct = 0;
    let laserRangeBonus = 0;
    let batteryCapacityBonus = 0;
    let extraCrewCapacity = 0;
    let foodDelta = 0;
    let o2Delta = 0;
    let scienceMultiplier = 1.0;

    for (const id of this.constructedBuildings) {
      const def = BUILDING_CATALOG[id];
      if (def?.effects) {
        if (def.effects.batteryBonusPct) batteryBonusPct += def.effects.batteryBonusPct;
        if (def.effects.laserRangeBonus) laserRangeBonus += def.effects.laserRangeBonus;
        if (def.effects.batteryCapacityBonus) batteryCapacityBonus += def.effects.batteryCapacityBonus;
        if (def.effects.extraCrewCapacity) extraCrewCapacity += def.effects.extraCrewCapacity;
        if (def.effects.foodDelta) foodDelta += def.effects.foodDelta;
        if (def.effects.o2Delta) o2Delta += def.effects.o2Delta;
        if (def.effects.scienceMultiplier) scienceMultiplier *= def.effects.scienceMultiplier;
      }
    }

    return {
      batteryBonusPct,
      laserRangeBonus,
      batteryCapacityBonus,
      extraCrewCapacity,
      foodDelta,
      o2Delta,
      scienceMultiplier,
    };
  }
}

// ============================================================================
// SPRINT 6: NASA Geological Samples, Stacking Buffs & Cabinet Vitrine
// ============================================================================

export interface GeologicalSample {
  id: string;
  type: 'polar_ice_cores' | 'jezero_clays_biofirmas' | 'lunar_basalts';
  titleEs: string;
  titleEn: string;
  location: BaseLocation;
  discoverySol: number;
  nasaMissionRef: string;
  scientificFactEs: string;
  scientificFactEn: string;
  stackingBonus: {
    scienceBonusPct: number;
    moraleBonus: number;
    shieldBonusPct?: number;
    waterEfficiencyBonusPct?: number;
  };
}

export const GEOLOGICAL_CATALOG: Record<string, GeologicalSample> = {
  polar_ice_cores: {
    id: 'polar_ice_cores',
    type: 'polar_ice_cores',
    titleEs: 'Núcleo de Hielo Criogénico Polar',
    titleEn: 'Cryogenic Polar Ice Core',
    location: 'moon',
    discoverySol: 1,
    nasaMissionRef: 'NASA VIPER & LRO Diviner Lunar South Pole PSR',
    scientificFactEs: 'Depósitos de hielo atrapados en regiones permanentemente sombreadas (PSR) a -230°C.',
    scientificFactEn: 'Water-ice deposits permanently shadowed in cold traps at 40 Kelvin (-230°C).',
    stackingBonus: {
      scienceBonusPct: 15,
      moraleBonus: 10,
      waterEfficiencyBonusPct: 20,
    },
  },
  jezero_clays_biofirmas: {
    id: 'jezero_clays_biofirmas',
    type: 'jezero_clays_biofirmas',
    titleEs: 'Arcillas Fluviales con Potencial de Biofirmas',
    titleEn: 'Fluvial Delta Clays with Biosignature Potential',
    location: 'mars',
    discoverySol: 1,
    nasaMissionRef: 'NASA Mars 2020 Perseverance Rover PIXL/SHERLOC',
    scientificFactEs: 'Filosilicatos depositados por un lago milenario en Jezero capaces de preservar microfósiles.',
    scientificFactEn: 'Phyllosilicates deposited in an ancient Jezero paleolake capable of preserving organic biosignatures.',
    stackingBonus: {
      scienceBonusPct: 25,
      moraleBonus: 15,
      shieldBonusPct: 5,
    },
  },
  lunar_basalts: {
    id: 'lunar_basalts',
    type: 'lunar_basalts',
    titleEs: 'Basaltos Ilmeníticos Lunares',
    titleEn: 'Lunar Ilmenite Mare Basalt',
    location: 'moon',
    discoverySol: 1,
    nasaMissionRef: 'NASA Apollo 11 & 17 Lunar Sample Return',
    scientificFactEs: 'Rocas volcánicas ricas en óxido de titanio (FeTiO3) ideales para escudo contra radiación.',
    scientificFactEn: 'Volcanic titanium-iron oxide rock providing regolith radiation shielding.',
    stackingBonus: {
      scienceBonusPct: 10,
      moraleBonus: 10,
      shieldBonusPct: 15,
    },
  },
};

export class GeologicalCabinetManager {
  public vitrine: Map<string, { sample: GeologicalSample; quantity: number }> = new Map();

  public rollGeologicalSample(
    location: BaseLocation,
    targetId: string,
    rollRandom: number = Math.random()
  ): GeologicalSample | null {
    // 40% probability of discovering geological specimen on sortie
    if (rollRandom > 0.40) return null;

    if (location === 'moon') {
      if (targetId === 'shackleton_rim') return { ...GEOLOGICAL_CATALOG['polar_ice_cores'] };
      return { ...GEOLOGICAL_CATALOG['lunar_basalts'] };
    } else {
      return { ...GEOLOGICAL_CATALOG['jezero_clays_biofirmas'] };
    }
  }

  public addSample(sample: GeologicalSample, currentSol: number): void {
    const existing = this.vitrine.get(sample.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.vitrine.set(sample.id, {
        sample: { ...sample, discoverySol: currentSol },
        quantity: 1,
      });
    }
  }

  public getCumulativeBuffs(): {
    totalScienceBonusPct: number;
    totalMoraleBonus: number;
    totalShieldBonusPct: number;
    totalWaterEfficiencyBonusPct: number;
  } {
    let totalScienceBonusPct = 0;
    let totalMoraleBonus = 0;
    let totalShieldBonusPct = 0;
    let totalWaterEfficiencyBonusPct = 0;

    for (const entry of this.vitrine.values()) {
      const q = entry.quantity;
      const b = entry.sample.stackingBonus;
      totalScienceBonusPct += b.scienceBonusPct * q;
      totalMoraleBonus += b.moraleBonus * q;
      if (b.shieldBonusPct) totalShieldBonusPct += b.shieldBonusPct * q;
      if (b.waterEfficiencyBonusPct) totalWaterEfficiencyBonusPct += b.waterEfficiencyBonusPct * q;
    }

    return {
      totalScienceBonusPct,
      totalMoraleBonus,
      totalShieldBonusPct,
      totalWaterEfficiencyBonusPct,
    };
  }
}
