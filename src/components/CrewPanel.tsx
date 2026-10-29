import React from 'react';
import { Astronaut } from '../types/game';
import { 
  Users, 
  Heart, 
  Smile, 
  Award, 
  Activity,
  CheckCircle,
  Shield
} from 'lucide-react';

interface CrewPanelProps {
  crew: Astronaut[];
  lang: 'es' | 'en';
}

export const CrewPanel: React.FC<CrewPanelProps> = ({ crew, lang }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-100">
              {lang === 'es' ? 'Tripulación de la Misión (NASA Artemis / Ares)' : 'Mission Astronaut Crew (NASA Artemis / Ares)'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {lang === 'es' 
                ? 'Monitorea el bienestar físico y psicológico según estudios biomédicos de la NASA (OSDR).' 
                : 'Track physical & psychological well-being based on NASA biological studies (OSDR).'}
            </p>
          </div>
        </div>
      </div>

      {/* Crew Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {crew.map((member) => (
          <div 
            key={member.id}
            className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-md group"
          >
            <div>
              <div className="flex items-start gap-2.5">
                <div className="text-3xl p-1.5 rounded-xl bg-slate-900 border border-slate-700/60 shadow-sm flex items-center justify-center">
                  {member.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-black text-slate-100 truncate">
                    {member.name}
                  </h3>
                  <div className="text-[10px] font-bold text-cyan-400 truncate">
                    {member.role}
                  </div>
                  <div className="text-[10px] text-slate-400 italic line-clamp-2 mt-1">
                    {member.quote}
                  </div>
                </div>
              </div>
            </div>

            {/* Health & Morale meters */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
              {/* Health */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Heart className="w-3 h-3 text-rose-400" />
                    {lang === 'es' ? 'Salud Física' : 'Physical Health'}
                  </span>
                  <span className={member.health > 70 ? 'text-emerald-400' : 'text-amber-400'}>
                    {member.health}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-0.5">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      member.health > 70 ? 'bg-emerald-500' : member.health > 40 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, member.health))}%` }}
                  />
                </div>
              </div>

              {/* Morale */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Smile className="w-3 h-3 text-amber-400" />
                    {lang === 'es' ? 'Moral & Ánimo' : 'Crew Morale'}
                  </span>
                  <span className={member.morale > 70 ? 'text-indigo-300' : 'text-amber-300'}>
                    {member.morale}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-0.5">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      member.morale > 70 ? 'bg-indigo-500' : member.morale > 40 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, member.morale))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
