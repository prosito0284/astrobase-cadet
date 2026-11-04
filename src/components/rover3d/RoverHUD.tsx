import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Droplets, 
  Shield, 
  Microscope, 
  Navigation, 
  Home, 
  RotateCcw, 
  AlertTriangle,
  Flame,
  Radio
} from 'lucide-react';

export interface RoverHUDProps {
  speed: number;             // m/s
  batteryPct: number;        // 0 to 100
  cargo: { water: number; shield: number; science: number };
  distanceToBase: number;    // meters
  bearingToBase: number;     // radians relative to rover heading
  targetName: string;
  targetIcon: string;
  location: 'moon' | 'mars';
  lang: 'es' | 'en';
  isDockingZone: boolean;
  laserCooldownPct: number;  // 0 (ready) to 1 (cooling)
  onFireLaser: () => void;
  onDock: () => void;
  onAbort: () => void;
  onControlChange: (input: { throttle: number; steer: number; brake: boolean }) => void;
  onResetVehicle: () => void;
}

export const RoverHUD: React.FC<RoverHUDProps> = ({
  speed,
  batteryPct,
  cargo,
  distanceToBase,
  bearingToBase,
  targetName,
  targetIcon,
  location,
  lang,
  isDockingZone,
  laserCooldownPct,
  onFireLaser,
  onDock,
  onAbort,
  onControlChange,
  onResetVehicle,
}) => {
  // Joystick Touch State
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  // Speedometer calculation
  const speedKmh = Math.abs(speed * 3.6).toFixed(1);
  const speedRatio = Math.min(1, Math.abs(speed) / 8.5);

  // Battery status color & alert ramp
  let batteryColor = 'bg-emerald-500';
  let batteryTextColor = 'text-emerald-400';
  let batteryBorderColor = 'border-emerald-500/40';
  let isBatteryLow = false;
  let isBatteryCritical = false;

  if (batteryPct <= 20) {
    batteryColor = 'bg-rose-500';
    batteryTextColor = 'text-rose-400';
    batteryBorderColor = 'border-rose-500/80 animate-pulse';
    isBatteryCritical = true;
  } else if (batteryPct <= 40) {
    batteryColor = 'bg-amber-500';
    batteryTextColor = 'text-amber-400';
    batteryBorderColor = 'border-amber-500/60';
    isBatteryLow = true;
  }

  // Compass needle rotation in degrees
  const compassDeg = (bearingToBase * 180) / Math.PI;

  // Virtual Joystick Touch Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setJoystickActive(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const updateJoystick = useCallback((clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const maxRadius = rect.width / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius;
      clampedY = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: clampedX, y: clampedY });

    // Normalize input: -1 to 1
    // Y negative = forward (throttle > 0), Y positive = reverse (throttle < 0)
    const normX = clampedX / maxRadius;
    const normY = -clampedY / maxRadius;

    // Apply deadzone
    const throttle = Math.abs(normY) > 0.12 ? normY : 0;
    const steer = Math.abs(normX) > 0.12 ? normX : 0;

    onControlChange({
      throttle,
      steer,
      brake: false,
    });
  }, [onControlChange]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  }, [updateJoystick]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystickActive(false);
        setKnobPos({ x: 0, y: 0 });
        onControlChange({ throttle: 0, steer: 0, brake: true });
        break;
      }
    }
  }, [onControlChange]);

  useEffect(() => {
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-between p-3 sm:p-5 text-slate-100 font-sans">
      {/* Top Bar: Telemetry, Battery & Navigation */}
      <div className="flex items-start justify-between gap-2 z-20">
        {/* Speedometer & Rover ID */}
        <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-2.5 sm:p-3 shadow-lg flex items-center gap-3">
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-700">
            <span className="text-sm font-black font-mono text-cyan-300">{speedKmh}</span>
            <span className="text-[8px] font-mono text-slate-400 tracking-wider">KM/H</span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-cyan-600/80 px-1.5 py-0.5 rounded font-black uppercase tracking-wider text-white">
                {location === 'moon' ? 'VIPER 4WD' : 'PERSEVERANCE 6WD'}
              </span>
              <span className="text-xs font-bold text-slate-300">{targetIcon} {targetName}</span>
            </div>

            {/* Speed Gauge bar */}
            <div className="w-32 sm:w-40 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-75"
                style={{ width: `${Math.round(speedRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Base Beacon Compass */}
        <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-lg">
          <div 
            className="w-7 h-7 rounded-full bg-slate-900 border border-cyan-500/50 flex items-center justify-center transition-transform duration-100"
            style={{ transform: `rotate(${compassDeg}deg)` }}
            title={lang === 'es' ? 'Brújula hacia la Base Lander' : 'Compass to Base Lander'}
          >
            <Navigation className="w-4 h-4 text-cyan-400 fill-cyan-400" />
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase text-slate-400 flex items-center gap-1">
              <Home className="w-3 h-3 text-cyan-400" />
              {lang === 'es' ? 'BASE LANDER' : 'BASE LANDER'}
            </span>
            <span className={`text-xs font-mono font-black ${
              isDockingZone ? 'text-emerald-400 animate-pulse' : 'text-slate-200'
            }`}>
              {distanceToBase.toFixed(1)} m
            </span>
          </div>
        </div>

        {/* Battery Telemetry Bar */}
        <div className={`pointer-events-auto bg-slate-950/85 backdrop-blur-md border ${batteryBorderColor} rounded-2xl p-2.5 sm:p-3 shadow-lg min-w-[130px]`}>
          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
            <span className="flex items-center gap-1 text-slate-300">
              <Zap className={`w-3.5 h-3.5 ${batteryTextColor}`} />
              {lang === 'es' ? 'BATERÍA' : 'BATTERY'}
            </span>
            <span className={`font-mono font-black ${batteryTextColor}`}>
              {Math.round(batteryPct)}%
            </span>
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${batteryColor} transition-all duration-200`}
              style={{ width: `${Math.max(0, Math.min(100, batteryPct))}%` }}
            />
          </div>

          {/* Warning banner */}
          {isBatteryCritical && (
            <div className="mt-1 flex items-center gap-1 text-[9px] font-black text-rose-400 tracking-tight animate-bounce">
              <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0" />
              <span>{lang === 'es' ? '¡CRÍTICA! REGRESA' : 'CRITICAL! RETURN'}</span>
            </div>
          )}
          {isBatteryLow && !isBatteryCritical && (
            <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-amber-400 tracking-tight">
              <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span>{lang === 'es' ? 'BATERÍA BAJA' : 'LOW BATTERY'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Middle Alerts & Docking Prompt Banner */}
      <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
        {isDockingZone && (
          <div className="pointer-events-auto bg-emerald-950/90 border-2 border-emerald-400/80 rounded-2xl px-5 py-2.5 shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-3 animate-pulse">
            <Home className="w-6 h-6 text-emerald-300" />
            <div>
              <p className="text-xs font-black text-white">
                {lang === 'es' ? '¡EN ZONA DE ATERRIZAJE BASE!' : 'BASE DOCKING ZONE REACHED!'}
              </p>
              <p className="text-[10px] text-emerald-300">
                {lang === 'es' ? 'Presiona ATRAQUE para descargar con 100% de botín + bono' : 'Press DOCK to deliver cargo with 100% payload + bonus'}
              </p>
            </div>
            <button
              onClick={onDock}
              className="py-1.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-950 transition-all transform hover:scale-105"
            >
              {lang === 'es' ? 'ATRAQUE' : 'DOCK NOW'}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Bar: Cargo Manifest & Touch Controls */}
      <div className="flex items-end justify-between gap-3 z-20">
        {/* Bottom Left: Touch Joystick + Reset Vehicle Button */}
        <div className="flex items-end gap-3 pointer-events-auto">
          {/* Virtual Analog Joystick */}
          <div 
            ref={joystickBaseRef}
            onTouchStart={handleTouchStart}
            style={{ touchAction: 'none' }}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 bg-slate-950/70 backdrop-blur-md relative flex items-center justify-center select-none shadow-2xl transition-colors ${
              joystickActive ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-700'
            }`}
          >
            {/* Direction hints */}
            <span className="absolute top-2 text-[8px] font-mono text-slate-500 font-bold">▲ THR</span>
            <span className="absolute bottom-2 text-[8px] font-mono text-slate-500 font-bold">▼ REV</span>
            <span className="absolute left-2 text-[8px] font-mono text-slate-500 font-bold">◀</span>
            <span className="absolute right-2 text-[8px] font-mono text-slate-500 font-bold">▶</span>

            {/* Inner Handle Knob */}
            <div 
              className={`w-12 h-12 rounded-full shadow-lg border transition-transform pointer-events-none ${
                joystickActive 
                  ? 'bg-cyan-500 border-white shadow-cyan-500/50 scale-110' 
                  : 'bg-slate-800 border-slate-600'
              }`}
              style={{
                transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              }}
            />
          </div>

          {/* Quick Vehicle Reset Button */}
          <button
            onClick={onResetVehicle}
            title={lang === 'es' ? 'Reorientar rover si vuelca' : 'Re-level rover'}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shadow-md transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Cargo Manifest Center Card */}
        <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xl flex items-center gap-3">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase hidden sm:block">
            {lang === 'es' ? 'CARGA RECOLECTADA:' : 'CARGO BAY:'}
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono font-black">
            <span className="flex items-center gap-1 text-cyan-300 bg-slate-900 px-2 py-1 rounded-lg border border-cyan-500/30">
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>{cargo.water}</span>
            </span>

            <span className="flex items-center gap-1 text-amber-300 bg-slate-900 px-2 py-1 rounded-lg border border-amber-500/30">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>{cargo.shield}</span>
            </span>

            <span className="flex items-center gap-1 text-purple-300 bg-slate-900 px-2 py-1 rounded-lg border border-purple-500/30">
              <Microscope className="w-3.5 h-3.5 text-purple-400" />
              <span>{cargo.science}</span>
            </span>
          </div>

          {/* Abort Sortie button */}
          <button
            onClick={onAbort}
            className="text-[10px] text-slate-400 hover:text-rose-400 ml-1 underline transition-colors"
          >
            {lang === 'es' ? 'Finalizar' : 'Abort'}
          </button>
        </div>

        {/* Bottom Right: Touch Action Buttons (Laser & Dock) */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Dock / Return button */}
          <button
            onClick={onDock}
            disabled={!isDockingZone}
            style={{ touchAction: 'none' }}
            className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col items-center gap-1 shadow-lg transition-all active:scale-95 ${
              isDockingZone
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300 shadow-emerald-950/50 animate-bounce'
                : 'bg-slate-900/80 text-slate-500 border-slate-800 opacity-60 cursor-not-allowed'
            }`}
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[9px] font-black uppercase tracking-wider">
              {lang === 'es' ? 'BASE' : 'DOCK'}
            </span>
          </button>

          {/* Fire Laser Button */}
          <button
            onClick={onFireLaser}
            disabled={laserCooldownPct > 0}
            style={{ touchAction: 'none' }}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-2 flex flex-col items-center justify-center gap-1 shadow-2xl transition-all active:scale-90 ${
              laserCooldownPct > 0
                ? 'bg-slate-900/90 border-slate-700 text-slate-500 opacity-70 cursor-not-allowed'
                : location === 'moon'
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white border-cyan-300 shadow-cyan-600/50'
                : 'bg-gradient-to-tr from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white border-rose-300 shadow-rose-600/50'
            }`}
          >
            <Flame className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">
              {lang === 'es' ? '⚡ LÁSER' : '⚡ LASER'}
            </span>
            {laserCooldownPct > 0 && (
              <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-cyan-400" 
                  style={{ width: `${Math.round((1 - laserCooldownPct) * 100)}%` }} 
                />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Keyboard Controls Legend Overlay (Bottom-Center desktop hint) */}
      <div className="hidden md:flex items-center justify-center gap-3 text-[10px] font-mono text-slate-400 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 self-center mt-2 pointer-events-none">
        <span><kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700">W</kbd><kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 ml-1">S</kbd> Acelerar / Reversa</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700">A</kbd><kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 ml-1">D</kbd> Girar</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700">ESPACIO</kbd> Disparar Espectrómetro</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700">R</kbd> Reorientar</span>
      </div>
    </div>
  );
};
