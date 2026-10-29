import React from 'react';
import { ResourceState, BaseLocation, GameDifficulty, Astronaut } from '../types/game';
import { 
  Award, 
  Printer, 
  X, 
  CheckCircle2, 
  Sparkles, 
  Wind, 
  Zap, 
  Droplets, 
  Sprout, 
  ShieldCheck, 
  Rocket, 
  Calendar,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundFx } from '../utils/audio';

interface MissionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: BaseLocation;
  currentDay: number;
  totalDays: number;
  difficulty: GameDifficulty;
  resources: ResourceState;
  crew: Astronaut[];
  lang: 'es' | 'en';
}

export const MissionReportModal: React.FC<MissionReportModalProps> = ({
  isOpen,
  onClose,
  location,
  currentDay,
  totalDays,
  difficulty,
  resources,
  crew,
  lang,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    soundFx.playVictory();
    window.print();
  };

  const handleTriggerConfetti = () => {
    soundFx.playVictory();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const avgCrewHealth = Math.round(crew.reduce((acc, c) => acc + c.health, 0) / crew.length);
  const avgCrewMorale = Math.round(crew.reduce((acc, c) => acc + c.morale, 0) / crew.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn print:p-0 print:bg-white">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.25)] max-h-[92vh] overflow-y-auto flex flex-col print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black shadow-md shadow-amber-900/40">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Informe Oficial de Misión & Certificado' : 'Official Mission Debrief & Certificate'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'es' 
                  ? 'Evaluación de supervivencia, ingeniería y datos científicos recopilados.' 
                  : 'Survival score, engineering review, and scientific datasets logged.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerConfetti}
              className="p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all"
              title="¡Celebrar!"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'es' ? 'Imprimir' : 'Print'}</span>
            </button>
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
        </div>

        {/* PRINTABLE OFFICIAL NASA CERTIFICATE CARD */}
        <div className="my-3 p-5 sm:p-7 rounded-3xl border-4 border-amber-500/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-center relative overflow-hidden shadow-2xl print:bg-white print:border-4 print:border-slate-800 print:text-black">
          {/* Decorative Corner Seals */}
          <div className="absolute top-3 left-4 text-xs font-mono font-bold text-amber-400/60 print:text-slate-600">
            DOC: NASA-CADET-{location.toUpperCase()}-{currentDay}
          </div>
          <div className="absolute top-3 right-4 flex items-center gap-1 text-xs font-black text-red-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            <span>NASA STEM EXPLORATION</span>
          </div>

          <div className="flex justify-center my-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30 border-2 border-white">
              🏅
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-amber-300 tracking-wider uppercase print:text-black">
            {lang === 'es' ? 'CERTIFICADO DE COMANDANTE DE MISIÓN' : 'MISSION COMMANDER CERTIFICATE'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold print:text-slate-600">
            {lang === 'es' ? 'Programa de Exploración Espacial Juvenil de la NASA' : 'NASA Youth Deep Space Exploration Program'}
          </p>

          <p className="text-xs sm:text-sm text-slate-200 mt-4 max-w-lg mx-auto leading-relaxed print:text-slate-800">
            {lang === 'es'
              ? `Se certifica que el Cadete al mando ha liderado con éxito las operaciones de la base en ${location === 'moon' ? 'el Polo Sur Lunar (Artemis III)' : 'el Cráter Jezero de Marte (Ares I)'}, resolviendo dilemas reales de soporte vital, radiación solar DONKI, cultivos Veggie OSDR y aislamiento de comunicaciones.`
              : `This hereby certifies that the commanding cadet has demonstrated exceptional leadership at the ${location === 'moon' ? 'Lunar South Pole (Artemis III)' : 'Mars Jezero Crater (Ares I)'} base, mastering ECLSS life support, DONKI space weather shielding, OSDR hydroponics, and deep space latency.`}
          </p>

          {/* Core Telemetry Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 max-w-xl mx-auto text-left">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <span className="text-[10px] text-slate-400 block font-semibold print:text-slate-600">
                {lang === 'es' ? 'Días Sobrevividos' : 'Days Commanded'}
              </span>
              <span className="text-base font-black text-amber-300 print:text-black">
                {currentDay} / {totalDays}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <span className="text-[10px] text-slate-400 block font-semibold print:text-slate-600">
                {lang === 'es' ? 'Salud Tripulación' : 'Crew Health'}
              </span>
              <span className="text-base font-black text-emerald-400 print:text-black">
                {avgCrewHealth}%
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <span className="text-[10px] text-slate-400 block font-semibold print:text-slate-600">
                {lang === 'es' ? 'Ciencia Descubierta' : 'Science Points'}
              </span>
              <span className="text-base font-black text-cyan-300 print:text-black">
                {resources.sciencePoints} pts
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300">
              <span className="text-[10px] text-slate-400 block font-semibold print:text-slate-600">
                {lang === 'es' ? 'Radiación Protegida' : 'Radiation Shield'}
              </span>
              <span className="text-base font-black text-purple-300 print:text-black">
                {Math.round(resources.shieldIntegrity)}%
              </span>
            </div>
          </div>

          {/* STEM Competencies Mastered */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-left print:border-slate-300">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 mb-2 print:text-slate-800">
              {lang === 'es' ? 'Competencias STEM de la NASA Demostradas:' : 'NASA STEM Competencies Mastered:'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300 print:text-slate-700">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Gestión de Energía Fotovoltaica vs Ciclos Planetarios</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Blindaje de Regolito y Agua vs CMEs Solares (DONKI)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Fotosíntesis en Microgravedad y Nutrición Veggie (OSDR)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Autonomía Operativa ante Retrasos de Velocidad de la Luz</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400 print:text-slate-600 print:border-slate-300">
            <div>
              <div className="font-sans font-bold text-slate-200 print:text-black">Capcom NOVA</div>
              <div className="text-[10px]">Director de Vuelo de IA, NASA</div>
            </div>
            <div>
              <div className="font-sans font-bold text-slate-200 print:text-black">Dra. Valentina Alarcón</div>
              <div className="text-[10px]">Comandante de Base Artemis/Ares</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
