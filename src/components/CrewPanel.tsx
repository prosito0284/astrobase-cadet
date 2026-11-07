import React from 'react';
import { Astronaut, GameDifficulty } from '../types/game';
import { 
  Users, 
  Heart, 
  Smile, 
  Skull,
  AlertTriangle,
  Activity,
  Zap
} from 'lucide-react';

interface CrewPanelProps {
  crew: Astronaut[];
  difficulty: GameDifficulty;
  lang: 'es' | 'en';
}

export const CrewPanel: React.FC<CrewPanelProps> = ({ crew, difficulty, lang }) => {
  const aliveCount = crew.filter(c => c.status !== 'deceased').length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-100 flex items-center gap-2">
              <span>{lang === 'es' ? 'Tripulación de la Misión' : 'Mission Astronaut Crew'}</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                aliveCount === crew.length 
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' 
                  : aliveCount > 0 
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
                  : 'bg-rose-950/80 border-rose-500 text-rose-300 animate-bounce'
              }`}>
                {aliveCount} / {crew.length} {lang === 'es' ? 'Sobrevivientes' : 'Survivors'}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {difficulty === 'facil'
                ? (lang === 'es' 
                    ? 'Modo Fácil: Los astronautas son inmortales al hambre y sed, con moral protegida.'
                    : 'Easy Mode: Astronauts are immune to hunger and thirst with shielded morale.')
                : difficulty === 'normal'
                ? (lang === 'es'
                    ? 'Modo Normal: El O₂ se consume por cada astronauta vivo. Si la salud llega a 0, fallecen.'
                    : 'Normal Mode: O₂ consumption is per living human. Health hitting 0 is fatal.')
                : (lang === 'es'
                    ? 'Modo Difícil: Supervivencia extrema. Consumo +15%, moral -25%, fallos eléctricos y asfixia en 1s.'
                    : 'Hard Mode: Extreme survival. +15% water use, -25% morale, electrical shocks and 1s asphyxiation.')}
            </p>
          </div>
        </div>
      </div>

      {/* Crew Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {crew.map((member) => {
          const isDead = member.status === 'deceased';
          const isCritical = member.status === 'critical' || member.health < 25;

          return (
            <div 
              key={member.id}
              className={`rounded-xl p-3 flex flex-col justify-between transition-all shadow-md group border ${
                isDead
                  ? 'bg-red-950/40 border-red-900/80 opacity-75'
                  : isCritical
                  ? 'bg-slate-950/90 border-amber-500/80 shadow-amber-950/30 ring-1 ring-amber-500/40'
                  : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/40'
              }`}
            >
              <div>
                <div className="flex items-start gap-2.5">
                  <div className={`text-3xl p-1.5 rounded-xl border shadow-sm flex items-center justify-center ${
                    isDead 
                      ? 'bg-black border-red-700' 
                      : 'bg-slate-900 border-slate-700/60'
                  }`}>
                    {isDead ? '🪦' : member.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className={`text-xs font-black truncate ${isDead ? 'text-red-400 line-through' : 'text-slate-100'}`}>
                        {member.name}
                      </h3>
                      {isDead && (
                        <span className="text-[8px] bg-red-700 text-white font-black px-1 rounded uppercase">
                          FALLECIDO
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] font-bold text-cyan-400 truncate">
                      {member.role}
                    </div>

                    {member.isAssignedToMine && !isDead && (
                      <span className="inline-block mt-0.5 text-[9px] bg-blue-900/80 text-blue-300 border border-blue-500/50 px-1.5 py-0.2 rounded font-bold">
                        ⛏️ {lang === 'es' ? 'En Mina Hielo' : 'In Ice Mine'}
                      </span>
                    )}

                    {(member.isShockDisabledDays ?? 0) > 0 && !isDead && (
                      <span className="inline-block mt-0.5 text-[9px] bg-amber-900/80 text-amber-300 border border-amber-500/50 px-1.5 py-0.2 rounded font-bold animate-pulse">
                        ⚡ {lang === 'es' ? `Incapacitado (${member.isShockDisabledDays}d)` : `Shocked (${member.isShockDisabledDays}d)`}
                      </span>
                    )}

                    {isDead ? (
                      <div className="text-[10px] text-red-300 font-bold mt-1 flex items-center gap-1">
                        <Skull className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span className="truncate">{member.causeOfDeath || 'Causa: Soporte vital agotado'}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic line-clamp-2 mt-1">
                        {member.quote}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Health & Morale meters */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                {/* Health */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Heart className={`w-3 h-3 ${isDead ? 'text-slate-400' : 'text-rose-400'}`} />
                      {lang === 'es' ? 'Salud Física' : 'Physical Health'}
                    </span>
                    <span className={isDead ? 'text-red-500 font-black' : member.health > 70 ? 'text-emerald-400' : 'text-amber-400'}>
                      {member.health}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-0.5">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        isDead ? 'bg-red-900' : member.health > 70 ? 'bg-emerald-500' : member.health > 30 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, member.health))}%` }}
                    />
                  </div>
                </div>

                {/* Morale */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Smile className={`w-3 h-3 ${isDead ? 'text-slate-400' : 'text-amber-400'}`} />
                      {lang === 'es' ? 'Moral & Ánimo' : 'Crew Morale'}
                    </span>
                    <span className={isDead ? 'text-slate-400' : member.morale > 70 ? 'text-indigo-300' : 'text-amber-300'}>
                      {member.morale}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-0.5">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        isDead ? 'bg-slate-800' : member.morale > 70 ? 'bg-indigo-500' : member.morale > 30 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, member.morale))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
