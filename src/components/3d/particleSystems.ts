import * as THREE from 'three';
import { disposeThreeObject } from './disposal';

/**
 * Creates a soft circular particle texture dynamically using Canvas.
 * Safely guards against Node / headless environments.
 */
function createParticleTexture(): THREE.Texture | null {
  if (typeof document === 'undefined' || !document.createElement) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export interface ParticleController {
  group: THREE.Group;
  update: (dt: number, dustActive: boolean, radiationActive: boolean) => void;
  dispose: () => void;
}

/**
 * Builds and controls dust storm and DONKI solar radiation particle systems.
 */
export function createParticleSystems(location: 'moon' | 'mars'): ParticleController {
  const group = new THREE.Group();
  group.name = 'particle_systems_root';

  const particleTex = createParticleTexture();

  // 1. Dust Storm System
  const dustCount = location === 'mars' ? 1200 : 600;
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  const dustVelocities = new Float32Array(dustCount * 3);

  const boundsX = 50;
  const boundsY = 16;
  const boundsZ = 50;

  for (let i = 0; i < dustCount; i++) {
    const i3 = i * 3;
    dustPositions[i3] = (Math.random() - 0.5) * boundsX;
    dustPositions[i3 + 1] = Math.random() * boundsY;
    dustPositions[i3 + 2] = (Math.random() - 0.5) * boundsZ;

    if (location === 'mars') {
      // Mars: high horizontal drift (sandstorm wind) + turbulent swirls
      dustVelocities[i3] = 4 + Math.random() * 8; // X wind
      dustVelocities[i3 + 1] = (Math.random() - 0.5) * 1.5; // Y turbulence
      dustVelocities[i3 + 2] = (Math.random() - 0.5) * 2; // Z drift
    } else {
      // Moon: electrostatic levitated dust, subtle thermal lofting
      dustVelocities[i3] = (Math.random() - 0.5) * 1.2;
      dustVelocities[i3 + 1] = 0.5 + Math.random() * 1.0;
      dustVelocities[i3 + 2] = (Math.random() - 0.5) * 1.2;
    }
  }

  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

  const dustColor = location === 'mars' ? new THREE.Color(0xd97706) : new THREE.Color(0x94a3b8);
  const dustMaterial = new THREE.PointsMaterial({
    color: dustColor,
    size: location === 'mars' ? 0.35 : 0.22,
    ...(particleTex ? { map: particleTex } : {}),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
  dustPoints.name = 'dust_storm_particles';
  group.add(dustPoints);

  // 2. Solar Radiation Proton Particles (DONKI CME SEP event)
  const radiationCount = 800;
  const radiationGeometry = new THREE.BufferGeometry();
  const radiationPositions = new Float32Array(radiationCount * 3);
  const radiationVelocities = new Float32Array(radiationCount * 3);

  for (let i = 0; i < radiationCount; i++) {
    const i3 = i * 3;
    radiationPositions[i3] = (Math.random() - 0.5) * boundsX * 1.2;
    radiationPositions[i3 + 1] = 10 + Math.random() * 25;
    radiationPositions[i3 + 2] = (Math.random() - 0.5) * boundsZ * 1.2;

    // High velocity solar proton flux descending from sky
    radiationVelocities[i3] = (Math.random() - 0.5) * 5;
    radiationVelocities[i3 + 1] = -(18 + Math.random() * 25);
    radiationVelocities[i3 + 2] = (Math.random() - 0.5) * 5;
  }

  radiationGeometry.setAttribute('position', new THREE.BufferAttribute(radiationPositions, 3));

  const radiationMaterial = new THREE.PointsMaterial({
    color: new THREE.Color(0x38bdf8),
    size: 0.28,
    ...(particleTex ? { map: particleTex } : {}),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const radiationPoints = new THREE.Points(radiationGeometry, radiationMaterial);
  radiationPoints.name = 'solar_radiation_particles';
  group.add(radiationPoints);

  // Smooth target opacities for fade in/out
  let currentDustOpacity = 0;
  let currentRadiationOpacity = 0;

  function update(dt: number, dustActive: boolean, radiationActive: boolean): void {
    // Clamped dt
    const safeDt = Math.min(dt, 0.1);

    // Fade dust
    const targetDustOpacity = dustActive ? (location === 'mars' ? 0.75 : 0.45) : 0;
    currentDustOpacity += (targetDustOpacity - currentDustOpacity) * Math.min(1, safeDt * 3.5);
    dustMaterial.opacity = currentDustOpacity;
    dustPoints.visible = currentDustOpacity > 0.01;

    if (dustPoints.visible) {
      const posAttr = dustGeometry.getAttribute('position') as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;
        posArray[i3] += dustVelocities[i3] * safeDt;
        posArray[i3 + 1] += dustVelocities[i3 + 1] * safeDt;
        posArray[i3 + 2] += dustVelocities[i3 + 2] * safeDt;

        // Wrap around boundaries
        if (posArray[i3] > boundsX / 2) posArray[i3] = -boundsX / 2;
        if (posArray[i3] < -boundsX / 2) posArray[i3] = boundsX / 2;
        if (posArray[i3 + 1] > boundsY) posArray[i3 + 1] = 0.2;
        if (posArray[i3 + 1] < 0.1) posArray[i3 + 1] = boundsY;
        if (posArray[i3 + 2] > boundsZ / 2) posArray[i3 + 2] = -boundsZ / 2;
        if (posArray[i3 + 2] < -boundsZ / 2) posArray[i3 + 2] = boundsZ / 2;
      }
      posAttr.needsUpdate = true;
    }

    // Fade radiation
    const targetRadiationOpacity = radiationActive ? 0.9 : 0;
    currentRadiationOpacity += (targetRadiationOpacity - currentRadiationOpacity) * Math.min(1, safeDt * 4.0);
    radiationMaterial.opacity = currentRadiationOpacity;
    radiationPoints.visible = currentRadiationOpacity > 0.01;

    if (radiationPoints.visible) {
      const posAttr = radiationGeometry.getAttribute('position') as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < radiationCount; i++) {
        const i3 = i * 3;
        posArray[i3] += radiationVelocities[i3] * safeDt;
        posArray[i3 + 1] += radiationVelocities[i3 + 1] * safeDt;
        posArray[i3 + 2] += radiationVelocities[i3 + 2] * safeDt;

        // Reset proton stream when hitting the ground or lower envelope
        if (posArray[i3 + 1] <= 0.1) {
          posArray[i3] = (Math.random() - 0.5) * boundsX * 1.2;
          posArray[i3 + 1] = 18 + Math.random() * 15;
          posArray[i3 + 2] = (Math.random() - 0.5) * boundsZ * 1.2;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  function dispose(): void {
    if (particleTex) {
      particleTex.dispose();
    }
    disposeThreeObject(group);
  }

  return {
    group,
    update,
    dispose,
  };
}
