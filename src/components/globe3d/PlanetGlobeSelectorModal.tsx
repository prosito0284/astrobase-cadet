import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BaseLocation } from '../../types/game';
import { 
  createPlanetGlobeMesh, 
  createAtmosphericGlowMesh, 
  createLandingBeaconMarker, 
  LandingMarker3D,
  LANDING_SITES 
} from './globeShaders';
import { disposeRenderer, disposeThreeObject, safeCancelAnimationFrame } from '../3d/disposal';
import { soundFx } from '../../utils/audio';
import { 
  X, 
  Compass, 
  RotateCcw, 
  Rocket, 
  Sparkles, 
  ShieldAlert, 
  Thermometer, 
  Radio, 
  Layers,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

export interface PlanetGlobeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: BaseLocation;
  onSelectLocation: (loc: BaseLocation) => void;
  lang: 'es' | 'en';
}

export const PlanetGlobeSelectorModal: React.FC<PlanetGlobeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
  lang,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<BaseLocation>(currentLocation);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References for Three.js instance
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markerRef = useRef<LandingMarker3D | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Globe interaction state: rotation, damping, inertia
  const interactionRef = useRef({
    rotationY: 0,
    rotationX: 0,
    targetRotY: 0,
    targetRotX: 0,
    velY: 0.002, // idle auto-spin velocity
    velX: 0,
    isDragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    zoomDist: 10.5,
    targetZoomDist: 10.5,
    minZoom: 6.5,
    maxZoom: 18.0,
    lastInteractTime: Date.now(),
  });

  // Sync selected location when modal opens or currentLocation changes
  useEffect(() => {
    if (isOpen) {
      setSelectedLocation(currentLocation);
    }
  }, [isOpen, currentLocation]);

  // Focus on landing site marker smoothly
  const focusLandingSite = useCallback((loc: BaseLocation) => {
    soundFx.playClick();
    const site = LANDING_SITES[loc];
    const s = interactionRef.current;

    // Calculate rotation angles to orient landing site towards viewer (+Z axis)
    // Longitude: +lon rotates to +Z -> targetRotY = - (lonRad)
    const lonRad = (site.lonDeg * Math.PI) / 180;
    const latRad = (site.latDeg * Math.PI) / 180;

    s.targetRotY = -lonRad;
    // For latitude: tilt globe so lat faces camera:
    s.targetRotX = latRad * 0.75;
    s.velY = 0;
    s.velX = 0;
    s.lastInteractTime = Date.now();
  }, []);

  // Initialize and rebuild 3D globe scene whenever selectedLocation or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200);
    camera.position.set(0, 0, interactionRef.current.zoomDist);
    cameraRef.current = camera;

    // 3. Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      rendererRef.current = renderer;
    } catch (err) {
      console.warn('WebGL init failed in PlanetGlobeSelectorModal:', err);
      return;
    }

    // 4. Starfield Background
    const starCount = 800;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 60 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.6,
      sizeAttenuation: true,
    });
    const starField = new THREE.Points(starGeom, starMat);
    scene.add(starField);

    // 5. Lighting: Ambient + High-contrast Directional Sun
    const ambientLight = new THREE.AmbientLight(0x334155, 0.45);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(20, 8, 15);
    scene.add(sunLight);

    // 6. Planet Globe Group (contains globe mesh, atmosphere, landing beacon)
    const globeGroup = new THREE.Group();
    globeGroup.name = 'planet_globe_group';
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    const planetRadius = 3.6;

    // Globe Mesh
    const globeMesh = createPlanetGlobeMesh(selectedLocation, planetRadius);
    globeGroup.add(globeMesh);

    // Atmosphere Glow
    const atmosphereGlow = createAtmosphericGlowMesh(selectedLocation, planetRadius);
    globeGroup.add(atmosphereGlow);

    // 3D Pulsing Landing Beacon Marker
    const landingMarker = createLandingBeaconMarker(selectedLocation, planetRadius);
    globeGroup.add(landingMarker.group);
    markerRef.current = landingMarker;

    // Reset rotation to focus on landing site initially
    focusLandingSite(selectedLocation);

    // 7. Interactive Drag & Touch Handling
    const handlePointerDown = (e: PointerEvent) => {
      const s = interactionRef.current;
      s.isDragging = true;
      s.lastPointerX = e.clientX;
      s.lastPointerY = e.clientY;
      s.velX = 0;
      s.velY = 0;
      s.lastInteractTime = Date.now();
      canvas.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const s = interactionRef.current;
      if (!s.isDragging) return;

      const dx = e.clientX - s.lastPointerX;
      const dy = e.clientY - s.lastPointerY;

      s.lastPointerX = e.clientX;
      s.lastPointerY = e.clientY;
      s.lastInteractTime = Date.now();

      // Sensitivity
      const sensitivity = 0.007;
      s.targetRotY += dx * sensitivity;
      // Clamp pitch between -1.3 rad and +1.3 rad (~75 deg)
      s.targetRotX = Math.max(-1.3, Math.min(1.3, s.targetRotX + dy * sensitivity));

      // Calculate instantaneous velocity for inertia
      s.velY = dx * 0.005;
      s.velX = dy * 0.005;
    };

    const handlePointerUp = (e: PointerEvent) => {
      const s = interactionRef.current;
      s.isDragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = interactionRef.current;
      const delta = e.deltaY * 0.01;
      s.targetZoomDist = Math.max(s.minZoom, Math.min(s.maxZoom, s.targetZoomDist + delta));
      s.lastInteractTime = Date.now();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // 8. Resize Observer
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

    // 9. Animation & Physics Loop
    let clock = new THREE.Clock();
    let totalTime = 0;

    const tick = () => {
      const rawDt = clock.getDelta();
      // Delta time clamping
      const dt = Math.min(rawDt, 0.1);
      totalTime += dt;

      const s = interactionRef.current;

      // Auto-rotation after 2 seconds of inactivity
      const idleTime = Date.now() - s.lastInteractTime;
      if (!s.isDragging && idleTime > 2000) {
        s.targetRotY += dt * 0.12; // slow continuous planetary spin
      } else if (!s.isDragging) {
        // Apply inertia velocity decay
        s.targetRotY += s.velY;
        s.targetRotX = Math.max(-1.3, Math.min(1.3, s.targetRotX + s.velX));
        s.velY *= 0.94;
        s.velX *= 0.94;
      }

      // Smooth damping interpolation
      s.rotationY += (s.targetRotY - s.rotationY) * Math.min(1, dt * 8.0);
      s.rotationX += (s.targetRotX - s.rotationX) * Math.min(1, dt * 8.0);
      s.zoomDist += (s.targetZoomDist - s.zoomDist) * Math.min(1, dt * 6.0);

      if (globeGroupRef.current) {
        globeGroupRef.current.rotation.y = s.rotationY;
        globeGroupRef.current.rotation.x = s.rotationX;
      }

      // Update camera distance
      camera.position.z = s.zoomDist;

      // Update landing marker animation
      if (markerRef.current) {
        markerRef.current.update(totalTime);
      }

      // Render frame
      renderer.render(scene, camera);

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    // Cleanup & Rigorous WebGL Disposal
    return () => {
      safeCancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;

      resizeObserver.disconnect();

      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);

      disposeThreeObject(scene);
      disposeRenderer(renderer);

      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      globeGroupRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen, selectedLocation, focusLandingSite]);

  if (!isOpen) return null;

  const currentSiteInfo = LANDING_SITES[selectedLocation];

  const handleConfirmDeploy = () => {
    soundFx.playVictory();
    onSelectLocation(selectedLocation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-950 to-blue-900 border border-cyan-500/40 text-cyan-400">
              <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '24s' }} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Selector de Misión Planetaria 3D' : '3D Planetary Mission Selector'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50 uppercase tracking-wider font-bold">
                  WebGL 360°
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'es' 
                  ? 'Explora las coordenadas de descenso de la NASA y selecciona el destino de tu colonia.' 
                  : 'Explore NASA landing coordinates and select your base destination.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Planet Selection Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80">
          <button
            onClick={() => {
              soundFx.playClick();
              setSelectedLocation('moon');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all border ${
              selectedLocation === 'moon'
                ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-cyan-300 border-cyan-500/60 shadow-lg shadow-cyan-950/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <span className="text-base">🌕</span>
            <span>{lang === 'es' ? 'Luna — Cráter Shackleton' : 'Moon — Shackleton Crater'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-400 font-mono">
              -89.9° S
            </span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setSelectedLocation('mars');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all border ${
              selectedLocation === 'mars'
                ? 'bg-gradient-to-r from-orange-950 to-amber-950 text-amber-300 border-amber-500/60 shadow-lg shadow-amber-950/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <span className="text-base">🔴</span>
            <span>{lang === 'es' ? 'Marte — Cráter Jezero' : 'Mars — Jezero Crater'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 font-mono">
              +18.4° N
            </span>
          </button>
        </div>

        {/* Content Body: 3D Globe + Mission Intel */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-[360px]">
          {/* 3D WebGL Globe Viewport */}
          <div 
            ref={containerRef} 
            className="md:col-span-7 relative h-[280px] sm:h-[340px] md:h-full bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing select-none"
          >
            <canvas ref={canvasRef} className="w-full h-full block outline-none" />

            {/* In-viewport HUD controls */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-auto">
              <button
                onClick={() => focusLandingSite(selectedLocation)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-all shadow-md"
                title={lang === 'es' ? 'Centrar cámara en el marcador de descenso' : 'Center on landing site'}
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'es' ? 'Enfocar Base' : 'Focus Base'}</span>
              </button>
            </div>

            {/* Interaction hint */}
            <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5 pointer-events-none">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{lang === 'es' ? 'Arrastra para rotar 360° • Zoom con rueda' : 'Drag to rotate 360° • Scroll to zoom'}</span>
            </div>

            {/* Coordinates Badge */}
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
              {selectedLocation === 'moon' ? 'LAT: 89.9° S | LON: 0.0° E' : 'LAT: 18.38° N | LON: 77.58° E'}
            </div>
          </div>

          {/* Mission Intel Panel */}
          <div className="md:col-span-5 p-4 sm:p-5 bg-slate-900/90 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 md:border-l border-slate-800">
            <div className="space-y-3.5">
              {/* Mission Header */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {currentSiteInfo.missionName}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400">
                    {currentSiteInfo.campaignDays} {lang === 'es' ? (selectedLocation === 'mars' ? 'Sols' : 'Días') : (selectedLocation === 'mars' ? 'Sols' : 'Days')}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-100 mt-1">
                  {lang === 'es' ? currentSiteInfo.siteNameEs : currentSiteInfo.siteNameEn}
                </h3>
              </div>

              {/* Environment description */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <p>{lang === 'es' ? currentSiteInfo.environmentDescriptionEs : currentSiteInfo.environmentDescriptionEn}</p>
              </div>

              {/* Telemetry specs grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Rocket className="w-3 h-3 text-cyan-400" />
                    <span>{lang === 'es' ? 'Rover Asignado' : 'Assigned Rover'}</span>
                  </div>
                  <div className="font-bold text-slate-200 mt-0.5">{currentSiteInfo.roverName}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    <span>{lang === 'es' ? 'Gravedad' : 'Gravity'}</span>
                  </div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {selectedLocation === 'moon' ? '0.166 g (16.6%)' : '0.380 g (38.0%)'}
                  </div>
                </div>
              </div>

              {/* Primary Hazard Alert */}
              <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/30 text-xs text-red-200 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[11px] text-red-300">
                    {lang === 'es' ? 'Amenaza Crítica Identificada:' : 'Primary Critical Hazard:'}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {lang === 'es' ? currentSiteInfo.primaryHazardEs : currentSiteInfo.primaryHazardEn}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions inside Panel */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
              <button
                onClick={() => {
                  soundFx.playClick();
                  onClose();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all text-center"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>

              <button
                onClick={handleConfirmDeploy}
                className="flex-[2] py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-900/40 transition-all flex items-center justify-center gap-1.5 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Rocket className="w-4 h-4" />
                <span>
                  {selectedLocation === currentLocation
                    ? (lang === 'es' ? 'Continuar en Base' : 'Continue at Base')
                    : (lang === 'es' ? `Desplegar a ${currentSiteInfo.nameEs}` : `Deploy to ${currentSiteInfo.nameEn}`)}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
