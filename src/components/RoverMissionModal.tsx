import React, { useState, useEffect, useRef } from 'react';
import { BaseLocation } from '../types/game';
import { 
  Compass, 
  X, 
  Send, 
  Battery, 
  Zap,
  Shield,
  Droplets,
  Microscope,
  Sun,
  Gamepad2,
  ArrowLeft
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Rover3DCanvas } from './rover3d/Rover3DCanvas';

interface RoverMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: BaseLocation;
  currentEnergy: number;
  onCompleteSortie: (reward: { batteryCost: number; water?: number; shield?: number; science?: number; energyBonus?: number }) => void;
  lang: 'es' | 'en';
  sortiesToday?: number;
  maxSortiesPerDay?: number;
}

interface SortieTarget {
  id: string;
  nameEs: string;
  nameEn: string;
  coordinates: string;
  distanceKm: number;
  batteryCost: number;
  riskLevel: 'Bajo' | 'Medio' | 'Alto';
  descriptionEs: string;
  descriptionEn: string;
  rewardType: 'water' | 'shield' | 'science' | 'energy';
  rewardAmount: number;
  nasaRef: string;
  icon: string;
}

const getStorageRoverSorties = (loc: BaseLocation): number => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('astrobase_dual_save_v7') || localStorage.getItem('astrobase_dual_save_v6');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const col = parsed[loc];
          if (col && typeof col.roverSortiesToday === 'number' && Number.isFinite(col.roverSortiesToday)) {
            return col.roverSortiesToday;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return 0;
};

const incrementStorageRoverSorties = (loc: BaseLocation) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('astrobase_dual_save_v7');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed[loc]) {
          parsed[loc].roverSortiesToday = (Number(parsed[loc].roverSortiesToday) || 0) + 1;
          localStorage.setItem('astrobase_dual_save_v7', JSON.stringify(parsed));
        }
      }
    }
  } catch {
    // ignore
  }
};

export const RoverMissionModal: React.FC<RoverMissionModalProps> = ({
  isOpen,
  onClose,
  location,
  currentEnergy,
  onCompleteSortie,
  lang,
  sortiesToday: propSortiesToday,
  maxSortiesPerDay = 2,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('shackleton_ice');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isDriving3D, setIsDriving3D] = useState<boolean>(false);
  const isDeployingRef = useRef<boolean>(false);
  const [localSorties, setLocalSorties] = useState<number>(() => {
    return propSortiesToday !== undefined 
      ? propSortiesToday 
      : getStorageRoverSorties(location);
  });

  const deployTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize local sorties and deployment state on open or prop change
  useEffect(() => {
    if (isOpen) {
      // oxlint-disable-next-line react/set-state-in-effect
      setLocalSorties(propSortiesToday !== undefined ? propSortiesToday : getStorageRoverSorties(location));
      setIsDeploying(false);
      setIsDriving3D(false);
      isDeployingRef.current = false;
    }
  }, [isOpen, propSortiesToday, location]);

  // Cleanup pending deployment timeouts on unmount or modal close
  useEffect(() => {
    return () => {
      if (deployTimeoutRef.current) {
        clearTimeout(deployTimeoutRef.current);
        deployTimeoutRef.current = null;
      }
      isDeployingRef.current = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const moonTargets: SortieTarget[] = [
    {
      id: 'shackleton_ice',
      nameEs: 'Fondo del Cráter Shackleton (Trampa Fría)',
      nameEn: 'Shackleton Crater Floor (Cold Trap)',
      coordinates: '89.9° S, 0.0° E',
      distanceKm: 4.2,
      batteryCost: 16,
      riskLevel: 'Medio',
      descriptionEs: 'Descenso a la oscuridad total a -240 °C. El rover VIPER usa su espectrómetro de neutrones y taladro de 1 metro para extraer regolito rico en hielo de agua (ISRU).',
      descriptionEn: 'Sortie into permanent shadow at 40 Kelvin. VIPER rover drills 1 meter into regolith to harvest cryogenic water ice for ECLSS loops.',
      rewardType: 'water',
      rewardAmount: 22,
      nasaRef: 'NASA VIPER Rover & LRO Diviner Data',
      icon: '❄️',
    },
    {
      id: 'lava_tube_cave',
      nameEs: 'Tubo de Lava Subterráneo (Cueva Natural)',
      nameEn: 'Subterranean Lunar Lava Tube Cave',
      coordinates: '88.2° S, 14.5° W',
      distanceKm: 7.8,
      batteryCost: 14,
      riskLevel: 'Bajo',
      descriptionEs: 'Cavidad volcánica milenaria protegida de micrometeoritos y radiación solar DONKI. Establecer un sensor otorga blindaje natural permanente a la base.',
      descriptionEn: 'Ancient basaltic volcanic tunnel naturally shielded from solar flares and cosmic rays. Surveying unlocks permanent natural habitat shielding.',
      rewardType: 'shield',
      rewardAmount: 18,
      nasaRef: 'NASA LROC (Lunar Reconnaissance Orbiter Camera)',
      icon: '🕳️',
    },
    {
      id: 'eternal_light_ridge',
      nameEs: 'Pico de Luz Eterna (Cresta Malapert)',
      nameEn: 'Peak of Eternal Light (Malapert Mountain)',
      coordinates: '86.0° S, 2.7° E',
      distanceKm: 12.0,
      batteryCost: 12,
      riskLevel: 'Bajo',
      descriptionEs: 'Cumbre elevada donde el Sol casi nunca se oculta. Instalar un repetidor solar fotovoltaico genera un balance equilibrado de energía.',
      descriptionEn: 'High-elevation ridge bathed in near-constant sunlight. Installing microwave power relays sustains balanced energy for the base.',
      rewardType: 'energy',
      rewardAmount: 12, // Rebalanced: does not exceed batteryCost (12 <= 12)
      nasaRef: 'NASA Artemis Polar Illumination Maps',
      icon: '☀️',
    },
  ];

  const marsTargets: SortieTarget[] = [
    {
      id: 'jezero_delta',
      nameEs: 'Delta Fluvial Antiguo de Jezero',
      nameEn: 'Ancient Jezero River Delta',
      coordinates: '18.38° N, 77.58° E',
      distanceKm: 3.5,
      batteryCost: 14,
      riskLevel: 'Bajo',
      descriptionEs: 'El rover Perseverance analiza rocas sedimentarias ricas en arcillas con los instrumentos PIXL y SHERLOC en busca de biofirmas orgánicas antiguas.',
      descriptionEn: 'Perseverance investigates delta mudstones using SHERLOC UV Raman spectrometer to identify biosignatures and geochemical history.',
      rewardType: 'science',
      rewardAmount: 25,
      nasaRef: 'NASA Mars 2020 Perseverance Rover',
      icon: '🔬',
    },
    {
      id: 'dune_field_clean',
      nameEs: 'Campo de Dunas Séítah (Limpieza Electrostática)',
      nameEn: 'Séítah Sand Dune Fields',
      coordinates: '18.42° N, 77.45° E',
      distanceKm: 6.2,
      batteryCost: 12,
      riskLevel: 'Medio',
      descriptionEs: 'Aprovechar remolinos de viento marciano (dust devils) para remover el polvo acumulado en los paneles solares y reactivar su generación eléctrica.',
      descriptionEn: 'Ride local dust devil wind corridors to clean surface arrays electrostatically, reclaiming lost photovoltaic generation.',
      rewardType: 'energy',
      rewardAmount: 12, // Rebalanced: does not exceed batteryCost (12 <= 12)
      nasaRef: 'NASA MEDA Wind & Dust Devil Survey',
      icon: '🌪️',
    },
    {
      id: 'hydrated_sulfates',
      nameEs: 'Depósitos de Sales y Sulfatos Hidratados',
      nameEn: 'Hydrated Sulfate Mineral Deposits',
      coordinates: '18.50° N, 77.70° E',
      distanceKm: 9.1,
      batteryCost: 16,
      riskLevel: 'Alto',
      descriptionEs: 'Calentar rocas de yeso y sulfatos subterráneos a 300 °C con el horno térmico del rover para evaporar y condensar agua líquida pura.',
      descriptionEn: 'Extract water bound chemically within subsurface sulfate crystals using the rover’s onboard thermal desorption cell.',
      rewardType: 'water',
      rewardAmount: 20,
      nasaRef: 'NASA CRISM Orbiter Mineralogy Data',
      icon: '💧',
    },
  ];

  const currentTargets = location === 'moon' ? moonTargets : marsTargets;
  const activeTarget = currentTargets.find(t => t.id === selectedTargetId) || currentTargets[0];

  const activeSortieCount = propSortiesToday !== undefined ? propSortiesToday : localSorties;
  const isDailyLimitReached = activeSortieCount >= maxSortiesPerDay;
  const remainingSorties = Math.max(0, maxSortiesPerDay - activeSortieCount);

  // Quick Sortie Fallback (Preserving 1200ms headless test contract)
  const handleLaunchSortie = () => {
    if (isDeployingRef.current || isDeploying) return;
    if (isDailyLimitReached) {
      soundFx.playAlert();
      return;
    }
    if (currentEnergy < activeTarget.batteryCost) {
      soundFx.playAlert();
      return;
    }

    soundFx.playHarvest();
    isDeployingRef.current = true;
    setIsDeploying(true);

    deployTimeoutRef.current = setTimeout(() => {
      setIsDeploying(false);
      isDeployingRef.current = false;
      soundFx.playVictory();
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });

      const sortiePayload = {
        batteryCost: activeTarget.batteryCost,
        ...(activeTarget.rewardType === 'water' ? { water: activeTarget.rewardAmount } : {}),
        ...(activeTarget.rewardType === 'shield' ? { shield: activeTarget.rewardAmount } : {}),
        ...(activeTarget.rewardType === 'science' ? { science: activeTarget.rewardAmount } : {}),
        ...(activeTarget.rewardType === 'energy' ? { energyBonus: activeTarget.rewardAmount } : {}),
      };

      onCompleteSortie(sortiePayload);
      setLocalSorties(prev => prev + 1);
      incrementStorageRoverSorties(location);
      onClose();
    }, 1200);
  };

  // Launch Interactive 3D Driving Mode
  const handleStart3DDriving = () => {
    if (isDeployingRef.current || isDeploying) return;
    if (isDailyLimitReached) {
      soundFx.playAlert();
      return;
    }
    if (currentEnergy < activeTarget.batteryCost) {
      soundFx.playAlert();
      return;
    }

    soundFx.playClick();
    setIsDriving3D(true);
  };

  // Complete Interactive 3D Driving Mode
  const handleComplete3DDriving = (results: {
    collectedWater: number;
    collectedShield: number;
    collectedScience: number;
    batteryUsed: number;
    batteryRemainingPct: number;
    dockedSuccessfully: boolean;
  }) => {
    setIsDriving3D(false);
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });

    // Dynamic calculation combining target baseline + interactive cargo shards
    const baseWater = activeTarget.rewardType === 'water' ? activeTarget.rewardAmount : 0;
    const baseShield = activeTarget.rewardType === 'shield' ? activeTarget.rewardAmount : 0;
    const baseScience = activeTarget.rewardType === 'science' ? activeTarget.rewardAmount : 0;
    const baseEnergy = activeTarget.rewardType === 'energy' ? activeTarget.rewardAmount : 0;

    const bonusEnergy = results.dockedSuccessfully 
      ? Math.round(results.batteryRemainingPct * 0.12)
      : 0;

    const finalWater = baseWater + (results.collectedWater * 3);
    const finalShield = baseShield + (results.collectedShield * 3);
    const finalScience = baseScience + (results.collectedScience * 4);
    const finalEnergyBonus = baseEnergy + bonusEnergy;

    const sortiePayload = {
      batteryCost: activeTarget.batteryCost,
      ...(finalWater > 0 ? { water: finalWater } : {}),
      ...(finalShield > 0 ? { shield: finalShield } : {}),
      ...(finalScience > 0 ? { science: finalScience } : {}),
      ...(finalEnergyBonus > 0 ? { energyBonus: finalEnergyBonus } : {}),
    };

    onCompleteSortie(sortiePayload);
    setLocalSorties(prev => prev + 1);
    incrementStorageRoverSorties(location);
    onClose();
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'water':
        return <Droplets className="w-3.5 h-3.5 text-blue-400" />;
      case 'shield':
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case 'science':
        return <Microscope className="w-3.5 h-3.5 text-cyan-400" />;
      case 'energy':
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className={`bg-slate-900 border-2 border-cyan-500/60 rounded-3xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.3)] max-h-[96vh] overflow-y-auto flex flex-col transition-all ${
        isDriving3D ? 'max-w-6xl' : 'max-w-4xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            {isDriving3D ? (
              <button
                onClick={() => setIsDriving3D(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-all flex items-center gap-1.5 text-xs font-bold"
                title={lang === 'es' ? 'Volver a Selección de Objetivo' : 'Back to Target Briefing'}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'es' ? 'Selector' : 'Briefing'}</span>
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-800 text-white shadow-md shadow-cyan-900/40">
                <Compass className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100">
                  {lang === 'es' ? 'Centro de Operaciones de Rovers de la NASA' : 'NASA Planetary Rover Sortie Command'}
                </h2>
                <span className="text-[10px] bg-cyan-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  {location === 'moon' ? 'ROVER VIPER' : 'ROVER PERSEVERANCE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isDriving3D
                  ? (lang === 'es' ? '¡Conduce en 3D! Dispara el láser a las formaciones minerales y regresa a la base antes de agotar la batería.' : '3D Driving Active! Blast mineral nodes with the laser and dock at base before battery depletes.')
                  : (lang === 'es' ? 'Despacha expediciones robóticas a zonas científicas para minar hielo, explorar cuevas o descubrir fósiles.' : 'Deploy autonomous robotic sorties to extract water ice, survey lava tubes, and analyze minerals.')}
              </p>
            </div>
          </div>

          {/* Close button - strictly disabled during active flight to prevent race conditions */}
          <button
            disabled={isDeploying}
            onClick={() => {
              if (isDeploying) return;
              soundFx.playClick();
              onClose();
            }}
            className={`p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all ${
              isDeploying ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={isDeploying ? (lang === 'es' ? 'Expedición en curso' : 'Sortie in progress') : (lang === 'es' ? 'Cerrar' : 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive 3D Driving Mode Active View */}
        {isDriving3D ? (
          <div className="mt-3">
            <Rover3DCanvas
              location={location}
              activeTarget={activeTarget}
              currentEnergy={currentEnergy}
              onFinishMission={handleComplete3DDriving}
              onCancel={() => setIsDriving3D(false)}
              lang={lang}
            />
          </div>
        ) : (
          /* Sortie Target Selector & Launch Cards */
          <>
            {/* Daily Sorties & Telemetry Bar */}
            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 font-bold">
                  {lang === 'es' ? 'Cuota de Expediciones por Sol:' : 'Sorties Quota per Sol:'}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-mono font-black text-[11px] ${
                  isDailyLimitReached 
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40' 
                    : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                }`}>
                  {remainingSorties} / {maxSortiesPerDay} {lang === 'es' ? 'restantes' : 'remaining'}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                <span>{lang === 'es' ? 'Batería de la Base: ' : 'Base Bus Energy: '}</span>
                <span className="text-amber-300 font-bold">{Math.round(currentEnergy)} kWh</span>
              </div>
            </div>

            {/* Rover Sortie Destinations - locked during deployment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
              {currentTargets.map(target => {
                const isSelected = target.id === activeTarget.id;
                return (
                  <button
                    key={target.id}
                    disabled={isDeploying}
                    onClick={() => {
                      if (isDeploying) return;
                      soundFx.playClick();
                      setSelectedTargetId(target.id);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    } ${isDeploying ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{target.icon}</span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-cyan-300">
                          {target.distanceKm} km
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-100">
                        {lang === 'es' ? target.nameEs : target.nameEn}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {target.coordinates}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-amber-400">-{target.batteryCost} kWh</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        {getRewardIcon(target.rewardType)}
                        <span>+{target.rewardAmount} {target.rewardType.toUpperCase()}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Target Deep-Dive Card */}
            <div className="bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-4 my-2">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                <div>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                    {activeTarget.nasaRef}
                  </span>
                  <h3 className="text-sm font-black text-slate-100">
                    {lang === 'es' ? activeTarget.nameEs : activeTarget.nameEn}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Riesgo:</span>
                  <span className={activeTarget.riskLevel === 'Bajo' ? 'text-emerald-400' : 'text-amber-400'}>
                    {activeTarget.riskLevel}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed my-2">
                {lang === 'es' ? activeTarget.descriptionEs : activeTarget.descriptionEn}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Battery className="w-4 h-4 text-amber-400" />
                  <span>
                    {lang === 'es' ? 'Costo de Batería:' : 'Battery Cost:'}{' '}
                    <b className="text-amber-300">{activeTarget.batteryCost} kWh</b> (
                    {lang === 'es' ? 'Disponible:' : 'Available:'} {Math.round(currentEnergy)} kWh)
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Secondary Accessible Action: Despacho Rápido (Headless Fallback) */}
                  <button
                    onClick={handleLaunchSortie}
                    disabled={currentEnergy < activeTarget.batteryCost || isDeploying || isDailyLimitReached}
                    className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title={lang === 'es' ? 'Despacho automático sin conducción 3D (1.2s)' : 'Automatic quick dispatch (1.2s)'}
                  >
                    <Send className="w-3 h-3 text-cyan-400" />
                    <span>
                      {isDeploying 
                        ? (lang === 'es' ? 'Desplegando...' : 'Deploying...') 
                        : (lang === 'es' ? 'Despacho Rápido' : 'Quick Sortie')}
                    </span>
                  </button>

                  {/* Primary Action: Iniciar Conducción 3D */}
                  <button
                    onClick={handleStart3DDriving}
                    disabled={currentEnergy < activeTarget.batteryCost || isDeploying || isDailyLimitReached}
                    className="flex items-center gap-2 py-2 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-cyan-950/40 border border-cyan-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                  >
                    <Gamepad2 className="w-4 h-4 text-cyan-200" />
                    <span>
                      {isDailyLimitReached
                        ? (lang === 'es' ? `Límite (${maxSortiesPerDay}/${maxSortiesPerDay})` : `Limit Reached`)
                        : (lang === 'es' ? '¡Iniciar Conducción 3D!' : 'Launch 3D Driving!')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
