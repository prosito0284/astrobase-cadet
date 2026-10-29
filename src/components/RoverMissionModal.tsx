import React, { useState } from 'react';
import { BaseLocation } from '../types/game';
import { 
  Compass, 
  X, 
  MapPin, 
  Send, 
  Battery, 
  Droplets, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle,
  CheckCircle2,
  Zap,
  Info
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';

interface RoverMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: BaseLocation;
  currentEnergy: number;
  onCompleteSortie: (reward: { water?: number; shield?: number; science?: number; energyBonus?: number }) => void;
  lang: 'es' | 'en';
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

export const RoverMissionModal: React.FC<RoverMissionModalProps> = ({
  isOpen,
  onClose,
  location,
  currentEnergy,
  onCompleteSortie,
  lang,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('shackleton_ice');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

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
      descriptionEs: 'Cumbre elevada donde el Sol casi nunca se oculta. Instalar un repetidor solar fotovoltaico genera un excedente de energía para la colonia.',
      descriptionEn: 'High-elevation ridge bathed in near-constant sunlight. Installing microwave power relays secures energy during the long polar night.',
      rewardType: 'energy',
      rewardAmount: 15,
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
      rewardAmount: 18,
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

  const handleLaunchSortie = () => {
    if (currentEnergy < activeTarget.batteryCost) return;
    soundFx.playHarvest();
    setIsDeploying(true);

    setTimeout(() => {
      setIsDeploying(false);
      soundFx.playVictory();
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });

      if (activeTarget.rewardType === 'water') {
        onCompleteSortie({ water: activeTarget.rewardAmount });
      } else if (activeTarget.rewardType === 'shield') {
        onCompleteSortie({ shield: activeTarget.rewardAmount });
      } else if (activeTarget.rewardType === 'science') {
        onCompleteSortie({ science: activeTarget.rewardAmount });
      } else if (activeTarget.rewardType === 'energy') {
        onCompleteSortie({ energyBonus: activeTarget.rewardAmount });
      }

      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.3)] max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-800 text-white shadow-md shadow-cyan-900/40">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Centro de Operaciones de Rovers de la NASA' : 'NASA Planetary Rover Sortie Command'}</span>
                <span className="text-[10px] bg-cyan-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  {location === 'moon' ? 'ROVER VIPER' : 'ROVER PERSEVERANCE'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'es' 
                  ? 'Despacha expediciones robóticas a zonas científicas para minar hielo, explorar cuevas o descubrir fósiles.' 
                  : 'Deploy autonomous robotic sorties to extract water ice, survey lava tubes, and analyze minerals.'}
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

        {/* Rover Sortie Destinations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
          {currentTargets.map(target => {
            const isSelected = target.id === activeTarget.id;
            return (
              <button
                key={target.id}
                onClick={() => {
                  soundFx.playClick();
                  setSelectedTargetId(target.id);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
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
                  <span className="text-amber-400">-{target.batteryCost} kWh Batería</span>
                  <span className="text-emerald-400">
                    +{target.rewardAmount} {target.rewardType.toUpperCase()}
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
                Costo de Batería: <b className="text-amber-300">{activeTarget.batteryCost} kWh</b> (Disponible: {Math.round(currentEnergy)} kWh)
              </span>
            </div>

            <button
              onClick={handleLaunchSortie}
              disabled={currentEnergy < activeTarget.batteryCost || isDeploying}
              className="flex items-center gap-2 py-2 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-cyan-950/40 border border-cyan-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isDeploying 
                  ? (lang === 'es' ? 'Desplegando Rover...' : 'Sortie in Progress...') 
                  : (lang === 'es' ? '¡Despachar Expedición!' : 'Launch Sortie!')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
