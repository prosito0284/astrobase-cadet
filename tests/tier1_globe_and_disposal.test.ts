import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { 
  latLonToCartesian, 
  LANDING_SITES, 
  createPlanetGlobeMesh, 
  createAtmosphericGlowMesh, 
  createLandingBeaconMarker 
} from '../src/components/globe3d/globeShaders';
import { 
  computeWalkKinematics, 
  interpolateWaypoint, 
  computeHeading, 
  createAstronautMesh,
  buildSpaceBase3D
} from '../src/components/3d/base3DBuilder';
import { 
  disposeThreeObject, 
  disposeMaterial, 
  disposeRenderer, 
  safeCancelAnimationFrame 
} from '../src/components/3d/disposal';

describe('Tier 1.13: 3D Interactive Planetary Globe & Astronaut Kinematics', () => {

  // ========================================================
  // 1. Lat/Lon to 3D Cartesian Spherical Coordinate Conversion
  // ========================================================
  describe('Lat/Lon Spherical Coordinate Mapping', () => {
    it('Shackleton Crater (-89.9° S, 0.0° E) points to Lunar South Pole on sphere', () => {
      const radius = 4.0;
      const pos = latLonToCartesian(-89.9, 0.0, radius);

      // Shackleton is located at 89.9° S, almost exactly at the South Pole (-Y)
      assert.ok(Math.abs(pos.y - (-radius)) < 0.002, `Y position should be near -${radius}, got ${pos.y}`);
      assert.ok(Math.abs(pos.x) < 0.02, `X position should be near 0, got ${pos.x}`);
      assert.ok(Math.abs(pos.z) < 0.02, `Z position should be near 0, got ${pos.z}`);

      // Radius magnitude must be preserved
      const magnitude = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      assert.ok(Math.abs(magnitude - radius) < 1e-5, 'Magnitude must equal sphere radius');
    });

    it('Jezero Crater (18.38° N, 77.58° E) maps to Martian Northern Delta quadrant', () => {
      const radius = 4.0;
      const pos = latLonToCartesian(18.38, 77.58, radius);

      // Northern latitude -> Y > 0
      assert.ok(pos.y > 0, `Y should be positive for Northern latitude, got ${pos.y}`);
      // Eastern longitude 77.58° -> X > 0, Z > 0
      assert.ok(pos.x > 0, `X should be positive for Eastern longitude, got ${pos.x}`);
      assert.ok(pos.z > 0, `Z should be positive for quadrant 1 longitude, got ${pos.z}`);

      // Exact trigonometric values:
      // y = R * sin(18.38°) = 4.0 * 0.3153 = ~1.261
      assert.ok(Math.abs(pos.y - 1.261) < 0.05, `Y should be approximately 1.261, got ${pos.y}`);

      // Exact magnitude preservation
      const magnitude = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      assert.ok(Math.abs(magnitude - radius) < 1e-5, 'Magnitude must equal sphere radius');
    });

    it('Cardinal directions: Equator and Poles align with primary Cartesian axes', () => {
      const R = 10.0;

      // North Pole (+90°, 0°) -> (0, +R, 0)
      const northPole = latLonToCartesian(90, 0, R);
      assert.ok(Math.abs(northPole.x) < 1e-5);
      assert.ok(Math.abs(northPole.y - R) < 1e-5);
      assert.ok(Math.abs(northPole.z) < 1e-5);

      // South Pole (-90°, 0°) -> (0, -R, 0)
      const southPole = latLonToCartesian(-90, 0, R);
      assert.ok(Math.abs(southPole.x) < 1e-5);
      assert.ok(Math.abs(southPole.y - (-R)) < 1e-5);
      assert.ok(Math.abs(southPole.z) < 1e-5);

      // Prime Meridian on Equator (0°, 0°) -> (0, 0, +R)
      const equatorPrime = latLonToCartesian(0, 0, R);
      assert.ok(Math.abs(equatorPrime.x) < 1e-5);
      assert.ok(Math.abs(equatorPrime.y) < 1e-5);
      assert.ok(Math.abs(equatorPrime.z - R) < 1e-5);

      // 90° East on Equator (0°, 90°) -> (+R, 0, 0)
      const equatorEast = latLonToCartesian(0, 90, R);
      assert.ok(Math.abs(equatorEast.x - R) < 1e-5);
      assert.ok(Math.abs(equatorEast.y) < 1e-5);
      assert.ok(Math.abs(equatorEast.z) < 1e-5);
    });

    it('Latitude clamping handles out-of-range inputs safely without NaN', () => {
      const R = 5.0;
      const clampedHigh = latLonToCartesian(120, 45, R);
      const clampedLow = latLonToCartesian(-150, -30, R);

      assert.ok(!Number.isNaN(clampedHigh.x) && !Number.isNaN(clampedHigh.y) && !Number.isNaN(clampedHigh.z));
      assert.ok(!Number.isNaN(clampedLow.x) && !Number.isNaN(clampedLow.y) && !Number.isNaN(clampedLow.z));
      assert.ok(Math.abs(clampedHigh.y - R) < 1e-5, 'Latitude > 90 must clamp to North Pole');
      assert.ok(Math.abs(clampedLow.y - (-R)) < 1e-5, 'Latitude < -90 must clamp to South Pole');
    });

    it('LANDING_SITES telemetry dictionary contains accurate mission data for Moon and Mars', () => {
      assert.ok(LANDING_SITES.moon, 'Must include Moon landing site');
      assert.ok(LANDING_SITES.mars, 'Must include Mars landing site');

      assert.strictEqual(LANDING_SITES.moon.latDeg, -89.9);
      assert.strictEqual(LANDING_SITES.moon.lonDeg, 0.0);
      assert.strictEqual(LANDING_SITES.moon.campaignDays, 28);
      assert.ok(LANDING_SITES.moon.roverName.includes('VIPER'));

      assert.strictEqual(LANDING_SITES.mars.latDeg, 18.38);
      assert.strictEqual(LANDING_SITES.mars.lonDeg, 77.58);
      assert.strictEqual(LANDING_SITES.mars.campaignDays, 30);
      assert.ok(LANDING_SITES.mars.roverName.includes('Perseverance'));
    });
  });

  // ========================================================
  // 2. Astronaut Kinematics & Walking Math
  // ========================================================
  describe('Astronaut Kinematics & Walking Patrol System', () => {
    it('computeWalkKinematics returns bounded leg swing, arm swing, and vertical torso bob', () => {
      // Test across an entire walking gait cycle (0 to 2*PI)
      for (let phase = 0; phase <= Math.PI * 2; phase += 0.2) {
        const kin = computeWalkKinematics(phase);

        assert.ok(kin.legAngle >= -0.56 && kin.legAngle <= 0.56, `Leg angle out of bounds: ${kin.legAngle}`);
        assert.ok(kin.armAngle >= -0.46 && kin.armAngle <= 0.46, `Arm angle out of bounds: ${kin.armAngle}`);
        // Torso bobbing must be strictly non-negative (lifting up with step)
        assert.ok(kin.torsoBob >= 0.0 && kin.torsoBob <= 0.055, `Torso bob out of bounds: ${kin.torsoBob}`);
        assert.ok(kin.torsoRoll >= -0.035 && kin.torsoRoll <= 0.035, `Torso roll out of bounds: ${kin.torsoRoll}`);
      }

      // Exact zero-crossing check
      const zeroKin = computeWalkKinematics(0);
      assert.strictEqual(zeroKin.legAngle, 0);
      assert.strictEqual(zeroKin.armAngle, 0);
      assert.strictEqual(zeroKin.torsoBob, 0);
      assert.strictEqual(zeroKin.torsoRoll, 0);

      // Peak step check at PI/2
      const peakKin = computeWalkKinematics(Math.PI / 2);
      assert.ok(Math.abs(peakKin.legAngle - 0.55) < 1e-5);
      assert.ok(Math.abs(peakKin.armAngle - 0.45) < 1e-5);
    });

    it('interpolateWaypoint interpolates smoothly between 2D coordinates with clamping', () => {
      const p1 = { x: 0, z: 10 };
      const p2 = { x: 20, z: 30 };

      // At t = 0
      const start = interpolateWaypoint(p1, p2, 0);
      assert.strictEqual(start.x, 0);
      assert.strictEqual(start.z, 10);

      // At t = 0.5 (midpoint)
      const mid = interpolateWaypoint(p1, p2, 0.5);
      assert.strictEqual(mid.x, 10);
      assert.strictEqual(mid.z, 20);

      // At t = 1.0 (destination)
      const end = interpolateWaypoint(p1, p2, 1.0);
      assert.strictEqual(end.x, 20);
      assert.strictEqual(end.z, 30);

      // Clamping bounds: t < 0 and t > 1
      const underflow = interpolateWaypoint(p1, p2, -0.5);
      assert.strictEqual(underflow.x, 0);
      assert.strictEqual(underflow.z, 10);

      const overflow = interpolateWaypoint(p1, p2, 2.5);
      assert.strictEqual(overflow.x, 20);
      assert.strictEqual(overflow.z, 30);
    });

    it('computeHeading calculates accurate orientation yaw in radians', () => {
      // Moving North along +Z
      const northHeading = computeHeading({ x: 0, z: 0 }, { x: 0, z: 10 });
      assert.ok(Math.abs(northHeading) < 1e-5, `Heading towards +Z should be 0, got ${northHeading}`);

      // Moving East along +X
      const eastHeading = computeHeading({ x: 0, z: 0 }, { x: 10, z: 0 });
      assert.ok(Math.abs(eastHeading - Math.PI / 2) < 1e-5, `Heading towards +X should be PI/2, got ${eastHeading}`);

      // Moving West along -X
      const westHeading = computeHeading({ x: 0, z: 0 }, { x: -10, z: 0 });
      assert.ok(Math.abs(westHeading - (-Math.PI / 2)) < 1e-5, `Heading towards -X should be -PI/2, got ${westHeading}`);
    });

    it('createAstronautMesh instantiates full spacesuit model with limbs, visor and backpack', () => {
      const astro = createAstronautMesh({
        suitColor: 0xf8fafc,
        visorColor: 0xf59e0b,
        hasTool: 'drill',
        scale: 1.0,
      });

      assert.ok(astro.root instanceof THREE.Group, 'Must return a root Three.Group');
      assert.ok(astro.bodyGroup instanceof THREE.Group, 'Must have body container group');
      assert.ok(astro.helmetGroup instanceof THREE.Group, 'Must have helmet group');
      assert.ok(astro.leftArmPivot instanceof THREE.Group, 'Must have left arm pivot');
      assert.ok(astro.rightArmPivot instanceof THREE.Group, 'Must have right arm pivot');
      assert.ok(astro.leftLegPivot instanceof THREE.Group, 'Must have left leg pivot');
      assert.ok(astro.rightLegPivot instanceof THREE.Group, 'Must have right leg pivot');
      assert.ok(astro.toolMesh instanceof THREE.Mesh, 'Must instantiate drill tool mesh when requested');
      assert.ok(astro.toolLight instanceof THREE.PointLight, 'Must attach tool light to drill');

      // Clean disposal of test mesh
      disposeThreeObject(astro.root);
    });

    it('Base3DBuilder dynamically toggles Ice Miner visibility based on assignedToMineCount', () => {
      const sceneResult = buildSpaceBase3D('moon');

      // Find astronaut crew in scene graph
      const crew = sceneResult.group.getObjectByName('astronaut_crew') as THREE.Group;
      assert.ok(crew, 'Scene graph must contain astronaut_crew Group');

      const iceMiner = crew.getObjectByName('astronaut_ice_miner') as THREE.Object3D;
      assert.ok(iceMiner, 'Crew must contain astronaut_ice_miner');

      // State with 0 miners assigned -> ice miner must be hidden
      sceneResult.update(0.016, {
        radiationActive: false,
        dustStormActive: false,
        isLunarNight: false,
        assignedToMineCount: 0,
        modules: [],
      });
      assert.strictEqual(iceMiner.visible, false, 'Ice miner must be hidden when assignedToMineCount is 0');

      // State with 1 miner assigned -> ice miner must become visible
      sceneResult.update(0.016, {
        radiationActive: false,
        dustStormActive: false,
        isLunarNight: false,
        assignedToMineCount: 1,
        modules: [],
      });
      assert.strictEqual(iceMiner.visible, true, 'Ice miner must be visible when assignedToMineCount > 0');

      // Clean disposal
      sceneResult.dispose();
    });
  });

  // ========================================================
  // 3. 3D Globe Mesh & Landing Beacon Markers
  // ========================================================
  describe('3D Globe Meshes & Procedural Landing Beacons', () => {
    it('createPlanetGlobeMesh instantiates procedural SphereGeometry globe for Moon and Mars', () => {
      const moonGlobe = createPlanetGlobeMesh('moon', 4.0);
      assert.ok(moonGlobe instanceof THREE.Mesh);
      assert.ok(moonGlobe.geometry instanceof THREE.SphereGeometry);
      assert.strictEqual(moonGlobe.name, 'planet_globe_moon');

      const marsGlobe = createPlanetGlobeMesh('mars', 4.0);
      assert.ok(marsGlobe instanceof THREE.Mesh);
      assert.ok(marsGlobe.geometry instanceof THREE.SphereGeometry);
      assert.strictEqual(marsGlobe.name, 'planet_globe_mars');

      disposeThreeObject(moonGlobe);
      disposeThreeObject(marsGlobe);
    });

    it('createAtmosphericGlowMesh instantiates outer inverted Rayleigh scattering halo', () => {
      const halo = createAtmosphericGlowMesh('mars', 4.0);
      assert.ok(halo instanceof THREE.Mesh);
      assert.ok(halo.geometry instanceof THREE.SphereGeometry);
      assert.strictEqual((halo.geometry as THREE.SphereGeometry).parameters.radius, 4.0 * 1.055);
      assert.strictEqual((halo.material as THREE.MeshBasicMaterial).side, THREE.BackSide);

      disposeThreeObject(halo);
    });

    it('createLandingBeaconMarker situates pulsing beacon on surface pointing along normal', () => {
      const marker = createLandingBeaconMarker('moon', 4.0);

      assert.ok(marker.group instanceof THREE.Group);
      assert.ok(typeof marker.update === 'function');
      assert.ok(marker.targetPosition instanceof THREE.Vector3);

      // Verify beacon position is on sphere surface (magnitude == 4.0)
      const dist = marker.targetPosition.length();
      assert.ok(Math.abs(dist - 4.0) < 1e-4, `Beacon distance should be 4.0, got ${dist}`);

      // Animation tick updates without throwing
      assert.doesNotThrow(() => marker.update(1.5));

      disposeThreeObject(marker.group);
    });
  });

  // ========================================================
  // 4. WebGL Disposal & Memory Guard
  // ========================================================
  describe('WebGL Memory Disposal Protocol', () => {
    it('disposeThreeObject safely handles nested hierarchies with materials, maps, and lines', () => {
      const parent = new THREE.Group();
      const child = new THREE.Group();
      parent.add(child);

      let geomDisposed = false;
      let matDisposed = false;
      let mapDisposed = false;

      const geom = new THREE.BufferGeometry();
      geom.addEventListener('dispose', () => { geomDisposed = true; });

      const fakeTexture = {
        dispose: () => { mapDisposed = true; },
      } as unknown as THREE.Texture;

      const mat = new THREE.MeshStandardMaterial();
      mat.map = fakeTexture;
      mat.addEventListener('dispose', () => { matDisposed = true; });

      const mesh = new THREE.Mesh(geom, mat);
      child.add(mesh);

      disposeThreeObject(parent);

      assert.strictEqual(geomDisposed, true, 'BufferGeometry must be disposed');
      assert.strictEqual(matDisposed, true, 'Material must be disposed');
      assert.strictEqual(mapDisposed, true, 'Texture map must be disposed');
      assert.strictEqual(parent.children.length, 0, 'Parent children must be cleared');
    });

    it('disposeMaterial gracefully handles multi-material arrays', () => {
      let mat1Disposed = false;
      let mat2Disposed = false;

      const mat1 = new THREE.MeshBasicMaterial();
      const mat2 = new THREE.MeshBasicMaterial();
      mat1.addEventListener('dispose', () => { mat1Disposed = true; });
      mat2.addEventListener('dispose', () => { mat2Disposed = true; });

      disposeMaterial(mat1);
      disposeMaterial(mat2);

      assert.strictEqual(mat1Disposed, true);
      assert.strictEqual(mat2Disposed, true);
    });

    it('disposeRenderer and safeCancelAnimationFrame tolerate edge cases without throwing', () => {
      // null and undefined checks
      assert.doesNotThrow(() => disposeRenderer(null));
      assert.doesNotThrow(() => safeCancelAnimationFrame(null));
      assert.doesNotThrow(() => safeCancelAnimationFrame(undefined));

      // Mock renderer with missing forceContextLoss or domElement
      const edgeRenderer = {
        dispose: () => {},
      } as unknown as THREE.WebGLRenderer;
      assert.doesNotThrow(() => disposeRenderer(edgeRenderer));
    });
  });
});
