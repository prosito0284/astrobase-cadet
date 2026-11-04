import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BaseLocation, BaseModule } from '../../types/game';
import { buildSpaceBase3D, Base3DSceneResult } from './base3DBuilder';
import { createParticleSystems, ParticleController } from './particleSystems';
import { disposeRenderer, safeCancelAnimationFrame } from './disposal';
import { soundFx } from '../../utils/audio';
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  ShieldAlert, 
  Wind, 
  Info,
  Maximize2
} from 'lucide-react';

export interface BaseScene3DProps {
  location: BaseLocation;
  modules: BaseModule[];
  radiationActive: boolean;
  dustStormActive: boolean;
  isLunarNight: boolean;
  wiringErrorActive?: boolean;
  emergencyO2Active?: boolean;
  assignedToMineCount?: number;
  onSelectModule: (moduleId: string) => void;
  selectedModuleId: string | null;
  lang: 'es' | 'en';
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
  assignedToMineCount = 0,
  onSelectModule,
  selectedModuleId,
  lang,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState<boolean>(false);

  // References for render loop & controls
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const builderRef = useRef<Base3DSceneResult | null>(null);
  const particlesRef = useRef<ParticleController | null>(null);
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
      assignedToMineCount,
      modules,
    };
  }, [radiationActive, dustStormActive, isLunarNight, wiringErrorActive, emergencyO2Active, assignedToMineCount, modules]);

  // Handle camera preset transition
  const applyPreset = useCallback((preset: ModuleCameraPreset) => {
    soundFx.playClick();
    const s = cameraState.current;
    s.targetTheta = preset.theta;
    s.targetPhi = preset.phi;
    s.targetRadius = preset.radius;
    if (preset.id !== 'overview') {
      onSelectModule(preset.id);
    }
  }, [onSelectModule]);

  // Main Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(location === 'moon' ? 0x020617 : 0x1c0c04);
    if (location === 'mars') {
      scene.fog = new THREE.FogExp2(0x451a03, 0.012);
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
        const hits = raycaster.intersectObjects(builder.interactiveObjects, true);

        if (hits.length > 0) {
          let topObj: THREE.Object3D | null = hits[0].object;
          let modId: string | null = null;
          while (topObj && topObj !== builder.group) {
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
        const hits = raycaster.intersectObjects(builder.interactiveObjects, true);

        if (hits.length > 0) {
          let topObj: THREE.Object3D | null = hits[0].object;
          let clickedModuleId: string | null = null;
          while (topObj && topObj !== builder.group) {
            if (topObj.userData && topObj.userData.moduleId) {
              clickedModuleId = topObj.userData.moduleId;
              break;
            }
            topObj = topObj.parent;
          }
          if (clickedModuleId) {
            soundFx.playClick();
            onSelectModule(clickedModuleId);
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = cameraState.current;
      const zoomDelta = e.deltaY * 0.02;
      s.targetRadius = Math.max(s.minRadius, Math.min(s.maxRadius, s.targetRadius + zoomDelta));
    };

    // Touch pinch-to-zoom
    const handleTouchMove = (e: TouchEvent) => {
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

        // Update 3D base structures & animations
        builder.update(dt, dynamicStateRef.current);

        // Update particle storms
        particles.update(
          dt,
          dynamicStateRef.current.dustStormActive,
          dynamicStateRef.current.radiationActive
        );

        // Dynamic fog adaptation during dust storm
        if (location === 'mars' && scene.fog) {
          const targetFogHex = dynamicStateRef.current.dustStormActive ? 0x9a3412 : 0x451a03;
          (scene.fog as THREE.FogExp2).color.setHex(targetFogHex);
        }

        // Render frame
        renderer.render(scene, camera);

        rafIdRef.current = requestAnimationFrame(tick);
      };

      rafIdRef.current = requestAnimationFrame(tick);
    }

    startRenderLoop();

    // Cleanup on unmount or location change
    return () => {
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

      builder.dispose();
      particles.dispose();
      disposeRenderer(renderer);

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      builderRef.current = null;
      particlesRef.current = null;
    };
  }, [location, onSelectModule]);

  // Selected module lookup
  const activeModuleData = modules.find(m => m.id === (hoveredModuleId || selectedModuleId));

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-[380px] sm:h-[460px] md:h-[500px] overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing"
    >
      {/* 3D WebGL Canvas */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block outline-none"
      />

      {/* Context Loss Alert */}
      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md text-amber-200">
          <div className="flex flex-col items-center gap-2 text-center p-6 rounded-2xl border border-amber-500/50">
            <ShieldAlert className="w-8 h-8 text-amber-400 animate-pulse" />
            <span className="font-bold text-sm">
              {lang === 'es' ? 'Contexto WebGL Suspendido' : 'WebGL Context Suspended'}
            </span>
            <span className="text-xs text-slate-300">
              {lang === 'es' ? 'Recuperando aceleración gráfica...' : 'Restoring graphic acceleration...'}
            </span>
          </div>
        </div>
      )}

      {/* Space Weather Alert Badges (Top Left) */}
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

      {/* Camera Controls & Presets Bar (Top Right) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/80 p-1.5 rounded-xl backdrop-blur-md shadow-xl">
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

      {/* Preset Quick Tabs (Floating along top edge) */}
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

      {/* Interactive Raycast Inspection Bar (Bottom Floating HUD) */}
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
    </div>
  );
};
