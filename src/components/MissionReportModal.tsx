import React, { useState, useRef } from 'react';
import { ResourceState, BaseLocation, GameDifficulty, Astronaut } from '../types/game';
import { 
  Award, 
  Printer, 
  X, 
  CheckCircle2, 
  Sparkles
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
  commanderName?: string;
  commanderPatch?: string;
  onRestart?: (difficulty?: GameDifficulty) => void;
  missionCompleted?: boolean;
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
  commanderName,
  commanderPatch,
  onRestart,
  missionCompleted,
}) => {
  const isRestartingRef = useRef(false);
  const [isRestarting, setIsRestarting] = useState(false);

  if (!isOpen) return null;

  const isMissionComplete = Boolean(
    missionCompleted !== undefined
      ? (missionCompleted && currentDay >= totalDays)
      : (currentDay >= totalDays && totalDays > 0)
  );

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

  const avgCrewHealth = crew && crew.length > 0
    ? Math.round(crew.reduce((acc, c) => acc + (c.health || 0), 0) / crew.length)
    : 0;

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
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100">
                  {isMissionComplete
                    ? (lang === 'es' ? 'Informe Oficial de Misión & Certificado' : 'Official Mission Debrief & Certificate')
                    : (lang === 'es' ? 'Informe Intermedio de Misión & Telemetría' : 'Interim Mission Telemetry & Operations Log')}
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300">
                  Por Troncos Intergalácticos
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isMissionComplete
                  ? (lang === 'es' 
                      ? 'Evaluación de supervivencia, ingeniería y datos científicos recopilados.' 
                      : 'Survival score, engineering review, and scientific datasets logged.')
                  : (lang === 'es'
                      ? 'Telemetría de la base en curso. Certificado oficial bloqueado hasta completar la misión.'
                      : 'Ongoing colony telemetry. Official NASA certificate locked until campaign completion.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMissionComplete && (
              <button
                onClick={handleTriggerConfetti}
                className="p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all"
                title="¡Celebrar!"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            )}
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

        {isMissionComplete ? (
          /* PRINTABLE OFFICIAL NASA CERTIFICATE CARD (Only after mission completion) */
          <div className="my-3 p-5 sm:p-7 rounded-3xl border-4 border-amber-500/60 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-center relative overflow-hidden shadow-2xl print:bg-white print:border-4 print:border-slate-800 print:text-black">
            {/* Decorative Corner Seals */}
            <div className="absolute top-3 left-4 text-xs font-mono font-bold text-amber-400/60 print:text-slate-600">
              DOC: NASA-CADET-{location.toUpperCase()}-{currentDay}
            </div>
            <div className="absolute top-3 right-4 flex items-center gap-1 text-xs font-black text-emerald-400 print:text-slate-700">
              <span>🌲</span>
              <span>TRONCOS INTERGALÁCTICOS</span>
            </div>

            <div className="flex justify-center my-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30 border-2 border-white">
                🏅
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-amber-300 tracking-wider uppercase print:text-black">
              {lang === 'es' ? 'CERTIFICADO DE COMANDANTE DE MISIÓN' : 'MISSION COMMANDER CERTIFICATE'}
            </h3>
            {difficulty === 'dificil' && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 border border-amber-400 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-950/50 print:bg-slate-200 print:text-black">
                <span>🔥</span>
                <span>{lang === 'es' ? 'HONOR MÁXIMO: COMANDANTE SUPREMO (MODO DIFÍCIL)' : 'MAX HONOR: SUPREME COMMANDER (HARD MODE)'}</span>
                <span>🔥</span>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold print:text-slate-600">
              {lang === 'es' ? 'Simulador Desarrollado por el Equipo Troncos Intergalácticos (NASA STEM)' : 'Simulator Developed by Team Troncos Intergalácticos (NASA STEM)'}
            </p>

            {commanderName && (
              <div className="my-3 py-1.5 px-4 rounded-2xl bg-amber-500/10 border border-amber-400/40 inline-block">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                  {lang === 'es' ? 'OTORGADO CON HONORES A:' : 'AWARDED WITH HONORS TO:'}
                </span>
                <span className="text-lg sm:text-xl font-black text-amber-300 drop-shadow print:text-black">
                  {commanderName}
                </span>
                {commanderPatch && (
                  <span className="text-[10px] text-emerald-400 block font-semibold print:text-slate-700">
                    Insignia Oficial: {commanderPatch}
                  </span>
                )}
              </div>
            )}

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

            {/* Signatures including Troncos Intergalácticos */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400 print:text-slate-600 print:border-slate-300">
              <div>
                <div className="font-sans font-bold text-emerald-400 print:text-black">Troncos Intergalácticos</div>
                <div className="text-[10px]">Equipo de Desarrollo & Ingeniería</div>
              </div>
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
        ) : (
          /* INTERIM MISSION STATUS & FLIGHT TELEMETRY (When opened prior to mission completion) */
          <div className="my-3 p-5 sm:p-7 rounded-3xl border-2 border-cyan-500/50 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-center relative overflow-hidden shadow-2xl print:bg-white print:border-2 print:border-slate-800 print:text-black">
            {/* Decorative Corner Seals */}
            <div className="absolute top-3 left-4 text-xs font-mono font-bold text-cyan-400/70 print:text-slate-600">
              TELEMETRY: NASA-CADET-{location.toUpperCase()}-SOL-{currentDay}
            </div>
            <div className="absolute top-3 right-4 flex items-center gap-1 text-xs font-black text-amber-400 print:text-slate-700">
              <span>🛰️</span>
              <span>EN VUELO ACTIVO</span>
            </div>

            <div className="flex justify-center my-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/30 border-2 border-white">
                🛰️
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-cyan-300 tracking-wider uppercase print:text-black">
              {lang === 'es' ? 'REGISTRO INTERMEDIO DE OPERACIONES' : 'INTERIM OPERATIONS TELEMETRY'}
            </h3>

            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/60 text-cyan-300 text-xs font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{lang === 'es' ? `MISIÓN EN CURSO: SOL ${currentDay} DE ${totalDays}` : `MISSION IN PROGRESS: SOL ${currentDay} OF ${totalDays}`}</span>
            </div>

            <div className="my-3.5 p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 max-w-xl mx-auto text-xs text-amber-200 text-left flex items-start gap-2.5">
              <span className="text-base">🔒</span>
              <div>
                <span className="font-black text-amber-300 block mb-0.5">
                  {lang === 'es' ? 'CERTIFICADO OFICIAL BLOQUEADO' : 'OFFICIAL CERTIFICATE LOCKED'}
                </span>
                <p className="text-[11px] text-amber-100/90 leading-relaxed">
                  {lang === 'es'
                    ? `El Certificado Oficial de Comandante de Misión y la distinción de Comandante Supremo solo se expedirán una vez sobrevividos los ${totalDays} días de la campaña espacial. Actualmente la base se encuentra en el Día ${currentDay}.`
                    : `The official Mission Commander Certificate and Supreme Commander honors require surviving all ${totalDays} days of the space campaign. Colony is currently on Day ${currentDay}.`}
                </p>
              </div>
            </div>

            {commanderName && (
              <div className="my-2 py-1.5 px-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 inline-block">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                  {lang === 'es' ? 'OFICIAL AL MANDO:' : 'COMMANDING OFFICER:'}
                </span>
                <span className="text-lg font-black text-cyan-300 print:text-black">
                  {commanderName}
                </span>
                {commanderPatch && (
                  <span className="text-[10px] text-emerald-400 block font-semibold print:text-slate-700">
                    Insignia Oficial: {commanderPatch}
                  </span>
                )}
              </div>
            )}

            {/* Telemetry Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 max-w-xl mx-auto text-left">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300">
                <span className="text-[10px] text-slate-400 block font-semibold print:text-slate-600">
                  {lang === 'es' ? 'Días Transcurridos' : 'Days Elapsed'}
                </span>
                <span className="text-base font-black text-cyan-300 print:text-black">
                  {currentDay} / {totalDays}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 print:bg-slate-100 print:border-slate-300">
                <span className="text-[10px] text-slate-400 block font-semibold print:text-slate-600">
                  {lang === 'es' ? 'Días Restantes' : 'Days Remaining'}
                </span>
                <span className="text-base font-black text-amber-300 print:text-black">
                  {Math.max(0, totalDays - currentDay)}
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
                  {lang === 'es' ? 'Ciencia Acumulada' : 'Science Points'}
                </span>
                <span className="text-base font-black text-cyan-300 print:text-black">
                  {resources.sciencePoints} pts
                </span>
              </div>
            </div>

            {/* Life support telemetry row */}
            <div className="grid grid-cols-4 gap-2 mt-2.5 max-w-xl mx-auto text-center font-mono text-xs">
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-sky-400 block">💨 O₂</span>
                <span className="font-bold text-slate-100">{Math.round(resources.oxygen)}%</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-blue-400 block">💧 H₂O</span>
                <span className="font-bold text-slate-100">{Math.round(resources.water)} L</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-amber-400 block">⚡ Energía</span>
                <span className="font-bold text-slate-100">{Math.round(resources.energy)}%</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-emerald-400 block">🥗 Comida</span>
                <span className="font-bold text-slate-100">{Math.round(resources.food)}</span>
              </div>
            </div>

            {/* Operational summary */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-left text-xs text-slate-300">
              <span className="font-bold text-cyan-300 block mb-1">
                {lang === 'es' ? 'Estado Operativo del Hábitat:' : 'Habitat Operational Status:'}
              </span>
              <p className="text-[11px] text-slate-400 leading-normal">
                {lang === 'es'
                  ? `Base en ${location === 'moon' ? 'Polo Sur Lunar (Artemis III)' : 'Cráter Jezero (Marte Ares I)'} operando bajo dificultad ${difficulty.toUpperCase()}. Mantén el soporte vital equilibrado y resuelve las contingencias para alcanzar la certificación oficial de la NASA.`
                  : `Base at ${location === 'moon' ? 'Lunar South Pole (Artemis III)' : 'Jezero Crater (Mars Ares I)'} active in ${difficulty.toUpperCase()} difficulty. Maintain life support balance to achieve official NASA certification.`}
              </p>
            </div>
          </div>
        )}

        {/* Action button: Restart mission cleanly */}
        {onRestart && (
          <div className="mt-2 flex justify-center print:hidden">
            <button
              onClick={() => {
                if (isRestartingRef.current || isRestarting) return;
                isRestartingRef.current = true;
                setIsRestarting(true);
                soundFx.playClick();
                onRestart();
              }}
              disabled={isRestarting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all transform hover:scale-[1.02] ${isRestarting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>🚀</span>
              <span>{lang === 'es' ? 'Iniciar Nueva Misión / Reiniciar Base' : 'Start New Mission / Restart Base'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
