/**
 * Spacesuit Helmet HUD Overlay (Metroid Prime / Halo / NASA Artemis style)
 * 100% pure CSS & SVG overlay (0 KB external files).
 * Features:
 * - Curved visor curvature vignette & subtle polycarbonate glass reflection glare
 * - Top 360° degree compass tape tracking camera yaw with cardinal points
 * - Dynamic O2 telemetry arc / bar gauge linked to colony life support
 * - Suit diagnostic telemetry (Pressure, Temperature, Heart Rate, Radiation)
 * - Accessible "Volver a Base (Órbita)" exit button and Esc key listener
 */

import React, { useEffect, useMemo } from 'react';
import { BaseLocation } from '../../types/game';
import { 
  ArrowLeft, 
  Activity, 
  Wind, 
  Thermometer, 
  Gauge, 
  Radio, 
  ShieldAlert,
  Compass as CompassIcon
} from 'lucide-react';
import { getCardinalDirection } from './evaControls';

export interface HelmetHUDProps {
  oxygenPct: number;
  cameraYawDeg: number;
  suitPressureKPa?: number;
  suitTempC?: number;
  heartRateBpm?: number;
  radiationLevel?: number;
  location: BaseLocation;
  onExitEva: () => void;
  lang: 'es' | 'en';
}

export const HelmetHUD: React.FC<HelmetHUDProps> = ({
  oxygenPct,
  cameraYawDeg,
  suitPressureKPa = 29.6,
  suitTempC = 21.0,
  heartRateBpm = 72,
  radiationLevel = 0.12,
  location,
  onExitEva,
  lang,
}) => {
  // Esc keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExitEva();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExitEva]);

  // Normalized heading and cardinal point
  const normalizedYaw = useMemo(() => {
    const deg = ((cameraYawDeg % 360) + 360) % 360;
    return Math.round(deg);
  }, [cameraYawDeg]);

  const cardinal = useMemo(() => getCardinalDirection(normalizedYaw), [normalizedYaw]);

  // O2 Status Colors and Warning Ramp
  const clampedO2 = Math.max(0, Math.min(100, oxygenPct));
  let o2Color = '#38bdf8'; // Cyan
  let o2Bg = 'bg-cyan-500';
  let o2Text = 'text-cyan-400';
  let o2Border = 'border-cyan-500/50';
  let isO2Critical = false;
  let isO2Warning = false;

  if (clampedO2 <= 20) {
    o2Color = '#ef4444'; // Red
    o2Bg = 'bg-rose-500';
    o2Text = 'text-rose-400';
    o2Border = 'border-rose-500/80 animate-pulse';
    isO2Critical = true;
  } else if (clampedO2 <= 50) {
    o2Color = '#f59e0b'; // Amber
    o2Bg = 'bg-amber-500';
    o2Text = 'text-amber-400';
    o2Border = 'border-amber-500/60';
    isO2Warning = true;
  }

  // Generate ticks for the compass tape across a 120° visible arc window
  const compassTicks = useMemo(() => {
    const ticks: { deg: number; label: string; isCardinal: boolean; offsetPct: number }[] = [];
    const windowSpan = 120; // visible degree window: [heading - 60, heading + 60]

    for (let d = -60; d <= 60; d += 10) {
      const markDeg = (normalizedYaw + d + 360) % 360;
      let label = `${markDeg}°`;
      let isCardinal = false;

      if (markDeg === 0) {
        label = 'N';
        isCardinal = true;
      } else if (markDeg === 45) {
        label = 'NE';
        isCardinal = true;
      } else if (markDeg === 90) {
        label = 'E';
        isCardinal = true;
      } else if (markDeg === 135) {
        label = 'SE';
        isCardinal = true;
      } else if (markDeg === 180) {
        label = 'S';
        isCardinal = true;
      } else if (markDeg === 225) {
        label = 'SW';
        isCardinal = true;
      } else if (markDeg === 270) {
        label = 'W';
        isCardinal = true;
      } else if (markDeg === 315) {
        label = 'NW';
        isCardinal = true;
      }

      // Position from 0% (left) to 100% (right)
      const offsetPct = ((d + 60) / windowSpan) * 100;
      ticks.push({ deg: markDeg, label, isCardinal, offsetPct });
    }
    return ticks;
  }, [normalizedYaw]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-30 font-mono">
      {/* 1. Curved Polycarbonate Visor Vignette & Structural Rim Frame */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 1000 600"
      >
        <defs>
          {/* Subtle visor edge shadow filter */}
          <radialGradient id="visorInnerShadow" cx="50%" cy="50%" r="50%">
            <stop offset="65%" stopColor="rgba(2, 6, 23, 0)" />
            <stop offset="88%" stopColor="rgba(15, 23, 42, 0.45)" />
            <stop offset="100%" stopColor="rgba(2, 6, 23, 0.88)" />
          </radialGradient>

          {/* Polycarbonate glass reflection beam */}
          <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.08)" />
            <stop offset="25%" stopColor="rgba(255, 255, 255, 0.02)" />
            <stop offset="45%" stopColor="rgba(56, 189, 248, 0.0)" />
            <stop offset="60%" stopColor="rgba(56, 189, 248, 0.05)" />
            <stop offset="85%" stopColor="rgba(255, 255, 255, 0.01)" />
            <stop offset="100%" stopColor="rgba(56, 189, 248, 0.08)" />
          </linearGradient>

          {/* O2 Arc Gradient */}
          <linearGradient id="o2GaugeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={o2Color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={o2Color} stopOpacity="1.0" />
          </linearGradient>
        </defs>

        {/* Outer helmet mask & darkening vignette */}
        <rect width="1000" height="600" fill="url(#visorInnerShadow)" />

        {/* Diagonal glass glare sheet */}
        <rect width="1000" height="600" fill="url(#glassReflection)" />

        {/* Curved upper visor arc border */}
        <path
          d="M 50,40 Q 500,10 950,40"
          fill="none"
          stroke="rgba(56, 189, 248, 0.35)"
          strokeWidth="1.5"
          strokeDasharray="8 4"
        />

        {/* Curved lower visor arc border */}
        <path
          d="M 50,560 Q 500,590 950,560"
          fill="none"
          stroke="rgba(56, 189, 248, 0.35)"
          strokeWidth="1.5"
          strokeDasharray="8 4"
        />

        {/* Lateral visor brackets (Metroid Prime / Halo style) */}
        <path
          d="M 28,120 L 28,480"
          fill="none"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="1"
        />
        <path
          d="M 972,120 L 972,480"
          fill="none"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="1"
        />

        {/* Corner HUD framing brackets */}
        <path d="M 40,70 L 40,45 L 80,45" fill="none" stroke="rgba(56, 189, 248, 0.7)" strokeWidth="2" />
        <path d="M 960,70 L 960,45 L 920,45" fill="none" stroke="rgba(56, 189, 248, 0.7)" strokeWidth="2" />
        <path d="M 40,530 L 40,555 L 80,555" fill="none" stroke="rgba(56, 189, 248, 0.7)" strokeWidth="2" />
        <path d="M 960,530 L 960,555 L 920,555" fill="none" stroke="rgba(56, 189, 248, 0.7)" strokeWidth="2" />
      </svg>

      {/* 2. Top Header: Exit EVA Button & Mission Mode Tag */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-auto">
        {/* Clean Return to Orbit Exit Button */}
        <button
          onClick={onExitEva}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-cyan-950/90 border border-cyan-500/70 text-cyan-200 text-xs font-bold shadow-lg shadow-cyan-950/50 backdrop-blur-md transition-all active:scale-95 group"
          title={lang === 'es' ? 'Volver a Base (Órbita) [Esc]' : 'Return to Base (Orbit) [Esc]'}
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>{lang === 'es' ? '⬅ Volver a Base (Órbita)' : '⬅ Return to Orbit'}</span>
          <span className="text-[10px] text-cyan-400/80 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">Esc</span>
        </button>

        {/* EVA Mission Indicator Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700/80 backdrop-blur-md text-[11px] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-white tracking-wider">
            {location === 'moon' ? 'EVA LUNAR · SHACKLETON' : 'EVA MARCIANA · JEZERO'}
          </span>
          <span className="text-cyan-400 font-mono text-[10px]">xEMU-MKIV</span>
        </div>
      </div>

      {/* 3. Top Degree Compass Tape Tracking Camera Yaw */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 sm:w-80 flex flex-col items-center">
        {/* Compass Heading Readout */}
        <div className="flex items-center gap-1.5 text-xs font-black text-cyan-300 bg-slate-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-md mb-1">
          <CompassIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>{normalizedYaw}°</span>
          <span className="text-white font-black bg-cyan-950 px-1 rounded">{cardinal}</span>
        </div>

        {/* Compass Horizontal Tape */}
        <div className="relative w-full h-7 bg-slate-950/70 border-x border-b border-cyan-500/30 rounded-b-lg backdrop-blur-md overflow-hidden shadow-inner">
          {/* Center pointer notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-cyan-400 z-10" />

          {/* Graduated markings */}
          <div className="relative w-full h-full">
            {compassTicks.map((tick, idx) => (
              <div
                key={idx}
                className="absolute top-1 flex flex-col items-center -translate-x-1/2 transition-all duration-75"
                style={{ left: `${tick.offsetPct}%` }}
              >
                <div
                  className={`w-0.5 ${
                    tick.isCardinal ? 'h-3 bg-cyan-300' : 'h-1.5 bg-slate-500'
                  }`}
                />
                <span
                  className={`text-[9px] font-bold tracking-tight select-none ${
                    tick.isCardinal
                      ? tick.label === 'N'
                        ? 'text-cyan-300 font-black'
                        : 'text-white'
                      : 'text-slate-400 text-[8px]'
                  }`}
                >
                  {tick.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Center Reticle & Artificial Pitch Reference (Subtle) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-12 h-12 flex items-center justify-center">
          {/* Central reticle dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/70 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          {/* Subtle pitch wing marks */}
          <div className="absolute -left-6 w-4 h-0.5 bg-cyan-500/40" />
          <div className="absolute -right-6 w-4 h-0.5 bg-cyan-500/40" />
        </div>
      </div>

      {/* 5. Lower-Left HUD: Dynamic O2 Telemetry Arc & Tank Readout */}
      <div className="absolute bottom-6 left-4 sm:left-8 flex flex-col gap-1.5 pointer-events-auto">
        <div className={`p-3 rounded-2xl bg-slate-950/85 border ${o2Border} backdrop-blur-md shadow-2xl transition-all`}>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Wind className={`w-4 h-4 ${o2Text}`} />
              <span className="text-[11px] font-black text-slate-200 uppercase tracking-wider">
                {lang === 'es' ? 'Soporte O₂' : 'O₂ Life Support'}
              </span>
            </div>
            <span className={`text-sm font-black ${o2Text}`}>
              {clampedO2.toFixed(1)}%
            </span>
          </div>

          {/* Segmented Horizontal / Arc Bar */}
          <div className="w-40 sm:w-48 h-3 bg-slate-900 rounded-lg p-0.5 border border-slate-700/80 overflow-hidden relative">
            <div
              className={`h-full rounded-md transition-all duration-300 ${o2Bg} ${
                isO2Critical ? 'animate-pulse' : ''
              }`}
              style={{ width: `${clampedO2}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
            <span>P_tanque: 420 bar</span>
            <span className={isO2Critical ? 'text-rose-400 font-bold' : isO2Warning ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
              {isO2Critical ? 'CRÍTICO' : isO2Warning ? 'RESERVA' : 'NOMINAL'}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Lower-Right HUD: Suit Telemetry Diagnostics */}
      <div className="absolute bottom-6 right-4 sm:right-8 flex flex-col gap-1.5 pointer-events-auto">
        <div className="p-3 rounded-2xl bg-slate-950/85 border border-slate-700/80 backdrop-blur-md shadow-2xl flex flex-col gap-1.5 text-[10px]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400" />
              {lang === 'es' ? 'TELEMETRÍA TRAJE' : 'SUIT TELEMETRY'}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-black text-[9px]">
              ONLINE
            </span>
          </div>

          {/* Pressure */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              {lang === 'es' ? 'Presión' : 'Pressure'}
            </span>
            <span className="font-bold text-white">
              {suitPressureKPa.toFixed(1)} kPa <span className="text-slate-400 text-[9px]">(4.3 psi)</span>
            </span>
          </div>

          {/* Temperature */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-cyan-400" />
              {lang === 'es' ? 'Temp. Traje' : 'Suit Temp'}
            </span>
            <span className="font-bold text-cyan-300">
              {suitTempC.toFixed(1)} °C
            </span>
          </div>

          {/* Heart Rate */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-rose-400" />
              {lang === 'es' ? 'Pulso' : 'Heart Rate'}
            </span>
            <span className="font-bold text-white flex items-center gap-1">
              <span>{heartRateBpm}</span>
              <span className="text-[9px] text-slate-400">BPM</span>
            </span>
          </div>

          {/* Radiation */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              {lang === 'es' ? 'Radiación' : 'Radiation'}
            </span>
            <span className={`font-bold ${radiationLevel > 0.5 ? 'text-amber-400' : 'text-slate-300'}`}>
              {radiationLevel.toFixed(2)} mSv/h
            </span>
          </div>
        </div>
      </div>

      {/* 7. Bottom Walking Keyboard Controls Helper */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2 bg-slate-950/70 border border-slate-800/80 px-3 py-1 rounded-full backdrop-blur-md text-[10px] text-slate-400">
        <span className="text-cyan-300 font-bold">[W][A][S][D]</span> {lang === 'es' ? 'Caminar' : 'Walk'} · 
        <span className="text-cyan-300 font-bold">[Shift]</span> {lang === 'es' ? 'Correr' : 'Sprint'} · 
        <span className="text-cyan-300 font-bold">{lang === 'es' ? 'Mouse' : 'Mouse'}</span> {lang === 'es' ? 'Mirar' : 'Look'} · 
        <span className="text-cyan-300 font-bold">[Esc]</span> {lang === 'es' ? 'Salir' : 'Exit'}
      </div>
    </div>
  );
};
