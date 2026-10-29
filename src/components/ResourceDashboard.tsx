import React from 'react';
import { ResourceState } from '../types/game';
import { 
  Wind, 
  Droplets, 
  Zap, 
  Sprout, 
  ShieldCheck, 
  Radio, 
  Sparkles,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Info
} from 'lucide-react';

interface ResourceDashboardProps {
  resources: ResourceState;
  lang: 'es' | 'en';
}

export const ResourceDashboard: React.FC<ResourceDashboardProps> = ({ resources, lang }) => {
  const netPower = resources.energyProduction - resources.energyConsumption;

  // Visual helper for progress bar colors
  const getStatusColor = (val: number, max: number, inverted = false) => {
    const ratio = val / max;
    if (inverted) {
      if (ratio > 0.7) return 'bg-rose-500';
      if (ratio > 0.4) return 'bg-amber-500';
      return 'bg-emerald-500';
    }
    if (ratio > 0.6) return 'bg-emerald-500';
    if (ratio > 0.25) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 my-3">
      {/* 1. OXÍGENO */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-md">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Wind className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-300">
              {lang === 'es' ? 'Oxígeno (O₂)' : 'Oxygen (O₂)'}
            </span>
          </div>
          <span className="text-xs font-black text-sky-300">{Math.round(resources.oxygen)}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden my-1">
          <div
            className={`h-full transition-all duration-500 ${getStatusColor(resources.oxygen, resources.maxOxygen)}`}
            style={{ width: `${Math.min(100, Math.max(0, (resources.oxygen / resources.maxOxygen) * 100))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>{lang === 'es' ? 'ECLSS y Plantas' : 'ECLSS & Veggie'}</span>
          {resources.oxygen < 30 && (
            <span className="text-rose-400 font-bold flex items-center gap-0.5 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> {lang === 'es' ? 'Bajo' : 'Low'}
            </span>
          )}
        </div>
      </div>

      {/* 2. ENERGÍA NETA */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-md">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-300">
              {lang === 'es' ? 'Batería' : 'Battery'}
            </span>
          </div>
          <span className="text-xs font-black text-amber-300">{Math.round(resources.energy)}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden my-1">
          <div
            className={`h-full transition-all duration-500 ${getStatusColor(resources.energy, resources.maxEnergy)}`}
            style={{ width: `${Math.min(100, Math.max(0, (resources.energy / resources.maxEnergy) * 100))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] mt-1 font-semibold">
          <span className="text-slate-400">{lang === 'es' ? 'Flujo neto:' : 'Net flow:'}</span>
          <span className={`flex items-center gap-0.5 ${netPower >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netPower >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {netPower > 0 ? `+${netPower}` : netPower} kW
          </span>
        </div>
      </div>

      {/* 3. AGUA */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-md">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Droplets className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-300">
              {lang === 'es' ? 'Agua (H₂O)' : 'Water (H₂O)'}
            </span>
          </div>
          <span className="text-xs font-black text-blue-300">{Math.round(resources.water)} L</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden my-1">
          <div
            className={`h-full transition-all duration-500 ${getStatusColor(resources.water, resources.maxWater)}`}
            style={{ width: `${Math.min(100, Math.max(0, (resources.water / resources.maxWater) * 100))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>{lang === 'es' ? 'Reciclaje 98%' : '98% Recycled'}</span>
          <span>{resources.water < 25 ? '⚠️ Crítico' : 'Estable'}</span>
        </div>
      </div>

      {/* 4. ALIMENTACIÓN VEGGIE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-md">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sprout className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-300">
              {lang === 'es' ? 'Comida Veggie' : 'Veggie Food'}
            </span>
          </div>
          <span className="text-xs font-black text-emerald-300">{Math.round(resources.food)}</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden my-1">
          <div
            className={`h-full transition-all duration-500 ${getStatusColor(resources.food, resources.maxFood)}`}
            style={{ width: `${Math.min(100, Math.max(0, (resources.food / resources.maxFood) * 100))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>OSDR OSD-379</span>
          <span>{resources.food < 30 ? '🥬 Escasa' : '✅ Fresca'}</span>
        </div>
      </div>

      {/* 5. PROTECCIÓN RADIACIÓN */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 relative overflow-hidden group hover:border-violet-500/40 transition-all shadow-md">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-300">
              {lang === 'es' ? 'Escudo Regolito' : 'Regolith Shield'}
            </span>
          </div>
          <span className="text-xs font-black text-purple-300">{Math.round(resources.shieldIntegrity)}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden my-1">
          <div
            className={`h-full transition-all duration-500 ${getStatusColor(resources.shieldIntegrity, 100)}`}
            style={{ width: `${Math.min(100, Math.max(0, resources.shieldIntegrity))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span className="text-amber-400/90 font-medium">{resources.radiationExposure} mSv acum.</span>
          <span>DONKI Safe</span>
        </div>
      </div>

      {/* 6. DESCUBRIMIENTOS CIENTÍFICOS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-md">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-300">
              {lang === 'es' ? 'Ciencia NASA' : 'NASA Science'}
            </span>
          </div>
          <span className="text-xs font-black text-cyan-300">{resources.sciencePoints} pts</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden my-1">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${Math.min(100, (resources.sciencePoints / 100) * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>Datos Artemis/Jezero</span>
          <span className="text-cyan-300 font-bold">Nivel {Math.floor(resources.sciencePoints / 25) + 1}</span>
        </div>
      </div>
    </div>
  );
};
