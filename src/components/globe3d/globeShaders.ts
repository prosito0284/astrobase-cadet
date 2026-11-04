import * as THREE from 'three';
import { BaseLocation } from '../../types/game';

/**
 * Converts Latitude and Longitude in degrees to a 3D Cartesian Vector3
 * on a sphere of specified radius.
 * 
 * Convention:
 * - Latitude: -90° (South Pole) to +90° (North Pole). Y axis is along North (+Y) / South (-Y).
 * - Longitude: -180° to +180°. 0° is on +Z axis, 90° E is on +X axis.
 */
export function latLonToCartesian(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  // Clamp latitude to [-90, 90]
  const clampedLat = Math.max(-90, Math.min(90, latDeg));
  const latRad = (clampedLat * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;

  // Spherical to Cartesian:
  // y = R * sin(lat)
  // x = R * cos(lat) * sin(lon)
  // z = R * cos(lat) * cos(lon)
  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);

  const x = radius * cosLat * sinLon;
  const y = radius * sinLat;
  const z = radius * cosLat * cosLon;

  return new THREE.Vector3(x, y, z);
}

/**
 * Landing site coordinate definitions
 */
export interface LandingSiteInfo {
  location: BaseLocation;
  nameEs: string;
  nameEn: string;
  siteNameEs: string;
  siteNameEn: string;
  latDeg: number;
  lonDeg: number;
  missionName: string;
  campaignDays: number;
  roverName: string;
  environmentDescriptionEs: string;
  environmentDescriptionEn: string;
  primaryHazardEs: string;
  primaryHazardEn: string;
  colorHex: number;
}

export const LANDING_SITES: Record<BaseLocation, LandingSiteInfo> = {
  moon: {
    location: 'moon',
    nameEs: 'Luna',
    nameEn: 'Moon',
    siteNameEs: 'Cráter Shackleton (Polo Sur)',
    siteNameEn: 'Shackleton Crater (South Pole)',
    latDeg: -89.9,
    lonDeg: 0.0,
    missionName: 'Programa Artemis / Base Alpha',
    campaignDays: 28,
    roverName: 'VIPER (Volatiles Polar Rover)',
    environmentDescriptionEs: 'Trampa fría permanente a -246°C con depósitos masivos de hielo de agua en sombra eterna.',
    environmentDescriptionEn: 'Permanent cold trap at -246°C with massive water ice deposits in eternal shadow.',
    primaryHazardEs: 'Noche Lunar prolongada (-180°C) y tormentas de radiación solar DONKI CME.',
    primaryHazardEn: 'Extended Lunar Night (-180°C) and DONKI CME solar radiation storms.',
    colorHex: 0x38bdf8, // Cyan beacon
  },
  mars: {
    location: 'mars',
    nameEs: 'Marte',
    nameEn: 'Mars',
    siteNameEs: 'Cráter Jezero (Delta Antiguo)',
    siteNameEn: 'Jezero Crater (Ancient Delta)',
    latDeg: 18.38,
    lonDeg: 77.58,
    missionName: 'Misión Mars 2020 / Base Ares',
    campaignDays: 30,
    roverName: 'Perseverance ("Percy")',
    environmentDescriptionEs: 'Paleolago con delta fluvial arcilloso rico en sedimentos orgánicos y minerales hidratados.',
    environmentDescriptionEn: 'Ancient paleolake with clay river delta rich in organic sediments and hydrated minerals.',
    primaryHazardEs: 'Tormentas globales de polvo atmosférico (Tau 2.1) que bloquean la energía solar.',
    primaryHazardEn: 'Global atmospheric dust storms (Tau 2.1) blocking photovoltaic solar energy.',
    colorHex: 0xf97316, // Orange beacon
  },
};

/**
 * Creates high-fidelity procedural texture for the Moon using Canvas2D.
 * Features dark basaltic maria, bright anorthosite highlands, and impact craters.
 */
export function createMoonProceduralTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;

  // 1. Base cratered highland anorthosite (medium silver-gray)
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, w, h);

  // Mottled terrain noise
  for (let i = 0; i < 6000; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    const radius = Math.random() * 4 + 1;
    const brightness = Math.floor(Math.random() * 50) + 80;
    ctx.fillStyle = `rgb(${brightness}, ${brightness + 4}, ${brightness + 8})`;
    ctx.beginPath();
    ctx.arc(rx, ry, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Basaltic Maria (Dark Lava Plains)
  ctx.fillStyle = '#1e293b';

  // Oceanus Procellarum & Mare Imbrium (Western hemisphere)
  ctx.beginPath();
  ctx.ellipse(w * 0.35, h * 0.38, w * 0.14, h * 0.18, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(w * 0.45, h * 0.30, w * 0.08, h * 0.10, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Mare Serenitatis & Mare Tranquillitatis (Apollo 11)
  ctx.beginPath();
  ctx.ellipse(w * 0.55, h * 0.35, w * 0.07, h * 0.09, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(w * 0.58, h * 0.48, w * 0.08, h * 0.08, 0.0, 0, Math.PI * 2);
  ctx.fill();

  // Mare Crisium (Crisium Basin)
  ctx.beginPath();
  ctx.ellipse(w * 0.68, h * 0.40, w * 0.045, h * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mare Fecunditatis & Mare Nectaris
  ctx.beginPath();
  ctx.ellipse(w * 0.62, h * 0.58, w * 0.06, h * 0.07, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // 3. Highlighted Impact Craters with sunlit rims & dark shadows
  const craterSeeds = [
    { x: w * 0.47, y: h * 0.72, r: 16, name: 'Tycho' },
    { x: w * 0.36, y: h * 0.42, r: 14, name: 'Copernicus' },
    { x: w * 0.28, y: h * 0.38, r: 12, name: 'Kepler' },
    { x: w * 0.50, y: h * 0.96, r: 15, name: 'Shackleton South Pole' },
    { x: w * 0.50, y: h * 0.04, r: 12, name: 'Peary North Pole' },
    { x: w * 0.82, y: h * 0.45, r: 18, name: 'Tsiolkovskiy' },
    { x: w * 0.20, y: h * 0.65, r: 11, name: 'Schickard' },
    { x: w * 0.75, y: h * 0.70, r: 13, name: 'Gagarin' },
  ];

  for (const c of craterSeeds) {
    // Dark floor
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();

    // Bright illuminated rim (crescent)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();

    // Central peak
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tycho Bright Ejecta Ray System
  ctx.strokeStyle = 'rgba(241, 245, 249, 0.35)';
  ctx.lineWidth = 1.2;
  const tychoX = w * 0.47;
  const tychoY = h * 0.72;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
    ctx.beginPath();
    ctx.moveTo(tychoX, tychoY);
    ctx.lineTo(
      tychoX + Math.cos(a) * (w * 0.25 + Math.random() * 50),
      tychoY + Math.sin(a) * (h * 0.35 + Math.random() * 40)
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates high-fidelity procedural texture for Mars using Canvas2D.
 * Features rust-red ferric oxide surface, dark Syrtis Major, Valles Marineris canyon,
 * and brilliant white polar ice caps.
 */
export function createMarsProceduralTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;

  // 1. Base Martian ochre / oxidized ferric oxide
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#7c2d12');
  gradient.addColorStop(0.3, '#c2410c');
  gradient.addColorStop(0.5, '#ea580c');
  gradient.addColorStop(0.7, '#c2410c');
  gradient.addColorStop(1, '#7c2d12');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Surface texture noise
  for (let i = 0; i < 5000; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    const radius = Math.random() * 5 + 1;
    const rVal = Math.floor(Math.random() * 50) + 160;
    const gVal = Math.floor(Math.random() * 40) + 50;
    ctx.fillStyle = `rgba(${rVal}, ${gVal}, 20, 0.35)`;
    ctx.beginPath();
    ctx.arc(rx, ry, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Dark Albedo Features (Syrtis Major, Acidalia Planitia, Sinus Sabaeus)
  ctx.fillStyle = '#431407';

  // Syrtis Major Planum (~70° E, 10° N)
  ctx.beginPath();
  ctx.moveTo(w * 0.68, h * 0.44);
  ctx.lineTo(w * 0.74, h * 0.52);
  ctx.lineTo(w * 0.66, h * 0.56);
  ctx.closePath();
  ctx.fill();

  // Sinus Sabaeus & Meridiani equatorial dark belt
  ctx.beginPath();
  ctx.ellipse(w * 0.52, h * 0.54, w * 0.14, h * 0.05, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // Acidalia Planitia (Northern dark basin)
  ctx.beginPath();
  ctx.ellipse(w * 0.40, h * 0.32, w * 0.09, h * 0.08, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Mare Tyrrhenum & Cimmerium (Southern highlands)
  ctx.beginPath();
  ctx.ellipse(w * 0.82, h * 0.62, w * 0.12, h * 0.06, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 3. Valles Marineris (The Grand Canyon of Mars, ~4,000 km long)
  ctx.strokeStyle = '#290b02';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.28, h * 0.52);
  ctx.bezierCurveTo(w * 0.34, h * 0.54, w * 0.40, h * 0.51, w * 0.46, h * 0.55);
  ctx.stroke();

  // Olympus Mons & Tharsis Volcanoes (Western hemisphere)
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(w * 0.18, h * 0.42, 10, 0, Math.PI * 2); // Olympus Mons
  ctx.fill();
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(w * 0.18, h * 0.42, 3, 0, Math.PI * 2); // Caldera
  ctx.fill();

  // 4. Jezero Crater Ancient Lake Delta location (~77.5° E, 18.4° N)
  // Marked with river delta fan
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(w * 0.71, h * 0.40, 5, 0, Math.PI * 2);
  ctx.fill();

  // 5. Brilliant White Polar Ice Caps
  // Planum Boreum (North Pole: CO2 & Water ice)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 12, w * 0.32, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Planum Australe (South Pole)
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h - 10, w * 0.28, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates the 3D celestial globe mesh for Moon or Mars with high-fidelity procedural materials.
 */
export function createPlanetGlobeMesh(location: BaseLocation, radius: number = 4.0): THREE.Mesh {
  const geom = new THREE.SphereGeometry(radius, 64, 48);

  const tex = location === 'moon' ? createMoonProceduralTexture() : createMarsProceduralTexture();

  const mat = new THREE.MeshStandardMaterial({
    ...(tex ? { map: tex } : {}),
    color: tex ? 0xffffff : (location === 'moon' ? 0x94a3b8 : 0xc2410c),
    roughness: location === 'moon' ? 0.92 : 0.85,
    metalness: 0.05,
    bumpScale: 0.05,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = `planet_globe_${location}`;
  return mesh;
}

/**
 * Creates atmospheric Rayleigh scattering outer glow halo for Mars or corona for Moon.
 */
export function createAtmosphericGlowMesh(location: BaseLocation, planetRadius: number = 4.0): THREE.Mesh {
  const glowGeom = new THREE.SphereGeometry(planetRadius * 1.055, 48, 36);

  const glowColor = location === 'mars' ? 0xf97316 : 0x38bdf8;
  const opacity = location === 'mars' ? 0.28 : 0.12;

  const glowMat = new THREE.MeshBasicMaterial({
    color: glowColor,
    transparent: true,
    opacity,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(glowGeom, glowMat);
  mesh.name = `atmosphere_glow_${location}`;
  return mesh;
}

export interface LandingMarker3D {
  group: THREE.Group;
  update: (time: number) => void;
  targetPosition: THREE.Vector3;
}

/**
 * Creates a pulsing 3D landing beacon marker situated precisely at the target latitude/longitude.
 */
export function createLandingBeaconMarker(
  location: BaseLocation,
  planetRadius: number = 4.0
): LandingMarker3D {
  const group = new THREE.Group();
  group.name = `landing_beacon_${location}`;

  const site = LANDING_SITES[location];
  const surfacePos = latLonToCartesian(site.latDeg, site.lonDeg, planetRadius);
  const normal = surfacePos.clone().normalize();

  // Position group on planet surface
  group.position.copy(surfacePos);

  // Align group's +Y axis along the surface normal
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);
  group.setRotationFromQuaternion(quat);

  // 1. Surface glowing rings
  const ringGeom = new THREE.RingGeometry(0.08, 0.28, 24);
  ringGeom.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: site.colorHex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.y = 0.02;
  group.add(ring);

  // 2. Vertical beacon beam
  const beamHeight = 1.2;
  const beamGeom = new THREE.CylinderGeometry(0.03, 0.05, beamHeight, 16);
  beamGeom.translate(0, beamHeight / 2, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: site.colorHex,
    transparent: true,
    opacity: 0.75,
  });
  const beam = new THREE.Mesh(beamGeom, beamMat);
  group.add(beam);

  // 3. Pulsing Diamond Beacon Top
  const diamondGeom = new THREE.OctahedronGeometry(0.18, 0);
  const diamondMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const diamond = new THREE.Mesh(diamondGeom, diamondMat);
  diamond.position.y = beamHeight;
  group.add(diamond);

  // 4. Dynamic Animation
  function update(time: number): void {
    // Pulse diamond scale & ring opacity
    const pulse = (Math.sin(time * 5.0) + 1.0) * 0.5;
    diamond.scale.setScalar(0.9 + pulse * 0.45);
    diamond.rotation.y += 0.03;
    ring.scale.setScalar(1.0 + pulse * 0.5);
    ringMat.opacity = 0.5 + pulse * 0.45;
  }

  return {
    group,
    update,
    targetPosition: surfacePos,
  };
}
