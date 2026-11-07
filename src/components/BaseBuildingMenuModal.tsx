import React from 'react';
import { BaseBuildingId } from '../types/game';
import { BUILDING_CATALOG } from './3d/baseBuildingBuilder';
import { 
  X, 
  Building2, 
  Zap, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Leaf, 
  Wrench,
  ShieldCheck
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';

export interface BaseBuildingMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScience: number;
  builtBuildings: BaseBuildingId[];
  onConstruct: (buildingId: BaseBuildingId) => void;
  lang: 'es' | 'en';
}

export const BaseBuildingMenuModal: React.FC<BaseBuildingMenuModalProps> = ({
  isOpen,
  onClose,
  currentScience,
  builtBuildings,
  onConstruct,
  lang,
}) => {
  if (!isOpen) return null;

  const builtSet = new Set(builtBuildings);

  const handleBuild = (id: BaseBuildingId) => {
    const def = BUILDING_CATALOG[id];
    if (!def) return;
    if (builtSet.has(id)) return;
    if (currentScience < def.costScience) {
      soundFx.playAlert();
      return;
    }

    soundFx.playVictory();
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    onConstruct(id);
  };

  const buildings: BaseBuildingId[] = ['rover_hangar', 'greenhouse_2', 'dsoc_tower'];

  const getBuildingIcon = (id: BaseBuildingId) => {
    switch (id) {
      case 'rover_hangar':
        return <Wrench className="w-5 h-5 text-amber-400" />;
      case 'greenhouse_2':
        return <Leaf className="w-5 h-5 text-emerald-400" />;
      case 'dsoc_tower':
        return <Radio className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-cyan-500/80 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.35)] flex flex-col max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 text-cyan-400 border border-cyan-500/40">
              <Building2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? '🏗️ Expansión de Base (Base Building 3D)' : '🏗️ Base Expansion (3D Base Building)'}</span>
                <span className="text-[10px] bg-cyan-700 text-white font-black px-2 py-0.5 rounded-full uppercase">
                  NASA STEM
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'es' 
                  ? 'Invierte puntos de Ciencia acumulados para desplegar módulos 3D avanzados en el terreno.' 
                  : 'Invest accumulated Science points to deploy advanced 3D structures on the plateau.'}
              </p>
            </div>
          </div>

          <button aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            title={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Science Balance Banner */}
        <div className="my-3 px-4 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span className="text-xs font-bold text-slate-300">
              {lang === 'es' ? 'Presupuesto de Investigación Disponible:' : 'Available Research Budget:'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-black text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-500/30">
            <span>🔬 {currentScience}</span>
            <span className="text-xs text-cyan-500">{lang === 'es' ? 'pts Ciencia' : 'Science pts'}</span>
          </div>
        </div>

        {/* 3 Expansion Buildings Catalog */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-2">
          {buildings.map(id => {
            const def = BUILDING_CATALOG[id];
            const isBuilt = builtSet.has(id);
            const canAfford = currentScience >= def.costScience;

            return (
              <div
                key={id}
                className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                  isBuilt
                    ? 'bg-slate-950/70 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                    : canAfford
                      ? 'bg-slate-950/80 border-cyan-500/50 hover:border-cyan-400 shadow-md shadow-cyan-950/20'
                      : 'bg-slate-950/40 border-slate-800 opacity-80'
                }`}
              >
                <div>
                  {/* Card Header & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-700/80">
                      {getBuildingIcon(id)}
                    </div>
                    {isBuilt ? (
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {lang === 'es' ? 'Construido' : 'Built'}
                      </span>
                    ) : (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        canAfford
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-rose-950/60 border-rose-600/60 text-rose-300'
                      }`}>
                        {canAfford 
                          ? (lang === 'es' ? 'Disponible' : 'Available') 
                          : (lang === 'es' ? `Faltan ${def.costScience - currentScience} pts` : `Need ${def.costScience - currentScience} pts`)}
                      </span>
                    )}
                  </div>

                  {/* Title & Cost */}
                  <h4 className="text-sm font-black text-slate-100">
                    {lang === 'es' ? def.nameEs : def.nameEn}
                  </h4>
                  <div className="text-xs font-mono font-bold text-amber-400 mb-2">
                    ⚡ {def.costScience} {lang === 'es' ? 'pts Ciencia' : 'Science pts'}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                    {lang === 'es' ? def.descriptionEs : def.descriptionEn}
                  </p>

                  {/* Specific Buffs Bullet List */}
                  <div className="space-y-1.5 border-t border-slate-800/80 pt-2.5 mb-3 text-[10px]">
                    {id === 'rover_hangar' && (
                      <>
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <Zap className="w-3.5 h-3.5 shrink-0" />
                          <span><b>2x</b> {lang === 'es' ? 'recarga acelerada de batería' : 'faster battery recharge speed'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span><b>+25 kWh</b> {lang === 'es' ? 'capacidad máxima de batería' : 'extended battery capacity'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <Wrench className="w-3.5 h-3.5 shrink-0" />
                          <span><b>35m</b> {lang === 'es' ? 'alcance extendido del láser minero' : 'extended mining laser range'}</span>
                        </div>
                      </>
                    )}

                    {id === 'greenhouse_2' && (
                      <>
                        <div className="flex items-center gap-1.5 text-emerald-300">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span><b>+4</b> {lang === 'es' ? 'capacidad de tripulación (hasta 10 colonos)' : 'crew capacity (supports up to 10)'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-300">
                          <Leaf className="w-3.5 h-3.5 shrink-0" />
                          <span><b>+12</b> {lang === 'es' ? 'raciones de comida fresca diarias' : 'daily fresh food rations'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-300">
                          <Zap className="w-3.5 h-3.5 shrink-0" />
                          <span><b>+6 O₂</b> {lang === 'es' ? 'producción diaria de soporte vital' : 'daily life support oxygen'}</span>
                        </div>
                      </>
                    )}

                    {id === 'dsoc_tower' && (
                      <>
                        <div className="flex items-center gap-1.5 text-cyan-300">
                          <Radio className="w-3.5 h-3.5 shrink-0" />
                          <span><b>3x</b> {lang === 'es' ? 'velocidad de telemetría DSN con Houston' : 'DSN telemetry downlink speed'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-cyan-300">
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span><b>x3.0</b> {lang === 'es' ? 'multiplicador de ciencia en telemetría' : 'science telemetry multiplier'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Construction Button */}
                <button
                  onClick={() => handleBuild(id)}
                  disabled={isBuilt || !canAfford}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    isBuilt
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                      : canAfford
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/40 active:scale-95'
                        : 'bg-slate-800 border border-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isBuilt ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'es' ? 'Estructura Activa' : 'Structure Active'}</span>
                    </>
                  ) : canAfford ? (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>{lang === 'es' ? `Construir (-${def.costScience} Ciencia)` : `Construct (-${def.costScience} Science)`}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>{lang === 'es' ? 'Ciencia Insuficiente' : 'Insufficient Science'}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Active Cumulative Buffs Summary Card */}
        <div className="mt-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
          <h5 className="font-black text-slate-200 flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'es' ? 'Estado de Bonificaciones Activas de Base:' : 'Base Active Expansion Buffs Status:'}</span>
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] font-mono">
            <div className={`p-2 rounded-xl border ${builtSet.has('rover_hangar') ? 'bg-amber-950/40 border-amber-500/50 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              <div className="text-[10px] text-slate-400">{lang === 'es' ? 'Recarga Batería' : 'Battery Recharge'}</div>
              <div className="font-bold">{builtSet.has('rover_hangar') ? '+50% (2x)' : '1x (Base)'}</div>
            </div>

            <div className={`p-2 rounded-xl border ${builtSet.has('rover_hangar') ? 'bg-amber-950/40 border-amber-500/50 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              <div className="text-[10px] text-slate-400">{lang === 'es' ? 'Láser Rover' : 'Rover Laser'}</div>
              <div className="font-bold">{builtSet.has('rover_hangar') ? '35m (+10m)' : '25m (Base)'}</div>
            </div>

            <div className={`p-2 rounded-xl border ${builtSet.has('greenhouse_2') ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              <div className="text-[10px] text-slate-400">{lang === 'es' ? 'Capacidad Tripulación' : 'Crew Capacity'}</div>
              <div className="font-bold">{builtSet.has('greenhouse_2') ? '10 Colonos (+4)' : '6 Colonos'}</div>
            </div>

            <div className={`p-2 rounded-xl border ${builtSet.has('dsoc_tower') ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              <div className="text-[10px] text-slate-400">{lang === 'es' ? 'Telemetría DSN' : 'DSN Telemetry'}</div>
              <div className="font-bold">{builtSet.has('dsoc_tower') ? '3.0x Velocidad' : '1.0x (Base)'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
