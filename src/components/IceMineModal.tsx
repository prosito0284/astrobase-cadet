import React, { useState, useEffect, useRef } from 'react';
import { Astronaut, GameDifficulty } from '../types/game';
import { 
  Droplets, 
  X, 
  Wind, 
  AlertTriangle, 
  ShieldAlert,
  WifiOff
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface IceMineModalProps {
  isOpen: boolean;
  onClose: () => void;
  crew: Astronaut[];
  assignedToMine: string[];
  difficulty: GameDifficulty;
  isCommBlackout: boolean;
  populationExpanded: boolean;
  onToggleAssignAstronaut: (astronautId: string) => void;
  lang: 'es' | 'en';
}

export const IceMineModal: React.FC<IceMineModalProps> = ({
  isOpen,
  onClose,
  crew,
  assignedToMine,
  difficulty,
  isCommBlackout,
  populationExpanded,
  onToggleAssignAstronaut,
  lang,
}) => {
  // V-ICEMINE-RACE: Add click debouncing / disabled state during astronaut assignment toggling
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const toggleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      // oxlint-disable-next-line react/set-state-in-effect
      setIsToggling(false);
    }
    return () => {
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
        toggleTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // V-ICEMINE-SAFETY & GHOST: Filter out deceased crew from assignment options and counts
  const livingCrew = crew.filter(c => c.status !== 'deceased');
  const livingCount = livingCrew.length;
  const validAssignedToMine = assignedToMine.filter(id => livingCrew.some(c => c.id === id));
  const assignedCount = validAssignedToMine.length;
  const remainingInBase = livingCount - assignedCount;

  // In Hard mode without population expansion: requires 1 miner!
  // In Normal mode, Easy mode, or Hard mode with population expanded to 6: requires 2 miners!
  const requiredMiners = (difficulty === 'dificil' && !populationExpanded) ? 1 : 2;

  // Calculate projected water production
  let projectedWater = 22;
  if (difficulty === 'dificil') {
    if (!populationExpanded) {
      // 70% less water
      projectedWater = Math.round(22 * 0.3); // ~7 L
    } else {
      // 40% less water
      projectedWater = Math.round(22 * 0.6); // ~13 L
    }
  }

  const isOperative = assignedCount === requiredMiners && !isCommBlackout;

  const handleToggle = (id: string, isAssigned: boolean, canToggleOn: boolean) => {
    if (isToggling) return;
    if (isAssigned || canToggleOn) {
      setIsToggling(true);
      soundFx.playClick();
      onToggleAssignAstronaut(id);
      toggleTimeoutRef.current = setTimeout(() => {
        setIsToggling(false);
      }, 250);
    } else if (remainingInBase <= 1 && !isAssigned) {
      soundFx.playAlert();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-blue-500/80 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(59,130,246,0.35)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40">
              <Droplets className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Mina de Hielo Criogénico (ISRU)' : 'Cryogenic Ice Mine (ISRU)'}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                  isCommBlackout
                    ? 'bg-red-950 text-red-300 border border-red-500 animate-bounce'
                    : isOperative
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' 
                    : 'bg-amber-950 text-amber-300 border border-amber-500'
                }`}>
                  {isCommBlackout 
                    ? 'BLOQUEADO POR BLACKOUT DSN' 
                    : isOperative 
                    ? `OPERATIVA (${assignedCount}/${requiredMiners})` 
                    : `REQUIERE ${requiredMiners} MINERO(S) (${assignedCount}/${requiredMiners})`}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'es' 
                  ? 'Extrae hielo para soporte vital en cráteres polares.' 
                  : 'Harvests crater water ice in permanently shadowed regions.'}
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

        {/* Warning if Comm Blackout */}
        {isCommBlackout && (
          <div className="my-2.5 p-3 rounded-2xl bg-red-950/80 border border-red-500 text-xs text-red-200 flex items-center gap-2 animate-pulse">
            <WifiOff className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <span className="font-bold block">¡Pérdida de Comunicación con Houston!</span>
              La perforación exterior está inhabilitada por falta de telemetría DSN. Calibra la antena para reanudar la extracción.
            </div>
          </div>
        )}

        {/* Operational Constraints Banner */}
        <div className="my-2.5 p-3 rounded-2xl bg-slate-950 border border-blue-500/30 text-xs space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
            <Wind className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span>Condición 1: Consumo de Oxígeno +1.5%</span>
          </div>
          <p className="text-slate-300 text-[11px]">
            Los astronautas asignados a la perforación consumen un <b>1.5% más de oxígeno</b> por esfuerzo físico en trajes EVA a -240 °C.
          </p>

          <div className="flex items-center gap-1.5 text-amber-300 font-bold pt-1 border-t border-slate-900">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Condición 2: No disponibles para reparaciones</span>
          </div>
          <p className="text-slate-300 text-[11px]">
            Los mineros están en el exterior y <b>no pueden reparar fallas de batería ni calibrar antenas</b> mientras trabajen en el cráter.
          </p>

          <div className="flex items-center gap-1.5 text-red-300 font-bold pt-1 border-t border-slate-900">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span>Condición 3: Regla de Seguridad de la Base</span>
          </div>
          <p className="text-slate-300 text-[11px]">
            <b>La base nunca puede quedarse con menos de 1 persona</b> para mantener el hábitat y evitar muertes. (Quedan en base: <b className="text-emerald-400">{remainingInBase} astronautas</b>).
          </p>
        </div>

        {/* Astronaut Assignment Cards */}
        <div className="my-2 space-y-2">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
            {lang === 'es' ? `Selecciona ${requiredMiners} astronauta(s) para la mina:` : `Assign ${requiredMiners} crew member(s):`}
          </label>

          {livingCrew.map(c => {
            const isAssigned = validAssignedToMine.includes(c.id);
            const canToggleOn = !isAssigned && assignedCount < requiredMiners && remainingInBase > 1;

            return (
              <div 
                key={c.id}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  isAssigned
                    ? 'bg-blue-950/80 border-blue-400 shadow-md ring-1 ring-blue-400/50'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{c.avatar}</span>
                  <div>
                    <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                      <span>{c.name}</span>
                      {isAssigned && (
                        <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded uppercase">
                          EN LA MINA
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Salud: {c.health}% • Moral: {c.morale}% • {c.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(c.id, isAssigned, canToggleOn)}
                  disabled={isToggling || (!isAssigned && !canToggleOn)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    isAssigned
                      ? 'bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/50'
                      : canToggleOn
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isAssigned 
                    ? (lang === 'es' ? 'Regresar a Base' : 'Recall to Base') 
                    : remainingInBase <= 1
                    ? (lang === 'es' ? 'Requiere 1 en base' : 'Must keep 1 in base')
                    : assignedCount >= requiredMiners
                    ? (lang === 'es' ? 'Cupo lleno' : 'Slot Full')
                    : (lang === 'es' ? 'Asignar a Mina' : 'Assign to Mine')}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">
            Producción: <b className="text-cyan-300">{isOperative ? `+${projectedWater} L Agua/día` : '0 L (Inactiva o Blackout)'}</b>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
