import * as THREE from 'three';
import { BaseBuildingId, BaseBuildingDefinition, BaseBuildingEffects, BaseLocation } from '../../types/game';
import { getTerrainHeight } from './base3DBuilder';
import { disposeThreeObject } from './disposal';

export const BUILDING_CATALOG: Record<BaseBuildingId, BaseBuildingDefinition> = {
  rover_hangar: {
    id: 'rover_hangar',
    nameEs: 'Hangar del Rover',
    nameEn: 'Rover Hangar',
    descriptionEs: 'Bahía industrial de mantenimiento con recarga inductiva acelerada de baterías, banco extendido de +25 kWh y calibrador de láser minero de largo alcance.',
    descriptionEn: 'Industrial maintenance bay with accelerated inductive battery recharge, +25 kWh extended capacity buffer, and long-range mining laser collimator.',
    costScience: 60,
    defaultPosition: [0, 0, -15],
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
    descriptionEs: 'Biodomo geodésico presurizado con iluminación hidropónica LED dual (esmeralda/magenta) y torres aeropónicas que expande el soporte vital hasta 10 tripulantes.',
    descriptionEn: 'Pressurized geodesic biodome with dual-spectrum hydroponic LED lighting and aeroponic towers expanding life support capacity up to 10 crew members.',
    costScience: 75,
    defaultPosition: [18, 0, 8],
    effects: {
      extraCrewCapacity: 4,
      foodDelta: 12,
      o2Delta: 6,
    },
  },
  dsoc_tower: {
    id: 'dsoc_tower',
    nameEs: 'Torre Láser Óptica (DSOC)',
    nameEn: 'Optical Laser Comm Tower (DSOC)',
    descriptionEs: 'Terminal Deep Space Optical Communications con mástil de celosía y emisor láser hacia la Tierra que triplica la velocidad de transmisión de telemetría científica.',
    descriptionEn: 'Deep Space Optical Communications terminal with lattice truss mast and Earth-pointing optical laser pulse emitter, tripling telemetry transmission speed.',
    costScience: 90,
    defaultPosition: [-8, 0, 18],
    effects: {
      scienceMultiplier: 3.0,
    },
  },
};

export interface ExpansionCollider {
  id: BaseBuildingId;
  name: string;
  x: number;
  z: number;
  radius: number;
}

export const EXPANSION_COLLIDER_RADII: Record<BaseBuildingId, number> = {
  rover_hangar: 4.5,
  greenhouse_2: 4.0,
  dsoc_tower: 3.0,
};

export const EXPANSION_COLLIDER_DEFS: Record<BaseBuildingId, { id: string; name: string; x: number; z: number; radius: number }> = {
  rover_hangar: { id: 'exp_rover_hangar', name: 'Hangar del Rover', x: 0, z: -15, radius: 4.5 },
  greenhouse_2: { id: 'exp_greenhouse_2', name: '2º Invernadero (Domo)', x: 18, z: 8, radius: 4.0 },
  dsoc_tower: { id: 'exp_dsoc_tower', name: 'Torre Láser DSOC', x: -8, z: 18, radius: 3.0 },
};

/**
 * Builds the 3D procedural mesh for the Rover Hangar (`rover_hangar`).
 * Includes reinforced garage arch canopy, deployment ramp, battery charging stanchions, and blinking status beacon.
 */
export function buildRoverHangarMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'expansion_rover_hangar';
  group.userData.buildingId = 'rover_hangar';

  // 1. Reinforced Foundation & Platform Floor
  const floorGeom = new THREE.BoxGeometry(7.2, 0.4, 8.0);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.65,
    roughness: 0.4,
  });
  const floorMesh = new THREE.Mesh(floorGeom, floorMat);
  floorMesh.position.set(0, 0.2, 0);
  floorMesh.castShadow = true;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Yellow hazard parking stripes on floor
  const stripeGeom = new THREE.BoxGeometry(0.2, 0.42, 6.0);
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.5,
    metalness: 0.2,
    emissive: 0x78350f,
    emissiveIntensity: 0.4,
  });
  const leftStripe = new THREE.Mesh(stripeGeom, stripeMat);
  leftStripe.position.set(-2.0, 0.21, 0);
  group.add(leftStripe);

  const rightStripe = new THREE.Mesh(stripeGeom, stripeMat);
  rightStripe.position.set(2.0, 0.21, 0);
  group.add(rightStripe);

  // 2. Deployment Ramp leading smoothly down to regolith
  const rampGeom = new THREE.BoxGeometry(6.4, 0.25, 3.2);
  rampGeom.rotateX(0.18);
  const rampMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.7,
    roughness: 0.45,
  });
  const ramp = new THREE.Mesh(rampGeom, rampMat);
  ramp.position.set(0, 0.05, 5.2);
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  group.add(ramp);

  // 3. Heavy Arch Shell / Reinforced Industrial Canopy
  const archGeom = new THREE.CylinderGeometry(3.6, 3.6, 7.6, 24, 1, true, 0, Math.PI);
  archGeom.rotateZ(Math.PI / 2);
  const archMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.3,
    side: THREE.DoubleSide,
  });
  const arch = new THREE.Mesh(archGeom, archMat);
  arch.position.set(0, 2.2, 0);
  arch.castShadow = true;
  arch.receiveShadow = true;
  group.add(arch);

  // Outer ribbed reinforcements (Torus segments / arch rib boxes)
  const ribGeom = new THREE.BoxGeometry(0.35, 4.0, 0.4);
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
  for (let z = -3.2; z <= 3.2; z += 1.6) {
    const leftPillar = new THREE.Mesh(ribGeom, ribMat);
    leftPillar.position.set(-3.65, 2.0, z);
    leftPillar.castShadow = true;
    group.add(leftPillar);

    const rightPillar = new THREE.Mesh(ribGeom, ribMat);
    rightPillar.position.set(3.65, 2.0, z);
    rightPillar.castShadow = true;
    group.add(rightPillar);
  }

  // 4. Rear Wall & Diagnostic Workbench
  const backWallGeom = new THREE.BoxGeometry(7.0, 3.6, 0.4);
  const backWall = new THREE.Mesh(backWallGeom, archMat);
  backWall.position.set(0, 2.0, -3.8);
  backWall.castShadow = true;
  group.add(backWall);

  // 5. Battery Charging Stanchions (Dual Inductive Terminals)
  const stanchionGeom = new THREE.CylinderGeometry(0.2, 0.25, 2.2, 12);
  const stanchionMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });
  const terminalGeom = new THREE.SphereGeometry(0.28, 12, 12);
  const terminalMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
  });

  const leftStanchion = new THREE.Mesh(stanchionGeom, stanchionMat);
  leftStanchion.position.set(-2.4, 1.3, -2.4);
  leftStanchion.castShadow = true;
  group.add(leftStanchion);

  const leftTerminal = new THREE.Mesh(terminalGeom, terminalMat);
  leftTerminal.position.set(-2.4, 2.4, -2.4);
  group.add(leftTerminal);

  const rightStanchion = new THREE.Mesh(stanchionGeom, stanchionMat);
  rightStanchion.position.set(2.4, 1.3, -2.4);
  rightStanchion.castShadow = true;
  group.add(rightStanchion);

  const rightTerminal = new THREE.Mesh(terminalGeom, terminalMat);
  rightTerminal.position.set(2.4, 2.4, -2.4);
  group.add(rightTerminal);

  // 6. Roof Status Beacon (Flashing amber/cyan beacon)
  const beaconMastGeom = new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8);
  const beaconMast = new THREE.Mesh(beaconMastGeom, stanchionMat);
  beaconMast.position.set(0, 4.4, 0);
  group.add(beaconMast);

  const beaconLightGeom = new THREE.SphereGeometry(0.25, 12, 12);
  const beaconLightMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const beaconLight = new THREE.Mesh(beaconLightGeom, beaconLightMat);
  beaconLight.name = 'hangar_beacon_bulb';
  beaconLight.position.set(0, 5.1, 0);
  group.add(beaconLight);

  return group;
}

/**
 * Builds the 3D procedural mesh for the 2nd Greenhouse / Growth Dome (`greenhouse_2`).
 * Features a geodesic biodome, interior hydroponic lighting (emerald/magenta glow),
 * tiered aeroponic nutrient towers, and airlock collar.
 */
export function build2ndGreenhouseMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'expansion_greenhouse_2';
  group.userData.buildingId = 'greenhouse_2';

  // 1. Concrete Base Ring / Foundation
  const ringGeom = new THREE.CylinderGeometry(5.2, 5.4, 0.6, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.6,
    metalness: 0.3,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.set(0, 0.3, 0);
  ring.castShadow = true;
  ring.receiveShadow = true;
  group.add(ring);

  // 2. Geodesic Biodome Glass Canopy (Translucent physical dome)
  const domeGeom = new THREE.SphereGeometry(5.0, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const domeMat = new THREE.MeshPhysicalMaterial({
    color: 0xa7f3d0,
    emissive: 0x059669,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.55,
    roughness: 0.15,
    metalness: 0.1,
    transmission: 0.7,
    side: THREE.DoubleSide,
  });
  const dome = new THREE.Mesh(domeGeom, domeMat);
  dome.name = 'greenhouse_glass_dome';
  dome.position.set(0, 0.6, 0);
  dome.castShadow = true;
  dome.receiveShadow = true;
  group.add(dome);

  // Geodesic Structural Strut Framework (Wireframe lattice overlay)
  const strutGeom = new THREE.SphereGeometry(5.04, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const strutMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.2,
    wireframe: true,
  });
  const struts = new THREE.Mesh(strutGeom, strutMat);
  struts.position.set(0, 0.6, 0);
  group.add(struts);

  // 3. Central Aeroponic Nutrient Tower (Emerald/Magenta tiered rings)
  const centralPoleGeom = new THREE.CylinderGeometry(0.3, 0.3, 4.2, 16);
  const centralPoleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  const centralPole = new THREE.Mesh(centralPoleGeom, centralPoleMat);
  centralPole.position.set(0, 2.7, 0);
  group.add(centralPole);

  const nutrientRingGeom = new THREE.TorusGeometry(1.8, 0.28, 12, 24);
  nutrientRingGeom.rotateX(Math.PI / 2);
  const emeraldMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  const magentaMat = new THREE.MeshStandardMaterial({
    color: 0xd946ef,
    emissive: 0xa21caf,
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });

  const tier1 = new THREE.Mesh(nutrientRingGeom, emeraldMat);
  tier1.name = 'greenhouse_glow_ring1';
  tier1.position.set(0, 1.4, 0);
  group.add(tier1);

  const tier2 = new THREE.Mesh(nutrientRingGeom, magentaMat);
  tier2.name = 'greenhouse_glow_ring2';
  tier2.scale.set(0.72, 0.72, 0.72);
  tier2.position.set(0, 2.6, 0);
  group.add(tier2);

  const tier3 = new THREE.Mesh(nutrientRingGeom, emeraldMat);
  tier3.name = 'greenhouse_glow_ring3';
  tier3.scale.set(0.45, 0.45, 0.45);
  tier3.position.set(0, 3.8, 0);
  group.add(tier3);

  // Interior hydroponic PointLight providing vibrant bio-glow
  const hydroLight = new THREE.PointLight(0x10b981, 1.5, 14);
  hydroLight.position.set(0, 2.5, 0);
  hydroLight.name = 'greenhouse_hydro_light';
  group.add(hydroLight);

  // 4. Airlock Entry Collar
  const airlockGeom = new THREE.BoxGeometry(2.2, 1.8, 2.2);
  const airlockMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.8,
    roughness: 0.3,
  });
  const airlock = new THREE.Mesh(airlockGeom, airlockMat);
  airlock.position.set(0, 1.1, 4.8);
  airlock.castShadow = true;
  group.add(airlock);

  // Airlock hatch door
  const hatchGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.15, 16);
  hatchGeom.rotateX(Math.PI / 2);
  const hatchMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x047857,
    emissiveIntensity: 0.4,
    metalness: 0.8,
  });
  const hatch = new THREE.Mesh(hatchGeom, hatchMat);
  hatch.position.set(0, 1.1, 5.9);
  group.add(hatch);

  return group;
}

/**
 * Builds the 3D procedural mesh for the Optical Laser Tower DSOC (`dsoc_tower`).
 * Deep Space Optical Communications tower with lattice truss mast, secondary reflector dish,
 * and Earth-pointed optical pulse laser emitter.
 */
export function buildDSOCTowerMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'expansion_dsoc_tower';
  group.userData.buildingId = 'dsoc_tower';

  // 1. Reinforced Hexagonal Foundation
  const baseGeom = new THREE.CylinderGeometry(3.0, 3.4, 0.6, 6);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.75,
    roughness: 0.35,
  });
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.position.set(0, 0.3, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 2. Lattice Truss Mast (Tapered structural tower)
  const mastLowerGeom = new THREE.CylinderGeometry(1.2, 2.2, 5.0, 6, 4, true);
  const mastMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.85,
    roughness: 0.25,
    wireframe: true,
  });
  const mastLower = new THREE.Mesh(mastLowerGeom, mastMat);
  mastLower.position.set(0, 3.1, 0);
  mastLower.castShadow = true;
  group.add(mastLower);

  const mastUpperGeom = new THREE.CylinderGeometry(0.7, 1.2, 5.0, 6, 4, true);
  const mastUpper = new THREE.Mesh(mastUpperGeom, mastMat);
  mastUpper.position.set(0, 8.0, 0);
  mastUpper.castShadow = true;
  group.add(mastUpper);

  // Central core conduit
  const conduitGeom = new THREE.CylinderGeometry(0.35, 0.35, 10.0, 12);
  const conduitMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0369a1, emissiveIntensity: 0.4 });
  const conduit = new THREE.Mesh(conduitGeom, conduitMat);
  conduit.position.set(0, 5.6, 0);
  group.add(conduit);

  // 3. Telescope / Optical Transceiver Assembly on Gimbal
  const gimbalAssembly = new THREE.Group();
  gimbalAssembly.name = 'dsoc_gimbal_assembly';
  gimbalAssembly.position.set(0, 10.8, 0);

  // Gimbal fork ring
  const forkGeom = new THREE.TorusGeometry(1.1, 0.15, 8, 16, Math.PI);
  const forkMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 });
  const fork = new THREE.Mesh(forkGeom, forkMat);
  fork.position.set(0, 0.2, 0);
  gimbalAssembly.add(fork);

  // Optical barrel (Telescope housing pointing at 45° elevation towards Earth)
  const barrelGeom = new THREE.CylinderGeometry(0.65, 0.8, 3.2, 16);
  barrelGeom.rotateX(Math.PI / 4);
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.15,
  });
  const barrel = new THREE.Mesh(barrelGeom, barrelMat);
  barrel.position.set(0, 1.2, 0.8);
  barrel.castShadow = true;
  gimbalAssembly.add(barrel);

  // Optical Laser Emitter Lens (Glowing green/cyan collimator)
  const lensGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.2, 16);
  lensGeom.rotateX(Math.PI / 4);
  const lensMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
  });
  const lens = new THREE.Mesh(lensGeom, lensMat);
  lens.name = 'dsoc_emitter_lens';
  lens.position.set(0, 2.3, 1.9);
  gimbalAssembly.add(lens);

  // Secondary optical reflector dish on mast side
  const dishGeom = new THREE.SphereGeometry(1.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.35);
  dishGeom.rotateX(Math.PI * 0.7);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.8,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });
  const dish = new THREE.Mesh(dishGeom, dishMat);
  dish.position.set(-1.4, 0.2, 0);
  gimbalAssembly.add(dish);

  // Pulsing laser beam effect pointed into deep space
  const beamGeom = new THREE.CylinderGeometry(0.04, 0.18, 14.0, 8);
  beamGeom.rotateX(Math.PI / 4);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.65,
  });
  const beam = new THREE.Mesh(beamGeom, beamMat);
  beam.name = 'dsoc_laser_beam';
  beam.userData.isLaserBeam = true;
  beam.position.set(0, 7.2, 6.8);
  gimbalAssembly.add(beam);

  group.add(gimbalAssembly);

  return group;
}

/**
 * Procedural Expansion Building Dispatcher:
 * Builds and returns the requested 3D model group.
 */
export function buildExpansionBuildingMesh(id: BaseBuildingId): THREE.Group {
  switch (id) {
    case 'rover_hangar':
      return buildRoverHangarMesh();
    case 'greenhouse_2':
      return build2ndGreenhouseMesh();
    case 'dsoc_tower':
      return buildDSOCTowerMesh();
    default: {
      const fallback = new THREE.Group();
      fallback.name = `expansion_${id}`;
      return fallback;
    }
  }
}

/**
 * Functional alias matching procedural builder dispatcher convention.
 */
export const createExpansionBuildingMesh = (
  id: BaseBuildingId,
  _pos?: [number, number, number]
): THREE.Group => buildExpansionBuildingMesh(id);


/**
 * Animation tick for expansion buildings:
 * Blinking beacons, glowing hydroponics, and pulsing optical laser communications.
 */
export function updateExpansionBuildings(group: THREE.Group, dt: number, timeSeconds: number): void {
  // 1. Rover Hangar Beacon Pulse
  const hangarBulb = group.getObjectByName('hangar_beacon_bulb') as THREE.Mesh | undefined;
  if (hangarBulb && hangarBulb.material instanceof THREE.MeshBasicMaterial) {
    const blink = (Math.sin(timeSeconds * 6.0) > 0.2) ? 1.0 : 0.2;
    hangarBulb.material.color.setHex(blink > 0.5 ? 0xf59e0b : 0x78350f);
  }

  // 2. 2nd Greenhouse Hydroponic Glow Breathing
  const glowRing1 = group.getObjectByName('greenhouse_glow_ring1') as THREE.Mesh | undefined;
  if (glowRing1 && glowRing1.material instanceof THREE.MeshStandardMaterial) {
    const intensity = 0.5 + Math.sin(timeSeconds * 2.2) * 0.35;
    glowRing1.material.emissiveIntensity = intensity;
  }
  const glowRing2 = group.getObjectByName('greenhouse_glow_ring2') as THREE.Mesh | undefined;
  if (glowRing2 && glowRing2.material instanceof THREE.MeshStandardMaterial) {
    const intensity = 0.5 + Math.cos(timeSeconds * 2.2) * 0.35;
    glowRing2.material.emissiveIntensity = intensity;
  }

  // 3. DSOC Optical Laser Pulse
  const laserBeam = group.getObjectByName('dsoc_laser_beam') as THREE.Mesh | undefined;
  if (laserBeam && laserBeam.material instanceof THREE.MeshBasicMaterial) {
    const pulse = 0.4 + Math.sin(timeSeconds * 8.0) * 0.35;
    laserBeam.material.opacity = Math.max(0.1, Math.min(0.9, pulse));
  }

  const emitterLens = group.getObjectByName('dsoc_emitter_lens') as THREE.Mesh | undefined;
  if (emitterLens && emitterLens.material instanceof THREE.MeshBasicMaterial) {
    const pulseFast = Math.sin(timeSeconds * 12.0) > 0.0 ? 0x22c55e : 0x15803d;
    emitterLens.material.color.setHex(pulseFast);
  }
}

/**
 * Strict recursive WebGL disposal for expansion buildings.
 * Guarantees zero memory leaks in geometries, materials, and textures.
 */
export function disposeExpansionBuildings(group: THREE.Group): void {
  disposeThreeObject(group);
}

/**
 * Base Building Manager:
 * Handles construction validation, science point spending, plateau bounds checking,
 * and active cumulative buffs aggregation.
 */
export class BaseBuildingManager {
  public constructedBuildings: Set<BaseBuildingId> = new Set();
  public buildingCoordinates: Map<BaseBuildingId, [number, number, number]> = new Map();

  constructor(initialBuildings?: BaseBuildingId[]) {
    if (initialBuildings && Array.isArray(initialBuildings)) {
      for (const id of initialBuildings) {
        if (BUILDING_CATALOG[id]) {
          this.constructedBuildings.add(id);
          this.buildingCoordinates.set(id, BUILDING_CATALOG[id].defaultPosition);
        }
      }
    }
  }

  public canBuild(buildingId: string, currentScience: number): { allowed: boolean; reason?: string } {
    const id = buildingId as BaseBuildingId;
    const def = BUILDING_CATALOG[id];
    if (!def) return { allowed: false, reason: 'INVALID_BUILDING_ID' };
    if (this.constructedBuildings.has(id)) return { allowed: false, reason: 'ALREADY_CONSTRUCTED' };
    if (typeof currentScience !== 'number' || isNaN(currentScience) || currentScience < def.costScience) {
      return { allowed: false, reason: 'INSUFFICIENT_SCIENCE' };
    }
    return { allowed: true };
  }

  public constructBuilding(
    buildingId: string,
    sim: { colony: { resources: { sciencePoints: number } } },
    coords?: [number, number, number]
  ): { success: boolean; reason?: string; effects?: BaseBuildingEffects } {
    const id = buildingId as BaseBuildingId;
    const check = this.canBuild(id, sim.colony.resources.sciencePoints);
    if (!check.allowed) return { success: false, reason: check.reason };

    const def = BUILDING_CATALOG[id];
    const position = coords || def.defaultPosition;

    // Validate plateau position (r <= 25.0 meters)
    const distFromCenter = Math.sqrt(position[0] * position[0] + position[2] * position[2]);
    if (distFromCenter > 25.0) {
      return { success: false, reason: 'POSITION_OUTSIDE_BASE_PLATEAU' };
    }

    // Deduct exact science cost
    sim.colony.resources.sciencePoints = Math.max(0, sim.colony.resources.sciencePoints - def.costScience);

    this.constructedBuildings.add(id);
    this.buildingCoordinates.set(id, position);

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

  public getColliders(): ExpansionCollider[] {
    const colliders: ExpansionCollider[] = [];
    for (const id of this.constructedBuildings) {
      const coords = this.buildingCoordinates.get(id) || BUILDING_CATALOG[id].defaultPosition;
      colliders.push({
        id,
        name: BUILDING_CATALOG[id].nameEs,
        x: coords[0],
        z: coords[2],
        radius: EXPANSION_COLLIDER_RADII[id] || 3.5,
      });
    }
    return colliders;
  }
}
