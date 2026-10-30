import React, { useState, useRef, useEffect } from 'react';
import { BaseModule, GameDifficulty } from '../types/game';
import { 
  Power, 
  ArrowUpCircle, 
  Zap, 
  Wind, 
  Droplets, 
  Sparkles
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface ModuleControlProps {
  modules: BaseModule[];
  selectedModuleId: string | null;
  onSelectModule: (id: string) => void;
  onToggleModule: (id: string) => void;
  onUpgradeModule: (id: string) => void;
  onRepairModule: (id: string) => void;
  lang: 'es' | 'en';
  difficulty?: GameDifficulty;
}

export const ModuleControl: React.FC<ModuleControlProps> = ({
  modules,
  selectedModuleId,
  onSelectModule,
  onToggleModule,
  onUpgradeModule,
  onRepairModule: _onRepairModule,
  lang,
  difficulty = 'normal',
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const upgradeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (upgradeTimeoutRef.current) {
        clearTimeout(upgradeTimeoutRef.current);
        upgradeTimeoutRef.current = null;
      }
    };
  }, []);

  const activeModule = modules.find(m => m.id === selectedModuleId) || modules[0];

  const handleUpgrade = (id: string) => {
    if (isUpgrading || activeModule.level >= activeModule.maxLevel) return;
    setIsUpgrading(true);
    soundFx.playHarvest();
    onUpgradeModule(id);
    upgradeTimeoutRef.current = setTimeout(() => {
      setIsUpgrading(false);
    }, 400);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Power className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-100">
              {lang === 'es' ? 'Centro de Control y Distribución de Energía' : 'Module Energy & System Control'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {lang === 'es' 
                ? 'Equilibra el consumo eléctrico: apagar módulos ahorra batería para emergencias.' 
                : 'Balance electrical draw: shutting modules saves power for emergency life support.'}
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal pill list of all modules for fast switching */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {modules.map(mod => {
          const isSelected = mod.id === activeModule.id;
          return (
            <button
              key={mod.id}
              onClick={() => {
                soundFx.playClick();
                onSelectModule(mod.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${mod.isActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span>{lang === 'es' ? mod.nameEs.split(' ')[0] : mod.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Active Module Details Card */}
      {activeModule && (
        <div className="mt-3 bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-100">
                  {lang === 'es' ? activeModule.nameEs : activeModule.name}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  activeModule.isActive
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                    : 'bg-rose-950/60 border-rose-500 text-rose-400'
                }`}>
                  {activeModule.isActive ? (lang === 'es' ? 'OPERATIVO' : 'ONLINE') : (lang === 'es' ? 'DESCONECTADO' : 'OFFLINE')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300">
                  {lang === 'es' ? `Nivel ${activeModule.level}/${activeModule.maxLevel}` : `Level ${activeModule.level}/${activeModule.maxLevel}`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {lang === 'es' ? activeModule.descriptionEs : activeModule.description}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (activeModule.isActive) {
                    soundFx.playToggleOff();
                  } else {
                    soundFx.playToggleOn();
                  }
                  onToggleModule(activeModule.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  activeModule.isActive
                    ? 'bg-rose-600/20 hover:bg-rose-600/30 border-rose-500/50 text-rose-300'
                    : 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{activeModule.isActive ? (lang === 'es' ? 'Desconectar' : 'Power Off') : (lang === 'es' ? 'Encender' : 'Power On')}</span>
              </button>

              <button
                onClick={() => handleUpgrade(activeModule.id)}
                disabled={activeModule.level >= activeModule.maxLevel || isUpgrading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Mejora la eficiencia y capacidad del módulo"
              >
                <ArrowUpCircle className={`w-3.5 h-3.5 ${isUpgrading ? 'animate-spin' : ''}`} />
                <span>
                  {isUpgrading
                    ? (lang === 'es' ? 'Mejorando...' : 'Upgrading...')
                    : activeModule.id === 'storm_bunker' && difficulty === 'dificil'
                      ? (lang === 'es' ? 'Mejorar (20 pts)' : 'Upgrade (20 pts)')
                      : (lang === 'es' ? 'Mejorar (10 pts)' : 'Upgrade (10 pts)')}
                </span>
              </button>
            </div>
          </div>

          {/* Module Output / Consumption Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/80">
            {/* Power Metric */}
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                {lang === 'es' ? 'Consumo Potencia' : 'Power Draw'}
              </span>
              <span className="text-xs font-black text-amber-300">
                {activeModule.powerRequired > 0 
                  ? `-${activeModule.powerRequired * activeModule.level} kW`
                  : `+${Math.abs(activeModule.powerRequired * activeModule.level)} kW`}
              </span>
            </div>

            {/* Oxygen Metric */}
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Wind className="w-3 h-3 text-sky-400" />
                {lang === 'es' ? 'Balance O₂' : 'O₂ Delta'}
              </span>
              <span className={`text-xs font-black ${activeModule.oxygenDelta >= 0 ? 'text-sky-300' : 'text-rose-400'}`}>
                {activeModule.oxygenDelta > 0 ? `+${activeModule.oxygenDelta * activeModule.level}` : activeModule.oxygenDelta * activeModule.level} kg/día
              </span>
            </div>

            {/* Water Metric */}
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-400" />
                {lang === 'es' ? 'Balance Agua' : 'Water Delta'}
              </span>
              <span className={`text-xs font-black ${activeModule.waterDelta >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
                {activeModule.waterDelta > 0 ? `+${activeModule.waterDelta * activeModule.level}` : activeModule.waterDelta * activeModule.level} L/día
              </span>
            </div>

            {/* Special Metric (Food / Shield / Science) */}
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {lang === 'es' ? 'Efecto Especial' : 'Special Output'}
              </span>
              <span className="text-xs font-black text-emerald-300">
                {activeModule.foodDelta > 0 && `+${activeModule.foodDelta * activeModule.level} Comida Veggie`}
                {activeModule.shieldDelta > 0 && `+${activeModule.shieldDelta * activeModule.level}% Escudo`}
                {activeModule.scienceDelta > 0 && `+${activeModule.scienceDelta * activeModule.level} pts Ciencia`}
                {activeModule.foodDelta === 0 && activeModule.shieldDelta === 0 && activeModule.scienceDelta === 0 && 'Soporte Base'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
