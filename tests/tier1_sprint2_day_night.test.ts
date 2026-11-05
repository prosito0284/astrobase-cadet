import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  calculateSunPosition,
  calculateDynamicShadow,
  getPlanetLightingParameters,
  buildSpaceBase3D,
  updateSolarCycle,
} from '../src/components/3d/base3DBuilder';

describe('Tier 1.15: Sprint 2 - Realistic Solar Cycle, Dynamic Shadows & Planetary Lighting', () => {

  describe('Feature 5: F-SOLAR-CYCLE (Diurnal Orbit Trajectory & Dynamic Shadows)', () => {
    it('SOLAR-1: Sun position traverses a continuous orbital trajectory over 120s diurnal period', () => {
      const pos0 = calculateSunPosition(0, 120, 150);
      const pos30 = calculateSunPosition(30, 120, 150); // Quarter orbit (noon)
      const pos60 = calculateSunPosition(60, 120, 150); // Half orbit (dusk)
      const pos90 = calculateSunPosition(90, 120, 150); // 3/4 orbit (midnight)

      assert.strictEqual(pos0.isAboveHorizon, false); // Sunrise start
      assert.strictEqual(pos30.isAboveHorizon, true); // High noon
      assert.ok(pos30.elevationDeg > 70, 'Noon solar elevation must be near zenith (> 70 deg)');
      assert.strictEqual(pos90.isAboveHorizon, false); // Deep night
    });

    it('SOLAR-2: Solar elevation angle reaches maximum at high noon and drops smoothly toward horizon', () => {
      const noon = calculateSunPosition(30, 120, 150);
      const afternoon = calculateSunPosition(45, 120, 150);
      const sunset = calculateSunPosition(58, 120, 150);

      assert.ok(noon.elevationDeg > afternoon.elevationDeg, 'Elevation must decrease past noon');
      assert.ok(afternoon.elevationDeg > sunset.elevationDeg, 'Elevation must decrease into sunset');
      assert.ok(sunset.elevationDeg > 0 && sunset.elevationDeg < 15, 'Sunset must be low above horizon');
    });

    it('SOLAR-3: Dynamic shadow length elongates inversely proportional to tan(elevation)', () => {
      const objectHeight = 5.0; // 5m communication mast

      const shadowNoon = calculateDynamicShadow(objectHeight, 75, 90);
      const shadowMidday = calculateDynamicShadow(objectHeight, 45, 120);
      const shadowSunset = calculateDynamicShadow(objectHeight, 10, 170);

      assert.ok(shadowNoon.shadowLength < shadowMidday.shadowLength, 'Noon shadow must be shorter than midday shadow');
      assert.ok(shadowMidday.shadowLength < shadowSunset.shadowLength, 'Midday shadow must be shorter than sunset shadow');
      assert.ok(shadowSunset.shadowLength > 20, 'Low-angle sunset shadow must project elongated (> 20m)');
    });

    it('SOLAR-4: Dynamic shadow angle points exactly opposite to sun azimuth angle (180 deg offset)', () => {
      const shadow1 = calculateDynamicShadow(5.0, 30, 45);
      assert.strictEqual(shadow1.shadowAngleDeg, 225, 'Azimuth 45 deg must project shadow towards 225 deg');

      const shadow2 = calculateDynamicShadow(5.0, 30, 200);
      assert.strictEqual(shadow2.shadowAngleDeg, 20, 'Azimuth 200 deg must project shadow towards 20 deg');
    });

    it('SOLAR-5: Sub-horizon elevation (nighttime) clamps shadow calculations safely without NaN or Infinity', () => {
      const shadowNight = calculateDynamicShadow(5.0, -15, 270);
      assert.ok(Number.isFinite(shadowNight.shadowLength), 'Shadow length must be finite even at negative elevation');
      assert.ok(shadowNight.shadowLength > 0, 'Shadow length must be positive');
    });
  });

  describe('Feature 6: F-MOON-LIGHTING (Apollo High Contrast & Vacuum Optical Model)', () => {
    it('MOON-1: Ambient light intensity maintains low baseline (0.05) representing lunar vacuum', () => {
      const lighting = getPlanetLightingParameters('moon', 45);
      assert.strictEqual(lighting.ambientIntensity, 0.05, 'Moon ambient light must be minimal (vacuum darkness)');
    });

    it('MOON-2: Atmospheric fog density is strictly 0.0 (zero scattering in hard vacuum)', () => {
      const lighting = getPlanetLightingParameters('moon', 30);
      assert.strictEqual(lighting.fogDensity, 0.0, 'Vacuum must have zero fog scattering');
    });

    it('MOON-3: Directional sunlight intensity is high (2.5) producing razor-sharp Apollo contrast', () => {
      const lighting = getPlanetLightingParameters('moon', 60);
      assert.strictEqual(lighting.directionalIntensity, 2.5, 'Lunar direct sunlight must be intense and unattenuated');
      assert.strictEqual(lighting.shadowContrast, 'high_sharp');
    });

    it('MOON-4: Shadow bias (-0.0005) eliminates surface acne while maintaining crisp crater boundaries', () => {
      const lighting = getPlanetLightingParameters('moon', 20);
      assert.strictEqual(lighting.shadowBias, -0.0005);
    });

    it('MOON-5: Lunar sky remains pitch-black (#000000) irrespective of sun elevation', () => {
      const noonSky = getPlanetLightingParameters('moon', 80).skyColor;
      const sunsetSky = getPlanetLightingParameters('moon', 5).skyColor;
      assert.strictEqual(noonSky, '#000000');
      assert.strictEqual(sunsetSky, '#000000');
    });
  });

  describe('Feature 7: F-MARS-SUNSET (Atmospheric Mie Scattering & Blue Sunsets)', () => {
    it('MARS-1: Daytime Martian sunlight presents warm amber tone (#ffe4b5) with salmon sky', () => {
      const dayLighting = getPlanetLightingParameters('mars', 55);
      assert.strictEqual(dayLighting.sunColor, '#ffe4b5');
      assert.strictEqual(dayLighting.skyColor, '#d18d6e');
      assert.strictEqual(dayLighting.isBlueSunsetActive, false);
    });

    it('MARS-2: Low solar elevation (<= 18 deg) triggers authentic Curiosity/Perseverance Blue Sunset', () => {
      const sunsetLighting = getPlanetLightingParameters('mars', 12);
      assert.strictEqual(sunsetLighting.isBlueSunsetActive, true);
      assert.strictEqual(sunsetLighting.sunColor, '#4a90e2', 'Sun disc must shift to cyan-blue due to forward scattering');
    });

    it('MARS-3: Twilight horizon transitions to dusky salmon-purple (#5a4050) during sunset', () => {
      const sunsetLighting = getPlanetLightingParameters('mars', 8);
      assert.strictEqual(sunsetLighting.skyColor, '#5a4050');
    });

    it('MARS-4: Diffuse atmospheric scattering provides soft shadows and non-zero daytime ambient (0.25)', () => {
      const marsLighting = getPlanetLightingParameters('mars', 40);
      assert.strictEqual(marsLighting.ambientIntensity, 0.25, 'Martian atmospheric dust must scatter ambient light');
      assert.strictEqual(marsLighting.shadowContrast, 'diffuse_scattering');
      assert.ok(marsLighting.fogDensity > 0, 'Mars must exhibit non-zero dust fog density');
    });

    it('MARS-5: Sunset transition state handles boundary angles (18.0 deg vs 18.1 deg) deterministically', () => {
      const boundaryAtSunset = getPlanetLightingParameters('mars', 18.0);
      const boundaryAboveSunset = getPlanetLightingParameters('mars', 18.1);

      assert.strictEqual(boundaryAtSunset.isBlueSunsetActive, true);
      assert.strictEqual(boundaryAboveSunset.isBlueSunsetActive, false);
    });
  });

  describe('Feature 8: F-SOLAR-ENGINE (Base3DBuilder & updateSolarCycle WebGL Integration)', () => {
    it('ENGINE-1: buildSpaceBase3D instantiates sunSphere, tuned shadow frustum [-50, 50, 50, -50] and bias', () => {
      const moonScene = buildSpaceBase3D('moon');
      const marsScene = buildSpaceBase3D('mars');

      assert.ok(moonScene.sunSphere instanceof THREE.Mesh, 'Moon scene must provide a sunSphere mesh');
      assert.ok(marsScene.sunSphere instanceof THREE.Mesh, 'Mars scene must provide a sunSphere mesh');
      assert.ok(marsScene.sunHalo instanceof THREE.Mesh, 'Mars scene must provide a radiant sunHalo mesh');

      // Check shadow camera frustum
      const sun = moonScene.lights.sunLight;
      assert.strictEqual(sun.shadow.camera.left, -50);
      assert.strictEqual(sun.shadow.camera.right, 50);
      assert.strictEqual(sun.shadow.camera.top, 50);
      assert.strictEqual(sun.shadow.camera.bottom, -50);
      assert.strictEqual(sun.shadow.bias, -0.0004);
      assert.strictEqual(sun.shadow.normalBias, 0.02);

      moonScene.dispose();
      marsScene.dispose();
    });

    it('ENGINE-2: updateSolarCycle updates directional sunLight and celestial sunSphere along orbital trajectory', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(sunSphere);

      sunLight.userData.solarTime = 0; // sunrise
      const cycle1 = updateSolarCycle(0, sunLight, sunSphere, 'moon', scene);
      const initialY = sunLight.position.y;

      // Advance by 30 seconds to noon
      sunLight.userData.solarTime = 30;
      const cycle2 = updateSolarCycle(0, sunLight, sunSphere, 'moon', scene);

      assert.ok(sunLight.position.y > initialY, 'Noon sun position Y must be higher than sunrise Y');
      assert.ok(sunSphere.position.y > 0, 'Noon celestial sun sphere must be in upper sky');
      assert.strictEqual(cycle2.isDay, true);
      assert.ok(cycle2.sunElevationDeg > 70);
    });

    it('ENGINE-3: Moon optical mode enforces hard vacuum (zero fog) and Earthlight glow during lunar night', () => {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xffffff, 0.01);
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // Daytime Moon
      sunLight.userData.solarTime = 30;
      updateSolarCycle(0, sunLight, sunSphere, 'moon', scene, ambientLight);
      assert.strictEqual(scene.fog, null, 'Moon must have null fog (hard vacuum)');
      assert.strictEqual(scene.background?.getHex(), 0x000000, 'Moon sky must be pitch-black');
      assert.ok(sunLight.intensity >= 2.2, 'Moon direct sunlight must be high intensity (Apollo contrast)');

      // Lunar Night (sun below horizon)
      sunLight.userData.solarTime = 90;
      updateSolarCycle(0.1, sunLight, sunSphere, 'moon', scene, ambientLight);
      assert.strictEqual(ambientLight.color.getHex(), 0x0369a1, 'Night ambient must shift to cold Earthlight blue');
      assert.ok(ambientLight.intensity <= 0.12, 'Night Earthlight intensity must be subtle (<= 0.12)');
    });

    it('ENGINE-4: Mars mode triggers authentic Curiosity/Perseverance Blue Sunset color shift', () => {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x451a03, 0.01);
      const sunLight = new THREE.DirectionalLight(0xfef08a, 1.8);
      const ambientLight = new THREE.AmbientLight(0x7c2d12, 0.55);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      halo.name = 'mars_sun_halo';
      sunSphere.add(halo);
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // Mid-day Mars (t = 30s)
      sunLight.userData.solarTime = 30;
      updateSolarCycle(0, sunLight, sunSphere, 'mars', scene, ambientLight);
      assert.strictEqual(sunLight.color.getHex(), 0xfef08a, 'Mid-day Mars sunlight must be warm amber');

      // Sunset Mars (t = 58s, elevation ~8.5 deg)
      sunLight.userData.solarTime = 58;
      updateSolarCycle(0, sunLight, sunSphere, 'mars', scene, ambientLight);

      // Color components must shift: blue component must be higher than red at sunset
      assert.ok(sunLight.color.b > 0.6, 'Sunlight blue component must rise significantly during sunset');
      assert.strictEqual((halo.material as THREE.MeshBasicMaterial).color.getHex(), 0x38bdf8, 'Halo must glow radiant cyan-blue');
    });

    it('ENGINE-5: builder.update integrates solar cycle state into base animation loop', () => {
      const builder = buildSpaceBase3D('moon');
      const scene = new THREE.Scene();

      builder.update(0.1, {
        radiationActive: false,
        dustStormActive: false,
        isLunarNight: false,
        modules: [],
      }, scene);

      assert.ok(builder.solarCycleState, 'Builder must maintain solarCycleState');
      assert.strictEqual(builder.solarCycleState.diurnalPeriodSeconds, 120);
      assert.ok(typeof builder.solarCycleState.sunElevationDeg === 'number');

      builder.dispose();
    });
  });

});
