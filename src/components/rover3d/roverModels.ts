import * as THREE from 'three';

/**
 * Procedural 3D Models for Planetary Rovers: VIPER (Moon) and Perseverance (Mars)
 * Built with pure Three.js primitive geometries for ultra-lightweight footprint and zero asset dependencies.
 */

export interface RoverModelComponents {
  root: THREE.Group;
  steerableWheels: THREE.Object3D[];
  allWheels: THREE.Object3D[];
  laserEmitter: THREE.Object3D;
  headlights?: THREE.Light[];
  animatedParts?: THREE.Object3D[];
}

/**
 * Builds NASA Artemis VIPER Rover (Volatiles Investigating Polar Exploration Rover)
 * 4 independently steerable wheels, gold MLI insulation chassis, TRIDENT drill, headlights, NIRVSS spectrometer mast.
 */
export function buildVIPERModel(): RoverModelComponents {
  const root = new THREE.Group();
  root.name = 'VIPER_Rover';

  const steerableWheels: THREE.Object3D[] = [];
  const allWheels: THREE.Object3D[] = [];

  // 1. Chassis Body (Gold MLI thermal blanket with silver top deck)
  const chassisGeo = new THREE.BoxGeometry(1.6, 0.7, 1.8);
  const mliGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.35,
    metalness: 0.85,
    emissive: 0x5a4a15,
    emissiveIntensity: 0.25,
  });
  const chassis = new THREE.Mesh(chassisGeo, mliGoldMat);
  chassis.position.y = 0.95;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  root.add(chassis);

  // Solar array top deck
  const solarGeo = new THREE.BoxGeometry(1.5, 0.05, 1.7);
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x0f172a,
  });
  const solarDeck = new THREE.Mesh(solarGeo, solarMat);
  solarDeck.position.y = 1.33;
  root.add(solarDeck);

  // 2. TRIDENT 1-Meter Regolith Core Drill at Rear Left Corner
  const drillMastGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8);
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.4 });
  const drillMast = new THREE.Mesh(drillMastGeo, darkMetalMat);
  drillMast.position.set(-0.6, 1.5, 0.65);
  root.add(drillMast);

  const drillBitGeo = new THREE.ConeGeometry(0.09, 0.4, 8);
  const drillBitMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.2 });
  const drillBit = new THREE.Mesh(drillBitGeo, drillBitMat);
  drillBit.position.set(-0.6, 0.8, 0.65);
  drillBit.rotation.x = Math.PI;
  root.add(drillBit);

  // 3. NIRVSS Spectrometer Sensor Mast (Front Center) - Laser Emitter origin
  const mastPoleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8);
  const mastPole = new THREE.Mesh(mastPoleGeo, darkMetalMat);
  mastPole.position.set(0, 1.6, -0.6);
  root.add(mastPole);

  const sensorHeadGeo = new THREE.BoxGeometry(0.35, 0.22, 0.25);
  const sensorHeadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
  const sensorHead = new THREE.Mesh(sensorHeadGeo, sensorHeadMat);
  sensorHead.position.set(0, 2.15, -0.6);
  root.add(sensorHead);

  // Spectrometer lens optic
  const opticGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12);
  const opticMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const optic = new THREE.Mesh(opticGeo, opticMat);
  optic.rotation.x = Math.PI / 2;
  optic.position.set(0, 2.15, -0.74);
  root.add(optic);

  const laserEmitter = new THREE.Object3D();
  laserEmitter.position.set(0, 2.15, -0.8);
  root.add(laserEmitter);

  // 4. Dual High-Beam LED Headlights on Front Bumper
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const hlGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12);
  hlGeo.rotateX(Math.PI / 2);

  const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
  hlLeft.position.set(-0.55, 0.95, -0.92);
  root.add(hlLeft);

  const hlRight = new THREE.Mesh(hlGeo, headlightMat);
  hlRight.position.set(0.55, 0.95, -0.92);
  root.add(hlRight);

  // Front SpotLight Illuminating Crater Darkness
  const spotLight = new THREE.SpotLight(0xffffff, 2.5, 35, Math.PI / 6, 0.4, 1.2);
  spotLight.position.set(0, 1.2, -0.8);
  spotLight.target.position.set(0, 0, -15);
  root.add(spotLight);
  root.add(spotLight.target);

  // 5. Four Active Steerable Wheels with Grousers
  const wheelRadius = 0.38;
  const wheelWidth = 0.26;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.6,
  });

  const wheelPositions = [
    { x: -0.95, z: -0.75, isFront: true },
    { x: 0.95, z: -0.75, isFront: true },
    { x: -0.95, z: 0.75, isFront: false },
    { x: 0.95, z: 0.75, isFront: false },
  ];

  for (const pos of wheelPositions) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(pos.x, wheelRadius, pos.z);

    const wheelMesh = new THREE.Mesh(wheelGeo, tireMat);
    wheelMesh.castShadow = true;
    steerPivot.add(wheelMesh);

    // Chevron grouser ridges on tire
    for (let g = 0; g < 8; g++) {
      const grouserGeo = new THREE.BoxGeometry(wheelWidth + 0.02, 0.03, 0.05);
      const grouserMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
      const grouser = new THREE.Mesh(grouserGeo, grouserMat);
      const angle = (g / 8) * Math.PI * 2;
      grouser.position.set(0, Math.sin(angle) * (wheelRadius + 0.01), Math.cos(angle) * (wheelRadius + 0.01));
      grouser.rotation.x = angle;
      wheelMesh.add(grouser);
    }

    // Suspension strut connecting wheel to chassis
    const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6);
    const strut = new THREE.Mesh(strutGeo, darkMetalMat);
    strut.position.set(pos.x < 0 ? 0.12 : -0.12, 0.3, 0);
    steerPivot.add(strut);

    root.add(steerPivot);

    if (pos.isFront) {
      steerableWheels.push(steerPivot);
    }
    allWheels.push(wheelMesh);
  }

  return {
    root,
    steerableWheels,
    allWheels,
    laserEmitter,
    headlights: [spotLight],
  };
}

/**
 * Builds NASA Mars 2020 Perseverance Rover
 * 6 cleated aluminum wheels on rocker-bogie suspension, white chassis, SuperCam mast, robotic arm, MMRTG generator.
 */
export function buildPerseveranceModel(): RoverModelComponents {
  const root = new THREE.Group();
  root.name = 'Perseverance_Rover';

  const steerableWheels: THREE.Object3D[] = [];
  const allWheels: THREE.Object3D[] = [];

  // 1. Chassis Body (Aerospace White with Black Trim)
  const chassisGeo = new THREE.BoxGeometry(1.8, 0.75, 2.2);
  const aeroWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
    metalness: 0.3,
  });
  const chassis = new THREE.Mesh(chassisGeo, aeroWhiteMat);
  chassis.position.y = 1.05;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  root.add(chassis);

  // Red accent badge
  const badgeGeo = new THREE.BoxGeometry(0.3, 0.05, 0.4);
  const badgeMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
  const badge = new THREE.Mesh(badgeGeo, badgeMat);
  badge.position.set(0.65, 1.44, -0.4);
  root.add(badge);

  // 2. MMRTG (Multi-Mission Radioisotope Thermoelectric Generator) at Aft
  const mmrtgGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.8, 12);
  mmrtgGeo.rotateX(Math.PI / 2);
  const mmrtgMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.7,
  });
  const mmrtg = new THREE.Mesh(mmrtgGeo, mmrtgMat);
  mmrtg.position.set(0, 1.25, 1.35);
  root.add(mmrtg);

  // MMRTG cooling fins
  for (let f = 0; f < 6; f++) {
    const finGeo = new THREE.BoxGeometry(0.8, 0.02, 0.7);
    const fin = new THREE.Mesh(finGeo, mmrtgMat);
    fin.rotation.z = (f / 6) * Math.PI;
    mmrtg.add(fin);
  }

  // 3. SuperCam Mast & Remote Sensing Head (Front Right)
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.8 });
  const mastGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.35, 8);
  const mast = new THREE.Mesh(mastGeo, darkMat);
  mast.position.set(0.4, 1.8, -0.7);
  root.add(mast);

  // Mastcam-Z and SuperCam Head Unit
  const camHeadGeo = new THREE.BoxGeometry(0.45, 0.3, 0.35);
  const camHead = new THREE.Mesh(camHeadGeo, aeroWhiteMat);
  camHead.position.set(0.4, 2.5, -0.7);
  root.add(camHead);

  // Pulsed LIBS Laser Optic (SuperCam)
  const laserOpticGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12);
  laserOpticGeo.rotateX(Math.PI / 2);
  const laserOpticMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const laserOptic = new THREE.Mesh(laserOpticGeo, laserOpticMat);
  laserOptic.position.set(0.4, 2.5, -0.88);
  root.add(laserOptic);

  const laserEmitter = new THREE.Object3D();
  laserEmitter.position.set(0.4, 2.5, -0.95);
  root.add(laserEmitter);

  // 4. Robotic Arm Stowed at Front Left
  const armGeo1 = new THREE.CylinderGeometry(0.05, 0.05, 0.7);
  const arm1 = new THREE.Mesh(armGeo1, darkMat);
  arm1.position.set(-0.6, 0.9, -1.05);
  arm1.rotation.set(0.4, 0, 0.3);
  root.add(arm1);

  const turretGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8);
  const turret = new THREE.Mesh(turretGeo, aeroWhiteMat);
  turret.position.set(-0.7, 0.65, -1.3);
  root.add(turret);

  // 5. Rocker-Bogie Suspension with 6 Cleated Aluminum Wheels
  const wheelRadius = 0.36;
  const wheelWidth = 0.28;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const alumTireMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.3,
    metalness: 0.9,
  });

  const wheelsConfig = [
    { x: -1.05, z: -0.85, steer: true },  // Front Left
    { x: 1.05, z: -0.85, steer: true },   // Front Right
    { x: -1.15, z: 0.1, steer: false },   // Middle Left
    { x: 1.15, z: 0.1, steer: false },    // Middle Right
    { x: -1.05, z: 1.05, steer: true },   // Rear Left (Perseverance steers rear wheels too)
    { x: 1.05, z: 1.05, steer: true },    // Rear Right
  ];

  for (const wc of wheelsConfig) {
    const pivot = new THREE.Group();
    pivot.position.set(wc.x, wheelRadius, wc.z);

    const wheelMesh = new THREE.Mesh(wheelGeo, alumTireMat);
    wheelMesh.castShadow = true;
    pivot.add(wheelMesh);

    // Cleats on aluminum wheels
    for (let c = 0; c < 10; c++) {
      const cleatGeo = new THREE.BoxGeometry(wheelWidth + 0.02, 0.025, 0.04);
      const cleat = new THREE.Mesh(cleatGeo, darkMat);
      const ang = (c / 10) * Math.PI * 2;
      cleat.position.set(0, Math.sin(ang) * (wheelRadius + 0.01), Math.cos(ang) * (wheelRadius + 0.01));
      cleat.rotation.x = ang;
      wheelMesh.add(cleat);
    }

    // Rocker bogie arm segment
    const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6);
    const strut = new THREE.Mesh(strutGeo, darkMat);
    strut.position.set(wc.x < 0 ? 0.12 : -0.12, 0.35, 0);
    pivot.add(strut);

    root.add(pivot);

    if (wc.steer) {
      steerableWheels.push(pivot);
    }
    allWheels.push(wheelMesh);
  }

  // Front Navigation Headlights
  const navLight = new THREE.SpotLight(0xffedd5, 2.0, 32, Math.PI / 5, 0.5, 1.2);
  navLight.position.set(0, 1.3, -0.9);
  navLight.target.position.set(0, 0, -15);
  root.add(navLight);
  root.add(navLight.target);

  return {
    root,
    steerableWheels,
    allWheels,
    laserEmitter,
    headlights: [navLight],
  };
}

/**
 * Builds Base Lander Beacon with a sky-high vertical light pillar at (0, 0).
 */
export function buildBaseBeacon(location: 'moon' | 'mars'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BaseLanderBeacon';
  group.position.set(0, 0, 0);

  // 1. Octagonal Landing Pad Base
  const padGeo = new THREE.CylinderGeometry(4.5, 5.0, 0.4, 8);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.5,
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.2;
  pad.receiveShadow = true;
  group.add(pad);

  // Docking Ring Perimeter
  const ringGeo = new THREE.RingGeometry(3.6, 4.0, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: location === 'moon' ? 0x38bdf8 : 0x10b981,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.42;
  group.add(ring);

  // Lander Hub Center Module
  const hubGeo = new THREE.CylinderGeometry(1.4, 1.8, 1.8, 8);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.8,
    roughness: 0.2,
  });
  const hub = new THREE.Mesh(hubGeo, hubMat);
  hub.position.y = 1.3;
  group.add(hub);

  // Four Landing Struts
  for (let s = 0; s < 4; s++) {
    const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2);
    const strut = new THREE.Mesh(strutGeo, padMat);
    const ang = (s / 4) * Math.PI * 2;
    strut.position.set(Math.cos(ang) * 2.2, 0.9, Math.sin(ang) * 2.2);
    strut.rotation.z = Math.cos(ang) * 0.4;
    strut.rotation.x = Math.sin(ang) * 0.4;
    group.add(strut);
  }

  // 2. Sky-High Vertical Light Pillar Beam
  const pillarGeo = new THREE.CylinderGeometry(0.35, 1.2, 70, 16, 1, true);
  const pillarMat = new THREE.MeshBasicMaterial({
    color: location === 'moon' ? 0x38bdf8 : 0x10b981,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.y = 35;
  pillar.name = 'BeaconLightPillar';
  group.add(pillar);

  // Glowing Point Beacon Light
  const beaconLight = new THREE.PointLight(
    location === 'moon' ? 0x38bdf8 : 0x10b981,
    3.0,
    30
  );
  beaconLight.position.y = 3.0;
  group.add(beaconLight);

  return group;
}

/**
 * Creates visual laser beam mesh.
 */
export function buildLaserBeamMesh(color = 0x38bdf8): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  return mesh;
}

/**
 * Updates wheel steering and rotational motion based on rover speed.
 */
export function updateRoverModelVisuals(
  components: RoverModelComponents,
  speed: number,
  steeringAngle: number,
  dt: number,
  location: 'moon' | 'mars'
): void {
  // 1. Steering angle application
  for (let i = 0; i < components.steerableWheels.length; i++) {
    const wheelGroup = components.steerableWheels[i];
    if (location === 'mars' && i >= 2) {
      // Rear wheels steer opposite for tighter turning circle on 6-wheel rover
      wheelGroup.rotation.y = -steeringAngle * 0.6;
    } else {
      wheelGroup.rotation.y = steeringAngle;
    }
  }

  // 2. Rolling wheel rotation around axle
  // wheel radius ~0.37m, rotation delta = (speed * dt) / radius
  const wheelRadius = location === 'moon' ? 0.38 : 0.36;
  const rollDelta = (speed * dt) / wheelRadius;

  for (const wheel of components.allWheels) {
    wheel.rotation.x += rollDelta;
  }
}
