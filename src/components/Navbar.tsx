import React from 'react';
import { BaseLocation, GameDifficulty } from '../types/game';
import { 
  Rocket, 
  Volume2, 
  VolumeX, 
  HelpCircle, 
  BookOpen, 
  FastForward, 
  Moon, 
  Globe2, 
  Sparkles,
  Award
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface NavbarProps {
  currentDay: number;
  totalDays: number;
  location: BaseLocation;
  difficulty: GameDifficulty;
  isMuted: boolean;
  onAdvanceDay: () => void;
  onOpenDossier: () => void;
  onOpenGuide: () => void;
  onOpenReport: () => void;
  onToggleMute: () => void;
  onChangeLocation: (loc: BaseLocation) => void;
  onChangeDifficulty: (diff: GameDifficulty) => void;
  lang: 'es' | 'en';
  onToggleLang: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDay,
  totalDays,
  location,
  difficulty,
  isMuted,
  onAdvanceDay,
  onOpenDossier,
  onOpenGuide,
  onOpenReport,
  onToggleMute,
  onChangeLocation,
  onChangeDifficulty,
  lang,
  onToggleLang,
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-cyan-500/30 sticky top-0 z-40 px-3 py-2.5 shadow-xl shadow-cyan-950/20">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-900 border border-cyan-400/40 shadow-lg shadow-cyan-500/30">
            <Rocket className="w-5 h-5 text-cyan-200 animate-pulse-subtle" />
            <span className="absolute -bottom-1 -right-1 text-[10px] bg-red-600 font-black px-1 rounded text-white tracking-wider">
              NASA
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-100 to-amber-300">
                ASTROBASE CADET
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                STEM Sim v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden md:block">
              {lang === 'es' 
                ? 'Simulador de Misiones Espaciales con Datos Abiertos de la NASA' 
                : 'Space Mission Simulator Powered by NASA Open Datasets'}
            </p>
          </div>
        </div>

        {/* Center: Mission Location & Day Progress */}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
          {/* Location Toggle */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700/60">
            <button
              onClick={() => {
                soundFx.playClick();
                onChangeLocation('moon');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                location === 'moon'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-cyan-300 shadow-sm border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Misión Artemis: Polo Sur Lunar"
            >
              <Moon className="w-3.5 h-3.5 text-slate-300" />
              <span>{lang === 'es' ? 'Luna' : 'Moon'}</span>
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                onChangeLocation('mars');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                location === 'mars'
                  ? 'bg-gradient-to-r from-orange-950 to-amber-900 text-amber-300 shadow-sm border border-amber-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Misión Ares: Cráter Jezero de Marte"
            >
              <Globe2 className="w-3.5 h-3.5 text-orange-400" />
              <span>{lang === 'es' ? 'Marte' : 'Mars'}</span>
            </button>
          </div>

          {/* Sol / Day Badge */}
          <div className="text-center px-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {location === 'mars' ? 'Sol' : (lang === 'es' ? 'Día Lunar' : 'Lunar Day')}
            </div>
            <div className="text-sm sm:text-base font-black text-amber-300">
              {currentDay} <span className="text-xs text-slate-500 font-semibold">/ {totalDays}</span>
            </div>
          </div>

          {/* Advance Turn Button */}
          <button
            onClick={() => {
              soundFx.playToggleOn();
              onAdvanceDay();
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm px-3 sm:px-4 py-1.5 rounded-lg shadow-md shadow-emerald-900/40 transition-all transform hover:scale-[1.03] active:scale-[0.98] border border-emerald-400/40"
          >
            <FastForward className="w-4 h-4 fill-white" />
            <span>{lang === 'es' ? 'Siguiente Día' : 'Next Day'}</span>
          </button>
        </div>

        {/* Right side: Tools, Dossier, Audio, Difficulty, Guide */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Difficulty Dropdown */}
          <select
            value={difficulty}
            onChange={(e) => {
              soundFx.playClick();
              onChangeDifficulty(e.target.value as GameDifficulty);
            }}
            className="bg-slate-900 border border-slate-700 text-xs font-semibold rounded-lg px-2 py-1.5 text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer hidden md:block"
          >
            <option value="cadet">🚀 {lang === 'es' ? 'Cadete (7-9 años)' : 'Cadet (7-9 yrs)'}</option>
            <option value="commander">🛰️ {lang === 'es' ? 'Comandante (10-12 años)' : 'Commander (10-12 yrs)'}</option>
            <option value="scientist">🔬 {lang === 'es' ? 'Científico NASA (Avanzado)' : 'NASA Scientist (Adv)'}</option>
          </select>

          {/* NASA Dossier Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenDossier();
            }}
            className="relative flex items-center gap-1.5 bg-gradient-to-r from-blue-900/70 to-indigo-900/70 hover:from-blue-800 hover:to-indigo-800 border border-blue-500/50 text-blue-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all shadow-sm"
            title="Ver Datos Abiertos de la NASA (DONKI, OSDR, Artemis, MEDA)"
          >
            <BookOpen className="w-4 h-4 text-cyan-300" />
            <span className="hidden lg:inline">{lang === 'es' ? 'Datos NASA' : 'NASA Data'}</span>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </button>

          {/* Mission Report / Certificate */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenReport();
            }}
            className="flex items-center gap-1 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-600/40 text-amber-300 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all"
            title="Ver Informe de Misión y Certificado"
          >
            <Award className="w-4 h-4" />
            <span className="hidden xl:inline">{lang === 'es' ? 'Informe' : 'Report'}</span>
          </button>

          {/* NOVA Guide Tutorial */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenGuide();
            }}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-2 py-1.5 rounded-lg transition-all"
            title="Asistente de Vuelo Capcom NOVA"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span className="hidden xl:inline">NOVA</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="text-[11px] font-black uppercase px-2 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-300 hover:border-cyan-500 transition-all"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
};
