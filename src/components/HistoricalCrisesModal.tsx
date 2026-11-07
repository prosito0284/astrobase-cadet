import React from 'react';
import { HISTORICAL_CRISES, HistoricalCrisis } from '../data/historicalCrises';
import { 
  Flame, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  History,
  Info
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface HistoricalCrisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCrisis: (crisis: HistoricalCrisis) => void;
  activeCrisisId: string | null;
  lang: 'es' | 'en';
}

export const HistoricalCrisesModal: React.FC<HistoricalCrisesModalProps> = ({
  isOpen,
  onClose,
  onSelectCrisis,
  activeCrisisId,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-red-500/60 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(239,68,68,0.25)] max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-600 to-rose-800 text-white shadow-md shadow-red-900/40">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Simulador de Crisis Históricas de la NASA' : 'NASA Historical Crisis Simulator'}</span>
                <span className="text-[10px] bg-red-700 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  REAL EVENTS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'es' 
                  ? 'Revive y supera las emergencias reales más intensas afrontadas por astronautas e ingenieros de vuelo.' 
                  : 'Relive and solve historic high-stakes emergencies faced by NASA flight directors and astronauts.'}
              </p>
            </div>
          </div>

          <button aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crisis Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-3">
          {HISTORICAL_CRISES.map(crisis => {
            const isActive = activeCrisisId === crisis.id;
            return (
              <div 
                key={crisis.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-red-950/80 border-red-500 ring-2 ring-red-500/50 shadow-xl'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{crisis.icon}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-700">
                        {crisis.badgeText}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      Año {crisis.year}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-100 mb-1">
                    {lang === 'es' ? crisis.titleEs : crisis.titleEn}
                  </h3>
                  <div className="text-[10px] font-bold text-cyan-400 mb-2">
                    Misión: {crisis.missionName}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {lang === 'es' ? crisis.descriptionEs : crisis.descriptionEn}
                  </p>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1 mb-2">
                    <div className="text-slate-400">
                      <span className="font-bold text-slate-200">🎯 {lang === 'es' ? 'Objetivo:' : 'Goal:'} </span>
                      {lang === 'es' ? crisis.objectiveEs : crisis.objectiveEn}
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400">
                      🛰️ {crisis.nasaDatasetRef}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">
                    Duración: {crisis.targetDays} {crisis.location === 'mars' ? 'Soles' : 'Días'}
                  </span>

                  <button
                    onClick={() => {
                      soundFx.playAlert();
                      onSelectCrisis(crisis);
                      onClose();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      isActive
                        ? 'bg-emerald-700 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40'
                    }`}
                  >
                    <span>{isActive ? (lang === 'es' ? 'Crisis Activa' : 'Active Crisis') : (lang === 'es' ? 'Comenzar Simulación' : 'Simulate Event')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
