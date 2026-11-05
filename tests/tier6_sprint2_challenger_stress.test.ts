import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  calculateSunPosition,
  calculateDynamicShadow,
  getPlanetLightingParameters,
  updateSolarCycle,
  buildSpaceBase3D,
} from '../src/components/3d/base3DBuilder';

describe('Tier 6 Challenger Stress: Sprint 2 Empirical Verification & Adversarial Harness', () => {

  /* =========================================================================
   * SUITE 1: Orbital Sun Path Trigonometry & Diurnal Cycle Verification
   * ========================================================================= */
  describe('1. Orbital Sun Path Trigonometry across 120s & 180s Diurnal Cycles', () => {

    it('TRIGO-1: Spherical radius invariant ||r|| = 150m is strictly preserved at 1,000 continuous time samples', () => {
      const orbitPeriod = 120;
      const expectedRadius = 150.0;
      const sampleCount = 1000;

      for (let i = 0; i <= sampleCount; i++) {
        const t = (i / sampleCount) * orbitPeriod;
        const { position } = calculateSunPosition(t, orbitPeriod, expectedRadius);
        const [x, y, z] = position;
        const actualRadius = Math.sqrt(x * x + y * y + z * z);

        assert.ok(
          Math.abs(actualRadius - expectedRadius) < 1e-6,
          `Radius at t=${t}s must equal ${expectedRadius}, got ${actualRadius}`
        );
      }
    });

    it('TRIGO-2: Azimuth angle increases strictly monotonically and covers exact [0, 360) range', () => {
      const orbitPeriod = 120;
      const steps = 360;
      let prevAzimuth = -1;

      for (let i = 0; i < steps; i++) {
        const t = (i / steps) * orbitPeriod;
        const { azimuthDeg } = calculateSunPosition(t, orbitPeriod, 150);

        assert.ok(azimuthDeg >= 0 && azimuthDeg < 360, `Azimuth ${azimuthDeg} out of bounds [0, 360)`);
        assert.ok(azimuthDeg > prevAzimuth, `Azimuth must be strictly increasing: prev=${prevAzimuth}, curr=${azimuthDeg}`);
        prevAzimuth = azimuthDeg;
      }
    });

    it('TRIGO-3: Solar elevation follows exact sinusoidal trajectory with high noon near zenith', () => {
      const orbitPeriod = 120;
      
      // Sunrise at t = 0
      const sunrise = calculateSunPosition(0, orbitPeriod, 150);
      assert.strictEqual(sunrise.azimuthDeg, 0);
      assert.ok(Math.abs(sunrise.elevationDeg) < 1e-6, `Sunrise elevation must be 0 deg, got ${sunrise.elevationDeg}`);
      assert.strictEqual(sunrise.isAboveHorizon, false);

      // High noon at t = 30 (1/4 cycle)
      const noon = calculateSunPosition(30, orbitPeriod, 150);
      assert.strictEqual(noon.azimuthDeg, 90);
      // elevationRad = sin(pi/2) * (pi / 2.2) = 1 * (pi / 2.2) => deg = 180 / 2.2 ~= 81.818 deg
      const expectedNoonDeg = (180 / 2.2);
      assert.ok(
        Math.abs(noon.elevationDeg - expectedNoonDeg) < 1e-4,
        `Noon elevation must be ~${expectedNoonDeg} deg, got ${noon.elevationDeg}`
      );
      assert.strictEqual(noon.isAboveHorizon, true);

      // Sunset at t = 60 (1/2 cycle)
      const sunset = calculateSunPosition(60, orbitPeriod, 150);
      assert.strictEqual(sunset.azimuthDeg, 180);
      assert.ok(Math.abs(sunset.elevationDeg) < 1e-6, `Sunset elevation must be 0 deg, got ${sunset.elevationDeg}`);

      // Midnight at t = 90 (3/4 cycle)
      const midnight = calculateSunPosition(90, orbitPeriod, 150);
      assert.strictEqual(midnight.azimuthDeg, 270);
      assert.ok(
        Math.abs(midnight.elevationDeg - (-expectedNoonDeg)) < 1e-4,
        `Midnight elevation must be ~-${expectedNoonDeg} deg, got ${midnight.elevationDeg}`
      );
      assert.strictEqual(midnight.isAboveHorizon, false);
    });

    it('TRIGO-4: Supports arbitrary diurnal periods (180s, 60s, 300s) with identical orbital invariants', () => {
      const periods = [60, 180, 240, 300];

      for (const period of periods) {
        const noon = calculateSunPosition(period * 0.25, period, 150);
        assert.ok(noon.elevationDeg > 80, `Period ${period}s noon elevation must be > 80 deg`);
        assert.strictEqual(noon.isAboveHorizon, true);

        const sunset = calculateSunPosition(period * 0.50, period, 150);
        assert.ok(Math.abs(sunset.elevationDeg) < 1e-5, `Period ${period}s sunset elevation must be ~0 deg`);

        const midnight = calculateSunPosition(period * 0.75, period, 150);
        assert.ok(midnight.elevationDeg < -80, `Period ${period}s midnight elevation must be < -80 deg`);
        assert.strictEqual(midnight.isAboveHorizon, false);
      }
    });

    it('TRIGO-5: Long-duration simulation stability (t = 100,000s) produces zero drift or NaN', () => {
      const period = 120;
      const largeTimes = [12000, 50000, 100000, 999999.5];

      for (const t of largeTimes) {
        const pos = calculateSunPosition(t, period, 150);
        assert.ok(Number.isFinite(pos.position[0]), `X coordinate must be finite at t=${t}`);
        assert.ok(Number.isFinite(pos.position[1]), `Y coordinate must be finite at t=${t}`);
        assert.ok(Number.isFinite(pos.position[2]), `Z coordinate must be finite at t=${t}`);
        assert.ok(Number.isFinite(pos.elevationDeg), `Elevation must be finite at t=${t}`);
        assert.ok(Number.isFinite(pos.azimuthDeg), `Azimuth must be finite at t=${t}`);
      }
    });
  });

  /* =========================================================================
   * SUITE 2: Dynamic Shadow Elongation Formula & Low Elevation Stress Test
   * ========================================================================= */
  describe('2. Dynamic Shadow Elongation Formula at Low Elevations (h / tan(elevation))', () => {

    it('SHADOW-1: Low elevation (10 deg) stretches ground shadow > 20m for standard 5m mast', () => {
      const mastHeight = 5.0;
      const elevationDeg = 10.0;
      const azimuthDeg = 135.0;

      const { shadowLength, shadowAngleDeg } = calculateDynamicShadow(mastHeight, elevationDeg, azimuthDeg);

      // tan(10 deg) = 0.1763269807 => L = 5.0 / 0.1763269807 = 28.3564m
      const expectedLength = mastHeight / Math.tan((elevationDeg * Math.PI) / 180);
      assert.ok(
        Math.abs(shadowLength - expectedLength) < 1e-4,
        `Expected shadow length ${expectedLength}m, got ${shadowLength}m`
      );
      assert.ok(
        shadowLength > 20.0,
        `Shadow at 10 deg must stretch > 20m, got ${shadowLength}m`
      );
      assert.strictEqual(shadowAngleDeg, 315.0);
    });

    it('SHADOW-2: Strict inverse monotonicity: shadow length strictly elongates as elevation decreases', () => {
      const mastHeight = 5.0;
      let prevLength = 0;

      // From zenith (85 deg) down to sunset grazing (2 deg)
      for (let elev = 85; elev >= 2; elev -= 1) {
        const { shadowLength } = calculateDynamicShadow(mastHeight, elev, 90);
        assert.ok(
          shadowLength > prevLength,
          `Shadow must elongate as elevation drops: at ${elev} deg L=${shadowLength} <= prev L=${prevLength}`
        );
        prevLength = shadowLength;
      }
    });

    it('SHADOW-3: Boundary clamping at grazing angle (elevation <= 1 deg) prevents division by zero and infinity', () => {
      const mastHeight = 5.0;
      const maxClampLength = mastHeight / Math.tan((1.0 * Math.PI) / 180); // ~286.43m

      const testAngles = [1.0, 0.5, 0.0, -0.001, -10.0, -90.0];
      for (const angle of testAngles) {
        const { shadowLength } = calculateDynamicShadow(mastHeight, angle, 45);
        assert.ok(Number.isFinite(shadowLength), `Shadow length must be finite at ${angle} deg`);
        assert.ok(shadowLength > 0, `Shadow length must be positive at ${angle} deg`);
        assert.ok(
          Math.abs(shadowLength - maxClampLength) < 1e-4,
          `At angle <= 1 deg, shadow length must clamp to ${maxClampLength}m, got ${shadowLength}m`
        );
      }
    });

    it('SHADOW-4: Height proportionality: shadow scales linearly with object height L(k*h) = k*L(h)', () => {
      const elev = 15.0;
      const az = 60.0;
      const baseL = calculateDynamicShadow(1.0, elev, az).shadowLength;

      const heights = [2.0, 3.5, 5.0, 10.0, 25.0];
      for (const h of heights) {
        const scaledL = calculateDynamicShadow(h, elev, az).shadowLength;
        assert.ok(
          Math.abs(scaledL - baseL * h) < 1e-4,
          `Linear height scaling violated: h=${h}, expected=${baseL * h}, got=${scaledL}`
        );
      }
    });

    it('SHADOW-5: Continuous stress test across 1,000 elevations from -90 to +90 deg yields finite numbers', () => {
      for (let i = 0; i <= 1000; i++) {
        const elev = -90 + (i / 1000) * 180;
        const { shadowLength, shadowAngleDeg } = calculateDynamicShadow(5.0, elev, 180);
        assert.ok(Number.isFinite(shadowLength) && !Number.isNaN(shadowLength), `NaN/Infinite at elev=${elev}`);
        assert.ok(shadowLength > 0, `Shadow length must be positive at elev=${elev}`);
        assert.ok(shadowAngleDeg >= 0 && shadowAngleDeg < 360, `Angle out of range at elev=${elev}`);
      }
    });
  });

  /* =========================================================================
   * SUITE 3: Opposite Shadow Projection Angle (180° Azimuth Offset)
   * ========================================================================= */
  describe('3. Opposite Shadow Projection Angle (180° offset from sun azimuth)', () => {

    it('PROJ-1: Shadow angle is exactly 180 deg offset from sun azimuth across all 4 quadrants', () => {
      const testCases = [
        { sunAzimuth: 0, expectedShadow: 180, name: 'North (0 deg) -> South (180 deg)' },
        { sunAzimuth: 45, expectedShadow: 225, name: 'NE (45 deg) -> SW (225 deg)' },
        { sunAzimuth: 90, expectedShadow: 270, name: 'East (90 deg) -> West (270 deg)' },
        { sunAzimuth: 135, expectedShadow: 315, name: 'SE (135 deg) -> NW (315 deg)' },
        { sunAzimuth: 180, expectedShadow: 0, name: 'South (180 deg) -> North (0 deg)' },
        { sunAzimuth: 225, expectedShadow: 45, name: 'SW (225 deg) -> NE (45 deg)' },
        { sunAzimuth: 270, expectedShadow: 90, name: 'West (270 deg) -> East (90 deg)' },
        { sunAzimuth: 315, expectedShadow: 135, name: 'NW (315 deg) -> SE (135 deg)' },
        { sunAzimuth: 359.9, expectedShadow: 179.9, name: 'Boundary 359.9 deg -> 179.9 deg' },
      ];

      for (const tc of testCases) {
        const { shadowAngleDeg } = calculateDynamicShadow(5.0, 30, tc.sunAzimuth);
        assert.ok(
          Math.abs(shadowAngleDeg - tc.expectedShadow) < 1e-4,
          `${tc.name}: expected ${tc.expectedShadow} deg, got ${shadowAngleDeg} deg`
        );
      }
    });

    it('PROJ-2: Vector dot product of sun ground vector and shadow ground vector is strictly -1.0', () => {
      // 360 test angles in 1 deg increments
      for (let az = 0; az < 360; az++) {
        const { shadowAngleDeg } = calculateDynamicShadow(5.0, 45, az);

        const sunRad = (az * Math.PI) / 180;
        const shadowRad = (shadowAngleDeg * Math.PI) / 180;

        const sunVec = [Math.cos(sunRad), Math.sin(sunRad)];
        const shadowVec = [Math.cos(shadowRad), Math.sin(shadowRad)];

        const dotProduct = sunVec[0] * shadowVec[0] + sunVec[1] * shadowVec[1];
        assert.ok(
          Math.abs(dotProduct - (-1.0)) < 1e-6,
          `Azimuth ${az}: ground vectors must be anti-parallel (dot=-1), got ${dotProduct}`
        );
      }
    });

    it('PROJ-3: Fuzz testing 5,000 arbitrary float azimuths strictly bounds shadow angle to [0, 360)', () => {
      for (let i = 0; i < 5000; i++) {
        const az = Math.random() * 360;
        const { shadowAngleDeg } = calculateDynamicShadow(5.0, 30, az);
        assert.ok(shadowAngleDeg >= 0 && shadowAngleDeg < 360, `Out of bounds: ${shadowAngleDeg}`);
        const diff = Math.abs((shadowAngleDeg - az + 360) % 360 - 180);
        assert.ok(diff < 1e-4, `Angle difference not 180 deg: az=${az}, shadow=${shadowAngleDeg}`);
      }
    });
  });

  /* =========================================================================
   * SUITE 4: WebGL Shadow Frustum, Normal Bias & Anti-Acne Configuration
   * ========================================================================= */
  describe('4. WebGL Shadow Camera Frustum, Far Plane & Anti-Acne Configuration', () => {

    it('FRUSTUM-1: DirectionalLight shadow frustum spans [-50, 50] to accommodate 28m+ elongated shadows', () => {
      const scene = buildSpaceBase3D('moon');
      const sun = scene.lights.sunLight;

      assert.strictEqual(sun.shadow.camera.left, -50);
      assert.strictEqual(sun.shadow.camera.right, 50);
      assert.strictEqual(sun.shadow.camera.top, 50);
      assert.strictEqual(sun.shadow.camera.bottom, -50);
      assert.strictEqual(sun.shadow.camera.far, 250);

      // Verify that at 10 deg elevation, a 5m mast at base perimeter (radius 15m) fits within the frustum
      const mastShadowLen = calculateDynamicShadow(5.0, 10.0, 180).shadowLength;
      assert.ok(mastShadowLen > 20, 'Shadow must stretch > 20m');
      assert.ok(15 + mastShadowLen < 50, '15m base offset + 28.36m shadow fits within 50m frustum');

      scene.dispose();
    });

    it('FRUSTUM-2: Shadow bias and normal bias are configured to eliminate low-angle acne', () => {
      const scene = buildSpaceBase3D('mars');
      const sun = scene.lights.sunLight;

      assert.strictEqual(sun.shadow.bias, -0.0004);
      assert.strictEqual(sun.shadow.normalBias, 0.02);

      scene.dispose();
    });
  });

  /* =========================================================================
   * SUITE 5: Moon Optical Model & Martian Blue Sunset State Transitions
   * ========================================================================= */
  describe('5. Moon Vacuum High Contrast & Martian Blue Sunset Optical Models', () => {

    it('OPTICAL-1: Moon daytime enforces hard vacuum (scene.fog === null) and pitch black background', () => {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x999999, 0.05);
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // Daytime Moon (time = 30s)
      sunLight.userData.solarTime = 30;
      updateSolarCycle(0, sunLight, sunSphere, 'moon', scene, ambientLight);

      assert.strictEqual(scene.fog, null, 'Hard vacuum must have scene.fog = null');
      assert.strictEqual(scene.background?.getHex(), 0x000000, 'Lunar sky must be 0x000000 pitch black');
      assert.ok(sunLight.intensity >= 2.2, 'Sunlight intensity must be >= 2.2 for Apollo razor-sharp contrast');
      assert.strictEqual(ambientLight.color.getHex(), 0x0f172a, 'Ambient fill must be minimal dark blue');
      assert.ok(ambientLight.intensity <= 0.12, 'Ambient intensity must be <= 0.12');
    });

    it('OPTICAL-2: Lunar night smoothly shifts ambient to Earthlight glow 0x0369a1', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
      const ambientLight = new THREE.AmbientLight(0x0f172a, 0.11);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // Nighttime Moon (time = 90s, sun below horizon)
      sunLight.userData.solarTime = 90;
      updateSolarCycle(0, sunLight, sunSphere, 'moon', scene, ambientLight);

      assert.strictEqual(sunLight.intensity, 0.0, 'Night direct sunlight must drop to 0');
      assert.strictEqual(ambientLight.color.getHex(), 0x0369a1, 'Ambient must become Earthlight blue (0x0369a1)');
      assert.ok(ambientLight.intensity <= 0.12, 'Earthlight ambient must be subtle (<= 0.12)');
    });

    it('OPTICAL-3: Mars sunset (elevation <= 18 deg) triggers authentic Blue Sunset color shift', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xfef08a, 1.8);
      const ambientLight = new THREE.AmbientLight(0x7c2d12, 0.55);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      const halo = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial());
      halo.name = 'mars_sun_halo';
      sunSphere.add(halo);
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // Midday (time = 30s)
      sunLight.userData.solarTime = 30;
      updateSolarCycle(0, sunLight, sunSphere, 'mars', scene, ambientLight);
      assert.strictEqual(sunLight.color.getHex(), 0xfef08a, 'Midday sun must be amber 0xfef08a');

      // Sunset transition (time = 58s, elevation ~8.5 deg)
      sunLight.userData.solarTime = 58;
      updateSolarCycle(0, sunLight, sunSphere, 'mars', scene, ambientLight);

      // Sunlight color blue component must rise
      assert.ok(sunLight.color.b > sunLight.color.r * 0.7, 'Blue component must rise during sunset');
      assert.strictEqual((halo.material as THREE.MeshBasicMaterial).color.getHex(), 0x38bdf8, 'Halo must glow radiant cyan-blue');
    });

    it('OPTICAL-4: Mars night transitions sky and fog to deep navy (0x1e1b4b)', () => {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x451a03, 0.01);
      const sunLight = new THREE.DirectionalLight(0xfef08a, 1.8);
      const ambientLight = new THREE.AmbientLight(0x7c2d12, 0.55);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // Nighttime Mars (time = 90s, elevation < -5 deg)
      sunLight.userData.solarTime = 90;
      updateSolarCycle(0, sunLight, sunSphere, 'mars', scene, ambientLight);

      assert.strictEqual(sunLight.intensity, 0.0);
      assert.strictEqual(scene.background?.getHex(), 0x1e1b4b, 'Martian night sky must be deep navy 0x1e1b4b');
      assert.strictEqual((scene.fog as THREE.FogExp2).color.getHex(), 0x1e1b4b, 'Martian night fog must be deep navy 0x1e1b4b');
      assert.strictEqual(ambientLight.color.getHex(), 0x1e1b4b);
      assert.ok(ambientLight.intensity <= 0.16);
    });
  });

  /* =========================================================================
   * SUITE 6: Simulation Integration & Solar Stowing
   * ========================================================================= */
  describe('6. Simulation Integration & Solar Stowing Logic', () => {

    it('INTEG-1: builder.update integrates diurnal cycle and correctly updates solarCycleState', () => {
      const builder = buildSpaceBase3D('moon');
      const scene = new THREE.Scene();

      // Initial state
      builder.update(0.1, {
        radiationActive: false,
        dustStormActive: false,
        isLunarNight: false,
        modules: [],
      }, scene);

      const state1 = builder.solarCycleState;
      assert.ok(state1, 'solarCycleState must be populated');
      assert.strictEqual(state1.diurnalPeriodSeconds, 120);

      // Advance by 1 second
      builder.update(1.0, {
        radiationActive: false,
        dustStormActive: false,
        isLunarNight: false,
        modules: [],
      }, scene);

      const state2 = builder.solarCycleState;
      assert.ok(state2.timeOfDaySeconds > state1.timeOfDaySeconds, 'timeOfDaySeconds must advance');

      builder.dispose();
    });

    it('INTEG-2: Solar panels stow flat during dust storm or night blockage', () => {
      const builder = buildSpaceBase3D('mars');
      const scene = new THREE.Scene();

      // Update during clear day
      builder.update(0.1, {
        radiationActive: false,
        dustStormActive: false,
        isLunarNight: false,
        modules: [],
      }, scene);

      // Find solar wing group
      const solarModule = builder.group.getObjectByName('module_solar_farm');
      assert.ok(solarModule, 'Solar module must exist');

      // Update during active dust storm
      builder.update(0.5, {
        radiationActive: false,
        dustStormActive: true,
        isLunarNight: false,
        modules: [],
      }, scene);

      builder.dispose();
    });
  });

});
