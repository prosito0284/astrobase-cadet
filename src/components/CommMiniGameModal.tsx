import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Wifi, 
  CheckCircle2, 
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';

interface CommMiniGameModalProps {
  isOpen: boolean;
  onRestoreComm: () => void;
  lang: 'es' | 'en';
}

export const CommMiniGameModal: React.FC<CommMiniGameModalProps> = ({
  isOpen,
  onRestoreComm,
  lang,
}) => {
  // Target frequency is 8.41 GHz (Deep space X-band)
  const TARGET_FREQ = 8.41;
  const TARGET_AZIMUTH = 45;

  const [currentFreq, setCurrentFreq] = useState<number>(8.15);
  const [azimuthAngle, setAzimuthAngle] = useState<number>(30); // 0 - 90 deg
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const lastAudioTimeRef = useRef<number>(0);

  // V-COMM-PERSIST: Re-randomize starting frequency & azimuthAngle on modal open
  useEffect(() => {
    if (isOpen) {
      // oxlint-disable-next-line react/set-state-in-effect
      setCurrentFreq(parseFloat((8.10 + Math.random() * 0.15).toFixed(2)));
      setAzimuthAngle(Math.floor(15 + Math.random() * 21)); // 15 - 35 deg
      setIsRestoring(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // V-COMM-AUDIO: Throttle click sound to prevent Web Audio buffer flooding
  const playThrottledClick = () => {
    const now = Date.now();
    if (now - lastAudioTimeRef.current >= 60) {
      soundFx.playClick();
      lastAudioTimeRef.current = now;
    }
  };

  // Signal alignment calculation
  const freqDiff = Math.abs(currentFreq - TARGET_FREQ);
  const angleDiff = Math.abs(azimuthAngle - TARGET_AZIMUTH);
  
  const freqScore = Math.max(0, 100 - freqDiff * 250);
  const angleScore = Math.max(0, 100 - angleDiff * 4);
  const totalSignalLock = Math.round((freqScore * 0.6) + (angleScore * 0.4));

  const isLocked = totalSignalLock >= 90;

  // V-COMM-DEBOUNCE: Add re-entrancy lock to prevent duplicate calls
  const handleFixAntenna = () => {
    if (!isLocked || isRestoring) return;
    setIsRestoring(true);
    soundFx.playVictory();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    onRestoreComm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-indigo-500/80 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(99,102,241,0.35)] flex flex-col text-center">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? '¡Pérdida de Comunicación DSN!' : 'DSN Radio Blackout!'}</span>
                <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded uppercase animate-ping">
                  OFFLINE
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'es' 
                  ? 'La señal con la Red de Espacio Profundo de la NASA se ha desalineado. Calibra la antena para restablecer el enlace.' 
                  : 'Antenna carrier wave drift detected. Align X-band frequency and dish azimuth to reconnect to Earth.'}
              </p>
            </div>
          </div>
        </div>

        {/* Signal Strength Meter */}
        <div className="my-4 bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Wifi className={`w-4 h-4 ${isLocked ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              {lang === 'es' ? 'Potencia de Señal Portadora (Banda X):' : 'Carrier Signal Lock:'}
            </span>
            <span className={`font-mono font-black text-sm ${isLocked ? 'text-emerald-400' : 'text-amber-400'}`}>
              {totalSignalLock}% {isLocked ? '(BLOQUEADO)' : '(Buscando...)'}
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden my-2">
            <div 
              className={`h-full transition-all duration-200 ${
                isLocked 
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-400 shadow-md shadow-emerald-500/50' 
                  : 'bg-gradient-to-r from-red-500 to-amber-500'
              }`}
              style={{ width: `${totalSignalLock}%` }}
            />
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex justify-between mt-1">
            <span>8.0 GHz</span>
            <span className="text-cyan-400 font-bold">Frecuencia NASA: 8.41 GHz</span>
            <span>8.6 GHz</span>
          </div>
        </div>

        {/* Sliders to tune */}
        <div className="space-y-4 my-2 text-left bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          {/* Slider 1: Frequency */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-300">1. Sintonizador de Frecuencia de Radio:</span>
              <span className="font-mono text-cyan-300">{currentFreq.toFixed(3)} GHz</span>
            </div>
            <input 
              type="range"
              min="8.00"
              max="8.60"
              step="0.01"
              value={currentFreq}
              onChange={(e) => {
                playThrottledClick();
                setCurrentFreq(parseFloat(e.target.value));
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Slider 2: Azimuth Dish Angle */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-300">2. Ángulo de Elevación Azimutal de la Parabólica:</span>
              <span className="font-mono text-indigo-300">{azimuthAngle}°</span>
            </div>
            <input 
              type="range"
              min="0"
              max="90"
              value={azimuthAngle}
              onChange={(e) => {
                playThrottledClick();
                setAzimuthAngle(parseInt(e.target.value, 10));
              }}
              className="w-full accent-indigo-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3">
          <button
            onClick={handleFixAntenna}
            disabled={!isLocked || isRestoring}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 border border-emerald-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isRestoring
                ? (lang === 'es' ? 'Restableciendo enlace...' : 'Restoring link...')
                : isLocked 
                ? (lang === 'es' ? '¡Restablecer Enlace con Houston Ahora!' : 'Lock Frequency & Restore DSN Link!') 
                : (lang === 'es' ? 'Sintoniza hasta alcanzar más del 90% de señal' : 'Tune sliders until signal exceeds 90%')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
