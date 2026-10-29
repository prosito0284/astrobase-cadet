import React, { useState } from 'react';
import { BaseLocation, BaseModule } from '../types/game';
import { 
  Sun, 
  ShieldAlert, 
  Wind, 
  Sparkles, 
  Wifi, 
  AlertCircle,
  Eye,
  Info
} from 'lucide-react';

interface BaseViewProps {
  location: BaseLocation;
  modules: BaseModule[];
  currentDay: number;
  totalDays: number;
  radiationActive: boolean;
  dustStormActive: boolean;
  isLunarNight: boolean;
  onSelectModule: (moduleId: string) => void;
  selectedModuleId: string | null;
  lang: 'es' | 'en';
}

export const BaseView: React.FC<BaseViewProps> = ({
  location,
  modules,
  currentDay,
  radiationActive,
  dustStormActive,
  isLunarNight,
  onSelectModule,
  selectedModuleId,
  lang,
}) => {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  const isMoon = location === 'moon';

  // Find module states
  const solarModule = modules.find(m => m.id === 'solar_farm');
  const greenhouseModule = modules.find(m => m.id === 'greenhouse');
  const shieldModule = modules.find(m => m.id === 'regolith_shield');
  const bunkerModule = modules.find(m => m.id === 'storm_bunker');
  const iceModule = modules.find(m => m.id === 'water_ice_extractor');
  const commsModule = modules.find(m => m.id === 'comm_array');
  const labModule = modules.find(m => m.id === 'science_lab');

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950 transition-all select-none">
      {/* Dynamic Background: Sky & Celestial Bodies */}
      <div 
        className={`relative h-64 sm:h-80 w-full overflow-hidden transition-all duration-1000 ${
          isMoon 
            ? isLunarNight ? 'bg-gradient-to-b from-slate-950 via-zinc-950 to-slate-900' : 'bg-gradient-to-b from-black via-slate-950 to-slate-900'
            : dustStormActive ? 'bg-gradient-to-b from-amber-950/90 via-orange-950 to-stone-900' : 'bg-gradient-to-b from-amber-950/40 via-stone-900 to-amber-950/60'
        }`}
      >
        {/* Stars */}
        <div className="absolute inset-0 opacity-80 pointer-events-none">
          <div className="absolute top-4 left-10 w-1 h-1 bg-white rounded-full animate-ping" />
          <div className="absolute top-12 left-1/4 w-1.5 h-1.5 bg-blue-200 rounded-full" />
          <div className="absolute top-8 left-1/2 w-1 h-1 bg-white rounded-full" />
          <div className="absolute top-16 right-1/4 w-1 h-1 bg-amber-100 rounded-full" />
          <div className="absolute top-6 right-12 w-1.5 h-1.5 bg-cyan-200 rounded-full" />
          <div className="absolute top-20 right-1/3 w-0.5 h-0.5 bg-white rounded-full" />
        </div>

        {/* Celestial Body: Earth (from Moon) or Sun/Phobos (from Mars) */}
        {isMoon ? (
          <div className="absolute top-4 right-10 flex flex-col items-center pointer-events-none">
            {/* The Blue Marble: Earth */}
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-blue-700 via-sky-400 to-blue-200 shadow-[0_0_25px_rgba(56,189,248,0.5)] border border-sky-300/40 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/30 via-transparent to-black/60" />
              <div className="w-8 h-4 rounded-full bg-emerald-600/40 blur-[1px] transform -rotate-12" />
            </div>
            <span className="text-[10px] text-sky-300 font-bold tracking-widest mt-1 opacity-90 drop-shadow">
              TIERRA (384,400 km)
            </span>
          </div>
        ) : (
          <div className="absolute top-5 right-12 flex flex-col items-center pointer-events-none">
            {/* Mars Sun or Phobos */}
            <div className={`relative rounded-full shadow-[0_0_30px_rgba(251,191,36,0.4)] ${dustStormActive ? 'w-10 h-10 bg-amber-200/40 blur-[2px]' : 'w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-300'}`} />
            <span className="text-[10px] text-amber-300 font-bold tracking-wider mt-1 opacity-90">
              {dustStormActive ? 'SOL ATENUADO (Tau 2.1)' : 'SOL MARCIANO'}
            </span>
          </div>
        )}

        {/* Space Weather Alert Banners */}
        {radiationActive && (
          <div className="absolute top-3 left-4 z-20 flex items-center gap-2 bg-red-950/80 border border-red-500 text-red-200 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-sm animate-bounce">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="text-xs font-black">
              {lang === 'es' ? 'ALERTA DONKI: RADIACIÓN SOLAR ALTA' : 'DONKI ALERT: HIGH SOLAR RADIATION'}
            </span>
          </div>
        )}

        {dustStormActive && (
          <div className="absolute top-3 left-4 z-20 flex items-center gap-2 bg-amber-950/80 border border-amber-500 text-amber-200 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-sm animate-pulse">
            <Wind className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black">
              {lang === 'es' ? 'MEDA: TORMENTA DE POLVO ACTIVA (-75% SOLAR)' : 'MEDA: DUST STORM ACTIVE (-75% SOLAR)'}
            </span>
          </div>
        )}

        {isMoon && isLunarNight && (
          <div className="absolute top-3 left-4 z-20 flex items-center gap-2 bg-indigo-950/80 border border-indigo-400 text-indigo-200 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="text-xs font-black">
              {lang === 'es' ? 'GRAN NOCHE LUNAR (-180 °C, 14 DÍAS)' : 'LUNAR NIGHT (-180 °C, 14 DAYS)'}
            </span>
          </div>
        )}

        {/* Mountain Ridge / Crater Rims */}
        <svg 
          className="absolute bottom-16 sm:bottom-20 inset-x-0 w-full h-24 sm:h-32 pointer-events-none opacity-40" 
          viewBox="0 0 1000 200" 
          preserveAspectRatio="none"
        >
          {isMoon ? (
            // Lunar Crater Peaks
            <path 
              d="M0,160 Q120,40 250,150 T500,90 T750,170 T1000,100 L1000,200 L0,200 Z" 
              fill="#334155" 
            />
          ) : (
            // Martian Sand Dunes & Crater Rim
            <path 
              d="M0,170 Q180,80 380,160 T700,110 T1000,140 L1000,200 L0,200 Z" 
              fill="#7c2d12" 
            />
          )}
        </svg>

        {/* Surface Ground Terrain */}
        <div 
          className={`absolute bottom-0 inset-x-0 h-28 sm:h-36 transition-colors duration-700 ${
            isMoon 
              ? 'bg-gradient-to-t from-slate-900 via-slate-800 to-slate-700 border-t border-slate-600/40' 
              : 'bg-gradient-to-t from-amber-950 via-amber-900 to-orange-900/90 border-t border-amber-600/50'
          }`}
        >
          {/* Surface Craters / Boulders Texture */}
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          {/* Little Rover Exploring */}
          <div className="absolute bottom-5 right-20 sm:right-36 flex items-center gap-1 group cursor-pointer animate-pulse-subtle">
            <span className="text-xl sm:text-2xl drop-shadow-md">🚜</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-cyan-300 border border-cyan-500/30">
              Rover VIPER / Percy
            </span>
          </div>

          {/* Little Animated Astronauts */}
          <div className="absolute bottom-4 left-1/4 flex items-center gap-1 cursor-pointer">
            <span className="text-xl sm:text-2xl transform hover:scale-125 transition-transform" title="Dra. Valentina">👩‍🚀</span>
            <span className="text-xl sm:text-2xl transform hover:scale-125 transition-transform" title="Dr. Leo Chen">🧑‍🚀</span>
          </div>
        </div>

        {/* INTERACTIVE BASE MODULES ON THE SURFACE */}
        <div className="absolute bottom-4 inset-x-4 sm:inset-x-12 flex items-end justify-around gap-2 z-10">
          {/* 1. Deep Space Comms Array */}
          <button
            onClick={() => onSelectModule('comm_array')}
            onMouseEnter={() => setHoveredModule('comm_array')}
            onMouseLeave={() => setHoveredModule(null)}
            className={`group flex flex-col items-center transition-all transform hover:-translate-y-1.5 focus:outline-none ${
              selectedModuleId === 'comm_array' ? 'scale-110 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]' : ''
            }`}
          >
            <div className={`relative p-2.5 rounded-xl border backdrop-blur-md transition-all ${
              commsModule?.isActive 
                ? 'bg-sky-950/80 border-sky-400 text-sky-300 shadow-lg shadow-sky-500/20' 
                : 'bg-slate-900/80 border-slate-700 text-slate-500 opacity-60'
            }`}>
              <div className="text-2xl sm:text-3xl">📡</div>
              {commsModule?.isActive && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              )}
            </div>
            <span className="text-[10px] font-extrabold text-slate-200 mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 whitespace-nowrap">
              {lang === 'es' ? 'Antena DSN' : 'DSN Antenna'}
            </span>
          </button>

          {/* 2. Solar Farm */}
          <button
            onClick={() => onSelectModule('solar_farm')}
            onMouseEnter={() => setHoveredModule('solar_farm')}
            onMouseLeave={() => setHoveredModule(null)}
            className={`group flex flex-col items-center transition-all transform hover:-translate-y-1.5 focus:outline-none ${
              selectedModuleId === 'solar_farm' ? 'scale-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]' : ''
            }`}
          >
            <div className={`relative p-2.5 rounded-xl border backdrop-blur-md transition-all ${
              solarModule?.isActive && !dustStormActive && !isLunarNight
                ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20' 
                : 'bg-slate-900/80 border-slate-700 text-slate-500 opacity-70'
            }`}>
              <div className="text-2xl sm:text-3xl">☀️</div>
              {solarModule?.isActive && !dustStormActive && !isLunarNight && (
                <div className="absolute -top-1 -right-1 text-[10px] font-black bg-emerald-500 text-white px-1 rounded-full">
                  +35kW
                </div>
              )}
            </div>
            <span className="text-[10px] font-extrabold text-slate-200 mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 whitespace-nowrap">
              {lang === 'es' ? 'Paneles Solares' : 'Solar Farm'}
            </span>
          </button>

          {/* 3. Central Habitation & Regolith Dome */}
          <button
            onClick={() => onSelectModule('regolith_shield')}
            onMouseEnter={() => setHoveredModule('regolith_shield')}
            onMouseLeave={() => setHoveredModule(null)}
            className={`group flex flex-col items-center transition-all transform hover:-translate-y-2 focus:outline-none ${
              selectedModuleId === 'regolith_shield' ? 'scale-115 drop-shadow-[0_0_16px_rgba(168,85,247,0.9)]' : ''
            }`}
          >
            <div className={`relative p-3.5 rounded-2xl border-2 backdrop-blur-md transition-all ${
              shieldModule?.isActive 
                ? 'bg-indigo-950/90 border-indigo-400 text-indigo-200 shadow-xl shadow-indigo-500/30' 
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}>
              <div className="text-3xl sm:text-4xl">🏛️</div>
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black bg-purple-600 text-white px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                {lang === 'es' ? 'Cúpula Regolito' : 'Regolith Dome'}
              </div>
            </div>
            <span className="text-[10px] font-extrabold text-cyan-200 mt-1 px-2 py-0.5 rounded bg-slate-900/95 border border-cyan-500/50 whitespace-nowrap">
              {lang === 'es' ? 'Hábitat Principal' : 'Main Habitat'}
            </span>
          </button>

          {/* 4. Veggie Greenhouse Dome */}
          <button
            onClick={() => onSelectModule('greenhouse')}
            onMouseEnter={() => setHoveredModule('greenhouse')}
            onMouseLeave={() => setHoveredModule(null)}
            className={`group flex flex-col items-center transition-all transform hover:-translate-y-1.5 focus:outline-none ${
              selectedModuleId === 'greenhouse' ? 'scale-110 drop-shadow-[0_0_12px_rgba(34,197,94,0.8)]' : ''
            }`}
          >
            <div className={`relative p-2.5 rounded-xl border backdrop-blur-md transition-all ${
              greenhouseModule?.isActive 
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20' 
                : 'bg-slate-900/80 border-slate-700 text-slate-500 opacity-60'
            }`}>
              <div className="text-2xl sm:text-3xl">🌱</div>
              {greenhouseModule?.isActive && (
                <div className="absolute -bottom-1 -right-1 text-[9px] bg-emerald-600 text-white font-bold px-1 rounded">
                  OSDR
                </div>
              )}
            </div>
            <span className="text-[10px] font-extrabold text-slate-200 mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 whitespace-nowrap">
              {lang === 'es' ? 'Invernadero Veggie' : 'Veggie Dome'}
            </span>
          </button>

          {/* 5. Water Ice Extractor / ECLSS Drill */}
          <button
            onClick={() => onSelectModule('water_ice_extractor')}
            onMouseEnter={() => setHoveredModule('water_ice_extractor')}
            onMouseLeave={() => setHoveredModule(null)}
            className={`group flex flex-col items-center transition-all transform hover:-translate-y-1.5 focus:outline-none ${
              selectedModuleId === 'water_ice_extractor' ? 'scale-110 drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]' : ''
            }`}
          >
            <div className={`relative p-2.5 rounded-xl border backdrop-blur-md transition-all ${
              iceModule?.isActive 
                ? 'bg-blue-950/80 border-blue-400 text-blue-300 shadow-lg shadow-blue-500/20' 
                : 'bg-slate-900/80 border-slate-700 text-slate-500 opacity-60'
            }`}>
              <div className="text-2xl sm:text-3xl">⛏️</div>
              {iceModule?.isActive && (
                <div className="absolute -top-1 -right-1 text-[10px] text-cyan-300 font-bold">💧</div>
              )}
            </div>
            <span className="text-[10px] font-extrabold text-slate-200 mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 whitespace-nowrap">
              {lang === 'es' ? 'Mina de Hielo' : 'Ice Mine'}
            </span>
          </button>

          {/* 6. Subterranean Storm Bunker */}
          <button
            onClick={() => onSelectModule('storm_bunker')}
            onMouseEnter={() => setHoveredModule('storm_bunker')}
            onMouseLeave={() => setHoveredModule(null)}
            className={`group flex flex-col items-center transition-all transform hover:-translate-y-1.5 focus:outline-none ${
              selectedModuleId === 'storm_bunker' ? 'scale-110 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]' : ''
            }`}
          >
            <div className={`relative p-2.5 rounded-xl border backdrop-blur-md transition-all ${
              bunkerModule?.isActive 
                ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/30 animate-pulse' 
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}>
              <div className="text-2xl sm:text-3xl">🛡️</div>
              {bunkerModule?.isActive && (
                <div className="absolute -top-1 -right-1 text-[8px] bg-red-600 text-white font-black px-1 rounded-full">
                  ACTIVO
                </div>
              )}
            </div>
            <span className="text-[10px] font-extrabold text-slate-200 mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 whitespace-nowrap">
              {lang === 'es' ? 'Búnker Solar' : 'Storm Bunker'}
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Tooltip / Status hint at bottom of BaseView */}
      <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            {hoveredModule ? (
              <span className="text-cyan-300 font-medium">
                {modules.find(m => m.id === hoveredModule)?.nameEs}: {modules.find(m => m.id === hoveredModule)?.descriptionEs}
              </span>
            ) : (
              lang === 'es' 
                ? 'Haz clic en cualquier cúpula o módulo de la base para gestionar su energía o consultar su ciencia.'
                : 'Click any base module above to manage its power allocation or inspect its NASA science.'
            )}
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
          {location === 'moon' ? 'Luna: Cráter Shackleton' : 'Marte: Cráter Jezero (Perseverance)'}
        </span>
      </div>
    </div>
  );
};
