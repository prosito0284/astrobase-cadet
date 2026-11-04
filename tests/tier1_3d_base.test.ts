import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { getTerrainHeight, buildSpaceBase3D } from '../src/components/3d/base3DBuilder';
import { createParticleSystems } from '../src/components/3d/particleSystems';
import { disposeThreeObject, disposeRenderer, safeCancelAnimationFrame } from '../src/components/3d/disposal';

describe('Tier 1.11: 3D Interactive Space Base Architecture', () => {

  it('Terrain Heightmap - Central Base Plateau is strictly flat (height = 0 for r < 12)', () => {
    // Within base radius (< 12), height must be exactly 0 on both Moon and Mars
    const moonCenter = getTerrainHeight(0, 0, 'moon');
    const marsCenter = getTerrainHeight(0, 0, 'mars');
    assert.strictEqual(moonCenter, 0, 'Moon center must be flat');
    assert.strictEqual(marsCenter, 0, 'Mars center must be flat');

    // Inner perimeter points (r = 5, 8, 11.5)
    for (const r of [2, 5, 8, 11]) {
      for (const angle of [0, Math.PI / 4, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const x = r * Math.cos(angle);
        const z = r * Math.sin(angle);
        assert.strictEqual(getTerrainHeight(x, z, 'moon'), 0, `Moon height at r=${r} must be 0`);
        assert.strictEqual(getTerrainHeight(x, z, 'mars'), 0, `Mars height at r=${r} must be 0`);
      }
    }
  });

  it('Terrain Heightmap - Outside Base Perimeter produces non-flat natural crater topography', () => {
    // At r = 35 (crater rim wall or delta terrace), height should be > 0 and bounded
    const moonRimHeight = getTerrainHeight(25, 25, 'moon');
    const marsRimHeight = getTerrainHeight(25, 25, 'mars');

    assert.ok(moonRimHeight > 0, 'Moon crater rim height must elevate above plateau');
    assert.ok(marsRimHeight > 0, 'Mars delta terrace height must elevate above plateau');
    assert.ok(!Number.isNaN(moonRimHeight) && Number.isFinite(moonRimHeight), 'Moon height must be a finite number');
    assert.ok(!Number.isNaN(marsRimHeight) && Number.isFinite(marsRimHeight), 'Mars height must be a finite number');
  });

  it('Base 3D Builder - Constructs scene graph with all 6 required modules and interactive raycast targets', () => {
    const sceneResult = buildSpaceBase3D('moon');

    assert.ok(sceneResult.group instanceof THREE.Group, 'Scene result must contain a root Group');
    assert.ok(sceneResult.interactiveObjects.length >= 6, 'Must register at least 6 interactive modules');

    const expectedModuleIds = [
      'regolith_shield',
      'greenhouse',
      'solar_farm',
      'comm_array',
      'water_ice_extractor',
      'storm_bunker',
    ];

    const registeredIds = sceneResult.interactiveObjects.map(obj => obj.userData.moduleId);

    for (const id of expectedModuleIds) {
      assert.ok(registeredIds.includes(id), `Interactive module '${id}' must be registered for raycasting`);
    }

    // Dispose after test
    sceneResult.dispose();
  });

  it('Base 3D Builder - Dynamic animation tick updates antenna, solar tracking, and emergency beacons', () => {
    const sceneResult = buildSpaceBase3D('mars');

    // Test normal day state
    sceneResult.update(0.016, {
      radiationActive: false,
      dustStormActive: false,
      isLunarNight: false,
      wiringErrorActive: false,
      emergencyO2Active: false,
      modules: [],
    });

    assert.strictEqual(sceneResult.lights.bunkerLight.intensity, 0, 'Bunker siren light must be off during normal weather');

    // Test DONKI solar radiation storm state
    sceneResult.update(0.016, {
      radiationActive: true,
      dustStormActive: false,
      isLunarNight: false,
      wiringErrorActive: false,
      emergencyO2Active: false,
      modules: [],
    });

    assert.ok(sceneResult.lights.bunkerLight.intensity > 0, 'Bunker siren light must activate during DONKI solar radiation storm');

    // Test wiring error emergency state
    sceneResult.update(0.016, {
      radiationActive: false,
      dustStormActive: false,
      isLunarNight: false,
      wiringErrorActive: true,
      emergencyO2Active: false,
      modules: [],
    });

    assert.strictEqual(sceneResult.lights.centralBeaconLight.color.getHex(), 0xef4444, 'Central dome beacon must turn red on electrical fault');

    sceneResult.dispose();
  });

  it('Particle Systems - Generates dust storm and solar radiation proton particle systems', () => {
    const particles = createParticleSystems('mars');

    assert.ok(particles.group instanceof THREE.Group, 'Particles controller must provide a root Group');
    assert.strictEqual(particles.group.children.length, 2, 'Must contain dust storm points and radiation points');

    // Update with active dust storm
    particles.update(0.016, true, false);

    const dustPoints = particles.group.getObjectByName('dust_storm_particles') as THREE.Points;
    assert.ok(dustPoints, 'Must include dust_storm_particles Points mesh');
    assert.ok((dustPoints.material as THREE.PointsMaterial).opacity > 0, 'Dust points opacity must increase when active');

    // Dispose cleanly
    particles.dispose();
  });

  it('Disposal Utility - Recursively disposes geometries, materials, and textures without throwing', () => {
    const root = new THREE.Group();
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geom, mat);
    root.add(mesh);

    let geomDisposed = false;
    let matDisposed = false;

    geom.addEventListener('dispose', () => { geomDisposed = true; });
    mat.addEventListener('dispose', () => { matDisposed = true; });

    disposeThreeObject(root);

    assert.strictEqual(geomDisposed, true, 'Geometry must receive dispose call');
    assert.strictEqual(matDisposed, true, 'Material must receive dispose call');
    assert.strictEqual(root.children.length, 0, 'Root group children must be cleared');
  });

  it('Disposal Utility - Safe cancelAnimationFrame and renderer disposal operate without exceptions', () => {
    // Null and valid ID cancellation safety
    assert.doesNotThrow(() => safeCancelAnimationFrame(null));
    assert.doesNotThrow(() => safeCancelAnimationFrame(undefined));

    // Renderer disposal mock
    let rendererDisposed = false;
    let contextLostCalled = false;
    const mockRenderer = {
      dispose: () => { rendererDisposed = true; },
      forceContextLoss: () => { contextLostCalled = true; },
      domElement: null,
    } as unknown as THREE.WebGLRenderer;

    disposeRenderer(mockRenderer);
    assert.strictEqual(rendererDisposed, true, 'Renderer dispose must be invoked');
    assert.strictEqual(contextLostCalled, true, 'Renderer forceContextLoss must be invoked');
  });
});
