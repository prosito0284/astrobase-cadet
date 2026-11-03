import React, { useState, useRef } from 'react';
import { BaseLocation, GameDifficulty, Astronaut } from '../types/game';
import { 
  Skull, 
  RotateCcw, 
  ShieldAlert, 
  Sparkles,
  TreePine,
  CheckCircle2
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface GameOverModalProps {
  isOpen: boolean;
  location: BaseLocation;
  currentDay: number;
  crew: Astronaut[];
  primaryCause: string;
  onRestart: (difficulty?: GameDifficulty) => void;
  lang: 'es' | 'en';
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  location,
  currentDay,
  crew,
  primaryCause,
  onRestart,
  lang,
}) => {
  const isRestartingRef = useRef(false);
  const [isRestarting, setIsRestarting] = useState(false);

  if (!isOpen) return null;

  const handleRestartClick = (diff: GameDifficulty) => {
    if (isRestartingRef.current || isRestarting) return;
    isRestartingRef.current = true;
    setIsRestarting(true);
    if (diff === 'normal') {
      soundFx.playHarvest();
    } else {
      soundFx.playVictory();
    }
    onRestart(diff);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-lg animate-fadeIn">
      <div className="bg-slate-950 border-4 border-red-600 rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-[0_0_80px_rgba(220,38,38,0.5)] text-center relative overflow-hidden">
        {/* Glowing hazard pulse */}
        <div className="w-20 h-20 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce shadow-lg shadow-red-900/50">
          <Skull className="w-10 h-10 text-red-400" />
        </div>

        <div className="text-xs font-black uppercase tracking-widest text-red-500 mb-1">
          {location === 'moon' ? 'BASE LUNAR ARTEMIS' : 'BASE MARCIANA JEZERO'} • TELEMETRÍA PERDIDA
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">
          {lang === 'es' ? 'MISIÓN FRACASADA: LA TRIPULACIÓN NO SOBREVIVIÓ' : 'MISSION FAILED: CREW CASUALTY'}
        </h2>

        <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800 text-xs text-red-200 my-3 leading-relaxed">
          <span className="font-bold text-red-400 block mb-0.5">
            🚨 {lang === 'es' ? 'Causa Fatal Principal:' : 'Primary Cause:'}
          </span>
          {primaryCause}
        </div>

        {/* Fallen Astronauts List */}
        <div className="my-3 text-left bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
          <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
            <span>Días sobrevividos: <b className="text-amber-300">{currentDay}</b></span>
            <span>Bajas: <b className="text-red-400">{crew.length} / {crew.length}</b></span>
          </div>

          <div className="space-y-1.5 text-xs">
            {crew.map(c => (
              <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-black/40 border border-red-950">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <span>🪦</span>
                  <span>{c.name} ({c.role.split(' ')[0]})</span>
                </span>
                <span className="text-[10px] text-red-400 font-semibold truncate max-w-[200px]">
                  {c.causeOfDeath || 'Falla de soporte vital'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Educational Lesson */}
        <p className="text-[11px] text-slate-400 italic mb-5 leading-normal">
          {lang === 'es' 
            ? '«En el espacio profundo, un error en la reserva de energía hoy se convierte en una asfixia o congelación mañana. Cada decisión exige sacrificios calculados.»'
            : '«In deep space, saving energy today can lead to life support failure tomorrow. Survival requires ruthless engineering balance.»'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={() => handleRestartClick('normal')}
            disabled={isRestarting}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white text-xs font-black shadow-lg shadow-red-950/60 border border-red-500 transition-all ${isRestarting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{lang === 'es' ? 'Reintentar en Modo Normal' : 'Retry Normal Mode'}</span>
          </button>

          <button
            onClick={() => handleRestartClick('facil')}
            disabled={isRestarting}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/60 border border-emerald-400 transition-all ${isRestarting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'es' ? 'Cambiar a Modo Fácil (Sin Muertes)' : 'Switch to Easy Mode (No Casualties)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
