import React, { useState } from 'react';
import { 
  Zap, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';

interface WiringMiniGameModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  lang: 'es' | 'en';
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

export const WiringMiniGameModal: React.FC<WiringMiniGameModalProps> = ({
  isOpen,
  onSuccess,
  lang,
}) => {
  // Left nodes are in standard order, right terminals are scrambled
  const leftWires = WIRE_TYPES;
  const [rightTerminals] = useState<WireNode[]>(() => {
    return [...WIRE_TYPES].sort(() => 0.5 - Math.random());
  });

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [connections, setConnections] = useState<{ [leftId: string]: string }>({});

  if (!isOpen) return null;

  const handleSelectLeft = (id: string) => {
    soundFx.playClick();
    setSelectedLeft(id);
  };

  const handleSelectRight = (rightId: string) => {
    if (!selectedLeft) return;
    soundFx.playClick();

    // Map left wire to this right terminal
    const newConns = { ...connections, [selectedLeft]: rightId };
    setConnections(newConns);
    setSelectedLeft(null);

    // Check if all 4 are connected and match!
    const allConnected = Object.keys(newConns).length === 4;
    const allCorrect = allConnected && Object.entries(newConns).every(([left, right]) => left === right);

    if (allCorrect) {
      soundFx.playVictory();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        onSuccess();
      }, 700);
    } else if (allConnected) {
      soundFx.playAlert();
    }
  };

  const handleReset = () => {
    soundFx.playClick();
    setConnections({});
    setSelectedLeft(null);
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
        </div>

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
                    onClick={() => handleSelectLeft(wire.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? 'ring-2 ring-white scale-105 shadow-lg'
                        : isConnected
                        ? 'opacity-80 border-slate-700'
                        : 'hover:scale-[1.02] border-slate-800'
                    }`}
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
                const isCorrectMatch = connectedLeftId === term.id;
                return (
                  <button
                    key={term.id}
                    onClick={() => handleSelectRight(term.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      connectedLeftId
                        ? isCorrectMatch
                          ? 'border-emerald-500 bg-emerald-950/60 shadow-md'
                          : 'border-red-500 bg-red-950/60 animate-shake'
                        : selectedLeft
                        ? 'hover:scale-[1.02] border-slate-700'
                        : 'border-slate-800 opacity-90'
                    }`}
                    style={{ backgroundColor: `${term.color}22`, borderColor: term.color }}
                  >
                    <span className="text-[10px] font-mono" style={{ color: term.color }}>●</span>
                    <span className="flex items-center gap-2">
                      <span className="text-slate-200">{lang === 'es' ? term.labelEs.split(' ')[0] : term.labelEn.split(' ')[0]}</span>
                      <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: term.color }} />
                    </span>
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
              className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-bold"
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
