import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  AlertTriangle, 
  ShieldAlert
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';

interface PopulationExpansionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExpansion: () => void;
  currentResources: {
    oxygen: number;
    water: number;
    energy: number;
    food: number;
  };
  lang: 'es' | 'en';
  difficulty?: 'facil' | 'normal' | 'dificil';
  currentDay?: number;
}

export const PopulationExpansionModal: React.FC<PopulationExpansionModalProps> = ({
  isOpen,
  onClose,
  onConfirmExpansion,
  currentResources,
  lang,
  difficulty,
  currentDay,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
      isSubmittingRef.current = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const MIN_SUPPLIES = 20;
  const hasMinOxygen = currentResources.oxygen >= MIN_SUPPLIES;
  const hasMinWater = currentResources.water >= MIN_SUPPLIES;
  const hasMinEnergy = currentResources.energy >= MIN_SUPPLIES;
  const hasMinFood = currentResources.food >= MIN_SUPPLIES;
  const hasSupplies = hasMinOxygen && hasMinWater && hasMinEnergy && hasMinFood;

  const isDifficultyAllowed = difficulty === undefined || difficulty === 'dificil';
  const isDayAllowed = currentDay === undefined || currentDay >= 15;
  const canConfirm = isDifficultyAllowed && isDayAllowed && hasSupplies;

  const costO2 = Math.round(currentResources.oxygen * 0.25);
  const costWater = Math.round(currentResources.water * 0.25);
  const costEnergy = Math.round(currentResources.energy * 0.25);
  const costFood = Math.round(currentResources.food * 0.25);

  const handleAccept = () => {
    if (isSubmittingRef.current || isSubmitting || !canConfirm) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    soundFx.playVictory();
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    onConfirmExpansion();
    onClose();
    submitTimeoutRef.current = setTimeout(() => {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-[0_0_60px_rgba(16,185,129,0.35)] flex flex-col text-center">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/40">
              <UserPlus className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Protocolo de Expansión de Tripulación (Día 15)' : 'Crew Expansion Protocol (Day 15)'}</span>
                <span className="text-[10px] bg-emerald-600 text-white font-black px-1.5 py-0.2 rounded uppercase">
                  DÍA 15
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'es' 
                  ? 'Una nave de transferencia de la NASA ha llegado con 2 nuevos astronautas especialistas.' 
                  : 'A NASA transfer shuttle has rendezvoused with 2 new specialist crew members.'}
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

        {/* Precondition Warnings (if requirements not met) */}
        {!canConfirm && (
          <div className="my-3 p-3 rounded-2xl bg-rose-950/70 border border-rose-600 text-left text-xs text-rose-200 space-y-1 animate-pulse">
            <div className="flex items-center gap-1.5 font-black text-rose-300">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{lang === 'es' ? 'PRECONDICIONES DE SEGURIDAD NO CUMPLIDAS:' : 'SAFETY PRECONDITIONS NOT MET:'}</span>
            </div>
            {!isDifficultyAllowed && (
              <p className="text-[11px]">
                • {lang === 'es' ? 'La expansión solo está autorizada en Modo Difícil.' : 'Expansion is only authorized in Hard Mode.'}
              </p>
            )}
            {!isDayAllowed && (
              <p className="text-[11px]">
                • {lang === 'es' ? `El transbordador se acopla a partir del Día 15 (Día actual: ${currentDay}).` : `Shuttle docks from Day 15 onwards (Current Day: ${currentDay}).`}
              </p>
            )}
            {!hasSupplies && (
              <p className="text-[11px]">
                • {lang === 'es' 
                    ? `Suministros mínimos requeridos: 20 en cada recurso (O₂, H₂O, Batería, Comida) para no expandir gratis con tanques vacíos.` 
                    : `Minimum base supplies required: 20 in each resource (O2, H2O, Power, Food) to prevent zero-cost expansion with empty tanks.`}
              </p>
            )}
          </div>
        )}

        {/* New Astronauts Preview */}
        <div className="my-3 grid grid-cols-2 gap-3 text-left">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
            <span className="text-3xl">🧑‍🚀</span>
            <div>
              <h4 className="text-xs font-black text-slate-100">Cadete Santi Gomez</h4>
              <span className="text-[10px] text-cyan-400 block font-semibold">Robótica & DSN</span>
              <span className="text-[9px] text-slate-400">Repara fallos y cableados rápido.</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-2.5">
            <span className="text-3xl">👩‍⚕️</span>
            <div>
              <h4 className="text-xs font-black text-slate-100">Dra. Elena Ruiz</h4>
              <span className="text-[10px] text-emerald-400 block font-semibold">Médico & Radiación</span>
              <span className="text-[9px] text-slate-400">Soporte celular y moral.</span>
            </div>
          </div>
        </div>

        {/* Cost & Conditions */}
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-600/50 text-xs text-left space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{lang === 'es' ? 'Sacrificio del 25% de Todos los Recursos Acumulados:' : 'Cost: 25% of All Stored Resources:'}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-mono font-bold">
            <span className={`p-1 rounded ${hasMinOxygen ? 'bg-black/50 text-sky-300' : 'bg-red-950 text-red-300 border border-red-700'}`}>
              -{costO2}% O₂
            </span>
            <span className={`p-1 rounded ${hasMinWater ? 'bg-black/50 text-blue-300' : 'bg-red-950 text-red-300 border border-red-700'}`}>
              -{costWater}L H₂O
            </span>
            <span className={`p-1 rounded ${hasMinEnergy ? 'bg-black/50 text-amber-300' : 'bg-red-950 text-red-300 border border-red-700'}`}>
              -{costEnergy}% Batería
            </span>
            <span className={`p-1 rounded ${hasMinFood ? 'bg-black/50 text-emerald-300' : 'bg-red-950 text-red-300 border border-red-700'}`}>
              -{costFood} Comida
            </span>
          </div>

          <div className="text-[11px] text-slate-300 pt-1 border-t border-amber-900/60 leading-normal">
            ℹ️ <b>Impacto en la Mina de Hielo:</b> Al aumentar la población a 6 astronautas, la mina volverá a requerir <b>2 personas</b> para operar, con una disminución del 40% en su recolección total por sobrecarga de consumo.
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
          >
            {lang === 'es' ? 'Rechazar (Permanecer en 4)' : 'Decline (Stay at 4)'}
          </button>

          <button
            onClick={handleAccept}
            disabled={!canConfirm || isSubmitting}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs shadow-lg border transition-all ${
              !canConfirm || isSubmitting
                ? 'bg-slate-800 border-slate-700 text-slate-500 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 border-emerald-400/40 transform hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isSubmitting
              ? (lang === 'es' ? 'Acoplando...' : 'Docking...')
              : !canConfirm
                ? (lang === 'es' ? 'Requisitos no cumplidos' : 'Preconditions Not Met')
                : (lang === 'es' ? '¡Aceptar y Aumentar a 6!' : 'Accept & Expand to 6!')}
          </button>
        </div>
      </div>
    </div>
  );
};
