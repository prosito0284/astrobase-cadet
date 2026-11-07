import React, { useState, useRef, useEffect } from 'react';
import { MissionEvent, MissionEventOption } from '../types/game';
import { Info } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface EventModalProps {
  event: MissionEvent | null;
  onSelectOption: (option: MissionEventOption) => void;
  lang: 'es' | 'en';
}

export const EventModal: React.FC<EventModalProps> = ({ event, onSelectOption, lang }) => {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const isChoosingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isChoosingRef.current = false;
    };
  }, []);

  if (!event) return null;

  const handleChoose = (opt: MissionEventOption, idx: number) => {
    if (isChoosingRef.current || selectedOptionIndex !== null) return;
    isChoosingRef.current = true;
    setSelectedOptionIndex(idx);
    soundFx.playClick();
    timeoutRef.current = setTimeout(() => {
      onSelectOption(opt);
      setSelectedOptionIndex(null);
      isChoosingRef.current = false;
    }, 300);
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-950/90 border-red-500 text-red-200';
      case 'high':
        return 'bg-amber-950/90 border-amber-500 text-amber-200';
      case 'medium':
        return 'bg-sky-950/90 border-sky-500 text-sky-200';
      default:
        return 'bg-slate-900 border-slate-700 text-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)] max-h-[92vh] overflow-y-auto">
        {/* Header with Severity & NASA Source */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${getSeverityStyle(event.severity)}`}>
              {lang === 'es' ? `ALERTA ${event.severity.toUpperCase()}` : `${event.severity.toUpperCase()} ALERT`}
            </span>
            <span className="text-xs font-bold text-slate-400">
              {event.category.toUpperCase()}
            </span>
          </div>
          {event.nasaReference && (
            <div className="flex items-center gap-1.5 bg-blue-950/80 border border-blue-500/40 px-2.5 py-1 rounded-full text-[11px] font-bold text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{event.nasaReference.source} OPEN DATA</span>
            </div>
          )}
        </div>

        {/* Title & Narrative */}
        <div className="my-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2">
            <span>🚨</span>
            <span>{lang === 'es' ? event.titleEs : event.titleEn}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            {lang === 'es' ? event.descriptionEs : event.descriptionEn}
          </p>
        </div>

        {/* Real NASA Data Callout Box */}
        {event.nasaReference && (
          <div className="my-3.5 bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-3 sm:p-3.5 shadow-inner">
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 mt-0.5">
                <Info className="w-4 h-4 flex-shrink-0" />
              </div>
              <div className="text-xs">
                <div className="font-extrabold text-cyan-300 tracking-wide flex items-center gap-1.5">
                  <span>{lang === 'es' ? 'Evidencia Científica de la NASA:' : 'NASA Science Ground Truth:'}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                    {event.nasaReference.datasetId}
                  </span>
                </div>
                <p className="text-slate-300 mt-1 leading-normal">
                  {lang === 'es' ? event.nasaReference.realFactEs : event.nasaReference.realFactEn}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Decision Options: Trade-offs where every choice has a cost */}
        <div className="space-y-3 mt-4">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
            {lang === 'es' ? 'Selecciona la decisión de ingeniería:' : 'Choose engineering course of action:'}
          </div>

          {event.options.map((opt, idx) => {
            const isSelected = selectedOptionIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => handleChoose(opt, idx)}
                disabled={selectedOptionIndex !== null}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  isSelected
                    ? 'bg-cyan-900/60 border-cyan-400 ring-2 ring-cyan-400'
                    : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-700/80 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-black text-xs sm:text-sm text-cyan-200">
                    {idx + 1}. {lang === 'es' ? opt.labelEs : opt.labelEn}
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 uppercase whitespace-nowrap">
                    {lang === 'es' ? 'Compromiso' : 'Trade-off'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  {lang === 'es' ? opt.descriptionEs : opt.descriptionEn}
                </p>

                {/* Resource Cost vs Benefit Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/70 text-[11px] font-bold">
                  {/* Energy Delta */}
                  {opt.resourceDeltas.energy !== undefined && opt.resourceDeltas.energy !== 0 && (
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      opt.resourceDeltas.energy > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
                    }`}>
                      ⚡ {opt.resourceDeltas.energy > 0 ? `+${opt.resourceDeltas.energy}` : opt.resourceDeltas.energy} Energía
                    </span>
                  )}
                  {/* Oxygen Delta */}
                  {opt.resourceDeltas.oxygen !== undefined && opt.resourceDeltas.oxygen !== 0 && (
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      opt.resourceDeltas.oxygen > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
                    }`}>
                      💨 {opt.resourceDeltas.oxygen > 0 ? `+${opt.resourceDeltas.oxygen}` : opt.resourceDeltas.oxygen}% Oxígeno
                    </span>
                  )}
                  {/* Water Delta */}
                  {opt.resourceDeltas.water !== undefined && opt.resourceDeltas.water !== 0 && (
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      opt.resourceDeltas.water > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
                    }`}>
                      💧 {opt.resourceDeltas.water > 0 ? `+${opt.resourceDeltas.water}` : opt.resourceDeltas.water} L Agua
                    </span>
                  )}
                  {/* Food Delta */}
                  {opt.resourceDeltas.food !== undefined && opt.resourceDeltas.food !== 0 && (
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      opt.resourceDeltas.food > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
                    }`}>
                      🥗 {opt.resourceDeltas.food > 0 ? `+${opt.resourceDeltas.food}` : opt.resourceDeltas.food} Comida
                    </span>
                  )}
                  {/* Radiation exposure */}
                  {opt.resourceDeltas.radiationExposure !== undefined && opt.resourceDeltas.radiationExposure > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-red-950 text-red-300 border border-red-700 flex items-center gap-1">
                      ☢️ +{opt.resourceDeltas.radiationExposure} mSv Radiación
                    </span>
                  )}
                  {/* Science Points */}
                  {opt.resourceDeltas.sciencePoints !== undefined && opt.resourceDeltas.sciencePoints !== 0 && (
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      opt.resourceDeltas.sciencePoints > 0 ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
                    }`}>
                      🔬 {opt.resourceDeltas.sciencePoints > 0 ? `+${opt.resourceDeltas.sciencePoints}` : opt.resourceDeltas.sciencePoints} Ciencia
                    </span>
                  )}
                  {/* Health impact */}
                  {opt.crewHealthDelta !== undefined && opt.crewHealthDelta !== 0 && (
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      opt.crewHealthDelta > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
                    }`}>
                      ❤️ {opt.crewHealthDelta > 0 ? `+${opt.crewHealthDelta}` : opt.crewHealthDelta} Salud
                    </span>
                  )}
                  {/* Morale impact */}
                  {opt.crewMoraleDelta !== undefined && opt.crewMoraleDelta !== 0 && (
                    <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      opt.crewMoraleDelta > 0 ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' : 'bg-stone-900 text-stone-400 border border-stone-700'
                    }`}>
                      😊 {opt.crewMoraleDelta > 0 ? `+${opt.crewMoraleDelta}` : opt.crewMoraleDelta} Moral
                    </span>
                  )}
                </div>

                {/* Educational Takeaway Preview */}
                <div className="mt-2 text-[10px] text-amber-300/90 italic flex items-center gap-1">
                  <span>💡</span>
                  <span>{lang === 'es' ? opt.educationalTakeawayEs : opt.educationalTakeawayEn}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
