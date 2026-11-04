import React, { useState, useRef } from 'react';
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
  Award,
  Mic,
  MicOff,
  History,
  Sprout,
  Compass,
  GraduationCap,
  Maximize,
  Minimize,
  TreePine,
  Music,
  Medal,
  FileText,
  User
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { PlanetGlobeSelectorModal } from './globe3d/PlanetGlobeSelectorModal';

interface NavbarProps {
  currentDay: number;
  totalDays: number;
  location: BaseLocation;
  difficulty: GameDifficulty;
  isMuted: boolean;
  isVoiceEnabled: boolean;
  activeCrisisTitle: string | null;
  onAdvanceDay: () => void;
  onOpenDossier: () => void;
  onOpenGuide: () => void;
  onOpenReport: () => void;
  onOpenBotanicalLab: () => void;
  onOpenRoverMission: () => void;
  onOpenHistoricalCrises: () => void;
  onOpenNasaQuiz: () => void;
  isBatteryFault: boolean;
  wiringErrorActive?: boolean;
  canExpandPopulation?: boolean;
  commanderName?: string;
  isMusicPlaying?: boolean;
  unlockedAchievementsCount?: number;
  onOpenCommanderProfile?: () => void;
  onToggleMusic?: () => void;
  onOpenAchievements?: () => void;
  onOpenFlightLog?: () => void;
  onOpenWiring: () => void;
  onOpenIceMine: () => void;
  onOpenPopulationExpansion?: () => void;
  onToggleMute: () => void;
  onToggleVoice: () => void;
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
  isVoiceEnabled,
  activeCrisisTitle,
  isBatteryFault,
  wiringErrorActive,
  canExpandPopulation,
  commanderName,
  isMusicPlaying,
  unlockedAchievementsCount,
  onOpenCommanderProfile,
  onToggleMusic,
  onOpenAchievements,
  onOpenFlightLog,
  onAdvanceDay,
  onOpenDossier,
  onOpenGuide,
  onOpenReport,
  onOpenBotanicalLab,
  onOpenRoverMission,
  onOpenHistoricalCrises,
  onOpenNasaQuiz,
  onOpenWiring,
  onOpenIceMine,
  onOpenPopulationExpansion,
  onToggleMute,
  onToggleVoice,
  onChangeLocation,
  onChangeDifficulty,
  lang,
  onToggleLang,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGlobeModalOpen, setIsGlobeModalOpen] = useState(false);
  const lastAdvanceTimeRef = useRef<number>(0);
  const [isAdvanceThrottled, setIsAdvanceThrottled] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-cyan-500/30 sticky top-0 z-40 px-3 py-2 shadow-xl shadow-cyan-950/20">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Brand / Logo + TEAM BRANDING: TRONCOS INTERGALÁCTICOS */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-cyan-700 to-indigo-900 border border-emerald-400/50 shadow-lg shadow-emerald-500/30 flex-shrink-0">
            <TreePine className="w-5 h-5 text-emerald-200" />
            <span className="absolute -bottom-1 -right-1 text-[8px] bg-red-600 font-black px-1 rounded text-white tracking-wider">
              NASA
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-sm sm:text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-100 to-amber-300">
                ASTROBASE CADET
              </h1>
              {/* Official Team Badge */}
              <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-950 to-teal-950 border border-emerald-400/60 text-emerald-300 shadow-sm shadow-emerald-950/60">
                <span>🌲</span>
                <span>Troncos Intergalácticos</span>
              </span>
              {activeCrisisTitle && (
                <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-red-950 border border-red-500 text-red-300 animate-pulse">
                  CRISIS: {activeCrisisTitle}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden md:block">
              {lang === 'es' 
                ? 'Desarrollado por Troncos Intergalácticos • Datos Abiertos de la NASA' 
                : 'Developed by Troncos Intergalácticos • NASA Open Science Data'}
            </p>
          </div>
        </div>

        {/* Center: Location & Day Controls */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1 shadow-inner">
          {/* Location Toggle & 3D Globe Selector */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700/60">
            {/* 3D Planet Globe Selector Modal Trigger */}
            <button
              onClick={() => {
                soundFx.playClick();
                setIsGlobeModalOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all bg-gradient-to-r from-blue-950 to-indigo-950 text-cyan-300 hover:text-white border border-cyan-500/40 hover:border-cyan-400 shadow-sm"
              title={lang === 'es' ? 'Abrir Selector de Misión Planetaria 3D' : 'Open 3D Planetary Globe Selector'}
            >
              <Globe2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden lg:inline">{lang === 'es' ? 'Misión 3D' : '3D Mission'}</span>
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                onChangeLocation('moon');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all ${
                location === 'moon'
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-cyan-300 shadow-sm border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-slate-300" />
              <span>{lang === 'es' ? 'Luna' : 'Moon'}</span>
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                onChangeLocation('mars');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all ${
                location === 'mars'
                  ? 'bg-gradient-to-r from-orange-950 to-amber-900 text-amber-300 shadow-sm border border-amber-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5 text-orange-400" />
              <span>{lang === 'es' ? 'Marte' : 'Mars'}</span>
            </button>
          </div>

          {/* Sol / Day Badge */}
          <div className="text-center px-1">
            <div className="text-[9px] uppercase font-bold text-slate-400">
              {location === 'mars' ? 'Sol' : (lang === 'es' ? 'Día' : 'Day')}
            </div>
            <div className="text-xs sm:text-sm font-black text-amber-300">
              {currentDay} <span className="text-[10px] text-slate-500 font-semibold">/ {totalDays}</span>
            </div>
          </div>

          {/* Advance Turn Button or Completed Certificate Button */}
          {currentDay >= totalDays ? (
            <button
              onClick={() => {
                soundFx.playVictory();
                onOpenReport();
              }}
              className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs px-2.5 sm:px-3 py-1.5 rounded-lg shadow-md shadow-amber-900/40 transition-all transform hover:scale-[1.03] active:scale-[0.98] border border-amber-300"
            >
              <span>🏆</span>
              <span>{lang === 'es' ? 'Ver Certificado' : 'View Certificate'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                const now = Date.now();
                if (now - lastAdvanceTimeRef.current < 400 || isAdvanceThrottled) return;
                lastAdvanceTimeRef.current = now;
                setIsAdvanceThrottled(true);
                soundFx.playToggleOn();
                onAdvanceDay();
                setTimeout(() => setIsAdvanceThrottled(false), 400);
              }}
              disabled={isAdvanceThrottled}
              className={`flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg shadow-md shadow-emerald-900/40 transition-all transform hover:scale-[1.03] active:scale-[0.98] border border-emerald-400/40 ${isAdvanceThrottled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FastForward className="w-3.5 h-3.5 fill-white" />
              <span>{lang === 'es' ? 'Siguiente Día' : 'Next Day'}</span>
            </button>
          )}
        </div>

        {/* Feature Tools Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Botanical Lab Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenBotanicalLab();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-all"
            title="Laboratorio Botánico OSDR"
          >
            <Sprout className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">{lang === 'es' ? 'Invernadero' : 'Veggie'}</span>
          </button>

          {/* Ice Mine Button (Requires 2 Astronauts) */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenIceMine();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-950/70 hover:bg-blue-900/80 border border-blue-500/50 text-blue-300 text-xs font-bold transition-all"
            title="Mina de Hielo Criogénica (Requiere 2 astronautas)"
          >
            <span className="text-xs">⛏️</span>
            <span className="hidden lg:inline">{lang === 'es' ? 'Mina Hielo' : 'Ice Mine'}</span>
          </button>

          {/* Battery Failure Indicator & Wiring Repair Button */}
          {isBatteryFault && (
            <button
              onClick={() => {
                soundFx.playAlert();
                onOpenWiring();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950 border border-red-500 text-red-200 text-xs font-black transition-all animate-bounce shadow-md shadow-red-950"
              title="¡Alerta de Cortocircuito en Baterías! Haz clic para abrir el minijuego de cableado"
            >
              <span className="text-xs">⚡</span>
              <span>{lang === 'es' ? 'Fallo Batería (Cablear)' : 'Fix Wiring!'}</span>
            </button>
          )}

          {/* Hard Mode Wiring Error / Sudden Light Drop Indicator */}
          {wiringErrorActive && (
            <button
              onClick={() => {
                soundFx.playAlert();
                onOpenWiring();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-500 text-amber-200 text-xs font-black transition-all animate-pulse shadow-md shadow-amber-950"
              title="¡Fallo de cableado general! La iluminación ha caído y el O2 se escapa. Requiere 2 astronautas para reparar."
            >
              <span className="text-xs">💡</span>
              <span>{lang === 'es' ? 'Fallo Luz (2 Astronautas)' : 'Fix Light Wiring (2 Crew)'}</span>
            </button>
          )}

          {/* Population Expansion Day 15 Button */}
          {canExpandPopulation && onOpenPopulationExpansion && (
            <button
              onClick={() => {
                soundFx.playVictory();
                onOpenPopulationExpansion();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs font-black transition-all animate-bounce shadow-md shadow-emerald-950"
              title="¡Protocolo de Expansión de Tripulación Disponible! Aumenta de 4 a 6 astronautas sacrificando 25% de recursos."
            >
              <span className="text-xs">👥</span>
              <span>{lang === 'es' ? '+2 Astronautas (Día 15)' : 'Expand Crew (Day 15)'}</span>
            </button>
          )}

          {/* Rover Mission Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenRoverMission();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all"
            title="Expediciones con Rover ISRU"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">{lang === 'es' ? 'Rover ISRU' : 'Rover'}</span>
          </button>

          {/* Historical Crises Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenHistoricalCrises();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-950/70 hover:bg-red-900/80 border border-red-500/50 text-red-300 text-xs font-bold transition-all"
            title="Crisis Históricas de la NASA"
          >
            <History className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden xl:inline">{lang === 'es' ? 'Crisis Reales' : 'Crises'}</span>
          </button>

          {/* NASA Quiz Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenNasaQuiz();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 text-amber-300 text-xs font-bold transition-all"
            title="Quiz STEM de la NASA"
          >
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Quiz</span>
          </button>

          {/* Commander Profile Button */}
          {onOpenCommanderProfile && (
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenCommanderProfile();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/60 text-cyan-200 text-xs font-black transition-all shadow-sm"
              title="Perfil y Credenciales del Comandante"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline truncate max-w-[120px]">
                {commanderName || (lang === 'es' ? 'Comandante' : 'Commander')}
              </span>
            </button>
          )}

          {/* NASA Achievements Showcase Button */}
          {onOpenAchievements && (
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenAchievements();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 text-amber-300 text-xs font-bold transition-all"
              title="Vitrina de Medallas y Logros de la NASA"
            >
              <Medal className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">{unlockedAchievementsCount ?? 0}/10 {lang === 'es' ? 'Logros' : 'Badges'}</span>
            </button>
          )}

          {/* Mission Flight Log Button */}
          {onOpenFlightLog && (
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenFlightLog();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all"
              title="Bitácora de Vuelo y Telemetría Histórica"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden lg:inline">{lang === 'es' ? 'Bitácora' : 'Log'}</span>
            </button>
          )}

          {/* NASA Dossier */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenDossier();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-900/70 hover:bg-blue-800/80 border border-blue-500/50 text-blue-200 text-xs font-bold transition-all"
            title="Datos Abiertos NASA"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden md:inline">{lang === 'es' ? 'Datos NASA' : 'Data'}</span>
          </button>

          {/* Mission Report */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenReport();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-600/40 text-amber-300 text-xs font-bold transition-all"
            title="Informe de Misión y Certificado"
          >
            <Award className="w-3.5 h-3.5" />
          </button>

          {/* Space Ambient Music Toggle Button */}
          {onToggleMusic && (
            <button
              onClick={onToggleMusic}
              className={`p-1.5 rounded-lg border transition-all ${
                isMusicPlaying
                  ? 'bg-indigo-950/90 border-indigo-400 text-indigo-200 shadow-sm shadow-indigo-500/50 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
              title={isMusicPlaying ? 'Música Espacial Activa (Clic para pausar)' : 'Activar Música Ambiental Espacial'}
            >
              <Music className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Voice Narration Toggle Button */}
          <button
            onClick={onToggleVoice}
            className={`p-1.5 rounded-lg border transition-all ${
              isVoiceEnabled 
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/30' 
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title={isVoiceEnabled ? 'Voz Natural de Capcom NOVA Activa' : 'Activar Voz Natural de Capcom NOVA'}
          >
            {isVoiceEnabled ? <Mic className="w-3.5 h-3.5 text-cyan-300" /> : <MicOff className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {/* Difficulty Dropdown */}
          <select
            value={difficulty}
            onChange={(e) => {
              soundFx.playClick();
              onChangeDifficulty(e.target.value as GameDifficulty);
            }}
            className="bg-slate-900 border border-slate-700 text-xs font-bold rounded-lg px-2 py-1 text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
            title="Selecciona la dificultad de la simulación"
          >
            <option value="facil">🟢 {lang === 'es' ? 'Fácil (Sin Hambre/Sed)' : 'Easy (Immune)'}</option>
            <option value="normal">🔴 {lang === 'es' ? 'Normal (O₂ por persona & Letal)' : 'Normal (Realistic)'}</option>
            <option value="dificil">🔥 {lang === 'es' ? 'Difícil (Supervivencia Extrema)' : 'Hard (Extreme Survival)'}</option>
          </select>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all hidden sm:block"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (Proyector/Aula)'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-amber-300" /> : <Maximize className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {/* NOVA Guide Tutorial */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenGuide();
            }}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-2 py-1 rounded-lg transition-all"
            title="Asistente de Vuelo Capcom NOVA"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">NOVA</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="text-[10px] font-black uppercase px-2 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-300 hover:border-cyan-500 transition-all"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </div>

      {/* 3D Interactive Planetary Globe Selector Modal */}
      <PlanetGlobeSelectorModal
        isOpen={isGlobeModalOpen}
        onClose={() => setIsGlobeModalOpen(false)}
        currentLocation={location}
        onSelectLocation={(loc) => {
          onChangeLocation(loc);
        }}
        lang={lang}
      />
    </header>
  );
};
