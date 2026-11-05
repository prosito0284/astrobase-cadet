import * as THREE from 'three';
import { disposeThreeObject } from './disposal';

/**
 * Interface contract for real-time procedural damage & crisis particle systems.
 */
export interface DamageParticleSystem {
  group: THREE.Group;
  update: (
    dt: number,
    alerts?: { batteryFailure?: boolean; o2Leak?: boolean; solarStorm?: boolean }
  ) => void;
  dispose: () => void;
  getDamagedModuleMeshes: () => THREE.Object3D[];
  setAlertState?: (alerts: { batteryFailure?: boolean; o2Leak?: boolean; solarStorm?: boolean }) => void;
}

/**
 * Creates soft particle circular texture dynamically using HTML5 Canvas.
 * Safely guards against headless and node environments.
 */
function createParticleTexture(): THREE.Texture | null {
  if (typeof document === 'undefined' || !document.createElement) {
    return null;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.75)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  } catch {
    return null;
  }
}

/**
 * Builds procedural real-time 3D particle and visual crisis systems anchored to base modules:
 * 1. Battery Failure on Solar Farm (`solar_farm`): Yellow/cyan electrical sparks + rising billows of black smoke.
 * 2. O2 Leak on Central Dome (`regolith_shield`): Fissure crack on dome + directional white vapor jet blasting into vacuum.
 * 3. Solar Storm on Magnetic Shield (`magnetic_shield`): Pulsating crimson-red shield sphere + rotating energetic plasma arcs.
 *
 * Enforces Zero-Allocation 60 FPS rule: all Float32Arrays, geometries, and materials are pre-allocated at initialization.
 */
export function createDamageParticleSystems(
  modulePositions: Record<string, THREE.Vector3> = {}
): DamageParticleSystem {
  const root = new THREE.Group();
  root.name = 'damage_particle_systems_root';

  const particleTex = createParticleTexture();

  // Anchors for crisis systems
  const solarBase = modulePositions['solar_farm'] ?? new THREE.Vector3(-8.5, 0, -5.5);
  const solarAnchorX = solarBase.x;
  const solarAnchorY = solarBase.y + 2.5; // at panel wings height
  const solarAnchorZ = solarBase.z;

  const regolithBase = modulePositions['regolith_shield'] ?? new THREE.Vector3(0, 0, 0);
  const domeAnchorX = regolithBase.x + 0.2;
  const domeAnchorY = regolithBase.y + 3.8; // upper dome surface
  const domeAnchorZ = regolithBase.z + 1.4;

  const shieldBase = modulePositions['magnetic_shield'] ?? new THREE.Vector3(0, 0, 0);
  const shieldAnchorX = shieldBase.x;
  const shieldAnchorY = shieldBase.y;
  const shieldAnchorZ = shieldBase.z;

  // Active crisis state cache
  let activeAlerts = {
    batteryFailure: false,
    o2Leak: false,
    solarStorm: false,
  };

  // ==========================================
  // 1. BATTERY FAILURE: Electrical Sparks + Black Smoke (`solar_farm`)
  // ==========================================
  const batteryGroup = new THREE.Group();
  batteryGroup.name = 'crisis_battery_failure';

  // 1A. Electrical Sparks (Yellow 0xfacc15 & Cyan 0x38bdf8)
  const sparkCount = 160;
  const sparkGeom = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array(sparkCount * 3);
  const sparkColors = new Float32Array(sparkCount * 3);
  const sparkVelocities = new Float32Array(sparkCount * 3);
  const sparkAges = new Float32Array(sparkCount);
  const sparkLifetimes = new Float32Array(sparkCount);

  for (let i = 0; i < sparkCount; i++) {
    const i3 = i * 3;
    sparkPositions[i3] = solarAnchorX + (Math.random() - 0.5) * 0.4;
    sparkPositions[i3 + 1] = solarAnchorY + (Math.random() - 0.5) * 0.2;
    sparkPositions[i3 + 2] = solarAnchorZ + (Math.random() - 0.5) * 0.4;

    // High velocity sparks
    sparkVelocities[i3] = (Math.random() - 0.5) * 8.0;
    sparkVelocities[i3 + 1] = 2.0 + Math.random() * 6.5;
    sparkVelocities[i3 + 2] = (Math.random() - 0.5) * 8.0;

    sparkAges[i] = Math.random() * 0.35;
    sparkLifetimes[i] = 0.15 + Math.random() * 0.35;

    // Alternating electric yellow and cyan
    if (i % 2 === 0) {
      sparkColors[i3] = 0.98; // R
      sparkColors[i3 + 1] = 0.8; // G
      sparkColors[i3 + 2] = 0.08; // B
    } else {
      sparkColors[i3] = 0.22; // R
      sparkColors[i3 + 1] = 0.74; // G
      sparkColors[i3 + 2] = 0.97; // B
    }
  }

  sparkGeom.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeom.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

  const sparkMat = new THREE.PointsMaterial({
    vertexColors: true,
    size: 0.32,
    ...(particleTex ? { map: particleTex } : {}),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparkPoints = new THREE.Points(sparkGeom, sparkMat);
  sparkPoints.name = 'battery_sparks';
  sparkPoints.visible = false;
  batteryGroup.add(sparkPoints);

  // 1B. Billows of Black Smoke
  const smokeCount = 130;
  const smokeGeom = new THREE.BufferGeometry();
  const smokePositions = new Float32Array(smokeCount * 3);
  const smokeVelocities = new Float32Array(smokeCount * 3);
  const smokeAges = new Float32Array(smokeCount);
  const smokeLifetimes = new Float32Array(smokeCount);

  for (let i = 0; i < smokeCount; i++) {
    const i3 = i * 3;
    smokePositions[i3] = solarAnchorX + (Math.random() - 0.5) * 0.6;
    smokePositions[i3 + 1] = solarAnchorY + Math.random() * 0.5;
    smokePositions[i3 + 2] = solarAnchorZ + (Math.random() - 0.5) * 0.6;

    smokeVelocities[i3] = (Math.random() - 0.5) * 0.9;
    smokeVelocities[i3 + 1] = 1.4 + Math.random() * 2.2; // rising billow
    smokeVelocities[i3 + 2] = (Math.random() - 0.5) * 0.9;

    smokeAges[i] = Math.random() * 1.8;
    smokeLifetimes[i] = 1.2 + Math.random() * 1.5;
  }

  smokeGeom.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));

  const smokeMat = new THREE.PointsMaterial({
    color: new THREE.Color(0x18181b), // Dense black/charcoal
    size: 0.85,
    ...(particleTex ? { map: particleTex } : {}),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const smokePoints = new THREE.Points(smokeGeom, smokeMat);
  smokePoints.name = 'battery_smoke';
  smokePoints.visible = false;
  batteryGroup.add(smokePoints);

  // 1C. Interactive Raycast Hit Mesh for Battery
  const solarDamageCollider = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 3.2, 3.8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  solarDamageCollider.name = 'hitbox_damage_battery';
  solarDamageCollider.position.set(solarAnchorX, solarAnchorY, solarAnchorZ);
  solarDamageCollider.userData = {
    moduleId: 'solar_farm',
    crisisType: 'battery',
    isDamagedModule: true,
  };
  const origSolarRaycast = solarDamageCollider.raycast.bind(solarDamageCollider);
  solarDamageCollider.raycast = function (raycaster, intersects) {
    if (!activeAlerts.batteryFailure) return;
    origSolarRaycast(raycaster, intersects);
  };
  batteryGroup.add(solarDamageCollider);

  root.add(batteryGroup);

  // ==========================================
  // 2. O2 LEAK: Fissure Crack + White Vapor Jet (`regolith_shield`)
  // ==========================================
  const o2Group = new THREE.Group();
  o2Group.name = 'crisis_o2_leak';

  // 2A. Visual Fissure / Crack on Central Dome
  const crackVertexCount = 7;
  const crackPositions = new Float32Array([
    domeAnchorX - 0.35, domeAnchorY - 0.4, domeAnchorZ + 0.15,
    domeAnchorX - 0.15, domeAnchorY - 0.2, domeAnchorZ + 0.08,
    domeAnchorX + 0.1,  domeAnchorY - 0.05, domeAnchorZ + 0.02,
    domeAnchorX,        domeAnchorY + 0.15, domeAnchorZ - 0.05,
    domeAnchorX + 0.25, domeAnchorY + 0.32, domeAnchorZ - 0.12,
    domeAnchorX + 0.05, domeAnchorY + 0.5,  domeAnchorZ - 0.22,
    domeAnchorX + 0.28, domeAnchorY + 0.68, domeAnchorZ - 0.3,
  ]);
  const fissureGeom = new THREE.BufferGeometry();
  fissureGeom.setAttribute('position', new THREE.BufferAttribute(crackPositions, 3));

  const fissureMat = new THREE.LineBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0,
    linewidth: 2,
    blending: THREE.AdditiveBlending,
  });
  const fissureLine = new THREE.Line(fissureGeom, fissureMat);
  fissureLine.name = 'o2_fissure_crack';
  fissureLine.visible = false;
  o2Group.add(fissureLine);

  // Fissure Frost Glow Accent
  const crackGlowGeom = new THREE.SphereGeometry(0.35, 8, 8);
  const crackGlowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    wireframe: true,
  });
  const crackGlow = new THREE.Mesh(crackGlowGeom, crackGlowMat);
  crackGlow.name = 'o2_crack_glow';
  crackGlow.position.set(domeAnchorX, domeAnchorY, domeAnchorZ);
  crackGlow.visible = false;
  o2Group.add(crackGlow);

  // 2B. High-Pressure Directional White Vapor Jet blasting into space
  const vaporCount = 180;
  const vaporGeom = new THREE.BufferGeometry();
  const vaporPositions = new Float32Array(vaporCount * 3);
  const vaporVelocities = new Float32Array(vaporCount * 3);
  const vaporAges = new Float32Array(vaporCount);
  const vaporLifetimes = new Float32Array(vaporCount);

  // Jet directional vector pointing outward & upward from dome: (0.35, 0.85, 0.40)
  const jetDirX = 0.35;
  const jetDirY = 0.85;
  const jetDirZ = 0.40;
  const jetLen = Math.hypot(jetDirX, jetDirY, jetDirZ);
  const normJetX = jetDirX / jetLen;
  const normJetY = jetDirY / jetLen;
  const normJetZ = jetDirZ / jetLen;

  for (let i = 0; i < vaporCount; i++) {
    const i3 = i * 3;
    vaporPositions[i3] = domeAnchorX;
    vaporPositions[i3 + 1] = domeAnchorY;
    vaporPositions[i3 + 2] = domeAnchorZ;

    // High velocity directional jet with conical dispersal
    const speed = 10.0 + Math.random() * 12.0;
    const coneJitterX = (Math.random() - 0.5) * 2.2;
    const coneJitterY = (Math.random() - 0.5) * 1.5;
    const coneJitterZ = (Math.random() - 0.5) * 2.2;

    vaporVelocities[i3] = normJetX * speed + coneJitterX;
    vaporVelocities[i3 + 1] = normJetY * speed + coneJitterY;
    vaporVelocities[i3 + 2] = normJetZ * speed + coneJitterZ;

    vaporAges[i] = Math.random() * 0.65;
    vaporLifetimes[i] = 0.45 + Math.random() * 0.45;
  }

  vaporGeom.setAttribute('position', new THREE.BufferAttribute(vaporPositions, 3));

  const vaporMat = new THREE.PointsMaterial({
    color: new THREE.Color(0xffffff), // Pristine white vapor jet
    size: 0.42,
    ...(particleTex ? { map: particleTex } : {}),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const vaporPoints = new THREE.Points(vaporGeom, vaporMat);
  vaporPoints.name = 'o2_vapor_jet';
  vaporPoints.visible = false;
  o2Group.add(vaporPoints);

  // 2C. Interactive Raycast Hit Mesh for O2 Leak
  const o2DamageCollider = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 12, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  o2DamageCollider.name = 'hitbox_damage_o2';
  o2DamageCollider.position.set(domeAnchorX, domeAnchorY, domeAnchorZ);
  o2DamageCollider.userData = {
    moduleId: 'regolith_shield',
    crisisType: 'o2',
    isDamagedModule: true,
  };
  const origO2Raycast = o2DamageCollider.raycast.bind(o2DamageCollider);
  o2DamageCollider.raycast = function (raycaster, intersects) {
    if (!activeAlerts.o2Leak) return;
    origO2Raycast(raycaster, intersects);
  };
  o2Group.add(o2DamageCollider);

  root.add(o2Group);

  // ==========================================
  // 3. SOLAR STORM: Pulsating Red Magnetic Shield + Plasma Arcs (`magnetic_shield`)
  // ==========================================
  const stormGroup = new THREE.Group();
  stormGroup.name = 'crisis_solar_storm';

  // 3A. Pulsating Semi-Transparent Magnetic Shield Sphere Mesh (Crimson Red)
  const shieldSphereGeom = new THREE.SphereGeometry(15.8, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const shieldSphereMat = new THREE.MeshBasicMaterial({
    color: 0xef4444, // Crimson Red
    wireframe: true,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const shieldSphereMesh = new THREE.Mesh(shieldSphereGeom, shieldSphereMat);
  shieldSphereMesh.name = 'crisis_magnetic_shield_sphere';
  shieldSphereMesh.position.set(shieldAnchorX, shieldAnchorY, shieldAnchorZ);
  shieldSphereMesh.visible = false;
  shieldSphereMesh.userData = {
    moduleId: 'magnetic_shield',
    crisisType: 'solar_storm',
    isDamagedModule: true,
  };
  const origShieldRaycast = shieldSphereMesh.raycast.bind(shieldSphereMesh);
  shieldSphereMesh.raycast = function (raycaster, intersects) {
    if (!activeAlerts.solarStorm) return;
    origShieldRaycast(raycaster, intersects);
  };
  stormGroup.add(shieldSphereMesh);

  // 3B. Rotating Energetic Plasma Arcs (3 Concentric / Tilted Toruses)
  const plasmaArc1Geom = new THREE.TorusGeometry(15.9, 0.12, 8, 48, Math.PI * 1.35);
  const plasmaArc1Mat = new THREE.MeshBasicMaterial({
    color: 0xdc2626, // Deep red
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const plasmaArc1 = new THREE.Mesh(plasmaArc1Geom, plasmaArc1Mat);
  plasmaArc1.name = 'plasma_arc_1';
  plasmaArc1.position.set(shieldAnchorX, shieldAnchorY, shieldAnchorZ);
  plasmaArc1.rotation.set(0.45, 0, 0.35);
  plasmaArc1.visible = false;
  stormGroup.add(plasmaArc1);

  const plasmaArc2Geom = new THREE.TorusGeometry(16.15, 0.14, 8, 48, Math.PI * 1.45);
  const plasmaArc2Mat = new THREE.MeshBasicMaterial({
    color: 0xf97316, // Energetic orange-red
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const plasmaArc2 = new THREE.Mesh(plasmaArc2Geom, plasmaArc2Mat);
  plasmaArc2.name = 'plasma_arc_2';
  plasmaArc2.position.set(shieldAnchorX, shieldAnchorY, shieldAnchorZ);
  plasmaArc2.rotation.set(-0.55, 0.75, 0.2);
  plasmaArc2.visible = false;
  stormGroup.add(plasmaArc2);

  const plasmaArc3Geom = new THREE.TorusGeometry(16.0, 0.10, 8, 48, Math.PI * 1.25);
  const plasmaArc3Mat = new THREE.MeshBasicMaterial({
    color: 0xf43f5e, // Hot rose-red
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const plasmaArc3 = new THREE.Mesh(plasmaArc3Geom, plasmaArc3Mat);
  plasmaArc3.name = 'plasma_arc_3';
  plasmaArc3.position.set(shieldAnchorX, shieldAnchorY, shieldAnchorZ);
  plasmaArc3.rotation.set(0.65, -0.4, 0.7);
  plasmaArc3.visible = false;
  stormGroup.add(plasmaArc3);

  root.add(stormGroup);

  // Interactive hit target list for tactile raycasting
  const damagedMeshes: THREE.Object3D[] = [
    solarDamageCollider,
    o2DamageCollider,
    shieldSphereMesh,
  ];

  // Guarantee world matrices are initialized for raycasting hit testing
  root.updateMatrixWorld(true);

  // ==========================================
  // ZERO-ALLOCATION ANIMATION LOOP VARIABLES
  // ==========================================
  let totalTime = 0;
  let currentSparkOpacity = 0;
  let currentSmokeOpacity = 0;
  let currentVaporOpacity = 0;
  let currentShieldOpacity = 0;

  /**
   * Updates all active damage particle and visual crisis systems.
   * Guarantees 0 heap allocations per tick.
   */
  function update(
    dt: number,
    alerts?: { batteryFailure?: boolean; o2Leak?: boolean; solarStorm?: boolean }
  ): void {
    const safeDt = Math.min(dt, 0.1);
    totalTime += safeDt;

    if (alerts) {
      activeAlerts.batteryFailure = Boolean(alerts.batteryFailure);
      activeAlerts.o2Leak = Boolean(alerts.o2Leak);
      activeAlerts.solarStorm = Boolean(alerts.solarStorm);
    }

    const isBattery = activeAlerts.batteryFailure;
    const isO2 = activeAlerts.o2Leak;
    const isStorm = activeAlerts.solarStorm;

    // ----------------------------------------
    // 1. Update Battery Sparks & Smoke
    // ----------------------------------------
    const targetSparkOpacity = isBattery ? 1.0 : 0.0;
    const sparkFade = isBattery ? 6.0 : 10.0;
    currentSparkOpacity += (targetSparkOpacity - currentSparkOpacity) * Math.min(1, safeDt * sparkFade);
    if (!isBattery && currentSparkOpacity < 0.01) {
      currentSparkOpacity = 0;
    }
    sparkMat.opacity = currentSparkOpacity;
    sparkPoints.visible = currentSparkOpacity > 0.01;

    const targetSmokeOpacity = isBattery ? 0.75 : 0.0;
    const smokeFade = isBattery ? 4.0 : 8.0;
    currentSmokeOpacity += (targetSmokeOpacity - currentSmokeOpacity) * Math.min(1, safeDt * smokeFade);
    if (!isBattery && currentSmokeOpacity < 0.01) {
      currentSmokeOpacity = 0;
    }
    smokeMat.opacity = currentSmokeOpacity;
    smokePoints.visible = currentSmokeOpacity > 0.01;

    if (sparkPoints.visible) {
      const posAttr = sparkGeom.getAttribute('position') as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      for (let i = 0; i < sparkCount; i++) {
        const i3 = i * 3;
        sparkAges[i] += safeDt;

        posArr[i3] += sparkVelocities[i3] * safeDt;
        sparkVelocities[i3 + 1] -= 9.8 * safeDt; // Gravity arc on sparks
        posArr[i3 + 1] += sparkVelocities[i3 + 1] * safeDt;
        posArr[i3 + 2] += sparkVelocities[i3 + 2] * safeDt;

        if (sparkAges[i] >= sparkLifetimes[i] || posArr[i3 + 1] < solarAnchorY - 1.2) {
          posArr[i3] = solarAnchorX + (Math.random() - 0.5) * 0.4;
          posArr[i3 + 1] = solarAnchorY + (Math.random() - 0.5) * 0.2;
          posArr[i3 + 2] = solarAnchorZ + (Math.random() - 0.5) * 0.4;

          sparkVelocities[i3] = (Math.random() - 0.5) * 8.0;
          sparkVelocities[i3 + 1] = 2.0 + Math.random() * 6.5;
          sparkVelocities[i3 + 2] = (Math.random() - 0.5) * 8.0;

          sparkAges[i] = 0;
        }
      }
      posAttr.needsUpdate = true;
    }

    if (smokePoints.visible) {
      const posAttr = smokeGeom.getAttribute('position') as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      for (let i = 0; i < smokeCount; i++) {
        const i3 = i * 3;
        smokeAges[i] += safeDt;

        posArr[i3] += smokeVelocities[i3] * safeDt;
        posArr[i3 + 1] += smokeVelocities[i3 + 1] * safeDt;
        posArr[i3 + 2] += smokeVelocities[i3 + 2] * safeDt;

        if (smokeAges[i] >= smokeLifetimes[i] || posArr[i3 + 1] > solarAnchorY + 6.5) {
          posArr[i3] = solarAnchorX + (Math.random() - 0.5) * 0.5;
          posArr[i3 + 1] = solarAnchorY + Math.random() * 0.3;
          posArr[i3 + 2] = solarAnchorZ + (Math.random() - 0.5) * 0.5;
          smokeAges[i] = 0;
        }
      }
      posAttr.needsUpdate = true;
    }

    // ----------------------------------------
    // 2. Update O2 Leak Fissure & Directional Vapor Jet
    // ----------------------------------------
    const targetVaporOpacity = isO2 ? 0.88 : 0.0;
    const vaporFade = isO2 ? 5.0 : 9.0;
    currentVaporOpacity += (targetVaporOpacity - currentVaporOpacity) * Math.min(1, safeDt * vaporFade);
    if (!isO2 && currentVaporOpacity < 0.01) {
      currentVaporOpacity = 0;
    }
    vaporMat.opacity = currentVaporOpacity;
    vaporPoints.visible = currentVaporOpacity > 0.01;

    fissureMat.opacity = currentVaporOpacity * (0.6 + Math.sin(totalTime * 14.0) * 0.4);
    fissureLine.visible = currentVaporOpacity > 0.01;

    crackGlowMat.opacity = currentVaporOpacity * 0.5;
    crackGlow.visible = currentVaporOpacity > 0.01;

    if (vaporPoints.visible) {
      const posAttr = vaporGeom.getAttribute('position') as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      for (let i = 0; i < vaporCount; i++) {
        const i3 = i * 3;
        vaporAges[i] += safeDt;

        posArr[i3] += vaporVelocities[i3] * safeDt;
        posArr[i3 + 1] += vaporVelocities[i3 + 1] * safeDt;
        posArr[i3 + 2] += vaporVelocities[i3 + 2] * safeDt;

        const dx = posArr[i3] - domeAnchorX;
        const dy = posArr[i3 + 1] - domeAnchorY;
        const dz = posArr[i3 + 2] - domeAnchorZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (vaporAges[i] >= vaporLifetimes[i] || distSq > 196.0) { // dist > 14m
          posArr[i3] = domeAnchorX;
          posArr[i3 + 1] = domeAnchorY;
          posArr[i3 + 2] = domeAnchorZ;

          const speed = 10.0 + Math.random() * 12.0;
          vaporVelocities[i3] = normJetX * speed + (Math.random() - 0.5) * 2.2;
          vaporVelocities[i3 + 1] = normJetY * speed + (Math.random() - 0.5) * 1.5;
          vaporVelocities[i3 + 2] = normJetZ * speed + (Math.random() - 0.5) * 2.2;

          vaporAges[i] = 0;
        }
      }
      posAttr.needsUpdate = true;
    }

    // ----------------------------------------
    // 3. Update Solar Storm Magnetic Shield & Plasma Arcs
    // ----------------------------------------
    const targetShieldOpacity = isStorm ? 0.45 : 0.0;
    const shieldFade = isStorm ? 4.5 : 9.0;
    currentShieldOpacity += (targetShieldOpacity - currentShieldOpacity) * Math.min(1, safeDt * shieldFade);
    if (!isStorm && currentShieldOpacity < 0.01) {
      currentShieldOpacity = 0;
    }

    if (currentShieldOpacity > 0.01) {
      shieldSphereMesh.visible = true;
      plasmaArc1.visible = true;
      plasmaArc2.visible = true;
      plasmaArc3.visible = true;

      // Pulsating crimson flash
      const pulseFlash = currentShieldOpacity * (1.0 + Math.sin(totalTime * 8.5) * 0.4);
      shieldSphereMat.opacity = Math.max(0, Math.min(1, pulseFlash));

      // Gentle energetic scale pulsing
      const scalePulse = 1.0 + Math.sin(totalTime * 6.0) * 0.018;
      shieldSphereMesh.scale.setScalar(scalePulse);

      // Rotate energetic plasma arcs around diverse axes
      plasmaArc1.rotation.y += safeDt * 2.5;
      plasmaArc2.rotation.x += safeDt * -1.8;
      plasmaArc2.rotation.z += safeDt * 1.4;
      plasmaArc3.rotation.z += safeDt * 2.9;
      plasmaArc3.rotation.y += safeDt * -1.3;

      plasmaArc1Mat.opacity = Math.max(0, Math.min(1, pulseFlash * 0.9));
      plasmaArc2Mat.opacity = Math.max(0, Math.min(1, pulseFlash * 0.85));
      plasmaArc3Mat.opacity = Math.max(0, Math.min(1, pulseFlash * 0.8));
    } else {
      shieldSphereMesh.visible = false;
      plasmaArc1.visible = false;
      plasmaArc2.visible = false;
      plasmaArc3.visible = false;
      shieldSphereMesh.scale.set(1, 1, 1);
    }
  }

  function setAlertState(alerts: {
    batteryFailure?: boolean;
    o2Leak?: boolean;
    solarStorm?: boolean;
  }): void {
    if (alerts.batteryFailure !== undefined) activeAlerts.batteryFailure = alerts.batteryFailure;
    if (alerts.o2Leak !== undefined) activeAlerts.o2Leak = alerts.o2Leak;
    if (alerts.solarStorm !== undefined) activeAlerts.solarStorm = alerts.solarStorm;
  }

  function getDamagedModuleMeshes(): THREE.Object3D[] {
    return damagedMeshes;
  }

  function dispose(): void {
    if (particleTex) {
      particleTex.dispose();
    }
    disposeThreeObject(root);
  }

  return {
    group: root,
    update,
    setAlertState,
    getDamagedModuleMeshes,
    dispose,
  };
}
