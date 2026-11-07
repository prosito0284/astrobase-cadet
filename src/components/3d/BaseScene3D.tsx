import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BaseLocation, BaseModule } from '../../types/game';
import { buildSpaceBase3D, Base3DSceneResult } from './base3DBuilder';
import { createParticleSystems, ParticleController } from './particleSystems';
import { createDamageParticleSystems, DamageParticleSystem } from './damageParticles';
import { disposeRenderer, safeCancelAnimationFrame, disposeThreeObject } from './disposal';
import { soundFx, evaBreathing } from '../../utils/audio';
import { HelmetHUD } from './HelmetHUD';
import { 
  EvaControllerState, 
  updateEvaMovement, 
  updateEvaMouseLook, 
  normalizeCompassDegrees, 
  EVA_SPAWN_POINT 
} from './evaControls';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  ShieldAlert, 
  Wind, 
  Info, 
  Maximize2, 
  LayoutGrid,
  User,
  Building2,
  Microscope
} from 'lucide-react';
import { BaseBuildingId } from '../../types/game';
import { 
  BUILDING_CATALOG, 
  buildExpansionBuildingMesh, 
  createExpansionBuildingMesh,
  updateExpansionBuildings, 
  disposeExpansionBuildings,
  EXPANSION_COLLIDER_RADII
} from './baseBuildingBuilder';
import { setExpansionColliders, clearExpansionColliders, DomeCollider } from './evaControls';
import { getTerrainHeight } from './base3DBuilder';

/**
 * Pide "pointer lock" sin dejar promesas rechazadas sin manejar: en navegadores
 * modernos requestPointerLock() devuelve una promesa que falla si no hubo un gesto
 * del usuario (y try/catch no la atrapa).
 */
function lockPointer(el: HTMLElement | null) {
  try {
    const p = el?.requestPointerLock?.() as unknown;
    if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => { /* sin pointer lock: se puede mirar arrastrando */ });
  } catch { /* navegador sin soporte */ }
}

export interface BaseScene3DProps {
  location: BaseLocation;
  modules: BaseModule[];
  radiationActive: boolean;
  dustStormActive: boolean;
  isLunarNight: boolean;
  wiringErrorActive?: boolean;
  emergencyO2Active?: boolean;
  batteryFaultActive?: boolean;
  assignedToMineCount?: number;
  oxygenPct?: number;
  onSelectModule: (moduleId: string) => void;
  selectedModuleId: string | null;
  lang: 'es' | 'en';
  onSwitchTo2D?: () => void;
  onTriggerRepair?: (crisisType: 'battery' | 'o2' | 'solar_storm', moduleId: string) => void;
  builtBuildings?: BaseBuildingId[];
  onOpenBuildingMenu?: () => void;
  onOpenGeologicalCabinet?: () => void;
}

interface ModuleCameraPreset {
  id: string;
  nameEs: string;
  nameEn: string;
  theta: number;
  phi: number;
  radius: number;
}

const CAMERA_PRESETS: ModuleCameraPreset[] = [
  { id: 'overview', nameEs: 'Vista General', nameEn: 'Overview', theta: 0.78, phi: 1.05, radius: 28 },
  { id: 'regolith_shield', nameEs: 'Domo Central', nameEn: 'Central Dome', theta: 0.0, phi: 1.15, radius: 18 },
  { id: 'greenhouse', nameEs: 'Invernadero', nameEn: 'Greenhouse', theta: 2.1, phi: 1.1, radius: 20 },
  { id: 'solar_farm', nameEs: 'Paneles Solares', nameEn: 'Solar Farm', theta: -2.3, phi: 1.1, radius: 20 },
  { id: 'comm_array', nameEs: 'Antena DSN', nameEn: 'DSN Antenna', theta: -0.9, phi: 1.15, radius: 20 },
  { id: 'water_ice_extractor', nameEs: 'Mina de Hielo', nameEn: 'Ice Mine', theta: 0.9, phi: 1.15, radius: 20 },
];

export const BaseScene3D: React.FC<BaseScene3DProps> = ({
  location,
  modules,
  radiationActive,
  dustStormActive,
  isLunarNight,
  wiringErrorActive = false,
  emergencyO2Active = false,
  batteryFaultActive = false,
  assignedToMineCount = 0,
  oxygenPct = 95,
  onSelectModule,
  selectedModuleId,
  lang,
  onSwitchTo2D,
  onTriggerRepair,
  builtBuildings = [],
  onOpenBuildingMenu,
  onOpenGeologicalCabinet,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [webGlError, setWebGlError] = useState<string | null>(null);
  const [canvasKey, setCanvasKey] = useState<number>(0);

  // Expansion buildings refs
  const expansionGroupRef = useRef<THREE.Group | null>(null);
  const interactiveExpansionsRef = useRef<THREE.Object3D[]>([]);

  // EVA First-Person Mode State
  const [isEvaMode, setIsEvaMode] = useState<boolean>(false);
  const [cameraYawDeg, setCameraYawDeg] = useState<number>(0);
  const isEvaModeRef = useRef<boolean>(false);
  const evaStateRef = useRef<EvaControllerState>({
    x: EVA_SPAWN_POINT.x,
    y: EVA_SPAWN_POINT.y,
    z: EVA_SPAWN_POINT.z,
    yaw: EVA_SPAWN_POINT.yaw,
    pitch: EVA_SPAWN_POINT.pitch,
    isMoving: false,
    isSprinting: false,
    walkBobPhase: 0,
  });
  const keysPressedRef = useRef<Record<string, boolean>>({});

  // Stable callback ref to avoid tearing down Three.js scene on every App render
  const onSelectModuleRef = useRef(onSelectModule);
  useEffect(() => {
    onSelectModuleRef.current = onSelectModule;
  }, [onSelectModule]);

  const onTriggerRepairRef = useRef(onTriggerRepair);
  useEffect(() => {
    onTriggerRepairRef.current = onTriggerRepair;
  }, [onTriggerRepair]);

  // References for render loop & controls
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const builderRef = useRef<Base3DSceneResult | null>(null);
  const particlesRef = useRef<ParticleController | null>(null);
  const damageParticlesRef = useRef<DamageParticleSystem | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Orbit camera state (Spherical coords)
  const cameraState = useRef({
    radius: 28,
    targetRadius: 28,
    theta: 0.78, // azimuth angle
    targetTheta: 0.78,
    phi: 1.05,   // polar angle (clamped [0.2, 1.45])
    targetPhi: 1.05,
    minRadius: 14,
    maxRadius: 48,
    minPhi: 0.22, // ~13 deg above horizon
    maxPhi: 1.45, // ~83 deg
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartTheta: 0.78,
    dragStartPhi: 1.05,
    totalDragDist: 0,
    touchPinchDist: 0,
  });

  // State mirror ref for animation ticks
  const dynamicStateRef = useRef({
    radiationActive,
    dustStormActive,
    isLunarNight,
    wiringErrorActive,
    emergencyO2Active,
    batteryFaultActive,
    assignedToMineCount,
    modules,
  });

  useEffect(() => {
    dynamicStateRef.current = {
      radiationActive,
      dustStormActive,
      isLunarNight,
      wiringErrorActive,
      emergencyO2Active,
      batteryFaultActive,
      assignedToMineCount,
      modules,
    };
  }, [radiationActive, dustStormActive, isLunarNight, wiringErrorActive, emergencyO2Active, batteryFaultActive, assignedToMineCount, modules]);

  // Handle camera preset transition
  const applyPreset = useCallback((preset: ModuleCameraPreset) => {
    soundFx.playClick();
    const s = cameraState.current;
    s.targetTheta = preset.theta;
    s.targetPhi = preset.phi;
    s.targetRadius = preset.radius;
    if (preset.id !== 'overview') {
      onSelectModuleRef.current(preset.id);
    }
  }, []);

  // Enter EVA mode: spawn at airlock portal (0, 5.5) and request pointer lock
  const handleEnterEva = useCallback(() => {
    soundFx.playClick();
    setIsEvaMode(true);
    isEvaModeRef.current = true;
    evaBreathing.start();
    evaStateRef.current = {
      x: EVA_SPAWN_POINT.x,
      y: EVA_SPAWN_POINT.y,
      z: EVA_SPAWN_POINT.z,
      yaw: EVA_SPAWN_POINT.yaw,
      pitch: EVA_SPAWN_POINT.pitch,
      isMoving: false,
      isSprinting: false,
      walkBobPhase: 0,
    };
    cameraState.current.isDragging = false;

    if (canvasRef.current) {
      try {
        lockPointer(canvasRef.current);
      } catch {
        // Fallback if browser requires gesture or unsupported
      }
    }
  }, []);

  // Exit EVA mode: release pointer lock and restore smooth orbit camera presets
  const handleExitEva = useCallback(() => {
    soundFx.playClick();
    setIsEvaMode(false);
    isEvaModeRef.current = false;
    evaBreathing.stop();

    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Safe ignore
      }
    }

    const s = cameraState.current;
    s.targetRadius = 28;
    s.targetPhi = 1.05;
    s.targetTheta = 0.78;
    s.isDragging = false;
  }, []);

  // Window keyboard listener for WASD movement & Esc exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      keysPressedRef.current[e.code] = true;
      keysPressedRef.current[e.key] = true;

      if (e.key === 'Escape' && isEvaModeRef.current) {
        handleExitEva();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
      keysPressedRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleExitEva]);

  // Main Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(location === 'moon' ? 0x000000 : 0x451a03);
    if (location === 'mars') {
      scene.fog = new THREE.FogExp2(0x451a03, 0.012);
    } else {
      scene.fog = null; // Hard vacuum on Moon
    }
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 300);
    cameraRef.current = camera;

    // 3. Renderer with antialias and shadow maps
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      rendererRef.current = renderer;
    } catch (err) {
      console.warn('WebGL initialization failed:', err);
      setWebGlError(err instanceof Error ? err.message : 'Error al inicializar WebGL');
      return;
    }

    // 4. Build Space Base
    const builder = buildSpaceBase3D(location);
    builderRef.current = builder;
    scene.add(builder.group);

    // 5. Particle Systems
    const particles = createParticleSystems(location);
    particlesRef.current = particles;
    scene.add(particles.group);

    // 5B. Damage & Crisis Particle Systems (Sprint 3)
    const moduleCoordinates: Record<string, THREE.Vector3> = {
      solar_farm: new THREE.Vector3(-8.5, 0, -5.5),
      regolith_shield: new THREE.Vector3(0, 0, 0),
      magnetic_shield: new THREE.Vector3(0, 0, 0),
      greenhouse: new THREE.Vector3(8.5, 0, -4.5),
      comm_array: new THREE.Vector3(-8.0, 0, 6.5),
      water_ice_extractor: new THREE.Vector3(8.0, 0, 6.5),
      storm_bunker: new THREE.Vector3(0, 0, 10.5),
    };
    const damageParticles = createDamageParticleSystems(moduleCoordinates);
    damageParticlesRef.current = damageParticles;
    scene.add(damageParticles.group);

    // 5C. Procedural Base Expansion Buildings (Sprint 5)
    const expansionGroup = new THREE.Group();
    expansionGroup.name = 'expansion_buildings_group';
    scene.add(expansionGroup);
    expansionGroupRef.current = expansionGroup;
    interactiveExpansionsRef.current = [];

    // 6. Raycaster
    const raycaster = new THREE.Raycaster();
    const mouseNdc = new THREE.Vector2();

    // Context Loss Handlers
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    const handleContextRestored = () => {
      setContextLost(false);
      // Restart loop
      startRenderLoop();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    // Pointer & Gesture Controls
    const handlePointerDown = (e: PointerEvent) => {
      if (isEvaModeRef.current) {
        // In EVA mode, clicking the canvas requests pointer lock
        if (canvas && typeof document !== 'undefined' && document.pointerLockElement !== canvas) {
          try {
            lockPointer(canvas);
          } catch {
            // Pointerlock fallback
          }
        }
        return;
      }

      const s = cameraState.current;
      s.isDragging = true;
      s.dragStartX = e.clientX;
      s.dragStartY = e.clientY;
      s.dragStartTheta = s.targetTheta;
      s.dragStartPhi = s.targetPhi;
      s.totalDragDist = 0;
      canvas.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isEvaModeRef.current) {
        // In EVA mode, mouse movement turns camera look
        const isLocked = typeof document !== 'undefined' && document.pointerLockElement === canvas;
        if (isLocked || e.buttons > 0) {
          updateEvaMouseLook(evaStateRef.current, e.movementX, e.movementY);
        }
        return;
      }

      const s = cameraState.current;
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      // Update NDC for raycast
      mouseNdc.x = (currentX / rect.width) * 2 - 1;
      mouseNdc.y = -(currentY / rect.height) * 2 + 1;

      if (s.isDragging) {
        const dx = e.clientX - s.dragStartX;
        const dy = e.clientY - s.dragStartY;
        s.totalDragDist += Math.sqrt(dx * dx + dy * dy);

        // Orbit rotation sensitivity
        s.targetTheta = s.dragStartTheta - dx * 0.008;
        s.targetPhi = Math.max(s.minPhi, Math.min(s.maxPhi, s.dragStartPhi - dy * 0.008));
      } else {
        // Hover Raycast
        raycaster.setFromCamera(mouseNdc, camera);
        const damageHoverHits = raycaster.intersectObjects(damageParticles.getDamagedModuleMeshes(), true);
        const candidateObjects = [...builder.interactiveObjects, ...interactiveExpansionsRef.current];
        const hits = raycaster.intersectObjects(candidateObjects, true);

        if (damageHoverHits.length > 0 && damageHoverHits[0].object.userData?.moduleId) {
          setHoveredModuleId(damageHoverHits[0].object.userData.moduleId);
          canvas.style.cursor = 'pointer';
        } else if (hits.length > 0) {
          let topObj: THREE.Object3D | null = hits[0].object;
          let modId: string | null = null;
          while (topObj && topObj !== builder.group && topObj !== expansionGroupRef.current) {
            if (topObj.userData && topObj.userData.moduleId) {
              modId = topObj.userData.moduleId;
              break;
            }
            topObj = topObj.parent;
          }
          if (modId) {
            setHoveredModuleId(modId);
            canvas.style.cursor = 'pointer';
          }
        } else {
          setHoveredModuleId(null);
          canvas.style.cursor = 'grab';
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isEvaModeRef.current) return;

      const s = cameraState.current;
      s.isDragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer might already be released
      }

      // If drag distance was minimal (< 6px), trigger click interaction
      if (s.totalDragDist < 6) {
        const rect = canvas.getBoundingClientRect();
        mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseNdc, camera);

        const isBatteryCrisis = Boolean(
          dynamicStateRef.current.wiringErrorActive || dynamicStateRef.current.batteryFaultActive
        );
        const isO2Crisis = Boolean(dynamicStateRef.current.emergencyO2Active);
        const isStormCrisis = Boolean(dynamicStateRef.current.radiationActive);

        // Check tactile click on damage meshes first
        const damageHits = raycaster.intersectObjects(damageParticles.getDamagedModuleMeshes(), true);
        let handledDamageClick = false;

        if (damageHits.length > 0) {
          const hitObj = damageHits[0].object;
          const { moduleId, crisisType } = hitObj.userData || {};
          const isCrisisActive =
            (crisisType === 'battery' && isBatteryCrisis) ||
            (crisisType === 'o2' && isO2Crisis) ||
            (crisisType === 'solar_storm' && isStormCrisis);

          if (isCrisisActive && crisisType && moduleId) {
            soundFx.playAlert();
            onTriggerRepairRef.current?.(crisisType, moduleId);
            onSelectModuleRef.current(moduleId);
            handledDamageClick = true;
          }
        }

        if (!handledDamageClick) {
          const candidateObjects = [...builder.interactiveObjects, ...interactiveExpansionsRef.current];
          const hits = raycaster.intersectObjects(candidateObjects, true);

          if (hits.length > 0) {
            let topObj: THREE.Object3D | null = hits[0].object;
            let clickedModuleId: string | null = null;
            while (topObj && topObj !== builder.group && topObj !== expansionGroupRef.current) {
              if (topObj.userData && topObj.userData.moduleId) {
                clickedModuleId = topObj.userData.moduleId;
                break;
              }
              topObj = topObj.parent;
            }
            if (clickedModuleId) {
              if (clickedModuleId === 'solar_farm' && isBatteryCrisis) {
                soundFx.playAlert();
                onTriggerRepairRef.current?.('battery', 'solar_farm');
              } else if (clickedModuleId === 'regolith_shield' && isO2Crisis) {
                soundFx.playAlert();
                onTriggerRepairRef.current?.('o2', 'regolith_shield');
              } else if (
                (clickedModuleId === 'magnetic_shield' || clickedModuleId === 'storm_bunker') &&
                isStormCrisis
              ) {
                soundFx.playAlert();
                onTriggerRepairRef.current?.('solar_storm', clickedModuleId);
              } else {
                soundFx.playClick();
              }
              onSelectModuleRef.current(clickedModuleId);
            }
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (isEvaModeRef.current) return;
      e.preventDefault();
      const s = cameraState.current;
      const zoomDelta = e.deltaY * 0.02;
      s.targetRadius = Math.max(s.minRadius, Math.min(s.maxRadius, s.targetRadius + zoomDelta));
    };

    // Touch pinch-to-zoom
    const handleTouchMove = (e: TouchEvent) => {
      if (isEvaModeRef.current) return;
      if (e.touches.length === 2) {
        e.preventDefault();
        const s = cameraState.current;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (s.touchPinchDist > 0) {
          const pinchDelta = (s.touchPinchDist - dist) * 0.08;
          s.targetRadius = Math.max(s.minRadius, Math.min(s.maxRadius, s.targetRadius + pinchDelta));
        }
        s.touchPinchDist = dist;
      }
    };

    const handleTouchEnd = () => {
      if (isEvaModeRef.current) return;
      cameraState.current.touchPinchDist = 0;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        }
      }
    });
    resizeObserver.observe(container);

    // Clock and Animation Loop
    const clock = new THREE.Clock();

    function startRenderLoop() {
      const targetLookAt = new THREE.Vector3(0, 1.8, 0);

      const tick = () => {
        // Delta time clamping against background tab jumps
        const rawDt = clock.getDelta();
        const dt = Math.min(rawDt, 0.1);

        if (isEvaModeRef.current) {
          // Update EVA First-Person Kinematics
          const eva = evaStateRef.current;
          updateEvaMovement(dt, eva, keysPressedRef.current, location);

          // Update pressurized breathing audio cadence
          evaBreathing.updateCadence(eva.isMoving, eva.isSprinting, oxygenPct);

          // Update camera position & orientation
          camera.position.set(eva.x, eva.y, eva.z);
          camera.rotation.order = 'YXZ';
          camera.rotation.set(eva.pitch, eva.yaw, 0, 'YXZ');

          // Update heading for Helmet HUD
          const deg = normalizeCompassDegrees(eva.yaw);
          setCameraYawDeg(deg);
        } else {
          // Smooth camera damping
          const s = cameraState.current;
          s.radius += (s.targetRadius - s.radius) * Math.min(1, dt * 8.0);
          s.theta += (s.targetTheta - s.theta) * Math.min(1, dt * 8.0);
          s.phi += (s.targetPhi - s.phi) * Math.min(1, dt * 8.0);

          // Compute camera cartesian position from spherical
          const cx = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
          const cy = s.radius * Math.cos(s.phi);
          const cz = s.radius * Math.sin(s.phi) * Math.cos(s.theta);

          camera.position.set(cx, cy, cz);
          camera.lookAt(targetLookAt);
        }

        try {
          // Update 3D base structures & animations (including diurnal solar cycle)
          builder.update(dt, dynamicStateRef.current, scene);

          // Update particle storms
          particles.update(
            dt,
            dynamicStateRef.current.dustStormActive,
            dynamicStateRef.current.radiationActive
          );

          // Update damage & crisis particle systems (Sprint 3)
          damageParticles.update(dt, {
            batteryFailure: Boolean(
              dynamicStateRef.current.wiringErrorActive || dynamicStateRef.current.batteryFaultActive
            ),
            o2Leak: Boolean(dynamicStateRef.current.emergencyO2Active),
            solarStorm: Boolean(dynamicStateRef.current.radiationActive),
          });

          // Dynamic fog adaptation during dust storm
          if (location === 'mars' && scene.fog && dynamicStateRef.current.dustStormActive) {
            (scene.fog as THREE.FogExp2).color.setHex(0x9a3412);
          }

          // Update expansion buildings animation (Sprint 5)
          updateExpansionBuildings(expansionGroup, dt, clock.getElapsedTime());

          // Render frame
          renderer.render(scene, camera);
        } catch (renderErr) {
          console.warn('3D render tick error:', renderErr);
        }

        rafIdRef.current = requestAnimationFrame(tick);
      };

      rafIdRef.current = requestAnimationFrame(tick);
    }

    startRenderLoop();

    // Cleanup on unmount or location change
    return () => {
      evaBreathing.stop();
      safeCancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;

      resizeObserver.disconnect();

      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      disposeExpansionBuildings(expansionGroup);
      clearExpansionColliders();
      interactiveExpansionsRef.current = [];
      expansionGroupRef.current = null;

      builder.dispose();
      particles.dispose();
      damageParticles.dispose();
      disposeRenderer(renderer);

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      builderRef.current = null;
      particlesRef.current = null;
      damageParticlesRef.current = null;
    };
  }, [location, canvasKey]);

  // Reactive Synchronization for Base Expansion Buildings (Sprint 5)
  // Dynamically materializes procedural 3D models and registers EVA colliders in real time without remounting.
  const builtBuildingsKey = (builtBuildings || []).slice().sort().join(',');

  useEffect(() => {
    const group = expansionGroupRef.current;
    if (!group) return;

    const targetList = (builtBuildings || []).filter(id => Boolean(BUILDING_CATALOG[id]));
    const targetSet = new Set<BaseBuildingId>(targetList);

    // 1. If any building in the group is no longer in builtBuildings (e.g. on reset/restart), recursively dispose and remove it
    const toRemove: THREE.Object3D[] = [];
    for (const child of group.children) {
      const bId = child.userData?.moduleId as BaseBuildingId;
      if (!bId || !targetSet.has(bId)) {
        toRemove.push(child);
      }
    }

    for (const child of toRemove) {
      group.remove(child);
      interactiveExpansionsRef.current = interactiveExpansionsRef.current.filter(m => m !== child);
      disposeThreeObject(child);
    }

    // 2. If a building in builtBuildings is not yet in expansionGroupRef.current, instantiate and add it
    const existingIds = new Set<BaseBuildingId>(
      group.children
        .map(c => c.userData?.moduleId as BaseBuildingId)
        .filter(Boolean)
    );

    for (const id of targetList) {
      if (existingIds.has(id)) continue;
      const def = BUILDING_CATALOG[id];
      if (!def) continue;

      const pos = def.defaultPosition;
      const mesh = createExpansionBuildingMesh(id, pos);
      const y = getTerrainHeight(pos[0], pos[2], location);
      mesh.position.set(pos[0], y, pos[2]);

      mesh.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      mesh.userData = {
        ...mesh.userData,
        moduleId: id,
        isExpansion: true,
        nameEs: def.nameEs,
        nameEn: def.nameEn,
      };

      interactiveExpansionsRef.current.push(mesh);
      group.add(mesh);
    }

    // 3. Update setExpansionColliders immediately so EVA collisions react dynamically
    const colliders: DomeCollider[] = [];
    for (const id of targetList) {
      const def = BUILDING_CATALOG[id];
      if (!def) continue;
      colliders.push({
        id: `exp_${id}`,
        name: def.nameEs,
        x: def.defaultPosition[0],
        z: def.defaultPosition[2],
        radius: EXPANSION_COLLIDER_RADII[id] || 3.5,
      });
    }
    setExpansionColliders(colliders);
  }, [builtBuildingsKey, location, canvasKey]);

  // Selected module lookup (includes active 3D base expansion buildings)
  const currentInspectId = hoveredModuleId || selectedModuleId;
  const expansionDef = currentInspectId && BUILDING_CATALOG[currentInspectId as BaseBuildingId];
  const activeModuleData = modules.find(m => m.id === currentInspectId) || (expansionDef ? {
    id: expansionDef.id,
    name: expansionDef.nameEn,
    nameEs: expansionDef.nameEs,
    description: expansionDef.descriptionEn,
    descriptionEs: expansionDef.descriptionEs,
    isActive: true,
    level: 1,
    maxLevel: 1,
    category: 'science' as const,
    icon: '🏗️',
    powerRequired: 0,
    oxygenDelta: expansionDef.effects.o2Delta || 0,
    waterDelta: 0,
    foodDelta: expansionDef.effects.foodDelta || 0,
    shieldDelta: 0,
    scienceDelta: 0,
    healthStatus: 100,
  } : null);

  const handleRetry3D = () => {
    soundFx.playClick();
    setWebGlError(null);
    setContextLost(false);
    setCanvasKey(k => k + 1);
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-[380px] sm:h-[460px] md:h-[500px] overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing"
    >
      {/* 3D WebGL Canvas */}
      <canvas 
        key={`${location}-${canvasKey}`}
        ref={canvasRef} 
        className="w-full h-full block outline-none"
      />

      {/* WebGL Error or Context Loss Fallback Card */}
      {(contextLost || webGlError) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md text-amber-200 p-4">
          <div className="flex flex-col items-center gap-3 text-center p-6 rounded-2xl border border-amber-500/50 bg-slate-900/90 max-w-md shadow-2xl">
            <ShieldAlert className="w-10 h-10 text-amber-400 animate-pulse" />
            <span className="font-bold text-base text-white">
              {lang === 'es' ? 'Gráficos 3D en Pausa' : '3D Graphics Suspended'}
            </span>
            <span className="text-xs text-slate-300">
              {lang === 'es' 
                ? 'El navegador pausó o no pudo inicializar el contexto WebGL. Puedes reintentar o usar la vista 2D clásica.'
                : 'Browser suspended or failed to initialize WebGL context. You can retry or switch to 2D view.'}
            </span>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleRetry3D}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-md shadow-cyan-600/30"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'es' ? 'Reintentar 3D' : 'Retry 3D'}</span>
              </button>
              {onSwitchTo2D && (
                <button
                  onClick={onSwitchTo2D}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-all"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{lang === 'es' ? 'Vista 2D Clásica' : '2D Classic'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Helmet HUD Overlay (Active in EVA Mode) */}
      {isEvaMode && (
        <HelmetHUD
          oxygenPct={oxygenPct}
          cameraYawDeg={cameraYawDeg}
          suitPressureKPa={29.6}
          suitTempC={21.0}
          heartRateBpm={72}
          radiationLevel={radiationActive ? 1.45 : 0.12}
          location={location}
          onExitEva={handleExitEva}
          lang={lang}
        />
      )}

      {/* Orbit Mode Space Weather Alert Badges (Top Left) */}
      {!isEvaMode && (
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
          {radiationActive && (
            <div className="flex items-center gap-2 bg-red-950/90 border border-red-500 text-red-200 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md animate-bounce">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="text-xs font-black">
                {lang === 'es' ? 'DONKI CME: RADIACIÓN SOLAR ALTA' : 'DONKI CME: HIGH SOLAR RADIATION'}
              </span>
            </div>
          )}

          {dustStormActive && (
            <div className="flex items-center gap-2 bg-amber-950/90 border border-amber-500 text-amber-200 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md animate-pulse">
              <Wind className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black">
                {lang === 'es' ? 'MEDA: TORMENTA DE POLVO ACTIVA' : 'MEDA: DUST STORM ACTIVE'}
              </span>
            </div>
          )}

          {location === 'moon' && isLunarNight && (
            <div className="flex items-center gap-2 bg-indigo-950/90 border border-indigo-400 text-indigo-200 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span className="text-xs font-black">
                {lang === 'es' ? 'NOCHE LUNAR (-180 °C)' : 'LUNAR NIGHT (-180 °C)'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Camera Controls & EVA Walk Button Bar (Top Right) */}
      {!isEvaMode && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {/* 🏗️ Base Building Expansion Button */}
          {onOpenBuildingMenu && (
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenBuildingMenu();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/50 border border-cyan-400/40 transition-all active:scale-95 group"
              title={lang === 'es' ? 'Expansión de Base 3D' : 'Base Expansion 3D'}
            >
              <Building2 className="w-3.5 h-3.5 text-cyan-200 group-hover:scale-110 transition-transform" />
              <span>{lang === 'es' ? '🏗️ Expansión de Base' : '🏗️ Base Building'}</span>
            </button>
          )}

          {/* 🔬 NASA Astromaterials Geological Cabinet Button */}
          {onOpenGeologicalCabinet && (
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenGeologicalCabinet();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all active:scale-95 group"
              title={lang === 'es' ? 'Gabinete de Muestras Geológicas de la NASA' : 'NASA Geological Specimen Cabinet'}
            >
              <Microscope className="w-3.5 h-3.5 text-emerald-200 group-hover:scale-110 transition-transform" />
              <span>{lang === 'es' ? '🔬 Gabinete de Muestras' : '🔬 Sample Cabinet'}</span>
            </button>
          )}

          {/* 👨🚀 Primary EVA First-Person Walk Button */}
          <button
            onClick={handleEnterEva}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all active:scale-95 group"
            title={lang === 'es' ? 'Salir a EVA (Cámara Astronauta en 1ª Persona)' : 'Enter EVA (1st Person Astronaut Camera)'}
          >
            <User className="w-3.5 h-3.5 text-emerald-200 group-hover:scale-110 transition-transform" />
            <span>{lang === 'es' ? '👨🚀 Salir a EVA (1ª Persona)' : '👨🚀 Enter EVA (1st Person)'}</span>
          </button>

          {/* Orbit Camera Zoom & Reset Controls */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/80 p-1.5 rounded-xl backdrop-blur-md shadow-xl">
            <button
              onClick={() => {
                soundFx.playClick();
                const s = cameraState.current;
                s.targetRadius = Math.max(s.minRadius, s.targetRadius - 4);
              }}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={lang === 'es' ? 'Acercar Zoom' : 'Zoom In'}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                const s = cameraState.current;
                s.targetRadius = Math.min(s.maxRadius, s.targetRadius + 4);
              }}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={lang === 'es' ? 'Alejar Zoom' : 'Zoom Out'}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => applyPreset(CAMERA_PRESETS[0])}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-300 transition-colors"
              title={lang === 'es' ? 'Restablecer Cámara 360°' : 'Reset 360° Camera'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Preset Quick Tabs (Floating along top edge) */}
      {!isEvaMode && (
        <div className="absolute top-14 right-3 z-20 hidden sm:flex flex-col gap-1 items-end pointer-events-auto">
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg border backdrop-blur-md transition-all ${
                selectedModuleId === preset.id
                  ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {lang === 'es' ? preset.nameEs : preset.nameEn}
            </button>
          ))}
        </div>
      )}

      {/* Interactive Raycast Inspection Bar (Bottom Floating HUD) */}
      {!isEvaMode && (
        <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-20 flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-300 shrink-0">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="flex flex-col truncate">
              {activeModuleData ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-cyan-300 truncate">
                      {lang === 'es' ? activeModuleData.nameEs : activeModuleData.name}
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                      activeModuleData.isActive ? 'bg-emerald-950 border border-emerald-500 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {activeModuleData.isActive ? (lang === 'es' ? 'ACTIVO' : 'ONLINE') : (lang === 'es' ? 'APAGADO' : 'OFFLINE')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-300 truncate">
                    {lang === 'es' ? activeModuleData.descriptionEs : activeModuleData.description}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-slate-200">
                    {location === 'moon' ? 'Base Shackleton 3D (Luna)' : 'Base Jezero 3D (Marte)'}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                    {lang === 'es' 
                      ? 'Arrastra para rotar en 360°, rueda/pellizca para zoom, o haz clic en cualquier módulo para operar.'
                      : 'Drag to rotate 360°, wheel/pinch to zoom, or click any module to inspect.'}
                  </span>
                </>
              )}
            </div>
          </div>

          {activeModuleData && (
            <button
              onClick={() => {
                soundFx.playClick();
                onSelectModule(activeModuleData.id);
              }}
              className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg shadow-cyan-600/30 transition-all active:scale-95"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{lang === 'es' ? 'Inspeccionar' : 'Inspect'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
