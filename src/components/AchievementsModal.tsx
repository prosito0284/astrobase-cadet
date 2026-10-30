import React from 'react';
import { Achievement } from '../types/game';
import { 
  Award, 
  X, 
  CheckCircle2, 
  Lock, 
  Sparkles,
  Medal,
  TreePine
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
  lang: 'es' | 'en';
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
  lang,
}) => {
  if (!isOpen) return null;

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const progressPercent = Math.round((unlockedCount / achievements.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.35)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30">
              <Medal className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Vitrina de Medallas y Logros de la NASA' : 'NASA Mission Badges & Achievements'}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  {unlockedCount} / {achievements.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === 'es' 
                  ? 'Condecoraciones espaciales otorgadas por el equipo Troncos Intergalácticos y la NASA.' 
                  : 'Space honors awarded by Team Troncos Intergalácticos and NASA.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="my-3.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {lang === 'es' ? 'Progreso de Condecoraciones Cósmicas' : 'Cosmic Honors Progress'}
            </span>
            <span className="text-amber-400 font-mono">{progressPercent}% Completado</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-500 shadow-md shadow-amber-500/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="overflow-y-auto pr-1 space-y-2.5 flex-1 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {achievements.map((ach) => {
              return (
                <div
                  key={ach.id}
                  className={`p-3 rounded-2xl border transition-all flex items-start gap-3 relative overflow-hidden ${
                    ach.unlocked
                      ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/60 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-60'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border shadow-inner ${
                    ach.unlocked
                      ? 'bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border-amber-400/50 shadow-amber-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-600 grayscale'
                  }`}>
                    {ach.unlocked ? ach.icon : <Lock className="w-5 h-5 text-slate-600" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-black truncate ${
                        ach.unlocked ? 'text-amber-300' : 'text-slate-400'
                      }`}>
                        {lang === 'es' ? ach.titleEs : ach.titleEn}
                      </h4>
                      {ach.unlocked ? (
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500 px-1.5 py-0.2 rounded font-black flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {ach.unlockedAtDay ? `DÍA ${ach.unlockedAtDay}` : 'OK'}
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded font-bold">
                          BLOQUEADO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {lang === 'es' ? ach.descriptionEs : ach.descriptionEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <TreePine className="w-4 h-4 text-emerald-300" />
            <span>Troncos Intergalácticos STEM</span>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
          >
            {lang === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
