import React, { useState, useRef, useEffect } from 'react';
import { 
  Wind, 
  Clock, 
  ShieldAlert 
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface OxygenEmergencyBannerProps {
  oxygenLevel: number;
  onEmergencyO2Injected: () => void;
  lang: 'es' | 'en';
  emergencyCharges?: number;
}

export const OxygenEmergencyBanner: React.FC<OxygenEmergencyBannerProps> = ({
  oxygenLevel,
  onEmergencyO2Injected,
  lang,
  emergencyCharges,
}) => {
  const [isPressurizing, setIsPressurizing] = useState(false);
  const isPressurizingRef = useRef(false);
  const [pressurizeProgress, setPressurizeProgress] = useState(0);
  const [localCharges, setLocalCharges] = useState(2);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const completePressurization = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPressurizing(false);
    isPressurizingRef.current = false;
    setLocalCharges(c => Math.max(0, c - 1));
    soundFx.playHarvest();
    onEmergencyO2Injected();
  };

  // Clear interval if oxygen level recovered to >= 25% (or game restarted)
  useEffect(() => {
    if (oxygenLevel >= 25) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isPressurizingRef.current = false;
      setIsPressurizing(false);
      setPressurizeProgress(0);
    }
  }, [oxygenLevel]);

  // Clean up interval on unmount & handle visibility changes
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isPressurizingRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed >= 1000) {
          completePressurization();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isPressurizingRef.current = false;
    };
  }, []);

  // Triggered when O2 is below 25%
  if (oxygenLevel >= 25) return null;

  const effectiveCharges = emergencyCharges !== undefined ? emergencyCharges : localCharges;

  const handleStartEmergencyO2 = () => {
    if (isPressurizingRef.current || isPressurizing || effectiveCharges <= 0) return;

    // Clear any previous interval before creating a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    soundFx.playAlert();
    isPressurizingRef.current = true;
    setIsPressurizing(true);
    setPressurizeProgress(0);

    startTimeRef.current = Date.now();
    const duration = 1000; // 1000ms pressurization completes safely within 3.0s asphyxiation window

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setPressurizeProgress(pct);

      if (elapsed >= duration) {
        completePressurization();
      }
    }, 50);
  };

  return (
    <div className="w-full bg-red-950/90 border-2 border-red-500 text-red-100 rounded-2xl p-3 sm:p-4 my-2 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-red-600 text-white animate-bounce">
          <Wind className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <span>{lang === 'es' ? '¡ALARMA CRÍTICA: FALLA DE PRESIÓN DE OXÍGENO!' : 'CRITICAL ECLSS O2 PRESSURE FAILURE!'}</span>
            <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded uppercase animate-ping">
              ASFIXIA INMINENTE
            </span>
            <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded uppercase">
              {lang === 'es' ? `CARGAS: ${effectiveCharges}/2` : `CHARGES: ${effectiveCharges}/2`}
            </span>
          </h3>
          <p className="text-xs text-red-200 mt-0.5">
            {lang === 'es'
              ? `Oxígeno al ${Math.round(oxygenLevel)}%. Activa manualmente los cartuchos de reserva (Retraso de presurización: 1s. Disponibles: ${effectiveCharges}/2).`
              : `O2 at ${Math.round(oxygenLevel)}%. Manually deploy emergency reserve candles (1-second pressurization delay. Available: ${effectiveCharges}/2).`}
          </p>
        </div>
      </div>

      <div className="w-full sm:w-auto flex-shrink-0">
        {isPressurizing ? (
          <div className="flex flex-col items-center bg-black/60 px-4 py-2 rounded-xl border border-red-700 min-w-[240px]">
            <div className="flex items-center justify-between w-full text-xs font-mono font-bold text-amber-300 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Presurizando...</span>
              </span>
              <span>{pressurizeProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all"
                style={{ width: `${pressurizeProgress}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400 mt-1">Retraso físico de válvulas de 1 segundo</span>
          </div>
        ) : (
          <button
            onClick={handleStartEmergencyO2}
            disabled={effectiveCharges <= 0}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-white text-xs font-black shadow-lg shadow-red-950 border transition-all ${
              effectiveCharges <= 0
                ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border-red-400 transform hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-white" />
            <span>
              {effectiveCharges <= 0
                ? (lang === 'es' ? 'SIN CARTUCHOS (0/2)' : 'NO CANISTERS (0/2)')
                : (lang === 'es' 
                    ? `ACTIVAR OXÍGENO (1s · ${effectiveCharges}/2)` 
                    : `DEPLOY EMERGENCY O2 (1s · ${effectiveCharges}/2)`)}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
