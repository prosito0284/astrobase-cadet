import * as THREE from 'three';

export type PlanetLocation = 'moon' | 'mars';

export interface ObstacleData {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  rotation: number;
  geometryType: 'dodecahedron' | 'icosahedron';
}

export interface ResourceShard {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  type: 'water' | 'shield' | 'science';
  collected: boolean;
  spawnTime: number;
}

export interface ResourceNodeData {
  id: string;
  x: number;
  z: number;
  y: number;
  type: 'water' | 'shield' | 'science';
  maxHp: number;
  currentHp: number;
  isDestroyed: boolean;
  shards: ResourceShard[];
}

/**
 * Deterministic multi-octave pseudo-noise height function for Moon & Mars.
 * Zero external dependencies, pure continuous mathematics.
 */
export function getRoverTerrainY(x: number, z: number, location: PlanetLocation): number {
  const distFromBase = Math.hypot(x, z);

  // Flat base landing zone (radius < 10m)
  if (distFromBase < 8.0) {
    return 0;
  }

  // Smooth blending transition from flat landing zone (8m to 14m)
  const baseBlend = Math.min(1, Math.max(0, (distFromBase - 8.0) / 6.0));

  if (location === 'moon') {
    // Shackleton crater floor & rising rim
    // Natural depression inside crater, steep outer rim rising at r > 40
    const rimProfile = Math.pow(Math.max(0, (distFromBase - 25.0) / 45.0), 2.2) * 16.0;

    // Multi-octave natural crater topography
    const oct1 = Math.sin(x * 0.045) * Math.cos(z * 0.045) * 3.5;
    const oct2 = Math.sin(x * 0.09 + 1.2) * Math.cos(z * 0.08 + 0.4) * 1.6;
    const oct3 = Math.sin(x * 0.22 - 0.7) * Math.cos(z * 0.19 + 1.9) * 0.6;
    const oct4 = Math.sin(x * 0.45) * Math.cos(z * 0.48) * 0.2;

    // Small craters (depressions)
    const crater1Dist = Math.hypot(x - 28, z + 22);
    const crater1 = crater1Dist < 12 ? -3.0 * Math.cos((crater1Dist / 12) * (Math.PI / 2)) : 0;

    const crater2Dist = Math.hypot(x + 32, z - 28);
    const crater2 = crater2Dist < 10 ? -2.5 * Math.cos((crater2Dist / 10) * (Math.PI / 2)) : 0;

    const rawHeight = rimProfile + oct1 + oct2 + oct3 + oct4 + crater1 + crater2;
    return rawHeight * baseBlend;
  } else {
    // Mars: Jezero ancient river delta terraces and undulating dunes
    // Layered step terraces (river delta deposition)
    const terrace = Math.floor(distFromBase / 14.0) * 1.4 + ((distFromBase % 14.0) / 14.0) * 0.8;

    // Undulating ripples and Séítah dunes
    const dune1 = Math.sin(x * 0.05 + z * 0.03) * 3.0;
    const dune2 = Math.sin(x * 0.12 - z * 0.08 + 1.5) * 1.4;
    const ripple = Math.sin(x * 0.35 + z * 0.25) * 0.35;

    // Dry river channel cut
    const channelDist = Math.abs(x * 0.4 + z * 0.8 - 18.0);
    const channel = channelDist < 8 ? -2.2 * Math.cos((channelDist / 8) * (Math.PI / 2)) : 0;

    const rawHeight = terrace * 0.7 + dune1 + dune2 + ripple + channel;
    return rawHeight * baseBlend;
  }
}

/**
 * Calculates surface normal [nx, ny, nz] using central finite differences.
 */
export function getRoverTerrainNormal(
  x: number,
  z: number,
  location: PlanetLocation,
  delta = 0.5
): [number, number, number] {
  const yL = getRoverTerrainY(x - delta, z, location);
  const yR = getRoverTerrainY(x + delta, z, location);
  const yD = getRoverTerrainY(x, z - delta, location);
  const yU = getRoverTerrainY(x, z + delta, location);

  // Gradient vectors:
  // dx = (2 * delta, yR - yL, 0)
  // dz = (0, yU - yD, 2 * delta)
  // Cross product: ( -(yR - yL) * (2*delta), 4 * delta^2, -(yU - yD) * (2*delta) )
  const nx = -(yR - yL) / (2 * delta);
  const nz = -(yU - yD) / (2 * delta);
  const ny = 1.0;

  const len = Math.hypot(nx, ny, nz);
  return [nx / len, ny / len, nz / len];
}

/**
 * Calculates slope gradient along the rover's heading direction.
 * Positive slope = uphill, negative = downhill.
 */
export function getRoverSlopeAlongHeading(
  x: number,
  z: number,
  yaw: number,
  location: PlanetLocation,
  step = 0.8
): number {
  // Heading vector: (-sin(yaw), -cos(yaw))
  const fwdX = -Math.sin(yaw);
  const fwdZ = -Math.cos(yaw);

  const yCurrent = getRoverTerrainY(x, z, location);
  const yAhead = getRoverTerrainY(x + fwdX * step, z + fwdZ * step, location);

  return (yAhead - yCurrent) / step;
}

/**
 * Creates terrain probe callback compatible with roverPhysics engine.
 */
export function createRoverTerrainProbe(location: PlanetLocation) {
  return (x: number, z: number) => {
    const y = getRoverTerrainY(x, z, location);
    const normal = getRoverTerrainNormal(x, z, location);
    // 0 yaw heading along -Z for default probe
    const slopeAlongHeading = getRoverSlopeAlongHeading(x, z, 0, location);
    return { y, normal, slopeAlongHeading };
  };
}

/**
 * Generates procedural obstacle boulders scattered across the map.
 * Ensures the base landing zone (radius < 12m) is kept 100% clear.
 */
export function generateRoverObstacles(location: PlanetLocation, count = 26): ObstacleData[] {
  const obstacles: ObstacleData[] = [];
  // Deterministic seed generation
  let seed = location === 'moon' ? 42109 : 88417;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < count; i++) {
    const angle = pseudoRandom() * Math.PI * 2;
    // Radius between 13m and 72m
    const dist = 13.0 + pseudoRandom() * 58.0;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const radius = 1.1 + pseudoRandom() * 1.8;
    const height = radius * (1.2 + pseudoRandom() * 0.6);
    const rotation = pseudoRandom() * Math.PI * 2;
    const geometryType = pseudoRandom() > 0.5 ? 'dodecahedron' : 'icosahedron';

    obstacles.push({
      id: `obs_${location}_${i}`,
      x,
      z,
      radius,
      height,
      rotation,
      geometryType,
    });
  }

  return obstacles;
}

/**
 * Generates collectible resource nodes tailored to mission targets.
 */
export function generateRoverResourceNodes(location: PlanetLocation): ResourceNodeData[] {
  const nodes: ResourceNodeData[] = [];
  let seed = location === 'moon' ? 12345 : 67890;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Node distribution:
  // Moon: heavier on water (Ice) and shield (Basalt)
  // Mars: heavier on science (Delta fossil cores) and water (Sulfates)
  const types: Array<'water' | 'shield' | 'science'> = location === 'moon' 
    ? ['water', 'water', 'water', 'water', 'shield', 'shield', 'science', 'water', 'shield', 'science']
    : ['science', 'science', 'science', 'water', 'water', 'shield', 'science', 'water', 'science', 'shield'];

  for (let i = 0; i < types.length; i++) {
    const angle = (i / types.length) * Math.PI * 2 + (pseudoRandom() - 0.5) * 0.4;
    const dist = 16.0 + pseudoRandom() * 50.0;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = getRoverTerrainY(x, z, location);

    nodes.push({
      id: `res_node_${location}_${i}`,
      x,
      z,
      y,
      type: types[i],
      maxHp: 3,
      currentHp: 3,
      isDestroyed: false,
      shards: [],
    });
  }

  return nodes;
}

/**
 * Builds 3D terrain mesh for Rover driving mode.
 */
export function buildRoverTerrainMesh(
  location: PlanetLocation,
  size = 180,
  segments = 90
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;
  const count = posAttr.count;
  const colors = new Float32Array(count * 3);

  const colorBase = location === 'moon' ? new THREE.Color('#1c2028') : new THREE.Color('#9a3412');
  const colorMid = location === 'moon' ? new THREE.Color('#374151') : new THREE.Color('#c2410c');
  const colorHigh = location === 'moon' ? new THREE.Color('#6b7280') : new THREE.Color('#ea580c');
  const vertexColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getRoverTerrainY(vx, vz, location);
    posAttr.setY(i, vy);

    // Height-based & slope tinting
    const heightNorm = Math.min(1, Math.max(0, (vy + 3) / 18));
    if (heightNorm < 0.45) {
      vertexColor.copy(colorBase).lerp(colorMid, heightNorm / 0.45);
    } else {
      vertexColor.copy(colorMid).lerp(colorHigh, (heightNorm - 0.45) / 0.55);
    }

    colors[i * 3] = vertexColor.r;
    colors[i * 3 + 1] = vertexColor.g;
    colors[i * 3 + 2] = vertexColor.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: location === 'moon' ? 0.15 : 0.05,
    flatShading: true,
  });

  const terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.receiveShadow = true;
  terrainMesh.name = 'RoverTerrainMesh';
  return terrainMesh;
}

/**
 * Builds a 3D visual representation for a resource node.
 */
export function buildResourceNodeMesh(node: ResourceNodeData): THREE.Group {
  const group = new THREE.Group();
  group.name = node.id;
  group.position.set(node.x, node.y, node.z);

  let mainColor: number;
  let emissiveColor: number;

  switch (node.type) {
    case 'water':
      mainColor = 0x38bdf8; // Bright cyan ice crystal
      emissiveColor = 0x0284c7;
      break;
    case 'shield':
      mainColor = 0xf59e0b; // Gold/bronze regolith outcrop
      emissiveColor = 0xb45309;
      break;
    case 'science':
      mainColor = 0xc084fc; // Violet/magenta astrobiology core
      emissiveColor = 0x9333ea;
      break;
  }

  const mat = new THREE.MeshStandardMaterial({
    color: mainColor,
    emissive: emissiveColor,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.4,
  });

  if (node.type === 'water') {
    // Crystal cluster: 4 interlocked octahedrons
    for (let c = 0; c < 4; c++) {
      const crystalGeo = new THREE.OctahedronGeometry(0.7 - c * 0.1, 0);
      const crystal = new THREE.Mesh(crystalGeo, mat);
      crystal.position.set(
        Math.sin((c * Math.PI) / 2) * 0.4,
        0.5 + c * 0.25,
        Math.cos((c * Math.PI) / 2) * 0.4
      );
      crystal.rotation.set(c * 0.3, c * 0.5, c * 0.2);
      group.add(crystal);
    }
  } else if (node.type === 'shield') {
    // Dense basalt/regolith monolith spire
    const spireGeo = new THREE.CylinderGeometry(0.5, 0.9, 1.8, 6);
    const spire = new THREE.Mesh(spireGeo, mat);
    spire.position.y = 0.9;
    spire.rotation.y = 0.4;
    group.add(spire);

    // Flanking rocks
    const flankGeo = new THREE.DodecahedronGeometry(0.45);
    const flank1 = new THREE.Mesh(flankGeo, mat);
    flank1.position.set(0.6, 0.4, 0.3);
    group.add(flank1);
  } else {
    // Science core: cylindrical tube with glowing rings
    const tubeGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.6, 12);
    const tube = new THREE.Mesh(tubeGeo, mat);
    tube.position.y = 0.8;
    group.add(tube);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const ringGeo = new THREE.TorusGeometry(0.55, 0.05, 8, 16);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.8;
    group.add(ring);
  }

  // Ground anchor base
  const anchorGeo = new THREE.CylinderGeometry(1.0, 1.3, 0.3, 8);
  const anchorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const anchor = new THREE.Mesh(anchorGeo, anchorMat);
  anchor.position.y = 0.15;
  group.add(anchor);

  return group;
}

/**
 * Builds 3D visual mesh for a mineral shard spawned when node shatters.
 */
export function buildShardMesh(type: 'water' | 'shield' | 'science'): THREE.Mesh {
  const geo = new THREE.OctahedronGeometry(0.3, 0);
  let color = 0x38bdf8;
  if (type === 'shield') color = 0xf59e0b;
  if (type === 'science') color = 0xc084fc;

  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.8,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}
