import * as THREE from 'three';
import { BaseLocation, BaseModule } from '../../types/game';
import { disposeThreeObject } from './disposal';

export interface BaseDynamicState {
  radiationActive: boolean;
  dustStormActive: boolean;
  isLunarNight: boolean;
  wiringErrorActive?: boolean;
  emergencyO2Active?: boolean;
  assignedToMineCount?: number;
  modules: BaseModule[];
}

export interface SolarCycleState {
  timeOfDaySeconds: number;
  diurnalPeriodSeconds: number; // e.g. 120s or 180s
  solarAngleRad: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  isDay: boolean;
}

export interface Base3DSceneResult {
  group: THREE.Group;
  interactiveObjects: THREE.Object3D[];
  lights: {
    sunLight: THREE.DirectionalLight;
    ambientLight: THREE.AmbientLight;
    greenhouseLight: THREE.PointLight;
    centralBeaconLight: THREE.PointLight;
    bunkerLight: THREE.PointLight;
  };
  sunSphere: THREE.Mesh;
  sunHalo?: THREE.Mesh | null;
  solarCycleState?: SolarCycleState;
  update: (dt: number, state: BaseDynamicState, scene?: THREE.Scene) => void;
  dispose: () => void;
}

/**
 * Procedural heightmap for Shackleton (Moon) and Jezero (Mars) craters.
 * Returns 0 height inside base perimeter (r < 12) for a secure flat plateau,
 * and natural crater rim / delta terraces outside.
 */
export function getTerrainHeight(x: number, z: number, location: BaseLocation): number {
  const dist = Math.sqrt(x * x + z * z);
  const baseRadius = 12;

  // Flatten the central base area completely
  if (dist < baseRadius) {
    return 0;
  }

  const factor = Math.min(1, (dist - baseRadius) / 20);

  if (location === 'moon') {
    // Shackleton crater rim: craggy rim wall rising to the south/west
    const rim = Math.sin(x * 0.08 + z * 0.05) * 2.5 + Math.cos(x * 0.15 - z * 0.12) * 1.5;
    const craterSlope = Math.pow(dist / 45, 1.8) * 4.5;
    return (rim + craterSlope) * factor;
  } else {
    // Jezero river delta: stepped sedimentary terraces and basalt ridges
    const terrace = Math.floor(Math.sin(x * 0.09 + z * 0.07) * 4) * 0.6;
    const dune = Math.sin(x * 0.15) * Math.cos(z * 0.12) * 1.2;
    return (terrace + dune + (dist / 50) * 2.5) * factor;
  }
}

/**
 * Natural walking kinematics: computes leg swings, arm swings,
 * torso vertical bob, and torso stride roll.
 */
export function computeWalkKinematics(walkPhase: number): {
  legAngle: number;
  armAngle: number;
  torsoBob: number;
  torsoRoll: number;
} {
  return {
    legAngle: Math.sin(walkPhase) * 0.55,
    armAngle: Math.sin(walkPhase) * 0.45,
    torsoBob: Math.abs(Math.sin(walkPhase * 2)) * 0.05,
    torsoRoll: Math.sin(walkPhase) * 0.03,
  };
}

/**
 * Interpolates between two 2D waypoints with clamped parameter t in [0, 1].
 */
export function interpolateWaypoint(
  p1: { x: number; z: number },
  p2: { x: number; z: number },
  t: number
): { x: number; z: number } {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: p1.x + (p2.x - p1.x) * clampedT,
    z: p1.z + (p2.z - p1.z) * clampedT,
  };
}

/**
 * Computes heading yaw angle (in radians) towards destination.
 */
export function computeHeading(
  from: { x: number; z: number },
  to: { x: number; z: number }
): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export interface SunPositionResult {
  position: [number, number, number];
  elevationDeg: number;
  azimuthDeg: number;
  isAboveHorizon: boolean;
}

// Module-level scratch structures to guarantee zero heap allocations in the 60 FPS update loop
const _scratchSunPos: SunPositionResult = {
  position: [0, 0, 0],
  elevationDeg: 0,
  azimuthDeg: 0,
  isAboveHorizon: false,
};

const SOLAR_CYCLE_RING_SIZE = 4;
let _scratchSolarCycleIndex = 0;
const _scratchSolarCycleRing: SolarCycleState[] = [
  { timeOfDaySeconds: 0, diurnalPeriodSeconds: 120, solarAngleRad: 0, sunElevationDeg: 0, sunAzimuthDeg: 0, isDay: false },
  { timeOfDaySeconds: 0, diurnalPeriodSeconds: 120, solarAngleRad: 0, sunElevationDeg: 0, sunAzimuthDeg: 0, isDay: false },
  { timeOfDaySeconds: 0, diurnalPeriodSeconds: 120, solarAngleRad: 0, sunElevationDeg: 0, sunAzimuthDeg: 0, isDay: false },
  { timeOfDaySeconds: 0, diurnalPeriodSeconds: 120, solarAngleRad: 0, sunElevationDeg: 0, sunAzimuthDeg: 0, isDay: false },
];

const _scratchAmber = new THREE.Color(0xfef08a);
const _scratchCyan = new THREE.Color(0x4a90e2);
const _scratchTwilight = new THREE.Color(0x5a4050);
const _scratchSunColor = new THREE.Color();
const _scratchAmbientColor = new THREE.Color();
const _scratchSkyColor = new THREE.Color();
const _scratchEarthlight = new THREE.Color(0x0369a1);
const _scratchSceneBackground = new THREE.Color(0x000000);

/**
 * Calculates continuous diurnal orbital sun coordinates, elevation, and azimuth angles.
 * Orbital period defaults to 120 seconds.
 */
export function calculateSunPosition(
  timeSeconds: number,
  orbitPeriod: number = 120,
  orbitRadius: number = 150,
  target?: SunPositionResult
): SunPositionResult {
  const phase = (timeSeconds % orbitPeriod) / orbitPeriod;
  const azimuthRad = phase * 2 * Math.PI;
  // Elevation follows sinusoidal day/night cycle
  const elevationRad = Math.sin(azimuthRad) * (Math.PI / 2.2);

  const x = orbitRadius * Math.cos(azimuthRad) * Math.cos(elevationRad);
  const y = orbitRadius * Math.sin(elevationRad);
  const z = orbitRadius * Math.sin(azimuthRad) * Math.cos(elevationRad);

  const elevationDeg = (elevationRad * 180) / Math.PI;
  const azimuthDeg = ((azimuthRad * 180) / Math.PI) % 360;

  if (target) {
    target.position[0] = x;
    target.position[1] = y;
    target.position[2] = z;
    target.elevationDeg = elevationDeg;
    target.azimuthDeg = azimuthDeg;
    target.isAboveHorizon = y > 0;
    return target;
  }

  return {
    position: [x, y, z],
    elevationDeg,
    azimuthDeg,
    isAboveHorizon: y > 0,
  };
}

/**
 * Calculates dynamic shadow projection length and opposite azimuth angle.
 * Shadows naturally elongate inversely proportional to tan(elevation).
 */
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

/**
 * Planetary lighting parameters for Moon (Apollo high contrast) and Mars (Curiosity/Perseverance blue sunsets).
 */
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

/**
 * Continuous diurnal solar orbital movement and celestial lighting updater.
 * Updates directional sunLight position, sunSphere celestial dome mesh, shadow bias,
 * and planetary atmospheric/contrast lighting.
 * Guaranteed ZERO dynamic heap allocations per frame.
 */
export function updateSolarCycle(
  dt: number,
  sunLight: THREE.DirectionalLight,
  sunSphere: THREE.Mesh,
  location: BaseLocation,
  scene?: THREE.Scene,
  ambientLight?: THREE.AmbientLight,
  state?: BaseDynamicState,
  targetState?: SolarCycleState
): SolarCycleState {
  const safeDt = Math.max(0, Math.min(dt, 0.1));
  const period = 120;

  if (sunLight.userData.solarTime === undefined) {
    sunLight.userData.solarTime = 25.0; // Start in daytime
  }
  sunLight.userData.solarTime = (sunLight.userData.solarTime + safeDt) % period;
  const timeSeconds = sunLight.userData.solarTime;

  // 1. Orbital position (reusing scratch structure to prevent GC churn)
  const sunPos = calculateSunPosition(timeSeconds, period, 150, _scratchSunPos);
  const sx = sunPos.position[0];
  const sy = sunPos.position[1];
  const sz = sunPos.position[2];

  // Sun Directional Light position & target
  sunLight.position.set(sx, Math.max(0.1, sy), sz);
  sunLight.target.position.set(0, 0, 0);
  sunLight.target.updateMatrixWorld();

  // Project sunSphere onto sky dome (radius ~85)
  const celestialRadius = 85;
  const scale = celestialRadius / 150;
  sunSphere.position.set(sx * scale, sy * scale, sz * scale);
  sunSphere.visible = sy > -15;

  // Locate ambient light if not provided directly (for-loop avoids per-frame closure)
  let ambient = ambientLight;
  if (!ambient && sunLight.parent) {
    const children = sunLight.parent.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as THREE.AmbientLight;
      if (child && child.isAmbientLight) {
        ambient = child;
        break;
      }
    }
  }

  // 2. Planetary Lighting & Atmosphere
  if (location === 'moon') {
    // Moon Mode (Apollo High-Contrast):
    // - Hard vacuum: zero fog (scene.fog = null)
    // - Pitch-black sky (0x000000)
    // - High contrast: sunlight intensity 2.2 - 2.5 (0xffffff), minimal ambient fill (0x0f172a, 0.10 - 0.12)
    // - When sun drops below horizon (lunar night): sunlight fades to 0, subtle cold Earthlight glow (0x0369a1, 0.08)
    if (scene) {
      scene.fog = null;
      if (scene.background instanceof THREE.Color) {
        scene.background.setHex(0x000000);
      } else {
        scene.background = _scratchSceneBackground.setHex(0x000000);
      }
    }

    const isNight = !sunPos.isAboveHorizon || sy <= 0 || !!(state?.isLunarNight);
    if (isNight) {
      if (ambient) {
        ambient.color.copy(_scratchEarthlight);
      }
      if (safeDt === 0) {
        sunLight.intensity = 0.0;
        if (ambient) ambient.intensity = 0.08;
      } else {
        sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, 0.0, safeDt * 4.0);
        if (ambient) {
          ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, 0.08, safeDt * 3.0);
        }
      }
    } else {
      const elevationFactor = Math.sin((Math.max(0, sunPos.elevationDeg) * Math.PI) / 180);
      const targetSunIntensity = 2.2 + 0.3 * elevationFactor;
      sunLight.color.setHex(0xffffff);
      if (ambient) {
        ambient.color.setHex(0x0f172a);
      }
      if (safeDt === 0) {
        sunLight.intensity = targetSunIntensity;
        if (ambient) ambient.intensity = 0.11;
      } else {
        sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, targetSunIntensity, safeDt * 3.0);
        if (ambient) {
          ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, 0.11, safeDt * 3.0);
        }
      }
    }

    if (sunSphere.material instanceof THREE.MeshBasicMaterial) {
      sunSphere.material.color.setHex(0xffffff);
    }
  } else {
    // Mars Mode (Atmospheric Scattering & Blue Sunsets):
    // - Mid-day: sunlight warm amber (0xfef08a), sky/fog dusty rust (0x451a03), ambient (0x7c2d12, 0.55)
    // - Sunset transition (elevation <= 18 deg):
    //   * Directional light color transitions from amber 0xfef08a to radiant icy cyan-blue 0x4a90e2 / 0x38bdf8
    //   * Scene sky/background and fog color transition from dusty rust 0x451a03 to twilight salmon-purple (0x5a4050) / deep navy (0x1e1b4b)
    //   * Sun sphere halo glows radiant blue, recreating Curiosity and Perseverance "Blue Sunset"
    const elev = sunPos.elevationDeg;
    const isSunset = elev <= 18.0 && elev >= -5.0;
    const isNight = elev < -5.0;

    _scratchAmber.setHex(0xfef08a);
    _scratchCyan.setHex(0x4a90e2);
    _scratchTwilight.setHex(0x5a4050);

    if (isNight) {
      if (ambient) {
        ambient.color.setHex(0x1e1b4b);
      }
      if (safeDt === 0) {
        sunLight.intensity = 0.0;
        if (ambient) ambient.intensity = 0.15;
      } else {
        sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, 0.0, safeDt * 4.0);
        if (ambient) ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, 0.15, safeDt * 3.0);
      }
      if (scene) {
        if (scene.background instanceof THREE.Color) {
          scene.background.setHex(0x1e1b4b);
        } else {
          scene.background = _scratchSceneBackground.setHex(0x1e1b4b);
        }
        if (scene.fog && !state?.dustStormActive) {
          (scene.fog as THREE.FogExp2).color.setHex(0x1e1b4b);
        }
      }
    } else if (isSunset) {
      // Transition ratio t in [0, 1] as sun drops from 18 deg to ~8 deg
      const t = Math.max(0, Math.min(1, (18.0 - elev) / 10.0));

      _scratchSunColor.lerpColors(_scratchAmber, _scratchCyan, t);
      sunLight.color.copy(_scratchSunColor);

      // Low sun angle light attenuation
      const sunsetIntensity = Math.max(0.05, 1.8 * Math.max(0, (elev + 5.0) / 23.0));
      if (safeDt === 0) {
        sunLight.intensity = sunsetIntensity;
        if (ambient) ambient.intensity = 0.25 + (1 - t) * 0.3;
      } else {
        sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, sunsetIntensity, safeDt * 3.0);
        if (ambient) ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, 0.25 + (1 - t) * 0.3, safeDt * 3.0);
      }

      // Sky & fog color transition to twilight salmon-purple
      _scratchAmber.setHex(0x451a03);
      _scratchTwilight.setHex(0x5a4050);
      _scratchSkyColor.lerpColors(_scratchAmber, _scratchTwilight, t);
      if (scene) {
        if (scene.background instanceof THREE.Color) {
          scene.background.copy(_scratchSkyColor);
        } else {
          scene.background = _scratchSceneBackground.copy(_scratchSkyColor);
        }
        if (scene.fog && !state?.dustStormActive) {
          (scene.fog as THREE.FogExp2).color.copy(_scratchSkyColor);
        }
      }

      if (ambient) {
        _scratchAmber.setHex(0x7c2d12);
        _scratchTwilight.setHex(0x1e1b4b);
        _scratchAmbientColor.lerpColors(_scratchAmber, _scratchTwilight, t * 0.7);
        ambient.color.copy(_scratchAmbientColor);
      }

      if (sunSphere.material instanceof THREE.MeshBasicMaterial) {
        sunSphere.material.color.setHex(0x4a90e2);
      }
      const halo = sunSphere.getObjectByName('mars_sun_halo') as THREE.Mesh | undefined;
      if (halo && halo.material instanceof THREE.MeshBasicMaterial) {
        halo.material.color.setHex(0x38bdf8);
        halo.material.opacity = 0.55 + Math.sin(timeSeconds * 4.0) * 0.15;
      }
    } else {
      // Mid-day Mars
      sunLight.color.setHex(0xfef08a);
      if (ambient) {
        ambient.color.setHex(0x7c2d12);
      }
      if (safeDt === 0) {
        sunLight.intensity = 1.8;
        if (ambient) ambient.intensity = 0.55;
      } else {
        sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, 1.8, safeDt * 3.0);
        if (ambient) ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, 0.55, safeDt * 3.0);
      }
      if (scene) {
        if (scene.background instanceof THREE.Color) {
          scene.background.setHex(0x451a03);
        } else {
          scene.background = _scratchSceneBackground.setHex(0x451a03);
        }
        if (scene.fog && !state?.dustStormActive) {
          (scene.fog as THREE.FogExp2).color.setHex(0x451a03);
        }
      }
      if (sunSphere.material instanceof THREE.MeshBasicMaterial) {
        sunSphere.material.color.setHex(0xfef08a);
      }
      const halo = sunSphere.getObjectByName('mars_sun_halo') as THREE.Mesh | undefined;
      if (halo && halo.material instanceof THREE.MeshBasicMaterial) {
        halo.material.color.setHex(0xfef08a);
        halo.material.opacity = 0.35;
      }
    }
  }

  let result = targetState;
  if (!result) {
    _scratchSolarCycleIndex = (_scratchSolarCycleIndex + 1) % SOLAR_CYCLE_RING_SIZE;
    result = _scratchSolarCycleRing[_scratchSolarCycleIndex];
  }
  result.timeOfDaySeconds = timeSeconds;
  result.diurnalPeriodSeconds = period;
  result.solarAngleRad = (timeSeconds / period) * 2 * Math.PI;
  result.sunElevationDeg = sunPos.elevationDeg;
  result.sunAzimuthDeg = sunPos.azimuthDeg;
  result.isDay = sunPos.isAboveHorizon;

  return result;
}

export interface AstronautMeshResult {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  helmetGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  toolMesh?: THREE.Mesh;
  toolLight?: THREE.PointLight;
}

/**
 * Constructs an articulated 3D spacesuit astronaut model:
 * white suit, chest pack with status LED, PLSS life-support backpack with dual oxygen tanks,
 * articulated helmet with gold reflective visor, shoulder-pivoted arms, and hip-pivoted legs.
 */
export function createAstronautMesh(options?: {
  suitColor?: number;
  visorColor?: number;
  hasTool?: 'scanner' | 'drill' | 'tablet';
  scale?: number;
}): AstronautMeshResult {
  const suitColor = options?.suitColor ?? 0xf8fafc;
  const visorColor = options?.visorColor ?? 0xf59e0b;
  const scale = options?.scale ?? 1.0;

  const root = new THREE.Group();
  root.name = 'astronaut_character';

  // Body container at baseline height
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.62 * scale;
  root.add(bodyGroup);

  const suitMat = new THREE.MeshStandardMaterial({
    color: suitColor,
    roughness: 0.45,
    metalness: 0.15,
  });

  const darkJointMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.6,
  });

  const visorMat = new THREE.MeshStandardMaterial({
    color: visorColor,
    roughness: 0.08,
    metalness: 0.95,
    emissive: 0x78350f,
    emissiveIntensity: 0.25,
  });

  // 1. Torso
  const torsoGeom = new THREE.BoxGeometry(0.34 * scale, 0.42 * scale, 0.22 * scale);
  const torso = new THREE.Mesh(torsoGeom, suitMat);
  bodyGroup.add(torso);

  // Chest pack utility unit
  const chestGeom = new THREE.BoxGeometry(0.18 * scale, 0.16 * scale, 0.06 * scale);
  const chest = new THREE.Mesh(chestGeom, darkJointMat);
  chest.position.set(0, 0.02 * scale, 0.13 * scale);
  bodyGroup.add(chest);

  // Chest status LED
  const ledGeom = new THREE.SphereGeometry(0.025 * scale, 8, 8);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const led = new THREE.Mesh(ledGeom, ledMat);
  led.position.set(0, 0.05 * scale, 0.165 * scale);
  bodyGroup.add(led);

  // 2. PLSS Backpack (Portable Life Support System)
  const packGeom = new THREE.BoxGeometry(0.26 * scale, 0.38 * scale, 0.14 * scale);
  const packMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.4,
    metalness: 0.3,
  });
  const backpack = new THREE.Mesh(packGeom, packMat);
  backpack.position.set(0, 0.02 * scale, -0.16 * scale);
  bodyGroup.add(backpack);

  // Dual oxygen tanks on backpack sides
  const tankGeom = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.32 * scale, 12);
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.8,
    roughness: 0.2,
  });

  const leftTank = new THREE.Mesh(tankGeom, tankMat);
  leftTank.position.set(-0.09 * scale, 0.02 * scale, -0.22 * scale);
  bodyGroup.add(leftTank);

  const rightTank = new THREE.Mesh(tankGeom, tankMat);
  rightTank.position.set(0.09 * scale, 0.02 * scale, -0.22 * scale);
  bodyGroup.add(rightTank);

  // 3. Helmet & Gold Visor
  const helmetGroup = new THREE.Group();
  helmetGroup.position.set(0, 0.32 * scale, 0);
  bodyGroup.add(helmetGroup);

  const collarGeom = new THREE.CylinderGeometry(0.13 * scale, 0.15 * scale, 0.05 * scale, 16);
  const collar = new THREE.Mesh(collarGeom, darkJointMat);
  collar.position.y = -0.04 * scale;
  helmetGroup.add(collar);

  const helmetGeom = new THREE.SphereGeometry(0.17 * scale, 16, 14);
  const helmet = new THREE.Mesh(helmetGeom, suitMat);
  helmetGroup.add(helmet);

  // Visor facing forward (+Z)
  const visorGeom = new THREE.SphereGeometry(0.145 * scale, 16, 12, 0, Math.PI, 0, Math.PI);
  visorGeom.rotateY(-Math.PI / 2);
  visorGeom.rotateX(Math.PI / 2);
  const visor = new THREE.Mesh(visorGeom, visorMat);
  visor.position.set(0, 0.01 * scale, 0.045 * scale);
  helmetGroup.add(visor);

  // 4. Articulated Legs
  const legGeom = new THREE.CylinderGeometry(0.065 * scale, 0.055 * scale, 0.38 * scale, 12);
  legGeom.translate(0, -0.19 * scale, 0);

  const bootGeom = new THREE.BoxGeometry(0.12 * scale, 0.09 * scale, 0.18 * scale);
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

  // Left Leg Pivot
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.10 * scale, -0.20 * scale, 0);
  const leftLegMesh = new THREE.Mesh(legGeom, suitMat);
  const leftBoot = new THREE.Mesh(bootGeom, bootMat);
  leftBoot.position.set(0, -0.38 * scale, 0.03 * scale);
  leftLegPivot.add(leftLegMesh);
  leftLegPivot.add(leftBoot);
  bodyGroup.add(leftLegPivot);

  // Right Leg Pivot
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.10 * scale, -0.20 * scale, 0);
  const rightLegMesh = new THREE.Mesh(legGeom, suitMat);
  const rightBoot = new THREE.Mesh(bootGeom, bootMat);
  rightBoot.position.set(0, -0.38 * scale, 0.03 * scale);
  rightLegPivot.add(rightLegMesh);
  rightLegPivot.add(rightBoot);
  bodyGroup.add(rightLegPivot);

  // 5. Articulated Arms
  const armGeom = new THREE.CylinderGeometry(0.05 * scale, 0.045 * scale, 0.34 * scale, 12);
  armGeom.translate(0, -0.17 * scale, 0);

  const gloveGeom = new THREE.SphereGeometry(0.06 * scale, 10, 10);
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });

  // Left Arm Pivot
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.22 * scale, 0.15 * scale, 0);
  const leftArmMesh = new THREE.Mesh(armGeom, suitMat);
  const leftGlove = new THREE.Mesh(gloveGeom, gloveMat);
  leftGlove.position.set(0, -0.34 * scale, 0);
  leftArmPivot.add(leftArmMesh);
  leftArmPivot.add(leftGlove);
  bodyGroup.add(leftArmPivot);

  // Right Arm Pivot
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.22 * scale, 0.15 * scale, 0);
  const rightArmMesh = new THREE.Mesh(armGeom, suitMat);
  const rightGlove = new THREE.Mesh(gloveGeom, gloveMat);
  rightGlove.position.set(0, -0.34 * scale, 0);
  rightArmPivot.add(rightArmMesh);
  rightArmPivot.add(rightGlove);

  let toolMesh: THREE.Mesh | undefined;
  let toolLight: THREE.PointLight | undefined;

  // Equipment held in right hand
  if (options?.hasTool === 'drill') {
    const toolGeom = new THREE.CylinderGeometry(0.03 * scale, 0.04 * scale, 0.45 * scale, 10);
    toolGeom.rotateX(Math.PI / 2);
    const toolMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    toolMesh = new THREE.Mesh(toolGeom, toolMat);
    toolMesh.position.set(0, -0.35 * scale, 0.18 * scale);
    rightArmPivot.add(toolMesh);

    toolLight = new THREE.PointLight(0x38bdf8, 1.2, 3);
    toolLight.position.set(0, -0.35 * scale, 0.38 * scale);
    rightArmPivot.add(toolLight);
  } else if (options?.hasTool === 'tablet') {
    const tabGeom = new THREE.BoxGeometry(0.16 * scale, 0.02 * scale, 0.22 * scale);
    const tabMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.5,
      roughness: 0.2,
    });
    toolMesh = new THREE.Mesh(tabGeom, tabMat);
    toolMesh.position.set(0, -0.35 * scale, 0.10 * scale);
    rightArmPivot.add(toolMesh);
  } else if (options?.hasTool === 'scanner') {
    const scanGeom = new THREE.BoxGeometry(0.08 * scale, 0.18 * scale, 0.08 * scale);
    const scanMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.6, roughness: 0.3 });
    toolMesh = new THREE.Mesh(scanGeom, scanMat);
    toolMesh.position.set(0, -0.35 * scale, 0.08 * scale);
    rightArmPivot.add(toolMesh);
  }

  bodyGroup.add(rightArmPivot);

  return {
    root,
    bodyGroup,
    helmetGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    toolMesh,
    toolLight,
  };
}

/**
 * Creates dynamic textures for procedural celestial bodies and surfaces.
 */
function createEarthCanvasTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Deep Blue Oceans
  ctx.fillStyle = '#0f3875';
  ctx.fillRect(0, 0, 256, 128);

  // Continents
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  // Africa / Europe
  ctx.arc(120, 60, 28, 0, Math.PI * 2);
  ctx.fill();
  // Americas
  ctx.beginPath();
  ctx.arc(60, 50, 22, 0, Math.PI * 2);
  ctx.arc(75, 90, 18, 0, Math.PI * 2);
  ctx.fill();
  // Asia
  ctx.beginPath();
  ctx.arc(180, 50, 32, 0, Math.PI * 2);
  ctx.fill();

  // White Cloud Bands & Swirls
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(90, 45, 50, 8, 0.2, 0, Math.PI * 2);
  ctx.ellipse(150, 75, 60, 10, -0.15, 0, Math.PI * 2);
  ctx.ellipse(130, 25, 45, 6, 0.1, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds the complete 3D Space Base scene: terrain, sky, celestial bodies,
 * 7 habitat modules, tunnels, animated panels, antennas, and magnetic shield dome.
 */
export function buildSpaceBase3D(location: BaseLocation): Base3DSceneResult {
  const root = new THREE.Group();
  root.name = 'space_base_3d_root';

  const interactiveObjects: THREE.Object3D[] = [];

  // ==========================================
  // 1. Procedural Terrain & Rocks
  // ==========================================
  const terrainSize = 120;
  const terrainSegments = 64;
  const terrainGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
  terrainGeom.rotateX(-Math.PI / 2);

  const posAttr = terrainGeom.getAttribute('position') as THREE.BufferAttribute;
  const posArray = posAttr.array as Float32Array;

  for (let i = 0; i < posArray.length; i += 3) {
    const vx = posArray[i];
    const vz = posArray[i + 2];
    posArray[i + 1] = getTerrainHeight(vx, vz, location);
  }
  terrainGeom.computeVertexNormals();

  const terrainColor = location === 'moon' ? 0x1e293b : 0x7c2d12;
  const terrainRoughness = location === 'moon' ? 0.95 : 0.88;
  const terrainMat = new THREE.MeshStandardMaterial({
    color: terrainColor,
    roughness: terrainRoughness,
    metalness: 0.1,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
  terrainMesh.name = 'terrain_mesh';
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // Scattered boulders / rocks outside base perimeter
  const rockGeom = new THREE.DodecahedronGeometry(0.8, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: location === 'moon' ? 0x475569 : 0x451a03,
    roughness: 0.9,
    metalness: 0.1,
  });

  const rockGroup = new THREE.Group();
  const rockSeed = [
    { x: -16, z: 14, s: 1.4 },
    { x: -22, z: -15, s: 2.1 },
    { x: 18, z: -18, s: 1.8 },
    { x: 24, z: 12, s: 2.4 },
    { x: -14, z: -25, s: 1.6 },
    { x: 15, z: 22, s: 1.9 },
    { x: -30, z: 8, s: 2.8 },
  ];

  for (const r of rockSeed) {
    const rock = new THREE.Mesh(rockGeom, rockMat);
    const y = getTerrainHeight(r.x, r.z, location);
    rock.position.set(r.x, y + r.s * 0.4, r.z);
    rock.scale.set(r.s, r.s * 0.7, r.s);
    rock.rotation.set(Math.sin(r.x), Math.cos(r.z), 0.5);
    rockGroup.add(rock);
  }
  root.add(rockGroup);

  // ==========================================
  // 2. Sky & Celestial Bodies
  // ==========================================
  const skyGroup = new THREE.Group();
  skyGroup.name = 'sky_group';

  // Stars
  const starCount = 1200;
  const starGeom = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 90;
    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 5; // keep in upper sky
    starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.45,
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(starGeom, starMat);
  skyGroup.add(stars);

  // Celestial Body: Earth (from Moon) or Sun/Phobos (from Mars)
  let earthMesh: THREE.Mesh | null = null;
  let marsSunMesh: THREE.Mesh | null = null;
  let phobosMesh: THREE.Mesh | null = null;
  let sunSphere: THREE.Mesh;
  let sunHalo: THREE.Mesh | null = null;

  if (location === 'moon') {
    // The Blue Marble: Earth in the sky
    const earthGeom = new THREE.SphereGeometry(5.5, 32, 24);
    const earthTex = createEarthCanvasTexture();
    const earthMat = new THREE.MeshStandardMaterial({
      ...(earthTex ? { map: earthTex } : {}),
      color: earthTex ? 0xffffff : 0x38bdf8,
      roughness: 0.5,
      metalness: 0.2,
      emissive: 0x075985,
      emissiveIntensity: 0.35,
    });
    earthMesh = new THREE.Mesh(earthGeom, earthMat);
    earthMesh.position.set(45, 38, -55);
    earthMesh.rotation.y = -0.6;
    skyGroup.add(earthMesh);

    // Subtle atmospheric glow halo around Earth
    const earthHaloGeom = new THREE.SphereGeometry(6.0, 24, 24);
    const earthHaloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    });
    const earthHalo = new THREE.Mesh(earthHaloGeom, earthHaloMat);
    earthHalo.position.copy(earthMesh.position);
    skyGroup.add(earthHalo);

    // Apollo Lunar Sun: Brilliant unattenuated star in vacuum
    const sunGeom = new THREE.SphereGeometry(3.0, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    sunSphere = new THREE.Mesh(sunGeom, sunMat);
    sunSphere.name = 'lunar_sun_sphere';
    skyGroup.add(sunSphere);
  } else {
    // Mars Sun with atmospheric scattering halo
    const sunGeom = new THREE.SphereGeometry(2.8, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });
    sunSphere = new THREE.Mesh(sunGeom, sunMat);
    sunSphere.name = 'mars_sun_sphere';
    marsSunMesh = sunSphere;
    skyGroup.add(sunSphere);

    // Radiant blue/amber scattering halo
    const haloGeom = new THREE.SphereGeometry(4.2, 24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    });
    sunHalo = new THREE.Mesh(haloGeom, haloMat);
    sunHalo.name = 'mars_sun_halo';
    sunSphere.add(sunHalo);

    // Phobos: small irregular moon
    const phobosGeom = new THREE.DodecahedronGeometry(1.6, 1);
    const phobosMat = new THREE.MeshStandardMaterial({
      color: 0xa8a29e,
      roughness: 0.9,
    });
    phobosMesh = new THREE.Mesh(phobosGeom, phobosMat);
    phobosMesh.position.set(-36, 42, -45);
    phobosMesh.scale.set(1.4, 0.9, 1.1);
    skyGroup.add(phobosMesh);
  }
  root.add(skyGroup);

  // ==========================================
  // 3. Lighting Setup
  // ==========================================
  const ambientLight = new THREE.AmbientLight(
    location === 'moon' ? 0x0f172a : 0x7c2d12,
    location === 'moon' ? 0.11 : 0.55
  );
  root.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(
    location === 'moon' ? 0xffffff : 0xfef08a,
    location === 'moon' ? 2.4 : 1.8
  );
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 5;
  sunLight.shadow.camera.far = 250;
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.02;
  root.add(sunLight);

  // Initial celestial positioning (pre-allocated ring buffer isolates snapshots across sequential update calls)
  let instanceSolarCycleIndex = 0;
  const instanceSolarCycleRing: SolarCycleState[] = [
    { timeOfDaySeconds: 0, diurnalPeriodSeconds: 120, solarAngleRad: 0, sunElevationDeg: 0, sunAzimuthDeg: 0, isDay: false },
    { timeOfDaySeconds: 0, diurnalPeriodSeconds: 120, solarAngleRad: 0, sunElevationDeg: 0, sunAzimuthDeg: 0, isDay: false },
    { timeOfDaySeconds: 0, diurnalPeriodSeconds: 120, solarAngleRad: 0, sunElevationDeg: 0, sunAzimuthDeg: 0, isDay: false },
    { timeOfDaySeconds: 0, diurnalPeriodSeconds: 120, solarAngleRad: 0, sunElevationDeg: 0, sunAzimuthDeg: 0, isDay: false },
  ];
  let currentSolarCycle = updateSolarCycle(0, sunLight, sunSphere, location, undefined, ambientLight, undefined, instanceSolarCycleRing[0]);

  // Point lights for modules
  const greenhouseLight = new THREE.PointLight(0xf43f5e, 2.4, 14);
  greenhouseLight.position.set(8.5, 2.5, -4.5);
  root.add(greenhouseLight);

  const centralBeaconLight = new THREE.PointLight(0x38bdf8, 2.2, 16);
  centralBeaconLight.position.set(0, 5.2, 0);
  root.add(centralBeaconLight);

  const bunkerLight = new THREE.PointLight(0xf43f5e, 0, 12);
  bunkerLight.position.set(0, 2.0, 10.5);
  root.add(bunkerLight);

  // Helper to register interactive root
  function makeInteractive(obj: THREE.Object3D, moduleId: string, moduleName: string) {
    obj.userData = { moduleId, moduleName, isModule: true };
    obj.traverse((child) => {
      child.userData = { moduleId, moduleName, isModule: true };
    });
    interactiveObjects.push(obj);
  }

  // ==========================================
  // 4. Habitat 3D Modules
  // ==========================================

  // --- Module 1: Central Habitation & Regolith Dome (`regolith_shield`) ---
  const centralHabGroup = new THREE.Group();
  centralHabGroup.position.set(0, 0, 0);
  centralHabGroup.name = 'module_regolith_shield';

  // Base circular plinth
  const plinthGeom = new THREE.CylinderGeometry(4.8, 5.2, 0.6, 32);
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.5 });
  const plinth = new THREE.Mesh(plinthGeom, plinthMat);
  plinth.position.y = 0.3;
  centralHabGroup.add(plinth);

  // Geodesic sintered regolith half-dome
  const domeGeom = new THREE.SphereGeometry(4.2, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.85,
    metalness: 0.25,
    flatShading: true,
  });
  const domeMesh = new THREE.Mesh(domeGeom, domeMat);
  domeMesh.position.y = 0.6;
  centralHabGroup.add(domeMesh);

  // Airlock portal with hazard seal
  const airlockGeom = new THREE.BoxGeometry(1.6, 1.8, 1.8);
  const airlockMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.8 });
  const airlock = new THREE.Mesh(airlockGeom, airlockMat);
  airlock.position.set(0, 0.9, 4.3);
  centralHabGroup.add(airlock);

  // Crown beacon
  const beaconGeom = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 16);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const beacon = new THREE.Mesh(beaconGeom, beaconMat);
  beacon.position.y = 4.8;
  centralHabGroup.add(beacon);

  root.add(centralHabGroup);
  makeInteractive(centralHabGroup, 'regolith_shield', 'Hábitat Central');

  // --- Module 2: Veggie Greenhouse Dome (`greenhouse`) ---
  const greenhouseGroup = new THREE.Group();
  greenhouseGroup.position.set(8.5, 0, -4.5);
  greenhouseGroup.name = 'module_greenhouse';

  // Base foundation ring
  const ghPlinthGeom = new THREE.CylinderGeometry(3.6, 3.8, 0.5, 24);
  const ghPlinthMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const ghPlinth = new THREE.Mesh(ghPlinthGeom, ghPlinthMat);
  ghPlinth.position.y = 0.25;
  greenhouseGroup.add(ghPlinth);

  // Translucent cupola dome
  const ghDomeGeom = new THREE.SphereGeometry(3.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const ghDomeMat = new THREE.MeshPhysicalMaterial({
    color: 0xa7f3d0,
    transparent: true,
    opacity: 0.62,
    roughness: 0.15,
    metalness: 0.1,
    transmission: 0.35,
    reflectivity: 0.8,
  });
  const ghDome = new THREE.Mesh(ghDomeGeom, ghDomeMat);
  ghDome.position.y = 0.5;
  greenhouseGroup.add(ghDome);

  // Interior hydroponic tiered green racks
  const plantRackGeom = new THREE.TorusGeometry(1.8, 0.35, 12, 24);
  plantRackGeom.rotateX(Math.PI / 2);
  const plantRackMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.6,
    emissive: 0x15803d,
    emissiveIntensity: 0.4,
  });
  const plantRack1 = new THREE.Mesh(plantRackGeom, plantRackMat);
  plantRack1.position.y = 1.0;
  greenhouseGroup.add(plantRack1);

  const plantRack2 = new THREE.Mesh(plantRackGeom, plantRackMat);
  plantRack2.scale.set(0.65, 0.65, 0.65);
  plantRack2.position.y = 1.8;
  greenhouseGroup.add(plantRack2);

  root.add(greenhouseGroup);
  makeInteractive(greenhouseGroup, 'greenhouse', 'Invernadero Veggie');

  // --- Module 3: Animated 3D Solar Farm (`solar_farm`) ---
  const solarGroup = new THREE.Group();
  solarGroup.position.set(-8.5, 0, -5.5);
  solarGroup.name = 'module_solar_farm';

  // Base mast
  const mastGeom = new THREE.CylinderGeometry(0.35, 0.45, 2.5, 16);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
  const mast = new THREE.Mesh(mastGeom, mastMat);
  mast.position.y = 1.25;
  solarGroup.add(mast);

  // Articulated panel wings
  const wingGroup = new THREE.Group();
  wingGroup.position.set(0, 2.5, 0);

  const panelGeom = new THREE.BoxGeometry(7.0, 0.15, 2.4);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    metalness: 0.9,
    roughness: 0.15,
    emissive: 0x172554,
    emissiveIntensity: 0.5,
  });
  const panelMesh = new THREE.Mesh(panelGeom, panelMat);
  wingGroup.add(panelMesh);

  // Solar cells dividing grid lines
  const gridGeom = new THREE.BoxGeometry(6.9, 0.16, 0.05);
  const gridMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });
  const gridLine = new THREE.Mesh(gridGeom, gridMat);
  wingGroup.add(gridLine);

  solarGroup.add(wingGroup);
  root.add(solarGroup);
  makeInteractive(solarGroup, 'solar_farm', 'Paneles Solares');

  // --- Module 4: Deep Space Network Parabolic Antenna (`comm_array`) ---
  const commGroup = new THREE.Group();
  commGroup.position.set(-8.0, 0, 6.5);
  commGroup.name = 'module_comm_array';

  // Tripod tower
  const towerGeom = new THREE.CylinderGeometry(0.4, 0.9, 2.8, 6);
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.4 });
  const tower = new THREE.Mesh(towerGeom, towerMat);
  tower.position.y = 1.4;
  commGroup.add(tower);

  // Dish rotation assembly (yaw & pitch)
  const dishAssembly = new THREE.Group();
  dishAssembly.position.set(0, 2.8, 0);

  // Parabolic dish bowl
  const dishGeom = new THREE.SphereGeometry(2.4, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.4);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.6,
    roughness: 0.3,
    side: THREE.DoubleSide,
  });
  const dishMesh = new THREE.Mesh(dishGeom, dishMat);
  dishMesh.rotation.x = Math.PI * 0.65;
  dishAssembly.add(dishMesh);

  // Feed horn
  const hornGeom = new THREE.CylinderGeometry(0.1, 0.2, 1.4, 12);
  hornGeom.rotateX(Math.PI / 2);
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.8,
  });
  const horn = new THREE.Mesh(hornGeom, hornMat);
  horn.position.set(0, 0.4, 1.2);
  dishAssembly.add(horn);

  commGroup.add(dishAssembly);
  root.add(commGroup);
  makeInteractive(commGroup, 'comm_array', 'Antena DSN');

  // --- Module 5: Cryogenic Ice Mine Drill Rig (`water_ice_extractor`) ---
  const iceGroup = new THREE.Group();
  iceGroup.position.set(8.0, 0, 6.5);
  iceGroup.name = 'module_water_ice_extractor';

  // Drilling derrick frame
  const gantryGeom = new THREE.BoxGeometry(3.2, 4.0, 3.2);
  const gantryMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.3,
    wireframe: true,
  });
  const gantry = new THREE.Mesh(gantryGeom, gantryMat);
  gantry.position.y = 2.0;
  iceGroup.add(gantry);

  // Cryo storage tank
  const tankGeom = new THREE.CylinderGeometry(0.8, 0.8, 2.2, 16);
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.7,
    roughness: 0.2,
    emissive: 0x0369a1,
    emissiveIntensity: 0.3,
  });
  const tank = new THREE.Mesh(tankGeom, tankMat);
  tank.position.set(-1.0, 1.1, 0);
  iceGroup.add(tank);

  // Reciprocating drill piston
  const drillPistonGeom = new THREE.CylinderGeometry(0.2, 0.25, 2.5, 12);
  const drillPistonMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
  const drillPiston = new THREE.Mesh(drillPistonGeom, drillPistonMat);
  drillPiston.position.set(0.6, 1.5, 0);
  iceGroup.add(drillPiston);

  root.add(iceGroup);
  makeInteractive(iceGroup, 'water_ice_extractor', 'Mina Criogénica');

  // --- Module 6: Subterranean Storm Bunker (`storm_bunker`) ---
  const bunkerGroup = new THREE.Group();
  bunkerGroup.position.set(0, 0, 10.5);
  bunkerGroup.name = 'module_storm_bunker';

  // Angled heavy blast door
  const bunkerFrameGeom = new THREE.BoxGeometry(3.6, 1.8, 2.6);
  const bunkerFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.4 });
  const bunkerFrame = new THREE.Mesh(bunkerFrameGeom, bunkerFrameMat);
  bunkerFrame.position.y = 0.9;
  bunkerGroup.add(bunkerFrame);

  // Heavy blast door with hazard yellow/black stripes accent
  const doorGeom = new THREE.BoxGeometry(2.0, 1.3, 0.2);
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    roughness: 0.4,
    metalness: 0.7,
    emissive: 0x881337,
    emissiveIntensity: 0.3,
  });
  const door = new THREE.Mesh(doorGeom, doorMat);
  door.position.set(0, 0.75, 1.25);
  bunkerGroup.add(door);

  // Emergency flashing rotating beacon on roof
  const bBeaconGeom = new THREE.SphereGeometry(0.3, 12, 12);
  const bBeaconMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const bBeacon = new THREE.Mesh(bBeaconGeom, bBeaconMat);
  bBeacon.position.set(0, 1.9, 0);
  bunkerGroup.add(bBeacon);

  root.add(bunkerGroup);
  makeInteractive(bunkerGroup, 'storm_bunker', 'Búnker de Tormentas');

  // ==========================================
  // 5. Pressurized Corrugated Tunnels with Translucent Canopies
  // ==========================================
  const tunnelGroup = new THREE.Group();
  tunnelGroup.name = 'corrugated_tunnels';

  const tunnelBaseMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.7,
    roughness: 0.35,
    flatShading: true,
  });

  const tunnelGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.45,
    roughness: 0.12,
    metalness: 0.1,
    transmission: 0.6,
    reflectivity: 0.8,
  });

  const moduleEndpoints = [
    { x: 8.5, z: -4.5 }, // Greenhouse
    { x: -8.5, z: -5.5 }, // Solar
    { x: -8.0, z: 6.5 }, // Comms
    { x: 8.0, z: 6.5 }, // Ice Mine
    { x: 0, z: 10.5 }, // Bunker
  ];

  for (const end of moduleEndpoints) {
    const length = Math.sqrt(end.x * end.x + end.z * end.z) - 3.8;

    // Segment group
    const segmentGroup = new THREE.Group();
    const midX = end.x * 0.45;
    const midZ = end.z * 0.45;
    segmentGroup.position.set(midX, 0.5, midZ);
    segmentGroup.lookAt(end.x, 0.5, end.z);

    // Lower metal trough
    const baseGeom = new THREE.CylinderGeometry(0.72, 0.72, length, 16, 1, false, 0, Math.PI);
    baseGeom.rotateX(Math.PI / 2);
    const baseMesh = new THREE.Mesh(baseGeom, tunnelBaseMat);
    segmentGroup.add(baseMesh);

    // Upper translucent viewing canopy
    const glassGeom = new THREE.CylinderGeometry(0.74, 0.74, length, 16, 1, false, Math.PI, Math.PI);
    glassGeom.rotateX(Math.PI / 2);
    const glassMesh = new THREE.Mesh(glassGeom, tunnelGlassMat);
    segmentGroup.add(glassMesh);

    // Structural pressure reinforcement rings
    const ringGeom = new THREE.TorusGeometry(0.77, 0.05, 8, 20);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    for (let rz = -length * 0.35; rz <= length * 0.35; rz += length * 0.35) {
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.z = rz;
      segmentGroup.add(ring);
    }

    // Interior floor light guide
    const floorLightGeom = new THREE.BoxGeometry(0.12, 0.02, length * 0.9);
    const floorLightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const floorLight = new THREE.Mesh(floorLightGeom, floorLightMat);
    floorLight.position.y = -0.3;
    segmentGroup.add(floorLight);

    tunnelGroup.add(segmentGroup);
  }
  root.add(tunnelGroup);

  // ==========================================
  // 6. Glowing Magnetic Energy Shield Dome
  // ==========================================
  const shieldGeom = new THREE.SphereGeometry(15.5, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.15,
    wireframe: true,
    side: THREE.DoubleSide,
  });
  const shieldDome = new THREE.Mesh(shieldGeom, shieldMat);
  shieldDome.name = 'magnetic_shield_dome';
  shieldDome.position.y = 0;
  root.add(shieldDome);

  // ==========================================
  // 7. Animated 3D Astronaut Crew
  // ==========================================
  const astronautGroup = new THREE.Group();
  astronautGroup.name = 'astronaut_crew';
  root.add(astronautGroup);

  // Astronaut 1: Dra. Valentina (Commander - Surface EVA Patrol)
  const valentina = createAstronautMesh({
    suitColor: 0xf8fafc,
    visorColor: 0xf59e0b,
    hasTool: 'scanner',
    scale: 0.95,
  });
  valentina.root.name = 'astronaut_valentina';
  astronautGroup.add(valentina.root);

  const evaWaypoints = [
    { x: 0.0, z: 4.5, pause: 1.2 }, // Central Dome Airlock
    { x: 4.5, z: 2.2, pause: 0.0 }, // Path towards Greenhouse
    { x: 7.2, z: -2.8, pause: 2.5 }, // Inspect Greenhouse
    { x: 1.5, z: -4.8, pause: 0.0 }, // North crossway
    { x: -6.8, z: -4.8, pause: 3.5 }, // Solar Farm inspection stop
    { x: -6.5, z: 4.8, pause: 2.5 }, // Comm Array inspection stop
    { x: -1.5, z: 4.2, pause: 0.0 }, // Return to Hab
  ];

  let evaWaypointIdx = 0;
  let evaProgress = 0;
  let evaPauseTimer = 0;
  let evaWalkPhase = 0;
  let evaWorkPhase = 0;

  // Astronaut 2: Dr. Leo Chen (Life Support Specialist in Translucent Tunnel)
  const leoChen = createAstronautMesh({
    suitColor: 0xe2e8f0,
    visorColor: 0x38bdf8,
    scale: 0.92,
  });
  leoChen.root.name = 'astronaut_leo_chen';
  astronautGroup.add(leoChen.root);

  const tunnelWaypoints = [
    { x: 1.8, z: -1.0 },
    { x: 4.2, z: -2.2 },
    { x: 6.8, z: -3.6 },
    { x: 4.2, z: -2.2 },
  ];
  let tunnelWaypointIdx = 0;
  let tunnelProgress = 0;
  let tunnelWalkPhase = 1.5;

  // Astronaut 3: Cryogenic Ice Miner (ISRU Extraction Team)
  const iceMiner = createAstronautMesh({
    suitColor: 0xcfd8dc,
    visorColor: 0x0284c7,
    hasTool: 'drill',
    scale: 0.95,
  });
  iceMiner.root.name = 'astronaut_ice_miner';
  iceMiner.root.position.set(7.0, 0, 5.2);
  iceMiner.root.lookAt(8.0, 0, 6.5);
  astronautGroup.add(iceMiner.root);
  let minerWorkPhase = 0;

  // Astronaut 4: Station Maintenance Specialist (Solar Array)
  const solarTech = createAstronautMesh({
    suitColor: 0xf1f5f9,
    visorColor: 0xeab308,
    hasTool: 'tablet',
    scale: 0.92,
  });
  solarTech.root.name = 'astronaut_solar_tech';
  solarTech.root.position.set(-7.2, 0, -4.0);
  solarTech.root.lookAt(-8.5, 0, -5.5);
  astronautGroup.add(solarTech.root);
  let techWorkPhase = 0;

  // ==========================================
  // 8. Dynamic Animation Update Loop
  // ==========================================
  let totalTime = 0;

  function update(dt: number, state: BaseDynamicState, scene?: THREE.Scene): void {
    const safeDt = Math.min(dt, 0.1);
    totalTime += safeDt;

    // 0. Continuous Diurnal Solar Orbital Movement & Celestial Lighting
    instanceSolarCycleIndex = (instanceSolarCycleIndex + 1) % 4;
    currentSolarCycle = updateSolarCycle(
      safeDt,
      sunLight,
      sunSphere,
      location,
      scene,
      ambientLight,
      state,
      instanceSolarCycleRing[instanceSolarCycleIndex]
    );

    // A. Earth slow axial rotation
    if (earthMesh) {
      earthMesh.rotation.y += safeDt * 0.05;
    }

    // B. DSN Antenna azimuth tracking
    dishAssembly.rotation.y += safeDt * 0.18;

    // C. Solar Panels Tracking / Stow Logic
    const isSolarBlocked = state.dustStormActive || (location === 'moon' && state.isLunarNight) || !currentSolarCycle.isDay;
    if (isSolarBlocked) {
      wingGroup.rotation.x = THREE.MathUtils.lerp(wingGroup.rotation.x, 0, safeDt * 2.0);
      wingGroup.rotation.z = THREE.MathUtils.lerp(wingGroup.rotation.z, 0, safeDt * 2.0);
    } else {
      wingGroup.rotation.x = Math.sin(totalTime * 0.25) * 0.35 + 0.2;
      wingGroup.rotation.z = Math.cos(totalTime * 0.15) * 0.15;
    }

    // D. Ice Mine drill reciprocating motion
    drillPiston.position.y = 1.3 + Math.sin(totalTime * 6.0) * 0.45;

    // E. Magnetic Shield Dome response to radiation
    if (state.radiationActive) {
      shieldDome.visible = true;
      shieldMat.opacity = 0.45 + Math.sin(totalTime * 8.0) * 0.25;
      shieldMat.color.setHex(0x38bdf8);
      shieldMat.emissive.setHex(0x60a5fa);
      shieldDome.scale.setScalar(1.0 + Math.sin(totalTime * 4.0) * 0.02);
    } else {
      shieldMat.opacity = THREE.MathUtils.lerp(shieldMat.opacity, 0.08, safeDt * 2.0);
      shieldDome.visible = shieldMat.opacity > 0.01;
      shieldDome.scale.set(1, 1, 1);
    }

    // F. Warning Beacon & Emergency Lighting
    if (state.wiringErrorActive || state.emergencyO2Active) {
      const flash = (Math.sin(totalTime * 12.0) + 1) * 0.5;
      centralBeaconLight.color.setHex(0xef4444);
      centralBeaconLight.intensity = 1.0 + flash * 3.0;
      beaconMat.emissive.setHex(0xdc2626);
    } else {
      centralBeaconLight.color.setHex(0x38bdf8);
      centralBeaconLight.intensity = 2.0;
      beaconMat.emissive.setHex(0x0284c7);
    }

    // G. Bunker Emergency Siren Beacon (during radiation storm)
    if (state.radiationActive) {
      bunkerLight.intensity = 2.5 + Math.sin(totalTime * 10.0) * 1.5;
      bBeaconMat.color.setHex(0xff0044);
    } else {
      bunkerLight.intensity = 0;
      bBeaconMat.color.setHex(0x475569);
    }

    // H. Additional solar light attenuation during dust storm
    if (state.dustStormActive) {
      sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, 0.45, safeDt * 3.0);
      ambientLight.intensity = THREE.MathUtils.lerp(ambientLight.intensity, 0.75, safeDt * 3.0);
    }

    // I. Astronaut Crew Animations & Kinematics
    // 1. Valentina Surface EVA Patrol
    const currWp = evaWaypoints[evaWaypointIdx];
    const nextWp = evaWaypoints[(evaWaypointIdx + 1) % evaWaypoints.length];

    if (evaPauseTimer > 0) {
      evaPauseTimer -= safeDt;
      evaWorkPhase += safeDt * 3.0;

      // Performing station inspection task (scanner arm raised, examining equipment)
      valentina.leftLegPivot.rotation.x = THREE.MathUtils.lerp(valentina.leftLegPivot.rotation.x, 0, safeDt * 5.0);
      valentina.rightLegPivot.rotation.x = THREE.MathUtils.lerp(valentina.rightLegPivot.rotation.x, 0, safeDt * 5.0);
      valentina.rightArmPivot.rotation.x = THREE.MathUtils.lerp(valentina.rightArmPivot.rotation.x, -1.2 + Math.sin(evaWorkPhase) * 0.15, safeDt * 4.0);
      valentina.leftArmPivot.rotation.x = THREE.MathUtils.lerp(valentina.leftArmPivot.rotation.x, -0.4, safeDt * 4.0);
      valentina.helmetGroup.rotation.y = Math.sin(evaWorkPhase * 0.6) * 0.35;
      valentina.bodyGroup.position.y = 0.62 * 0.95;
      valentina.bodyGroup.rotation.z = 0;
    } else {
      // Walking along patrol path
      evaWalkPhase += safeDt * 5.5;
      const kin = computeWalkKinematics(evaWalkPhase);

      const segmentDist = Math.hypot(nextWp.x - currWp.x, nextWp.z - currWp.z);
      const walkSpeed = 1.35; // units per second
      evaProgress += (safeDt * walkSpeed) / Math.max(0.1, segmentDist);

      if (evaProgress >= 1.0) {
        evaProgress = 0;
        evaWaypointIdx = (evaWaypointIdx + 1) % evaWaypoints.length;
        if (nextWp.pause > 0) {
          evaPauseTimer = nextWp.pause;
        }
      }

      const currentPos = interpolateWaypoint(currWp, nextWp, evaProgress);
      valentina.root.position.set(currentPos.x, 0, currentPos.z);

      const heading = computeHeading(currWp, nextWp);
      valentina.root.rotation.y = THREE.MathUtils.lerp(valentina.root.rotation.y, heading, safeDt * 8.0);

      valentina.leftLegPivot.rotation.x = kin.legAngle;
      valentina.rightLegPivot.rotation.x = -kin.legAngle;
      valentina.leftArmPivot.rotation.x = -kin.armAngle;
      valentina.rightArmPivot.rotation.x = kin.armAngle;
      valentina.bodyGroup.position.y = 0.62 * 0.95 + kin.torsoBob;
      valentina.bodyGroup.rotation.z = kin.torsoRoll;
      valentina.helmetGroup.rotation.y = Math.sin(evaWalkPhase * 0.5) * 0.08;
    }

    // 2. Dr. Leo Chen in Translucent Tunnel Corridor
    tunnelWalkPhase += safeDt * 5.0;
    const tunnelKin = computeWalkKinematics(tunnelWalkPhase);

    const tCurr = tunnelWaypoints[tunnelWaypointIdx];
    const tNext = tunnelWaypoints[(tunnelWaypointIdx + 1) % tunnelWaypoints.length];
    const tDist = Math.hypot(tNext.x - tCurr.x, tNext.z - tCurr.z);
    tunnelProgress += (safeDt * 1.1) / Math.max(0.1, tDist);

    if (tunnelProgress >= 1.0) {
      tunnelProgress = 0;
      tunnelWaypointIdx = (tunnelWaypointIdx + 1) % tunnelWaypoints.length;
    }

    const tPos = interpolateWaypoint(tCurr, tNext, tunnelProgress);
    leoChen.root.position.set(tPos.x, 0.18, tPos.z);
    leoChen.root.rotation.y = computeHeading(tCurr, tNext);

    leoChen.leftLegPivot.rotation.x = tunnelKin.legAngle;
    leoChen.rightLegPivot.rotation.x = -tunnelKin.legAngle;
    leoChen.leftArmPivot.rotation.x = -tunnelKin.armAngle;
    leoChen.rightArmPivot.rotation.x = tunnelKin.armAngle;
    leoChen.bodyGroup.position.y = 0.62 * 0.92 + tunnelKin.torsoBob;
    leoChen.bodyGroup.rotation.z = tunnelKin.torsoRoll;

    // 3. Ice Miner Astronaut: Active and visible when assignedToMineCount > 0
    const hasMiners = !!(state.assignedToMineCount && state.assignedToMineCount > 0);
    iceMiner.root.visible = hasMiners;

    if (hasMiners) {
      minerWorkPhase += safeDt * 4.5;
      iceMiner.rightArmPivot.rotation.x = -1.1 + Math.sin(minerWorkPhase * 2.0) * 0.12;
      iceMiner.leftArmPivot.rotation.x = -0.5 + Math.cos(minerWorkPhase) * 0.08;
      iceMiner.helmetGroup.rotation.x = 0.25; // looking down at extraction core
      iceMiner.bodyGroup.position.y = 0.62 * 0.95 + Math.sin(minerWorkPhase * 4.0) * 0.01;

      if (iceMiner.toolLight) {
        iceMiner.toolLight.intensity = 1.0 + Math.sin(minerWorkPhase * 8.0) * 0.6;
      }
    }

    // 4. Solar Tech inspecting array with datapad
    techWorkPhase += safeDt * 2.0;
    solarTech.rightArmPivot.rotation.x = -1.0 + Math.sin(techWorkPhase) * 0.06;
    solarTech.leftArmPivot.rotation.x = -0.8 + Math.cos(techWorkPhase) * 0.05;
    solarTech.helmetGroup.rotation.y = Math.sin(techWorkPhase * 0.5) * 0.2;
    solarTech.bodyGroup.position.y = 0.62 * 0.92 + Math.sin(techWorkPhase * 0.8) * 0.01;
  }

  function dispose(): void {
    disposeThreeObject(root);
  }

  return {
    group: root,
    interactiveObjects,
    lights: {
      sunLight,
      ambientLight,
      greenhouseLight,
      centralBeaconLight,
      bunkerLight,
    },
    sunSphere,
    sunHalo,
    get solarCycleState() {
      return currentSolarCycle;
    },
    update,
    dispose,
  };
}
