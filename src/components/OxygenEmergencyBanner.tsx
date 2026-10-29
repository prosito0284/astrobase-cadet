import React, { useState } from 'react';
import { 
  Wind, 
  AlertTriangle, 
  Zap, 
  Clock, 
  CheckCircle2, 
  ShieldAlert 
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface OxygenEmergencyBannerProps {
  oxygenLevel: number;
  onEmergencyO2Injected: () => void;
  lang: 'es' | 'en';
}

export const OxygenEmergencyBanner: React.FC<OxygenEmergencyBannerProps> = ({
  oxygenLevel,
  onEmergencyO2Injected,
  lang,
}) => {
  const [isPressurizing, setIsPressurizing] = useState(false);
  const [pressurizeProgress, setPressurizeProgress] = useState(0);

  // Triggered when O2 is below 25%
  if (oxygenLevel >= 25) return null;

  const handleStartEmergencyO2 = () => {
    if (isPressurizing) return;
    soundFx.playAlert();
    setIsPressurizing(true);
    setPressurizeProgress(0);

    const startTime = Date.now();
    const duration = 2000; // Exact 2 seconds required by the user!

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setPressurizeProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        setIsPressurizing(false);
        soundFx.playHarvest();
        onEmergencyO2Injected();
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
          </h3>
          <p className="text-xs text-red-200 mt-0.5">
            {lang === 'es'
              ? `Oxígeno al ${Math.round(oxygenLevel)}%. Activa manualmente los cartuchos de reserva (Retraso de presurización de 2 segundos).`
              : `O2 at ${Math.round(oxygenLevel)}%. Manually deploy emergency reserve candles (2-second pressurization delay).`}
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
            <span className="text-[9px] text-slate-400 mt-1">Retraso físico de válvulas de 2 segundos</span>
          </div>
        ) : (
          <button
            onClick={handleStartEmergencyO2}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black shadow-lg shadow-red-950 border border-red-400 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShieldAlert className="w-4 h-4 text-white" />
            <span>
              {lang === 'es' 
                ? 'ACTIVAR OXÍGENO DE RESERVA (2s)' 
                : 'DEPLOY EMERGENCY O2 (2s)'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
