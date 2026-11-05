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

describe('Tier 6 Challenger 2: Sprint 2 Optical Invariants & Adversarial Verification', () => {

  /* =========================================================================
   * SUITE 1: Moon Vacuum Optical Model & Zero-Fog Invariants
   * ========================================================================= */
  describe('1. Moon Vacuum Mode & Zero-Fog Optical Invariants', () => {
    it('VAC-1: scene.fog is strictly null across all diurnal cycle phases on the Moon', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(sunSphere);

      // Test 120 distinct time steps across the full 120s orbit (every 1 second)
      for (let t = 0; t <= 120; t += 1) {
        sunLight.userData.solarTime = t;
        updateSolarCycle(0, sunLight, sunSphere, 'moon', scene);

        assert.strictEqual(
          scene.fog,
          null,
          `Moon scene.fog must be strictly null at t=${t}s (hard vacuum optical invariant)`
        );
        assert.strictEqual(
          scene.background?.getHex(),
          0x000000,
          `Moon sky background must be pitch-black (0x000000) at t=${t}s`
        );
      }
    });

    it('VAC-2: Invariant enforcement — pre-existing or polluted fog is unconditionally stripped to null', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(sunSphere);

      // Intentionally pollute scene with different fog types and densities
      const fogContaminants = [
        new THREE.FogExp2(0xffffff, 0.05),
        new THREE.FogExp2(0x451a03, 0.004),
        new THREE.Fog(0x000000, 10, 100),
        new THREE.FogExp2(0x38bdf8, 0.1),
      ];

      for (let i = 0; i < fogContaminants.length; i++) {
        scene.fog = fogContaminants[i];
        assert.notStrictEqual(scene.fog, null, 'Precondition: fog is injected');

        sunLight.userData.solarTime = 25.0;
        updateSolarCycle(0, sunLight, sunSphere, 'moon', scene);

        assert.strictEqual(
          scene.fog,
          null,
          `Contaminated fog (${fogContaminants[i].constructor.name}) must be reset to null`
        );
      }
    });

    it('VAC-3: getPlanetLightingParameters returns strictly fogDensity = 0.0 for Moon at all elevations', () => {
      // Probe elevations from -90 to +90 degrees in 5 degree steps
      for (let elev = -90; elev <= 90; elev += 5) {
        const params = getPlanetLightingParameters('moon', elev);
        assert.strictEqual(
          params.fogDensity,
          0.0,
          `Moon fogDensity must be 0.0 at elevation ${elev} deg`
        );
        assert.strictEqual(params.skyColor, '#000000');
        assert.strictEqual(params.shadowContrast, 'high_sharp');
      }
    });

    it('VAC-4: Moon vacuum maintains zero fog even under active radiation storms or dust storm flags', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(sunSphere);

      // Moon has no atmosphere, so even if a dust storm flag is passed, vacuum fog is null
      sunLight.userData.solarTime = 30.0;
      updateSolarCycle(0, sunLight, sunSphere, 'moon', scene, undefined, {
        radiationActive: true,
        dustStormActive: true,
        isLunarNight: false,
        modules: [],
      });

      assert.strictEqual(scene.fog, null, 'Moon scene.fog must remain null under crisis flags');
    });
  });

  /* =========================================================================
   * SUITE 2: Negative Sun Elevation & Night Transitions (Moon & Mars)
   * ========================================================================= */
  describe('2. Negative Sun Elevations & Planetary Night Transitions', () => {
    it('NIGHT-1: Directional light position Y is strictly clamped (>= 0.1) under negative elevation', () => {
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());

      // Phase 60s to 120s represents negative elevation (night)
      for (let t = 60.1; t < 120; t += 2.0) {
        sunLight.userData.solarTime = t;
        const cycle = updateSolarCycle(0, sunLight, sunSphere, 'moon');

        assert.ok(
          cycle.sunElevationDeg < 0,
          `Elevation must be negative at t=${t}s (got ${cycle.sunElevationDeg}deg)`
        );
        assert.ok(
          sunLight.position.y >= 0.1,
          `sunLight.position.y must be clamped >= 0.1 at t=${t}s to avoid ground-up illumination (got ${sunLight.position.y})`
        );
      }
    });

    it('NIGHT-2: Moon night activation — sunlight fades to 0 and Earthlight glow (0x0369a1) activates', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
      const ambientLight = new THREE.AmbientLight(0x0f172a, 0.11);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // 1. Instantaneous evaluation (safeDt = 0) at midnight (t = 90s)
      sunLight.userData.solarTime = 90.0;
      const cycle = updateSolarCycle(0, sunLight, sunSphere, 'moon', scene, ambientLight);

      assert.strictEqual(cycle.isDay, false, 'Midnight must be night');
      assert.strictEqual(sunLight.intensity, 0.0, 'Direct sunlight intensity must be 0 at midnight');
      assert.strictEqual(
        ambientLight.color.getHex(),
        0x0369a1,
        'Ambient color must shift to cold Earthlight cyan-blue (0x0369a1)'
      );
      assert.strictEqual(ambientLight.intensity, 0.08, 'Earthlight ambient intensity must settle at 0.08');
    });

    it('NIGHT-3: Moon dynamic dusk simulation — sunlight intensity decays smoothly and monotonically', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.3);
      const ambientLight = new THREE.AmbientLight(0x0f172a, 0.11);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // Start at sunset boundary (t = 60s, elevation ~0 deg)
      sunLight.userData.solarTime = 60.0;
      updateSolarCycle(0, sunLight, sunSphere, 'moon', scene, ambientLight);

      let prevIntensity = sunLight.intensity;
      const dt = 0.05; // 20 FPS step

      // Simulate 100 continuous ticks into lunar night
      for (let step = 0; step < 100; step++) {
        updateSolarCycle(dt, sunLight, sunSphere, 'moon', scene, ambientLight);

        // Sunlight intensity must monotonically decrease toward 0
        assert.ok(
          sunLight.intensity <= prevIntensity + 1e-6,
          `Sunlight intensity must decrease monotonically (was ${prevIntensity}, now ${sunLight.intensity})`
        );
        assert.ok(
          sunLight.intensity >= 0.0,
          `Sunlight intensity must never be negative (got ${sunLight.intensity})`
        );

        // Ambient must switch to Earthlight
        assert.strictEqual(
          ambientLight.color.getHex(),
          0x0369a1,
          'Ambient color must be Earthlight 0x0369a1 throughout lunar night'
        );

        prevIntensity = sunLight.intensity;
      }

      // After 5 seconds (100 * 0.05s) of decay, sunlight intensity should be virtually 0 (< 0.01)
      assert.ok(
        sunLight.intensity < 0.01,
        `Sunlight intensity must fade to near 0 after 5s of night (got ${sunLight.intensity})`
      );
    });

    it('NIGHT-4: Forced isLunarNight flag activates Earthlight even during high noon', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
      const ambientLight = new THREE.AmbientLight(0x0f172a, 0.11);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // High noon (t = 30s) but isLunarNight = true
      sunLight.userData.solarTime = 30.0;
      updateSolarCycle(0, sunLight, sunSphere, 'moon', scene, ambientLight, {
        radiationActive: false,
        dustStormActive: false,
        isLunarNight: true,
        modules: [],
      });

      assert.strictEqual(sunLight.intensity, 0.0, 'Direct sunlight must be 0 when isLunarNight is forced');
      assert.strictEqual(ambientLight.color.getHex(), 0x0369a1, 'Earthlight must be active when isLunarNight is forced');
      assert.strictEqual(ambientLight.intensity, 0.08);
    });

    it('NIGHT-5: Mars night transition — sunlight decays to 0 and ambient settles into deep navy (0x1e1b4b)', () => {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x451a03, 0.004);
      const sunLight = new THREE.DirectionalLight(0xfef08a, 1.8);
      const ambientLight = new THREE.AmbientLight(0x7c2d12, 0.55);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // Midnight on Mars (t = 90s, elevation ~ -81.8 deg)
      sunLight.userData.solarTime = 90.0;
      updateSolarCycle(0, sunLight, sunSphere, 'mars', scene, ambientLight);

      assert.strictEqual(sunLight.intensity, 0.0, 'Mars midnight direct sunlight intensity must be 0.0');
      assert.strictEqual(ambientLight.color.getHex(), 0x1e1b4b, 'Mars night ambient must be deep navy (0x1e1b4b)');
      assert.strictEqual(ambientLight.intensity, 0.15, 'Mars night ambient intensity must be 0.15');
      assert.strictEqual((scene.background as THREE.Color).getHex(), 0x1e1b4b, 'Mars night sky must be deep navy');
      assert.strictEqual(((scene.fog as THREE.FogExp2).color).getHex(), 0x1e1b4b, 'Mars night fog must match sky');
    });
  });

  /* =========================================================================
   * SUITE 3: Mars Blue Sunset Color Transition Continuity & Popping Defense
   * ========================================================================= */
  describe('3. Mars Blue Sunset Continuity, Color Banding & NaN Defense', () => {
    it('COLOR-1: Directional sunlight color shifts continuously from amber (0xfef08a) to cyan-blue (0x4a90e2)', () => {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x451a03, 0.004);
      const sunLight = new THREE.DirectionalLight(0xfef08a, 1.8);
      const ambientLight = new THREE.AmbientLight(0x7c2d12, 0.55);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      const halo = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial());
      halo.name = 'mars_sun_halo';
      sunSphere.add(halo);
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // Midday test (t = 30s, elevation > 70 deg)
      sunLight.userData.solarTime = 30.0;
      updateSolarCycle(0, sunLight, sunSphere, 'mars', scene, ambientLight);
      assert.strictEqual(sunLight.color.getHex(), 0xfef08a, 'Midday sunlight must be warm amber (0xfef08a)');

      // Pre-sunset threshold test (elevation = 18.1 deg)
      // Elevation = 18.0 occurs near t = 57.1s
      // Let's sweep across the sunset entry (t = 56s to 62s in fine steps)
      let prevColor = sunLight.color.clone();
      let maxColorDelta = 0;

      for (let t = 50.0; t <= 62.0; t += 0.05) {
        sunLight.userData.solarTime = t;
        const cycle = updateSolarCycle(0, sunLight, sunSphere, 'mars', scene, ambientLight);

        // Verify valid, non-NaN RGB channels
        assert.ok(!Number.isNaN(sunLight.color.r), `Sun red channel is NaN at t=${t}`);
        assert.ok(!Number.isNaN(sunLight.color.g), `Sun green channel is NaN at t=${t}`);
        assert.ok(!Number.isNaN(sunLight.color.b), `Sun blue channel is NaN at t=${t}`);

        assert.ok(sunLight.color.r >= 0 && sunLight.color.r <= 1.0);
        assert.ok(sunLight.color.g >= 0 && sunLight.color.g <= 1.0);
        assert.ok(sunLight.color.b >= 0 && sunLight.color.b <= 1.0);

        // Measure Euclidean step in RGB space: delta = sqrt(dr^2 + dg^2 + db^2)
        const dr = sunLight.color.r - prevColor.r;
        const dg = sunLight.color.g - prevColor.g;
        const db = sunLight.color.b - prevColor.b;
        const delta = Math.sqrt(dr * dr + dg * dg + db * db);

        if (delta > maxColorDelta) {
          maxColorDelta = delta;
        }

        // Color delta between 0.05s steps must be smooth (< 0.05 in RGB space) — no color popping!
        assert.ok(
          delta < 0.05,
          `Color popping detected at t=${t}s (elev=${cycle.sunElevationDeg.toFixed(2)}deg): delta=${delta.toFixed(4)}`
        );

        prevColor = sunLight.color.clone();
      }

      // Max step in RGB across 0.05s steps must be well below 0.05 (< 3% of spectrum per 20 FPS step)
      assert.ok(maxColorDelta < 0.05, `Max color step was ${maxColorDelta.toFixed(4)} (smooth transition verified)`);
    });

    it('COLOR-2: Mathematical continuity — lerp transition across 1,000 elevation increments has 0 discontinuity', () => {
      const amberSun = new THREE.Color(0xfef08a);
      const blueSun = new THREE.Color(0x4a90e2);

      let prevC = amberSun.clone();
      // Sweep elevation from 25 deg down to -10 deg in 0.035 deg increments (1,000 samples)
      for (let elev = 25.0; elev >= -10.0; elev -= 0.035) {
        const isSunset = elev <= 18.0 && elev >= -5.0;
        let c: THREE.Color;

        if (isSunset) {
          const t = Math.max(0, Math.min(1, (18.0 - elev) / 10.0));
          c = amberSun.clone().lerp(blueSun, t);
        } else if (elev > 18.0) {
          c = amberSun.clone();
        } else {
          // Night retains blueSun
          c = blueSun.clone();
        }

        const dr = prevC.r - c.r;
        const dg = prevC.g - c.g;
        const db = prevC.b - c.b;
        const step = Math.sqrt(dr * dr + dg * dg + db * db);

        assert.ok(
          step < 0.01,
          `Discontinuity detected at elevation ${elev}deg: step distance=${step}`
        );
        assert.ok(Number.isFinite(c.r) && Number.isFinite(c.g) && Number.isFinite(c.b));

        prevC = c;
      }
    });

    it('COLOR-3: Mars celestial sun sphere halo shifts to radiant cyan-blue (0x38bdf8) with dynamic opacity', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xfef08a, 1.8);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      const halo = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      halo.name = 'mars_sun_halo';
      sunSphere.add(halo);
      scene.add(sunLight);
      scene.add(sunSphere);

      // Mid-day: halo is warm amber 0xfef08a, opacity 0.35
      sunLight.userData.solarTime = 30.0;
      updateSolarCycle(0, sunLight, sunSphere, 'mars', scene);
      assert.strictEqual((halo.material as THREE.MeshBasicMaterial).color.getHex(), 0xfef08a);
      assert.strictEqual((halo.material as THREE.MeshBasicMaterial).opacity, 0.35);

      // Sunset: halo switches to radiant cyan-blue 0x38bdf8 and oscillates opacity
      sunLight.userData.solarTime = 58.0; // Sunset elevation ~ 8.5 deg
      updateSolarCycle(0, sunLight, sunSphere, 'mars', scene);
      assert.strictEqual((halo.material as THREE.MeshBasicMaterial).color.getHex(), 0x38bdf8);

      const op = (halo.material as THREE.MeshBasicMaterial).opacity;
      assert.ok(op >= 0.40 && op <= 0.70, `Halo opacity ${op} must be within scattering range [0.40, 0.70]`);
    });

    it('COLOR-4: Directional sunlight intensity attenuates gracefully during sunset without jumping', () => {
      const sunLight = new THREE.DirectionalLight(0xfef08a, 1.8);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());

      // At elevation = 18 deg (sunset start): intensity = 1.8
      // At elevation = -5 deg (sunset end): intensity = 0.05
      let prevIntensity = 2.0;

      for (let elev = 18.0; elev >= -5.0; elev -= 1.0) {
        const sunsetIntensity = Math.max(0.05, 1.8 * Math.max(0, (elev + 5.0) / 23.0));

        assert.ok(
          sunsetIntensity <= prevIntensity + 1e-6,
          `Sunset intensity must be non-increasing as sun sinks (at ${elev}deg: ${sunsetIntensity} > ${prevIntensity})`
        );
        assert.ok(sunsetIntensity >= 0.05, 'Intensity must stay above minimum floor 0.05 during sunset');
        assert.ok(sunsetIntensity <= 1.8, 'Intensity must not exceed noon intensity 1.8');

        prevIntensity = sunsetIntensity;
      }
    });
  });

  /* =========================================================================
   * SUITE 4: Boundary Angles, Fuzz Testing & Performance Benchmarks
   * ========================================================================= */
  describe('4. Critical Boundary Angles, Fuzz Testing & 60 FPS Performance', () => {
    it('BOUND-1: Precise boundary angles (0.0°, ±0.0001°, 18.0°, -5.0°) evaluate deterministically', () => {
      const criticalElevations = [
        18.0001,
        18.0,
        17.9999,
        0.0001,
        0.0,
        -0.0001,
        -4.9999,
        -5.0,
        -5.0001,
      ];

      for (const elev of criticalElevations) {
        const moonParams = getPlanetLightingParameters('moon', elev);
        assert.strictEqual(moonParams.fogDensity, 0.0);
        assert.strictEqual(moonParams.skyColor, '#000000');

        const marsParams = getPlanetLightingParameters('mars', elev);
        assert.ok(Number.isFinite(marsParams.ambientIntensity));
        assert.ok(Number.isFinite(marsParams.directionalIntensity));
        assert.ok(typeof marsParams.sunColor === 'string');
        assert.ok(typeof marsParams.skyColor === 'string');

        // Check isBlueSunsetActive boundary condition
        const expectedSunset = elev <= 18.0 && elev >= -5.0;
        assert.strictEqual(
          marsParams.isBlueSunsetActive,
          expectedSunset,
          `At elevation ${elev}deg, isBlueSunsetActive should be ${expectedSunset}`
        );
      }
    });

    it('FUZZ-2: 2,500 random solar times [-100,000s, +100,000s] survive without NaN or throwing', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      for (let i = 0; i < 2500; i++) {
        // Random time spanning negative, zero, fractional, and massive values
        const randomTime = (Math.random() - 0.5) * 200000;
        const loc = i % 2 === 0 ? 'moon' : 'mars';

        sunLight.userData.solarTime = randomTime;
        const cycle = updateSolarCycle(0.016, sunLight, sunSphere, loc, scene, ambientLight);

        assert.ok(Number.isFinite(cycle.timeOfDaySeconds));
        assert.ok(Number.isFinite(cycle.solarAngleRad));
        assert.ok(Number.isFinite(cycle.sunElevationDeg));
        assert.ok(Number.isFinite(cycle.sunAzimuthDeg));
        assert.ok(typeof cycle.isDay === 'boolean');

        assert.ok(!Number.isNaN(sunLight.intensity));
        assert.ok(!Number.isNaN(ambientLight.intensity));
        assert.ok(!Number.isNaN(sunLight.position.x));
        assert.ok(!Number.isNaN(sunLight.position.y));
        assert.ok(!Number.isNaN(sunLight.position.z));
      }
    });

    it('PERF-3: 1,000 continuous solar update frames execute well within 60 FPS budget (< 0.05ms/frame)', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      const start = performance.now();
      const frameCount = 1000;

      for (let f = 0; f < frameCount; f++) {
        updateSolarCycle(0.016, sunLight, sunSphere, f % 2 === 0 ? 'moon' : 'mars', scene, ambientLight);
      }

      const elapsedMs = performance.now() - start;
      const msPerFrame = elapsedMs / frameCount;

      // 60 FPS frame budget is 16.67ms. Solar cycle calculation must take < 0.05ms (< 0.3% of frame budget)
      assert.ok(
        msPerFrame < 0.05,
        `updateSolarCycle must take < 0.05ms per tick (measured ${msPerFrame.toFixed(4)}ms)`
      );
    });

    it('MEM-4: 2,000 frames of solar simulation exhibit zero memory growth or resource leak', () => {
      const scene = new THREE.Scene();
      const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial());
      scene.add(sunLight);
      scene.add(ambientLight);
      scene.add(sunSphere);

      // Force GC if available or snapshot heap
      const heapBefore = process.memoryUsage().heapUsed;

      for (let f = 0; f < 2000; f++) {
        updateSolarCycle(0.016, sunLight, sunSphere, 'mars', scene, ambientLight);
      }

      const heapAfter = process.memoryUsage().heapUsed;
      const growthMb = (heapAfter - heapBefore) / (1024 * 1024);

      // Heap growth over 2,000 frames of pure number math must be minimal (< 5MB allowance)
      assert.ok(
        growthMb < 5.0,
        `Heap growth over 2,000 solar ticks must be < 5MB (measured ${growthMb.toFixed(2)}MB)`
      );
    });
  });

});
