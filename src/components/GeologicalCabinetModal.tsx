import React, { useState, useEffect, useRef } from 'react';
import { BaseLocation } from '../types/game';
import { 
  GEOLOGICAL_SAMPLES, 
  GeologicalSpecimen, 
  calculateCabinetBonuses, 
  getSamplesByLocation,
  getGeologicalSample 
} from '../data/geologicalSamples';
import { 
  Microscope, 
  X, 
  Lock, 
  Sparkles, 
  Zap, 
  Shield, 
  Droplets, 
  Smile, 
  ExternalLink, 
  Compass, 
  Calendar, 
  Clock, 
  Award,
  Layers,
  RotateCcw
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export interface GeologicalCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: BaseLocation;
  sampleCabinet?: string[];
  lang: 'es' | 'en';
}

/**
 * Procedural Canvas specimen preview renderer
 * Draws a rotating 3D faceted crystal/mineral polyhedron with authentic colors and shading
 */
const SpecimenCanvasPreview: React.FC<{
  specimen: GeologicalSpecimen;
  isUnlocked: boolean;
}> = ({ specimen, isUnlocked }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const rotationAngleRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    // Define 3D polyhedron vertices based on geometryType
    const vertices: [number, number, number][] = [];
    const faces: number[][] = [];

    if (specimen.visuals.geometryType === 'octahedron') {
      vertices.push([0, 1.2, 0], [0, -1.2, 0], [1.1, 0, 0], [-1.1, 0, 0], [0, 0, 1.1], [0, 0, -1.1]);
      faces.push(
        [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
        [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]
      );
    } else if (specimen.visuals.geometryType === 'icosahedron') {
      const phi = (1 + Math.sqrt(5)) / 2;
      const s = 0.7;
      vertices.push(
        [-s, phi * s, 0], [s, phi * s, 0], [-s, -phi * s, 0], [s, -phi * s, 0],
        [0, -s, phi * s], [0, s, phi * s], [0, -s, -phi * s], [0, s, -phi * s],
        [phi * s, 0, -s], [phi * s, 0, s], [-phi * s, 0, -s], [-phi * s, 0, s]
      );
      faces.push(
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
      );
    } else if (specimen.visuals.geometryType === 'prism') {
      const r = 1.0;
      const h = 1.2;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        vertices.push([Math.cos(ang) * r, h, Math.sin(ang) * r]);
        vertices.push([Math.cos(ang) * r, -h, Math.sin(ang) * r]);
      }
      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        faces.push([i * 2, next * 2, next * 2 + 1, i * 2 + 1]);
      }
    } else {
      // Default faceted dodecahedron/polyhedron
      const phi = (1 + Math.sqrt(5)) / 2;
      const a = 0.65;
      const b = 0.65 / phi;
      const c = 0.65 * phi;
      vertices.push(
        [a, a, a], [a, a, -a], [a, -a, a], [a, -a, -a],
        [-a, a, a], [-a, a, -a], [-a, -a, a], [-a, -a, -a],
        [0, b, c], [0, b, -c], [0, -b, c], [0, -b, -c],
        [b, c, 0], [b, -c, 0], [-b, c, 0], [-b, -c, 0],
        [c, 0, b], [c, 0, -b], [-c, 0, b], [-c, 0, -b]
      );
      faces.push(
        [0, 8, 4, 14, 12], [0, 12, 1, 17, 16], [0, 16, 2, 10, 8],
        [12, 14, 5, 9, 1], [8, 10, 6, 18, 4], [16, 17, 3, 13, 2],
        [7, 11, 3, 13, 15], [7, 15, 6, 18, 19], [7, 19, 5, 9, 11],
        [1, 9, 11, 3, 17], [4, 18, 19, 5, 14], [2, 13, 15, 6, 10]
      );
    }

    const render = () => {
      if (!isRunning) return;
      rotationAngleRef.current += 0.015;
      const angle = rotationAngleRef.current;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Radial background aura
      const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 1.5);
      grad.addColorStop(0, isUnlocked ? `${specimen.visuals.accentColor}25` : '#1e293b33');
      grad.addColorStop(1, '#00000000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const cosY = Math.cos(angle);
      const sinY = Math.sin(angle);
      const cosX = Math.cos(0.4);
      const sinX = Math.sin(0.4);

      // Project vertices
      const scale = Math.min(w, h) * 0.32;
      const projected = vertices.map(v => {
        // Rotate Y
        let x1 = v[0] * cosY - v[2] * sinY;
        let y1 = v[1];
        let z1 = v[0] * sinY + v[2] * cosY;

        // Rotate X
        let x2 = x1;
        let y2 = y1 * cosX - z1 * sinX;
        let z2 = y1 * sinX + z1 * cosX;

        // Perspective
        const fov = 3.5;
        const pz = fov / (fov + z2);
        return {
          x: w / 2 + x2 * scale * pz,
          y: h / 2 + y2 * scale * pz,
          z: z2,
        };
      });

      // Sort faces by average Z depth (painter's algorithm)
      const sortedFaces = faces.map(face => {
        const avgZ = face.reduce((sum, idx) => sum + projected[idx].z, 0) / face.length;
        return { face, avgZ };
      }).sort((a, b) => b.avgZ - a.avgZ);

      // Render faces
      for (const item of sortedFaces) {
        const face = item.face;
        if (face.length < 3) continue;

        // Normal computation for back-face culling & lighting
        const p0 = projected[face[0]];
        const p1 = projected[face[1]];
        const p2 = projected[face[2]];
        const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);

        if (cross <= 0) continue; // back-face culled

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < face.length; i++) {
          ctx.lineTo(projected[face[i]].x, projected[face[i]].y);
        }
        ctx.closePath();

        if (isUnlocked) {
          // Shading based on normal and light source
          const lightIntensity = Math.min(1.0, Math.max(0.2, (item.avgZ + 1.5) / 3.0));
          ctx.fillStyle = specimen.visuals.primaryColor;
          ctx.globalAlpha = 0.88;
          ctx.fill();

          // Shiny highlight gradient
          const faceGrad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
          faceGrad.addColorStop(0, specimen.visuals.accentColor);
          faceGrad.addColorStop(1, specimen.visuals.secondaryColor);
          ctx.strokeStyle = faceGrad;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Mineral facet shine
          ctx.fillStyle = `rgba(255, 255, 255, ${lightIntensity * 0.25})`;
          ctx.fill();
        } else {
          // Locked silhouette: dark with wireframe
          ctx.fillStyle = '#0f172a';
          ctx.globalAlpha = 0.95;
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1.0;
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [specimen, isUnlocked]);

  return (
    <canvas 
      ref={canvasRef} 
      width={240} 
      height={240} 
      className="w-full max-w-[220px] h-[220px] rounded-2xl mx-auto shadow-inner bg-slate-950/80 border border-slate-800"
    />
  );
};

export const GeologicalCabinetModal: React.FC<GeologicalCabinetModalProps> = ({
  isOpen,
  onClose,
  location,
  sampleCabinet = [],
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<BaseLocation>(location);
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string>('');

  // Synchronize location tab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(location);
      const locSamples = getSamplesByLocation(location);
      // Select first acquired sample, or first sample in catalog
      const firstDiscovered = locSamples.find(s => sampleCabinet.includes(s.id));
      setSelectedSpecimenId(firstDiscovered ? firstDiscovered.id : locSamples[0].id);
    }
  }, [isOpen, location, sampleCabinet]);

  // Keyboard navigation & Escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTabSamples = getSamplesByLocation(activeTab);
  const selectedSpecimen = getGeologicalSample(selectedSpecimenId) || currentTabSamples[0];
  const isSelectedUnlocked = sampleCabinet.includes(selectedSpecimen?.id);

  // Calculate cumulative bonuses across all discovered samples in this cabinet
  const cabinetBonuses = calculateCabinetBonuses(sampleCabinet);
  const locationDiscoveredCount = currentTabSamples.filter(s => sampleCabinet.includes(s.id)).length;
  const locationTotalCount = currentTabSamples.length;
  const locationCompletionPct = Math.round((locationDiscoveredCount / locationTotalCount) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl w-full max-w-5xl shadow-[0_0_60px_rgba(16,185,129,0.25)] max-h-[96vh] overflow-hidden flex flex-col transition-all">
        
        {/* Top Header & NASA Astromaterials Banner */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950/90 border-b border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 shadow-md shadow-emerald-500/20">
              <Microscope className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-white tracking-wide">
                  {lang === 'es' ? 'Gabinete de Astromateriales de la NASA' : 'NASA Astromaterials Specimen Cabinet'}
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                  {lang === 'es' ? 'Laboratorio Lunar y Marciano' : 'Lunar & Martian Curation'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'es' 
                  ? 'Catálogo oficial de muestras geológicas prístinas con bonificaciones acumulables de Ciencia y Moral' 
                  : 'Official catalog of pristine geological specimens with stacking Science & Morale bonuses'}
              </p>
            </div>
          </div>

          <button aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
            title={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Active Stacking Bonuses Bar */}
        <div className="px-5 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {lang === 'es' ? 'Bonificaciones Activas de la Colonia:' : 'Active Colony Bonuses:'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Science Multiplier Buff */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/50 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-slate-300">
                {lang === 'es' ? 'Multiplicador Ciencia:' : 'Science Mult:'}
              </span>
              <span className="text-xs font-black text-cyan-300">
                +{cabinetBonuses.totalScienceBonusPct}% ({cabinetBonuses.scienceMultiplier.toFixed(2)}x)
              </span>
            </div>

            {/* Morale Boost */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/50 shadow-sm">
              <Smile className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-slate-300">
                {lang === 'es' ? 'Moral de Tripulación:' : 'Colony Morale:'}
              </span>
              <span className="text-xs font-black text-emerald-300">
                +{cabinetBonuses.totalMoraleBonus} pts
              </span>
            </div>

            {/* Shield or Water if any */}
            {cabinetBonuses.totalShieldBonusPct > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/50 shadow-sm">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-slate-300">{lang === 'es' ? 'Blindaje:' : 'Shield:'}</span>
                <span className="text-xs font-black text-amber-300">+{cabinetBonuses.totalShieldBonusPct}%</span>
              </div>
            )}

            {cabinetBonuses.totalWaterEfficiencyBonusPct > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-500/50 shadow-sm">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-slate-300">{lang === 'es' ? 'Reciclaje Agua:' : 'Water Loop:'}</span>
                <span className="text-xs font-black text-blue-300">+{cabinetBonuses.totalWaterEfficiencyBonusPct}%</span>
              </div>
            )}

            {/* Total cataloged badge */}
            <div className="px-2.5 py-1 rounded-xl bg-slate-800 text-[11px] font-bold text-slate-300 border border-slate-700">
              {cabinetBonuses.discoveredCount} / {Object.keys(GEOLOGICAL_SAMPLES).length} {lang === 'es' ? 'Muestras' : 'Samples'}
            </div>
          </div>
        </div>

        {/* Tab Selector & Location Progress Bar */}
        <div className="px-5 pt-3 pb-2 bg-slate-900 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFx.playClick();
                setActiveTab('moon');
                const moonSamples = getSamplesByLocation('moon');
                setSelectedSpecimenId(moonSamples[0].id);
              }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'moon'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-900/40 border border-cyan-400/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              <span>🌓</span>
              <span>{lang === 'es' ? 'Astromateriales Lunares (Apollo / VIPER)' : 'Lunar Astromaterials (Apollo / VIPER)'}</span>
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                setActiveTab('mars');
                const marsSamples = getSamplesByLocation('mars');
                setSelectedSpecimenId(marsSamples[0].id);
              }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'mars'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-900/40 border border-red-400/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              <span>🔴</span>
              <span>{lang === 'es' ? 'Astromateriales Marcianos (Perseverance / MSL)' : 'Martian Astromaterials (Perseverance / MSL)'}</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {lang === 'es' ? 'Completitud del sector:' : 'Sector progress:'}
            </span>
            <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div 
                className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${locationCompletionPct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-400">{locationCompletionPct}%</span>
          </div>
        </div>

        {/* Modal Body: Left Vitrine Grid & Right Datasheet */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 sm:p-6 overflow-y-auto max-h-[calc(96vh-170px)]">
          
          {/* Left Column: Vitrine Cards Grid (5 Cols) */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                {lang === 'es' ? 'Vitrinas de Exposición Criógena' : 'Cryogenic Vitrine Chambers'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {locationDiscoveredCount}/{locationTotalCount} {lang === 'es' ? 'adquiridas' : 'acquired'}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {currentTabSamples.map((specimen) => {
                const isUnlocked = sampleCabinet.includes(specimen.id);
                const isSelected = selectedSpecimenId === specimen.id;

                return (
                  <div
                    key={specimen.id}
                    onClick={() => {
                      soundFx.playClick();
                      setSelectedSpecimenId(specimen.id);
                    }}
                    className={`relative p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.01]'
                        : isUnlocked
                          ? 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600 hover:bg-slate-850'
                          : 'bg-slate-950/60 border-slate-800/80 grayscale hover:grayscale-0'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Specimen Icon or Padlock */}
                      <div 
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 border transition-all ${
                          isUnlocked
                            ? 'border-emerald-500/60 shadow-md'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                        style={{
                          backgroundColor: isUnlocked ? `${specimen.visuals.primaryColor}55` : undefined,
                        }}
                      >
                        {isUnlocked ? specimen.visuals.icon : <Lock className="w-5 h-5 text-slate-400" />}
                      </div>

                      {/* Specimen Title & Subtitle */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-bold truncate ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                            {lang === 'es' ? specimen.nameEs : specimen.nameEn}
                          </span>
                          {isUnlocked ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-300 shrink-0">
                              {lang === 'es' ? 'ACTIVA' : 'ACTIVE'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 shrink-0">
                              {lang === 'es' ? 'BLOQUEADA' : 'LOCKED'}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 truncate">
                          {lang === 'es' ? specimen.subnameEs : specimen.subnameEn}
                        </span>

                        {/* Passive Bonus Snippet */}
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span className="text-cyan-400 font-bold">
                            +{specimen.stackingBonus.scienceBonusPct}% {lang === 'es' ? 'Ciencia' : 'Sci'}
                          </span>
                          <span className="text-emerald-400 font-bold">
                            +{specimen.stackingBonus.moraleBonus} {lang === 'es' ? 'Moral' : 'Mor'}
                          </span>
                          {specimen.stackingBonus.shieldBonusPct && (
                            <span className="text-amber-400 font-bold">
                              +{specimen.stackingBonus.shieldBonusPct}% {lang === 'es' ? 'Escudo' : 'Shield'}
                            </span>
                          )}
                          {specimen.stackingBonus.waterEfficiencyBonusPct && (
                            <span className="text-blue-400 font-bold">
                              +{specimen.stackingBonus.waterEfficiencyBonusPct}% {lang === 'es' ? 'Agua' : 'Water'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sortie Extraction Tip */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
              <Compass className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-300">
                  {lang === 'es' ? 'Protocolo de Adquisición ISRU:' : 'ISRU Acquisition Protocol:'}
                </span>{' '}
                {lang === 'es'
                  ? 'Despacha el Rover en expediciones o destruye nodos de recursos en el simulador 3D con el rayo láser espectrómetro para recolectar muestras raras.'
                  : 'Dispatch the Rover on sorties or shatter resource nodes in 3D driving mode with your spectrometer laser to recover rare specimens.'}
              </div>
            </div>
          </div>

          {/* Right Column: Specimen Datasheet & Procedural 3D/Canvas Preview (7 Cols) */}
          <div className="md:col-span-7 bg-slate-950/70 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
            {selectedSpecimen ? (
              <div className="flex flex-col gap-4">
                
                {/* Header Section with 3D Preview Canvas */}
                <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-800/80 pb-4">
                  <div className="relative shrink-0">
                    <SpecimenCanvasPreview 
                      specimen={selectedSpecimen} 
                      isUnlocked={isSelectedUnlocked} 
                    />
                    {!isSelectedUnlocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl backdrop-blur-xs p-3 text-center">
                        <Lock className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-200">
                          {lang === 'es' ? 'Muestra No Descubierta' : 'Specimen Undiscovered'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 max-w-[160px]">
                          {lang === 'es' ? 'Completa expediciones del rover para analizarla.' : 'Complete rover expeditions to analyze.'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-white">
                        {lang === 'es' ? selectedSpecimen.nameEs : selectedSpecimen.nameEn}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-emerald-400">
                      {lang === 'es' ? selectedSpecimen.subnameEs : selectedSpecimen.subnameEn}
                    </span>

                    <div className="mt-1 flex flex-col gap-1 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold text-slate-400">{lang === 'es' ? 'Misión NASA:' : 'NASA Mission:'}</span>
                        <span className="text-white font-mono text-[11px] truncate">{selectedSpecimen.nasaMissionRef}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-bold text-slate-400">{lang === 'es' ? 'Catálogo ID:' : 'Catalog ID:'}</span>
                        <span className="text-cyan-300 font-mono text-[11px]">{selectedSpecimen.sampleCatalogId}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="font-bold text-slate-400">{lang === 'es' ? 'Edad Geológica:' : 'Geological Age:'}</span>
                        <span className="text-slate-200 text-[11px]">{selectedSpecimen.geologicalAge}</span>
                      </div>
                    </div>

                    {/* Stacking Buff Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs px-2.5 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 font-bold">
                        +{selectedSpecimen.stackingBonus.scienceBonusPct}% {lang === 'es' ? 'Multiplicador Ciencia' : 'Science Multiplier'}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-bold">
                        +{selectedSpecimen.stackingBonus.moraleBonus} {lang === 'es' ? 'Moral Permanente' : 'Permanent Morale'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mineralogical Breakdown & Chemical Formula */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                      {lang === 'es' ? 'Composición Mineralógica y Fórmula Química' : 'Mineralogical Composition & Chemical Formula'}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">
                      {selectedSpecimen.chemicalFormula}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lang === 'es' ? selectedSpecimen.mineralCompositionEs : selectedSpecimen.mineralCompositionEn}
                  </p>
                </div>

                {/* Astrobiological & Scientific Significance */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1.5">
                  <span className="text-[11px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    {lang === 'es' ? 'Importancia Astrobiológica y Científica' : 'Astrobiological & Scientific Significance'}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lang === 'es' ? selectedSpecimen.astrobiologicalSignificanceEs : selectedSpecimen.astrobiologicalSignificanceEn}
                  </p>
                </div>

                {/* NASA Science Fact */}
                <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-200 italic leading-relaxed">
                    "{lang === 'es' ? selectedSpecimen.scientificFactEs : selectedSpecimen.scientificFactEn}"
                  </p>
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                {lang === 'es' ? 'Selecciona una muestra para examinar.' : 'Select a specimen to examine.'}
              </div>
            )}

            {/* Bottom Modal Action */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end">
              <button
                onClick={() => {
                  soundFx.playClick();
                  onClose();
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                {lang === 'es' ? 'Volver a la Base' : 'Return to Base'}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
