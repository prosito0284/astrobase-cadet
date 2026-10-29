import React, { useState } from 'react';
import { NASA_DATASETS } from '../data/nasaData';
import { NasaDataSetCard } from '../types/game';
import { 
  BookOpen, 
  ExternalLink, 
  X, 
  Sparkles, 
  ShieldAlert, 
  Sprout, 
  Moon, 
  Globe2, 
  Calculator,
  Search,
  CheckCircle2
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface ScienceDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'es' | 'en';
}

export const ScienceDossierModal: React.FC<ScienceDossierModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DONKI' | 'OSDR' | 'ARTEMIS' | 'MEDA'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive mini-calculator state for kids
  const [calcAstronauts, setCalcAstronauts] = useState<number>(4);
  const [calcShieldThicknessCm, setCalcShieldThicknessCm] = useState<number>(50);

  if (!isOpen) return null;

  const filteredData = NASA_DATASETS.filter(item => {
    const matchesFilter = activeFilter === 'ALL' || item.source === activeFilter;
    const matchesSearch = item.titleEs.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.summaryEs.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.dateOrId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Fun STEM math
  const requiredO2PerDay = calcAstronauts * 0.84; // kg O2 per day (~0.84 kg/human)
  const requiredVeggieArea = (requiredO2PerDay / 0.016).toFixed(0); // sq meters of salad crops
  const radiationBlockedPct = Math.min(99.9, (1 - Math.exp(-0.06 * calcShieldThicknessCm)) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.25)] max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-md shadow-cyan-900/40">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Expediente Científico de Datos Abiertos de la NASA' : 'NASA Open Science Data Repository Dossier'}</span>
                <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black">
                  VERIFIED
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'es' 
                  ? 'Descubre las fuentes científicas y conjuntos de datos reales que sustentan cada mecánica del juego.' 
                  : 'Explore authentic NASA datasets and peer-reviewed studies powering this simulation.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills & Search Bar */}
        <div className="my-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {(['ALL', 'DONKI', 'OSDR', 'ARTEMIS', 'MEDA'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => {
                  soundFx.playClick();
                  setActiveFilter(cat);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all border ${
                  activeFilter === cat
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'ALL' ? (lang === 'es' ? 'Todos los Datos' : 'All Data') : cat}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder={lang === 'es' ? 'Buscar dato o misión...' : 'Search dataset...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-44 sm:w-56"
            />
          </div>
        </div>

        {/* NASA Dataset Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2 overflow-y-auto max-h-96 pr-1">
          {filteredData.map(item => (
            <div 
              key={item.id}
              className="bg-slate-950/90 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-3.5 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.source}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.dateOrId}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-200 transition-colors">
                  {lang === 'es' ? item.titleEs : item.title}
                </h3>
                <div className="text-[10px] font-semibold text-slate-400 mb-2">
                  {item.sourceFullName}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === 'es' ? item.summaryEs : item.summaryEn}
                </p>

                {/* Real Data Highlight */}
                <div className="my-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300">
                  <span className="text-slate-400 font-sans block text-[10px] font-bold">
                    {lang === 'es' ? 'Telemetría Real Registrada:' : 'Real Telemetry Recorded:'}
                  </span>
                  {item.realDataValue}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[10px] text-amber-300 italic">
                  💡 {lang === 'es' ? item.scientificImpactEs : item.scientificImpact}
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 ml-2 flex-shrink-0"
                >
                  <span>Portal NASA</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive STEM Lab for Kids: Mini Calculator */}
        <div className="mt-3 pt-3 border-t border-slate-800 bg-slate-950/70 rounded-2xl p-3 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs sm:text-sm font-black text-cyan-200">
              {lang === 'es' ? 'Laboratorio Interactivo STEM: Simulador de Ecuaciones de la NASA' : 'Interactive STEM Lab: NASA Equation Simulator'}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Calculator 1: Hydroponics & Oxygen */}
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="font-bold text-slate-200 flex items-center gap-1 mb-1">
                <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                {lang === 'es' ? 'Consumo de O₂ vs Cultivo Veggie (OSD-379)' : 'O₂ Demand vs Veggie Crops (OSD-379)'}
              </span>
              <div className="flex items-center gap-2 my-1.5">
                <label className="text-[11px] text-slate-400">{lang === 'es' ? 'Astronautas:' : 'Crew size:'}</label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={calcAstronauts}
                  onChange={(e) => setCalcAstronauts(Number(e.target.value))}
                  className="w-28 accent-emerald-400 cursor-pointer"
                />
                <span className="font-black text-emerald-300">{calcAstronauts}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {calcAstronauts} astronautas consumen <b className="text-sky-300">{requiredO2PerDay.toFixed(2)} kg de O₂/día</b>. Se requieren <b className="text-emerald-300">{requiredVeggieArea} m²</b> de cultivo hidropónico de lechuga para fotosintetizar su oxígeno de forma 100% natural.
              </p>
            </div>

            {/* Calculator 2: Regolith Shielding against DONKI CMEs */}
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="font-bold text-slate-200 flex items-center gap-1 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                {lang === 'es' ? 'Blindaje de Regolito vs Radiación DONKI' : 'Regolith Shielding vs DONKI Protons'}
              </span>
              <div className="flex items-center gap-2 my-1.5">
                <label className="text-[11px] text-slate-400">{lang === 'es' ? 'Grosor cúpula:' : 'Shell depth:'}</label>
                <input
                  type="range"
                  min="10"
                  max="150"
                  step="10"
                  value={calcShieldThicknessCm}
                  onChange={(e) => setCalcShieldThicknessCm(Number(e.target.value))}
                  className="w-28 accent-purple-400 cursor-pointer"
                />
                <span className="font-black text-purple-300">{calcShieldThicknessCm} cm</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Con <b className="text-purple-300">{calcShieldThicknessCm} cm de regolito</b> compactado sobre la cúpula, se atenúa el <b className="text-emerald-400">{radiationBlockedPct}%</b> de los rayos cósmicos y protones de una CME solar de clase X.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
