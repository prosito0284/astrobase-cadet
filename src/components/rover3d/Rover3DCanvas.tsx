import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  RoverPhysicsState, 
  RoverControlInput, 
  createInitialRoverState, 
  stepRoverPhysics, 
  getHeadingVector, 
  getDistanceToBase, 
  getBearingToBase, 
  MOON_PHYSICS_CONFIG, 
  MARS_PHYSICS_CONFIG,
  ObstacleCollision 
} from './roverPhysics';
import { 
  PlanetLocation, 
  getRoverTerrainY, 
  createRoverTerrainProbe, 
  generateRoverObstacles, 
  generateRoverResourceNodes, 
  buildRoverTerrainMesh, 
  buildResourceNodeMesh, 
  buildShardMesh, 
  ObstacleData, 
  ResourceNodeData, 
  ResourceShard 
} from './roverTerrain';
import { 
  buildVIPERModel, 
  buildPerseveranceModel, 
  buildBaseBeacon, 
  buildLaserBeamMesh, 
  updateRoverModelVisuals, 
  RoverModelComponents 
} from './roverModels';
import { RoverHUD } from './RoverHUD';
import { disposeThreeObject, disposeRenderer } from '../3d/disposal';
import { soundFx } from '../../utils/audio';
import { rollGeologicalSample, GeologicalSpecimen } from '../../data/geologicalSamples';

export interface Rover3DCanvasProps {
  location: PlanetLocation;
  activeTarget: {
    id: string;
    nameEs: string;
    nameEn: string;
    batteryCost: number;
    icon: string;
    rewardType: 'water' | 'shield' | 'science' | 'energy';
    rewardAmount: number;
  };
  currentEnergy: number;
  onFinishMission: (results: {
    collectedWater: number;
    collectedShield: number;
    collectedScience: number;
    batteryUsed: number;
    batteryRemainingPct: number;
    dockedSuccessfully: boolean;
  }) => void;
  onCancel: () => void;
  lang: 'es' | 'en';
  hasRoverHangar?: boolean;
  onDiscoverSample?: (sample: GeologicalSpecimen) => void;
}

/**
 * Procedural Web Audio Spectrometer Zap Synthesizer
 */
class LaserAudioSynth {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playLaserZap() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      // High-tech frequency sweep from 1800 Hz down to 240 Hz
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.09);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Graceful fallback to audio soundFx
      soundFx.playClick();
    }
  }

  public close() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const Rover3DCanvas: React.FC<Rover3DCanvasProps> = ({
  location,
  activeTarget,
  onFinishMission,
  onCancel,
  lang,
  hasRoverHangar = false,
  onDiscoverSample,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<LaserAudioSynth | null>(null);
  const onDiscoverSampleRef = useRef(onDiscoverSample);
  useEffect(() => { onDiscoverSampleRef.current = onDiscoverSample; }, [onDiscoverSample]);

  // Sample Discovery Banner State
  const [sampleDiscoveryBanner, setSampleDiscoveryBanner] = useState<GeologicalSpecimen | null>(null);

  // HUD and Telemetry State
  const [speed, setSpeed] = useState<number>(0);
  const [batteryPct, setBatteryPct] = useState<number>(100);
  const [cargo, setCargo] = useState<{ water: number; shield: number; science: number }>({
    water: 0,
    shield: 0,
    science: 0,
  });
  const [distanceToBase, setDistanceToBase] = useState<number>(8.0);
  const [bearingToBase, setBearingToBase] = useState<number>(0);
  const [isDockingZone, setIsDockingZone] = useState<boolean>(true);
  const [laserCooldownPct, setLaserCooldownPct] = useState<number>(0);

  // Input state refs (accessible inside render loop without closure lag)
  const inputRef = useRef<RoverControlInput>({
    throttle: 0,
    steer: 0,
    brake: false,
    reset: false,
  });

  const keysPressedRef = useRef<Record<string, boolean>>({});
  const roverStateRef = useRef<RoverPhysicsState>(createInitialRoverState(0, 8, 0));
  const batteryPctRef = useRef<number>(100);
  const cargoRef = useRef<{ water: number; shield: number; science: number }>({
    water: 0,
    shield: 0,
    science: 0,
  });
  const laserCooldownRef = useRef<number>(0);
  const isFinishedRef = useRef<boolean>(false);

  // Laser beam visual and spark particles
  const laserBeamMeshRef = useRef<THREE.Mesh | null>(null);
  const laserTimerRef = useRef<number>(0);
  const sparkGroupRef = useRef<THREE.Group | null>(null);
  const activeSparksRef = useRef<Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }>>([]);

  // Three.js Scene References
  const nodesDataRef = useRef<ResourceNodeData[]>([]);
  const nodeMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const activeShardsRef = useRef<Array<{ shard: ResourceShard; mesh: THREE.Mesh }>>([]);

  const finishSortie = useCallback((dockedSuccessfully: boolean) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;

    // Apply cargo penalty if blackout emergency winch retrieval occurred
    let finalWater = cargoRef.current.water;
    let finalShield = cargoRef.current.shield;
    let finalScience = cargoRef.current.science;

    if (!dockedSuccessfully) {
      // 15% cargo penalty on blackout recovery
      finalWater = Math.floor(finalWater * 0.85);
      finalShield = Math.floor(finalShield * 0.85);
      finalScience = Math.floor(finalScience * 0.85);
      soundFx.playAlert();
    } else {
      soundFx.playVictory();
    }

    onFinishMission({
      collectedWater: finalWater,
      collectedShield: finalShield,
      collectedScience: finalScience,
      batteryUsed: activeTarget.batteryCost,
      batteryRemainingPct: Math.max(0, batteryPctRef.current),
      dockedSuccessfully,
    });
  }, [activeTarget.batteryCost, onFinishMission]);

  // Touch & UI control change handler
  const handleControlChange = useCallback((input: { throttle: number; steer: number; brake: boolean }) => {
    inputRef.current.throttle = input.throttle;
    inputRef.current.steer = input.steer;
    inputRef.current.brake = input.brake;
  }, []);

  const handleResetVehicle = useCallback(() => {
    inputRef.current.reset = true;
    soundFx.playClick();
  }, []);

  // Spectrometer Laser Fire Action
  const triggerLaserFire = useCallback(() => {
    if (laserCooldownRef.current > 0 || isFinishedRef.current) return;
    laserCooldownRef.current = 0.4; // 400ms cooldown

    // Audio zap synthesis
    if (!synthRef.current) {
      synthRef.current = new LaserAudioSynth();
    }
    synthRef.current.playLaserZap();

    // Deduct battery (0.5% per laser shot)
    batteryPctRef.current = Math.max(0, batteryPctRef.current - 0.5);

    // Laser raycasting from rover heading forward
    const rover = roverStateRef.current;
    const [fwdX, fwdZ] = getHeadingVector(rover.yaw);
    // Laser mining range extends from 22/25m to 35m when Rover Hangar is active
    const laserRange = hasRoverHangar ? 35.0 : 22.0;

    // Check hit against resource nodes
    let hitNode: ResourceNodeData | null = null;
    let closestDist = laserRange;

    for (const node of nodesDataRef.current) {
      if (node.isDestroyed) continue;
      const dx = node.x - rover.x;
      const dz = node.z - rover.z;
      const dist = Math.hypot(dx, dz);

      // Dot product to check if node is in front cone
      const dot = (dx * fwdX + dz * fwdZ) / Math.max(0.1, dist);
      if (dist < closestDist && dot > 0.88) {
        closestDist = dist;
        hitNode = node;
      }
    }

    // Orient and show laser beam mesh
    if (laserBeamMeshRef.current) {
      const beam = laserBeamMeshRef.current;
      beam.visible = true;
      laserTimerRef.current = 0.12; // visible for 120ms

      const targetX = hitNode ? hitNode.x : rover.x + fwdX * laserRange;
      const targetY = hitNode ? hitNode.y + 0.8 : rover.y + 1.2;
      const targetZ = hitNode ? hitNode.z : rover.z + fwdZ * laserRange;

      const originX = rover.x;
      const originY = rover.y + 1.8;
      const originZ = rover.z;

      const beamDist = Math.hypot(targetX - originX, targetY - originY, targetZ - originZ);
      beam.scale.set(1, 1, beamDist);
      beam.position.set((originX + targetX) / 2, (originY + targetY) / 2, (originZ + targetZ) / 2);
      beam.lookAt(targetX, targetY, targetZ);
    }

    // If node was hit, apply damage and spark burst
    if (hitNode) {
      hitNode.currentHp -= 1;
      soundFx.playHarvest();

      // Spawn spark particles at hit location
      if (sparkGroupRef.current) {
        const sparkCount = 16;
        for (let s = 0; s < sparkCount; s++) {
          const sparkMat = new THREE.MeshBasicMaterial({
            color: hitNode.type === 'water' ? 0x38bdf8 : hitNode.type === 'shield' ? 0xf59e0b : 0xc084fc,
          });
          const sparkGeo = new THREE.SphereGeometry(0.08, 4, 4);
          const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
          sparkMesh.position.set(hitNode.x, hitNode.y + 0.8, hitNode.z);
          sparkGroupRef.current.add(sparkMesh);

          const ang = Math.random() * Math.PI * 2;
          const speed = 2.0 + Math.random() * 4.0;
          activeSparksRef.current.push({
            mesh: sparkMesh,
            vx: Math.cos(ang) * speed,
            vy: 2.0 + Math.random() * 3.5,
            vz: Math.sin(ang) * speed,
            life: 0.35,
          });
        }
      }

      // Check if node shattered
      if (hitNode.currentHp <= 0 && !hitNode.isDestroyed) {
        hitNode.isDestroyed = true;

        // Hide main node mesh
        const meshGroup = nodeMeshesRef.current.get(hitNode.id);
        if (meshGroup) {
          meshGroup.visible = false;
        }

        // Trigger sample collection roll from mined node
        const minedSample = rollGeologicalSample(location, hitNode.type);
        if (minedSample) {
          setSampleDiscoveryBanner(minedSample);
          soundFx.playVictory();
          onDiscoverSampleRef.current?.(minedSample);
          setTimeout(() => {
            setSampleDiscoveryBanner(null);
          }, 4500);
        }

        // Spawn 3 collectible mineral shards
        if (sparkGroupRef.current) {
          for (let sh = 0; sh < 3; sh++) {
            const shardMesh = buildShardMesh(hitNode.type);
            const shardOffsetAngle = (sh / 3) * Math.PI * 2 + Math.random() * 0.5;
            const shardDist = 1.2 + Math.random() * 1.5;
            const sx = hitNode.x + Math.cos(shardOffsetAngle) * shardDist;
            const sz = hitNode.z + Math.sin(shardOffsetAngle) * shardDist;
            const sy = getRoverTerrainY(sx, sz, location) + 0.4;

            shardMesh.position.set(sx, sy, sz);
            sparkGroupRef.current.add(shardMesh);

            activeShardsRef.current.push({
              shard: {
                id: `${hitNode.id}_shard_${sh}`,
                x: sx,
                y: sy,
                z: sz,
                vx: 0,
                vy: 0,
                vz: 0,
                type: hitNode.type,
                collected: false,
                spawnTime: performance.now(),
              },
              mesh: shardMesh,
            });
          }
        }
      }
    }
  }, [location]);

  // Stable callback refs for animation & keyboard loops
  const triggerLaserFireRef = useRef(triggerLaserFire);
  useEffect(() => { triggerLaserFireRef.current = triggerLaserFire; }, [triggerLaserFire]);

  const handleResetVehicleRef = useRef(handleResetVehicle);
  useEffect(() => { handleResetVehicleRef.current = handleResetVehicle; }, [handleResetVehicle]);

  const finishSortieRef = useRef(finishSortie);
  useEffect(() => { finishSortieRef.current = finishSortie; }, [finishSortie]);

  // Main Three.js Scene, Physics & Game Loop Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    synthRef.current = new LaserAudioSynth();

    // 1. Scene, Camera, Renderer Setup
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(location === 'moon' ? 0x05070c : 0x1a0b06);

    // Atmospheric scattering fog for Mars, crisp vacuum for Moon
    if (location === 'mars') {
      scene.fog = new THREE.FogExp2(0x9a3412, 0.012);
    } else {
      scene.fog = new THREE.FogExp2(0x05070c, 0.008);
    }

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.2, 300);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
    } catch {
      // Graceful fallback for non-WebGL test runners
      renderer = null;
    }

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(
      location === 'moon' ? 0x334155 : 0x7c2d12,
      location === 'moon' ? 0.6 : 0.9
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(
      location === 'moon' ? 0xffffff : 0xffedd5,
      location === 'moon' ? 2.8 : 2.2
    );
    dirLight.position.set(45, 50, 35);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 180;
    const d = 40;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Starfield for Moon
    if (location === 'moon') {
      const starGeo = new THREE.BufferGeometry();
      const starCount = 600;
      const starPositions = new Float32Array(starCount * 3);
      for (let s = 0; s < starCount; s++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const rad = 240;
        starPositions[s * 3] = rad * Math.sin(phi) * Math.cos(theta);
        starPositions[s * 3 + 1] = Math.abs(rad * Math.cos(phi)) + 10;
        starPositions[s * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2 });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);
    }

    // 3. Terrain Mesh
    const terrainMesh = buildRoverTerrainMesh(location, 180, 80);
    scene.add(terrainMesh);

    // 4. Base Lander Beacon at (0, 0)
    const baseBeacon = buildBaseBeacon(location);
    scene.add(baseBeacon);

    // 5. Obstacle Boulders Scatter
    const obstaclesData = generateRoverObstacles(location, 28);
    const obstaclesCollisionList: ObstacleCollision[] = obstaclesData.map(o => ({
      x: o.x,
      z: o.z,
      radius: o.radius,
      id: o.id,
    }));

    for (const obs of obstaclesData) {
      const boulderMat = new THREE.MeshStandardMaterial({
        color: location === 'moon' ? 0x475569 : 0x7c2d12,
        roughness: 0.95,
        metalness: 0.1,
        flatShading: true,
      });

      const boulderGeo = obs.geometryType === 'dodecahedron'
        ? new THREE.DodecahedronGeometry(obs.radius, 1)
        : new THREE.IcosahedronGeometry(obs.radius, 0);

      const boulderMesh = new THREE.Mesh(boulderGeo, boulderMat);
      const obsY = getRoverTerrainY(obs.x, obs.z, location);
      boulderMesh.position.set(obs.x, obsY + obs.radius * 0.7, obs.z);
      boulderMesh.rotation.set(obs.rotation, obs.rotation * 0.7, obs.rotation * 0.3);
      boulderMesh.castShadow = true;
      boulderMesh.receiveShadow = true;
      scene.add(boulderMesh);
    }

    // 6. Resource Nodes Scatter
    const resourceNodes = generateRoverResourceNodes(location);
    nodesDataRef.current = resourceNodes;
    nodeMeshesRef.current.clear();

    for (const node of resourceNodes) {
      const nodeGroup = buildResourceNodeMesh(node);
      scene.add(nodeGroup);
      nodeMeshesRef.current.set(node.id, nodeGroup);
    }

    // Spark / Shard group
    const sparkGroup = new THREE.Group();
    sparkGroup.name = 'SparkAndShardGroup';
    scene.add(sparkGroup);
    sparkGroupRef.current = sparkGroup;

    // 7. Rover Model (VIPER or Perseverance)
    const roverModel: RoverModelComponents = location === 'moon'
      ? buildVIPERModel()
      : buildPerseveranceModel();

    scene.add(roverModel.root);

    // Laser beam visual
    const laserBeam = buildLaserBeamMesh(location === 'moon' ? 0x38bdf8 : 0xef4444);
    scene.add(laserBeam);
    laserBeamMeshRef.current = laserBeam;

    // 8. Keyboard Controls Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        triggerLaserFireRef.current();
      }
      if (e.key.toLowerCase() === 'r') {
        handleResetVehicleRef.current();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 9. Resize & Tab Visibility Handlers
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let isTabVisible = true;
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // WebGL Context Lost Prevention
    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer?.domElement.addEventListener('webglcontextlost', handleContextLost);

    // 10. Main Animation & Game Loop
    let animFrameId: number | null = null;
    let lastTime = performance.now();
    const terrainProbe = createRoverTerrainProbe(location);
    const physicsConfig = location === 'moon' ? MOON_PHYSICS_CONFIG : MARS_PHYSICS_CONFIG;

    let blackoutTriggered = false;

    const gameTick = (now: number) => {
      animFrameId = requestAnimationFrame(gameTick);

      if (!isTabVisible) {
        lastTime = now;
        return;
      }

      // DeltaTime Clamping strictly bounded to Math.min(rawDt, 0.1)
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.max(0, Math.min(rawDt, 0.1));
      lastTime = now;

      if (dt <= 0) return;

      // Update laser beam visibility timer
      if (laserTimerRef.current > 0) {
        laserTimerRef.current -= dt;
        if (laserTimerRef.current <= 0 && laserBeamMeshRef.current) {
          laserBeamMeshRef.current.visible = false;
        }
      }

      // Update laser cooldown
      if (laserCooldownRef.current > 0) {
        laserCooldownRef.current = Math.max(0, laserCooldownRef.current - dt);
        setLaserCooldownPct(laserCooldownRef.current / 0.4);
      }

      // 1. Synthesize keyboard inputs if no touch joystick active
      const keys = keysPressedRef.current;
      let throttle = inputRef.current.throttle;
      let steer = inputRef.current.steer;
      let brake = inputRef.current.brake;
      const reset = inputRef.current.reset;
      inputRef.current.reset = false;

      if (keys['w'] || keys['arrowup']) throttle = 1.0;
      if (keys['s'] || keys['arrowdown']) throttle = -1.0;
      if (keys['a'] || keys['arrowleft']) steer = -1.0;
      if (keys['d'] || keys['arrowright']) steer = 1.0;
      if (keys['shift']) brake = true;

      // 2. Step Rover Physics Engine
      const physicsResult = stepRoverPhysics(
        roverStateRef.current,
        { throttle, steer, brake, reset },
        terrainProbe,
        obstaclesCollisionList,
        dt,
        physicsConfig
      );

      roverStateRef.current = physicsResult.state;
      const rover = roverStateRef.current;

      // Play impact sound on obstacle collision
      if (physicsResult.collisionOccurred && physicsResult.speedPenaltyApplied) {
        soundFx.playAlert();
      }

      // 3. Dynamic Battery Consumption
      // Passive: 0.15%/s
      const passiveDrain = 0.15 * dt;
      // Driving: 0.8% * (speed / maxSpeed) per second
      const speedRatio = Math.abs(rover.speed) / physicsConfig.maxSpeedForward;
      const slopePenalty = terrainProbe(rover.x, rover.z).slopeAlongHeading > 0.05 ? 1.8 : 1.0;
      const driveDrain = 0.8 * speedRatio * slopePenalty * dt;

      batteryPctRef.current = Math.max(0, batteryPctRef.current - (passiveDrain + driveDrain));
      setBatteryPct(batteryPctRef.current);

      // Emergency blackout safeguard: if battery hits 0%, trigger recovery
      if (batteryPctRef.current <= 0 && !blackoutTriggered && !isFinishedRef.current) {
        blackoutTriggered = true;
        setTimeout(() => {
          finishSortieRef.current(false);
        }, 1200);
      }

      // 4. Update 3D Rover Model Position and Orientation
      roverModel.root.position.set(rover.x, rover.y, rover.z);
      roverModel.root.rotation.order = 'YXZ';
      roverModel.root.rotation.y = rover.yaw;
      roverModel.root.rotation.x = rover.pitch;
      roverModel.root.rotation.z = rover.roll;

      // Wheels animation
      updateRoverModelVisuals(roverModel, rover.speed, rover.steeringAngle, dt, location);

      // 5. Update Sparks & Magnetic Shard Harvester
      const sparks = activeSparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        s.vy -= 9.8 * dt; // gravity
        if (s.life <= 0) {
          sparkGroup.remove(s.mesh);
          s.mesh.geometry.dispose();
          sparks.splice(i, 1);
        }
      }

      // Magnetic shard attraction radius: 4.0 meters
      const shards = activeShardsRef.current;
      for (let i = shards.length - 1; i >= 0; i--) {
        const item = shards[i];
        const shard = item.shard;
        if (shard.collected) continue;

        const dx = rover.x - shard.x;
        const dy = (rover.y + 0.6) - shard.y;
        const dz = rover.z - shard.z;
        const distToRover = Math.hypot(dx, dy, dz);

        if (distToRover < 4.0) {
          // Accelerate toward rover magnetically
          const pullForce = 8.0 * dt;
          shard.x += (dx / distToRover) * pullForce;
          shard.y += (dy / distToRover) * pullForce;
          shard.z += (dz / distToRover) * pullForce;
          item.mesh.position.set(shard.x, shard.y, shard.z);

          // Collected if within 0.9m
          if (distToRover < 0.9) {
            shard.collected = true;
            sparkGroup.remove(item.mesh);
            item.mesh.geometry.dispose();
            shards.splice(i, 1);

            soundFx.playHarvest();
            cargoRef.current[shard.type] += 1;
            setCargo({ ...cargoRef.current });
          }
        }
      }

      // 6. Chase Camera Update
      const [fwdCamX, fwdCamZ] = getHeadingVector(rover.yaw);
      const camDist = 7.0;
      const camHeight = 3.6;
      const targetCamX = rover.x - fwdCamX * camDist;
      const targetCamY = rover.y + camHeight;
      const targetCamZ = rover.z - fwdCamZ * camDist;

      // Smooth camera interpolation
      camera.position.x += (targetCamX - camera.position.x) * Math.min(1, 6.0 * dt);
      camera.position.y += (targetCamY - camera.position.y) * Math.min(1, 6.0 * dt);
      camera.position.z += (targetCamZ - camera.position.z) * Math.min(1, 6.0 * dt);
      camera.lookAt(rover.x, rover.y + 1.2, rover.z);

      // 7. Base Distance & Bearing Telemetry
      const distBase = getDistanceToBase(rover.x, rover.z);
      const bearingBase = getBearingToBase(rover.x, rover.z, rover.yaw);

      setSpeed(rover.speed);
      setDistanceToBase(distBase);
      setBearingToBase(bearingBase);
      setIsDockingZone(distBase <= 10.0);

      // Render Three.js Scene
      if (renderer) {
        renderer.render(scene, camera);
      }
    };

    animFrameId = requestAnimationFrame(gameTick);

    // 11. Cleanup and Teardown on Unmount
    return () => {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (synthRef.current) {
        synthRef.current.close();
      }

      // Strict Three.js resource disposal
      if (container && renderer?.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      disposeThreeObject(scene);
      disposeRenderer(renderer);
    };
  }, [location]);

  return (
    <div className="relative w-full h-[75vh] sm:h-[80vh] bg-black rounded-3xl overflow-hidden border-2 border-cyan-500/60 shadow-[0_0_60px_rgba(6,182,212,0.3)]">
      {/* Three.js WebGL Container */}
      <div 
        ref={containerRef} 
        tabIndex={0}
        aria-label={lang === 'es' ? 'Simulador de conducción 3D del Rover' : '3D Rover Driving Simulator'}
        className="w-full h-full cursor-crosshair focus:outline-none" 
        onClick={triggerLaserFire} 
      />

      {/* High-Tech HUD Layer */}
      <RoverHUD
        speed={speed}
        batteryPct={batteryPct}
        cargo={cargo}
        distanceToBase={distanceToBase}
        bearingToBase={bearingToBase}
        targetName={lang === 'es' ? activeTarget.nameEs : activeTarget.nameEn}
        targetIcon={activeTarget.icon}
        location={location}
        lang={lang}
        isDockingZone={isDockingZone}
        laserCooldownPct={laserCooldownPct}
        onFireLaser={triggerLaserFire}
        onDock={() => finishSortie(true)}
        onAbort={() => finishSortie(false)}
        onControlChange={handleControlChange}
        onResetVehicle={handleResetVehicle}
      />

      {/* Exciting Geological Sample Discovery Banner */}
      {sampleDiscoveryBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-emerald-950/95 via-slate-900/95 to-emerald-950/95 border-2 border-emerald-400 text-white px-5 py-3 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.6)] backdrop-blur-md animate-bounce flex items-center gap-3.5 pointer-events-none">
          <span className="text-3xl shrink-0">{sampleDiscoveryBanner.visuals.icon}</span>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-300">
              {lang === 'es' ? '¡NUEVA MUESTRA GEOLÓGICA EXTRAÍDA!' : 'NEW GEOLOGICAL SPECIMEN EXTRACTED!'}
            </span>
            <span className="text-sm font-black text-white">
              {lang === 'es' ? sampleDiscoveryBanner.nameEs : sampleDiscoveryBanner.nameEn}
            </span>
            <span className="text-[11px] text-cyan-300 font-mono">
              +{sampleDiscoveryBanner.stackingBonus.scienceBonusPct}% {lang === 'es' ? 'Ciencia' : 'Sci'} · +{sampleDiscoveryBanner.stackingBonus.moraleBonus} {lang === 'es' ? 'Moral' : 'Morale'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
