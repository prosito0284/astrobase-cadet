import React, { useState, useEffect, useRef } from 'react';
import { GameDifficulty } from '../types/game';
import { 
  Zap, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';

interface WiringMiniGameModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
  lang: 'es' | 'en';
  difficulty?: GameDifficulty;
  batteryLockoutSeconds?: number;
  availableCrewCount?: number;
  onShockCrew?: () => void;
}

interface WireNode {
  id: string;
  color: string;
  labelEs: string;
  labelEn: string;
}

const WIRE_TYPES: WireNode[] = [
  { id: 'red', color: '#ef4444', labelEs: 'Rojo (Positivo 28V)', labelEn: 'Red (Positive 28V)' },
  { id: 'blue', color: '#3b82f6', labelEs: 'Azul (Tierra Chasis)', labelEn: 'Blue (Chassis Ground)' },
  { id: 'yellow', color: '#eab308', labelEs: 'Amarillo (Bus Solar)', labelEn: 'Yellow (Solar Bus)' },
  { id: 'green', color: '#22c55e', labelEs: 'Verde (Control BMS)', labelEn: 'Green (BMS Logic)' },
];

/**
 * Generates a true derangement scramble of the terminals so that:
 * 1. Terminals are randomly shuffled (Fisher-Yates).
 * 2. No terminal is placed directly across from its matching left wire (derangement).
 */
export const generateScrambledTerminals = (): WireNode[] => {
  const wires = [...WIRE_TYPES];
  for (let attempt = 0; attempt < 50; attempt++) {
    const shuffled = [...wires];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const isDerangement = shuffled.every((term, idx) => term.id !== wires[idx].id);
    if (isDerangement) {
      return shuffled;
    }
  }
  // Cyclic shift fallback guarantees full derangement
  return [wires[1], wires[2], wires[3], wires[0]];
};

export const WiringMiniGameModal: React.FC<WiringMiniGameModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  lang,
  difficulty = 'normal',
  batteryLockoutSeconds = 0,
  availableCrewCount = 4,
  onShockCrew,
}) => {
  // Left nodes are in standard order, right terminals are scrambled
  const leftWires = WIRE_TYPES;
  const [rightTerminals, setRightTerminals] = useState<WireNode[]>(() => generateScrambledTerminals());

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [connections, setConnections] = useState<{ [leftId: string]: string }>({});
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const [errorTerminalId, setErrorTerminalId] = useState<string | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // V-WIRING-PERSIST: Reset state and re-shuffle right terminals when modal opens (useEffect when isOpen becomes true)
  useEffect(() => {
    if (isOpen) {
      // oxlint-disable-next-line react/set-state-in-effect
      setConnections({});
      setSelectedLeft(null);
      setIsSolved(false);
      setMismatchError(null);
      setErrorTerminalId(null);
      setRightTerminals(generateScrambledTerminals());
    }
    return () => {
      // V-WIRING-DEBOUNCE: Clear pending success timer on unmount / close
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
      setConnections({});
      setSelectedLeft(null);
      setIsSolved(false);
      setMismatchError(null);
      setErrorTerminalId(null);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const requiresTwoCrew = difficulty === 'dificil';
  const hasEnoughCrew = !requiresTwoCrew || availableCrewCount >= 2;
  const isLockedOut = batteryLockoutSeconds > 0;

  const handleClose = () => {
    // V-WIRING-DEBOUNCE: Clear timer so onSuccess does not fire after closing
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setConnections({});
    setSelectedLeft(null);
    setIsSolved(false);
    setMismatchError(null);
    setErrorTerminalId(null);
    soundFx.playClick();
    onClose?.();
  };

  const handleSelectLeft = (id: string) => {
    if (isSolved) return;
    if (isLockedOut) {
      soundFx.playAlert();
      onShockCrew?.();
      return;
    }
    if (!hasEnoughCrew) {
      soundFx.playAlert();
      return;
    }
    soundFx.playClick();
    setMismatchError(null);
    setSelectedLeft(id);
  };

  const handleSelectRight = (rightId: string) => {
    if (isSolved) return;
    if (isLockedOut) {
      soundFx.playAlert();
      onShockCrew?.();
      return;
    }
    if (!hasEnoughCrew) {
      soundFx.playAlert();
      return;
    }
    if (!selectedLeft) return;

    // Strict color matching: A wire can ONLY connect to its matching color terminal!
    if (selectedLeft !== rightId) {
      soundFx.playAlert();
      const leftWire = leftWires.find(w => w.id === selectedLeft);
      const rightTerm = rightTerminals.find(t => t.id === rightId);
      const leftName = lang === 'es' ? leftWire?.labelEs.split(' ')[0] : leftWire?.labelEn.split(' ')[0];
      const rightName = lang === 'es' ? rightTerm?.labelEs.split(' ')[0] : rightTerm?.labelEn.split(' ')[0];

      setMismatchError(
        lang === 'es'
          ? `⚠️ ¡Error de polaridad! El cable ${leftName} no puede conectarse al terminal ${rightName}. Conecta cada cable con su color correspondiente.`
          : `⚠️ Polarity error! ${leftName} wire cannot connect to ${rightName} terminal. Match identical colors.`
      );
      setErrorTerminalId(rightId);
      setTimeout(() => {
        setErrorTerminalId(null);
      }, 900);
      return;
    }

    // Terminal occupancy check: Cannot connect if right terminal is already connected to another wire
    const existingOccupant = Object.entries(connections).find(([l, r]) => r === rightId && l !== selectedLeft);
    if (existingOccupant) {
      soundFx.playAlert();
      setMismatchError(
        lang === 'es'
          ? '⚠️ Este terminal ya está ocupado. Elige su color correspondiente libre o reinicia el circuito.'
          : '⚠️ Terminal already occupied. Connect to an available matching terminal.'
      );
      return;
    }

    // Matching color connection!
    soundFx.playClick();
    setMismatchError(null);
    setErrorTerminalId(null);

    const newConns = { ...connections, [selectedLeft]: rightId };
    setConnections(newConns);
    setSelectedLeft(null);

    // Check if all 4 matching wires are connected
    const allConnected = Object.keys(newConns).length === 4;
    const allCorrect = allConnected && Object.entries(newConns).every(([left, right]) => left === right);

    if (allCorrect) {
      // V-WIRING-DEBOUNCE: Immediately lock wire clicks upon success detection
      setIsSolved(true);
      soundFx.playVictory();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      successTimeoutRef.current = setTimeout(() => {
        onSuccess();
      }, 700);
    }
  };

  const handleReset = () => {
    if (isSolved) return;
    soundFx.playClick();
    setConnections({});
    setSelectedLeft(null);
    setMismatchError(null);
    setErrorTerminalId(null);
  };

  const completedCount = Object.keys(connections).length;
  const allCorrect = completedCount === 4 && Object.entries(connections).every(([l, r]) => l === r);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.35)] flex flex-col text-center">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-600/30 text-amber-400 border border-amber-500/40">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? '¡Cortocircuito en el Banco de Baterías!' : 'Battery Bank Short Circuit!'}</span>
                <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded uppercase animate-ping">
                  ERROR BMS
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'es' 
                  ? 'Une los cables de colores correspondientes para restaurar la carga eléctrica.' 
                  : 'Connect matching color wires from left to right to restore electrical bus flow.'}
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={handleClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Lockout Hazard Warning (Hard Mode: 5s critical lockout) */}
        {isLockedOut && (
          <div className="mt-3 p-3 rounded-2xl bg-red-950/90 border-2 border-red-500 text-red-200 text-xs font-bold flex items-center gap-2 animate-bounce">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 animate-pulse" />
            <div className="text-left">
              <span className="block font-black text-white">¡ALTO VOLTAJE CRÍTICO! BLOQUEO DE SEGURIDAD ({batteryLockoutSeconds}s)</span>
              La batería acumula 2 fallos. Fuga activa: -4% energía/segundo. Si tocas los cables ahora, los astronautas recibirán una descarga de 50% de daño e incapacidad de 1 día.
            </div>
          </div>
        )}

        {/* Crew Requirement Warning */}
        {requiresTwoCrew && !hasEnoughCrew && !isLockedOut && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-950/90 border border-amber-500 text-amber-200 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="text-left">
              <span className="block font-black text-white">¡REQUERIMIENTO: 2 ASTRONAUTAS ACTIVOS!</span>
              En Modo Difícil el circuito de alta potencia requiere 2 técnicos simultáneos. Actualmente disponibles en base: {availableCrewCount}.
            </div>
          </div>
        )}

        {/* Polarity / Color Mismatch Error Alert */}
        {mismatchError && (
          <div className="mt-3 p-2.5 rounded-2xl bg-red-950/95 border-2 border-red-500 text-red-200 text-xs font-bold animate-shake flex items-center justify-center gap-2 shadow-lg shadow-red-950">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />
            <span>{mismatchError}</span>
          </div>
        )}

        {/* Electrical Box Board */}
        <div className="my-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 relative">
          <div className="text-[11px] font-mono text-slate-400 mb-3 flex items-center justify-between">
            <span>Terminal Entrada (Izquierda)</span>
            <span className="text-amber-400 font-bold">{completedCount}/4 Conectados</span>
            <span>Terminal Salida (Derecha)</span>
          </div>

          <div className="flex items-center justify-between gap-6 relative">
            {/* Left Terminals */}
            <div className="space-y-3.5 flex-1">
              {leftWires.map(wire => {
                const isSelected = selectedLeft === wire.id;
                const isConnected = !!connections[wire.id];
                return (
                  <button
                    key={wire.id}
                    disabled={isSolved}
                    onClick={() => handleSelectLeft(wire.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'ring-2 ring-white scale-105 shadow-lg'
                        : isConnected
                        ? 'opacity-80 border-slate-700'
                        : 'hover:scale-[1.02] border-slate-800'
                    } ${isSolved ? 'cursor-not-allowed opacity-60' : ''}`}
                    style={{ backgroundColor: `${wire.color}22`, borderColor: wire.color }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: wire.color }} />
                      <span className="text-slate-200">{lang === 'es' ? wire.labelEs.split(' ')[0] : wire.labelEn.split(' ')[0]}</span>
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: wire.color }}>●</span>
                  </button>
                );
              })}
            </div>

            {/* Visual Center Divider */}
            <div className="flex flex-col items-center justify-center opacity-30 select-none">
              <span className="text-2xl">⚡</span>
            </div>

            {/* Right Terminals (Scrambled) */}
            <div className="space-y-3.5 flex-1">
              {rightTerminals.map(term => {
                const connectedLeftId = Object.keys(connections).find(k => connections[k] === term.id);
                const isConnected = !!connectedLeftId;
                const isErrored = errorTerminalId === term.id;
                return (
                  <button
                    key={term.id}
                    disabled={isSolved}
                    onClick={() => handleSelectRight(term.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isErrored
                        ? 'border-red-500 bg-red-900/80 ring-2 ring-red-400 animate-shake scale-105'
                        : isConnected
                        ? 'border-emerald-500 bg-emerald-950/70 shadow-md ring-1 ring-emerald-400'
                        : selectedLeft
                        ? 'hover:scale-[1.02] border-slate-700'
                        : 'border-slate-800 opacity-90'
                    } ${isSolved ? 'cursor-not-allowed' : ''}`}
                    style={{ backgroundColor: isErrored ? '#7f1d1d' : `${term.color}22`, borderColor: isErrored ? '#ef4444' : term.color }}
                  >
                    <span className="text-[10px] font-mono" style={{ color: term.color }}>●</span>
                    <span className="flex items-center gap-2">
                      <span className="text-slate-200">{lang === 'es' ? term.labelEs.split(' ')[0] : term.labelEn.split(' ')[0]}</span>
                      <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: term.color }} />
                    </span>
                    {isConnected && (
                      <span className="text-[10px] font-mono text-emerald-400 font-black">✓ OK</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hint */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Haz clic en un cable de la izquierda y luego en su color de la derecha.</span>
            <button
              onClick={handleReset}
              disabled={isSolved}
              className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reiniciar</span>
            </button>
          </div>
        </div>

        {allCorrect && (
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold animate-bounce flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Cableado correcto! El flujo eléctrico de las baterías se ha restaurado.</span>
          </div>
        )}
      </div>
    </div>
  );
};
