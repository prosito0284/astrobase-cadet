import React, { useState } from 'react';
import { 
  Sprout, 
  X, 
  Sun, 
  Droplets, 
  Wind, 
  Sparkles, 
  CheckCircle2, 
  Award,
  Zap,
  Info
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';

interface BotanicalLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHarvest: (foodGain: number, scienceGain: number, moraleGain: number) => void;
  currentWater: number;
  currentEnergy: number;
  lang: 'es' | 'en';
}

interface CropType {
  id: string;
  nameEs: string;
  nameEn: string;
  scientificName: string;
  nasaStudy: string;
  growthDays: number;
  co2AbsorptionPerDay: number; // grams
  o2GenerationPerDay: number;  // grams
  nutritionValue: string;
  icon: string;
  descriptionEs: string;
  descriptionEn: string;
}

const CROPS: CropType[] = [
  {
    id: 'mizuna',
    nameEs: 'Mostaza Japonesa Mizuna',
    nameEn: 'Mizuna Japanese Mustard',
    scientificName: 'Brassica rapa var. nipposinica',
    nasaStudy: 'NASA OSDR OSD-379',
    growthDays: 4,
    co2AbsorptionPerDay: 26,
    o2GenerationPerDay: 19,
    nutritionValue: 'Alta en Vitamina K, A y Antioxidantes (Salud celular)',
    icon: '🥬',
    descriptionEs: 'Cultivo estrella del estudio OSD-379 de la NASA. Hojas crujientes y picantes que estimulan las papilas gustativas de los astronautas (que pierden sensibilidad por congestión en microgravedad).',
    descriptionEn: 'Flagship crop from NASA OSDR study OSD-379. Peppery crunch that stimulates astronaut taste buds diminished by microgravity head congestion.',
  },
  {
    id: 'outredgeous',
    nameEs: 'Lechuga Romana Roja Outredgeous',
    nameEn: 'Outredgeous Red Romaine Lettuce',
    scientificName: 'Lactuca sativa',
    nasaStudy: 'NASA Veggie-01 / ISS Exp 44',
    growthDays: 5,
    co2AbsorptionPerDay: 22,
    o2GenerationPerDay: 16,
    nutritionValue: 'Rica en Vitamina C, Ácido Fólico y Fibra',
    icon: '🥗',
    descriptionEs: 'La primera hortaliza formalmente cosechada y comida por humanos en el espacio a bordo de la ISS. Su pigmentación roja antocianina protege a las hojas del exceso de radiación ultravioleta.',
    descriptionEn: 'The first fresh vegetable harvested and consumed on orbit. Red anthocyanin pigments naturally protect plant tissue against space radiation.',
  },
  {
    id: 'radish',
    nameEs: 'Rábano Espacial Cherry Belle',
    nameEn: 'Cherry Belle Space Radish',
    scientificName: 'Raphanus sativus',
    nasaStudy: 'NASA Advanced Plant Habitat (APH)',
    growthDays: 3,
    co2AbsorptionPerDay: 18,
    o2GenerationPerDay: 14,
    nutritionValue: 'Potasio, Calcio y Minerales Óseos',
    icon: '🌱',
    descriptionEs: 'Crecimiento ultrarrápido bajo tierra en tubos hidropónicos porosos. Aporta calcio bioasimilable para contrarrestar la pérdida ósea del estudio de los gemelos (OSD-174).',
    descriptionEn: 'Ultra-fast underground bulb growth in porous tubes. Supplies bioavailable calcium to combat microgravity osteopenia (OSD-174).',
  },
  {
    id: 'spirulina',
    nameEs: 'Microalga Spirulina (Biorreactor)',
    nameEn: 'Spirulina Microalgae Bioreactor',
    scientificName: 'Arthrospira platensis',
    nasaStudy: 'NASA MELiSSA / Closed Loop Life Support',
    growthDays: 2,
    co2AbsorptionPerDay: 48,
    o2GenerationPerDay: 35,
    nutritionValue: '65% Proteína completa, Hierro y B12',
    icon: '🧪',
    descriptionEs: 'Cultivo microscópico líquido. Absorbe el doble de CO2 que cualquier planta terrestre y se reproduce cada 48 horas. Ideal para emergencias de soporte vital.',
    descriptionEn: 'Liquid microalgae culture. Absorbs twice as much CO2 per volume as leafy greens and doubles biomass every 48 hours for ECLSS loops.',
  },
];

export const BotanicalLabModal: React.FC<BotanicalLabModalProps> = ({
  isOpen,
  onClose,
  onHarvest,
  currentWater,
  currentEnergy,
  lang,
}) => {
  const [selectedCrop, setSelectedCrop] = useState<CropType>(CROPS[0]);
  const [redSpectrum, setRedSpectrum] = useState<number>(70); // % Red LED (660nm)
  const [blueSpectrum, setBlueSpectrum] = useState<number>(30); // % Blue LED (450nm)
  const [growthProgress, setGrowthProgress] = useState<number>(65); // 0-100%
  const [isWatering, setIsWatering] = useState<boolean>(false);

  if (!isOpen) return null;

  // Efficiency calculation based on red/blue spectrum
  const optimalRatioScore = Math.max(0, 100 - Math.abs(redSpectrum - 75) * 1.5 - Math.abs(blueSpectrum - 25) * 1.5);
  const realCO2Absorbed = Math.round(selectedCrop.co2AbsorptionPerDay * (optimalRatioScore / 100));
  const realO2Produced = Math.round(selectedCrop.o2GenerationPerDay * (optimalRatioScore / 100));

  // Determine LED glow color
  const ledGlowColor = `rgb(${Math.round(redSpectrum * 2.5)}, 40, ${Math.round(blueSpectrum * 2.55)})`;

  const handleWaterCrop = () => {
    if (currentWater < 5) return;
    soundFx.playHarvest();
    setIsWatering(true);
    setTimeout(() => {
      setIsWatering(false);
      setGrowthProgress(prev => Math.min(100, prev + 25));
    }, 600);
  };

  const handleHarvestClick = () => {
    soundFx.playVictory();
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    onHarvest(25, 15, 12);
    setGrowthProgress(15);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(16,185,129,0.3)] max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md shadow-emerald-900/40">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Laboratorio Botánico Espacial VEGGIE' : 'VEGGIE Space Botanical Chamber'}</span>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  NASA OSDR OSD-379
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'es'
                  ? 'Ajusta el espectro de luz LED y el riego para cultivar superalimentos que regeneran el aire y nutren a los astronautas.'
                  : 'Tune LED photon spectra and irrigation to cultivate life-support greens in low gravity.'}
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

        {/* Crop Selection Bar */}
        <div className="my-3">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
            {lang === 'es' ? 'Selecciona el Cultivo Espacial de la NASA:' : 'Select NASA Experimental Crop:'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CROPS.map(crop => (
              <button
                key={crop.id}
                onClick={() => {
                  soundFx.playClick();
                  setSelectedCrop(crop);
                }}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  selectedCrop.id === crop.id
                    ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-400/50 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{crop.icon}</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-100 truncate">
                      {lang === 'es' ? crop.nameEs : crop.nameEn}
                    </h4>
                    <span className="text-[9px] font-mono text-emerald-400 block truncate">
                      {crop.nasaStudy}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Chamber Visual & Tuning Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
          {/* Chamber Visualizer */}
          <div 
            className="rounded-2xl p-4 flex flex-col items-center justify-between relative overflow-hidden border border-slate-800 transition-all duration-700 shadow-inner"
            style={{ 
              backgroundColor: '#090d16',
              boxShadow: `inset 0 0 45px ${ledGlowColor}33`,
            }}
          >
            {/* LED Overhead Grow Lights */}
            <div 
              className="w-full flex items-center justify-around py-2 px-4 rounded-xl border border-white/10 backdrop-blur-md transition-all duration-500"
              style={{ backgroundColor: `${ledGlowColor}22`, borderColor: `${ledGlowColor}55` }}
            >
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold" style={{ color: ledGlowColor }}>
                <Zap className="w-3.5 h-3.5 animate-pulse" />
                <span>LED Spectrum: {redSpectrum}% Red (660nm) / {blueSpectrum}% Blue (450nm)</span>
              </div>
            </div>

            {/* Animated Growing Plant Artwork */}
            <div className="my-6 relative flex flex-col items-center">
              {/* Glow field */}
              <div 
                className="absolute w-36 h-36 rounded-full blur-2xl opacity-40 transition-all duration-500"
                style={{ backgroundColor: ledGlowColor }}
              />

              <div className="relative text-7xl sm:text-8xl transform transition-transform duration-500" style={{ transform: `scale(${0.6 + (growthProgress / 100) * 0.5})` }}>
                {selectedCrop.icon}
              </div>

              {isWatering && (
                <div className="absolute inset-0 flex items-center justify-center animate-bounce">
                  <span className="text-3xl">💧</span>
                </div>
              )}

              {/* Substrate / Hydroponic Pillow */}
              <div className="mt-3 px-4 py-1 rounded-full bg-stone-900 border border-stone-700 text-[10px] text-stone-300 font-mono shadow-md">
                Sustrato Arcilloso Arcillite & Cojines Veggie
              </div>
            </div>

            {/* Growth Progress Bar */}
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-slate-300">
                  {lang === 'es' ? 'Maduración del Cultivo:' : 'Crop Maturity:'}
                </span>
                <span className="text-emerald-400 font-black">{growthProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-500"
                  style={{ width: `${growthProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Spectrum Controls & Science Telemetry */}
          <div className="flex flex-col justify-between space-y-3">
            {/* LED Sliders */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>{lang === 'es' ? 'Calibración Fotónica (Espectro LED)' : 'Photonic LED Spectrum Calibration'}</span>
              </h4>

              {/* Red LED Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-red-400">LED Rojo 660 nm (Fotosíntesis & Biomasa):</span>
                  <span className="font-mono text-red-300">{redSpectrum}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={redSpectrum}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setRedSpectrum(r);
                    setBlueSpectrum(100 - r);
                  }}
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>

              {/* Blue LED Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-sky-400">LED Azul 450 nm (Apertura de Estomas & Morfología):</span>
                  <span className="font-mono text-sky-300">{blueSpectrum}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={blueSpectrum}
                  onChange={(e) => {
                    const b = Number(e.target.value);
                    setBlueSpectrum(b);
                    setRedSpectrum(100 - b);
                  }}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div className="text-[10px] text-amber-300/90 italic flex items-center gap-1">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  {lang === 'es' 
                    ? 'Proporción óptima de la NASA: ~75% Rojo y 25% Azul maximiza la síntesis de glucosa.'
                    : 'Optimal NASA photoperiod: ~75% Red and 25% Blue maximizes carbohydrate yield.'}
                </span>
              </div>
            </div>

            {/* Environmental Benefits Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                  {lang === 'es' ? 'Absorción de CO₂' : 'CO₂ Cleared'}
                </span>
                <span className="text-sm font-black text-emerald-400">
                  +{realCO2Absorbed} g/día
                </span>
              </div>

              <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  {lang === 'es' ? 'Producción de O₂' : 'O₂ Generated'}
                </span>
                <span className="text-sm font-black text-sky-400">
                  +{realO2Produced} g/día
                </span>
              </div>

              <div className="col-span-2 text-[11px] text-slate-300 bg-slate-900/40 p-2 rounded-xl border border-slate-800/80">
                <span className="font-bold text-amber-300">{lang === 'es' ? 'Aporte Nutricional:' : 'Nutrition:'} </span>
                {selectedCrop.nutritionValue}
              </div>
            </div>

            {/* Action Buttons: Water & Harvest */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleWaterCrop}
                disabled={currentWater < 5 || isWatering || growthProgress >= 100}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Droplets className="w-4 h-4 text-blue-400" />
                <span>{lang === 'es' ? 'Regar con Agua (-5L)' : 'Irrigate (-5L)'}</span>
              </button>

              <button
                onClick={handleHarvestClick}
                disabled={growthProgress < 80}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/40 border border-emerald-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
              >
                <Award className="w-4 h-4 text-emerald-200" />
                <span>{lang === 'es' ? '¡Cosechar y Servir!' : 'Harvest & Serve!'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
