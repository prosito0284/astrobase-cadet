import React, { useState, useRef, useEffect } from 'react';
import { 
  HelpCircle, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import confetti from 'canvas-confetti';

interface NasaQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSciencePoints?: (pts: number) => void;
  onQuizBonus: (scienceBonus: number, moraleBonus: number, score?: number) => void;
  lang: 'es' | 'en';
  hasQuizCompletedToday?: boolean;
}

interface QuizQuestion {
  questionEs: string;
  questionEn: string;
  optionsEs: string[];
  optionsEn: string[];
  correctIndex: number;
  explanationEs: string;
  explanationEn: string;
  nasaDatasetBadge: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    questionEs: '¿Cuánto tiempo tarda en viajar una señal de radio entre la Tierra y Marte a la velocidad de la luz?',
    questionEn: 'How long does a radio signal take to travel between Earth and Mars at the speed of light?',
    optionsEs: [
      '1.3 segundos (igual que a la Luna)',
      'Entre 4 y 22 minutos (según las órbitas planetarias)',
      'Es instantáneo gracias a los satélites',
      'Exactamente 24 horas',
    ],
    optionsEn: [
      '1.3 seconds (same as the Moon)',
      'Between 4 and 22 minutes (depending on orbits)',
      'Instantaneous via satellite relays',
      'Exactly 24 hours',
    ],
    correctIndex: 1,
    explanationEs: '¡Correcto! La luz viaja a 300.000 km/s. Debido a que la distancia entre la Tierra y Marte varía entre 54 y 400 millones de kilómetros, la señal tarda hasta 22 minutos en llegar. ¡Por eso la tripulación debe ser autónoma!',
    explanationEn: 'Correct! At 300,000 km/s, the vast interplanetary distance creates a 4 to 22 minute speed-of-light lag. Deep space crews must make autonomous decisions!',
    nasaDatasetBadge: 'NASA Deep Space Network (DSN)',
  },
  {
    questionEs: '¿Por qué el agua (H₂O) es uno de los mejores escudos contra las fulguraciones solares de DONKI?',
    questionEn: 'Why is water (H₂O) one of the best shields against DONKI solar flare protons?',
    optionsEs: [
      'Porque enfría los rayos solares',
      'Porque los núcleos de hidrógeno absorben y desaceleran los protones ionizantes',
      'Porque refleja la luz como un espejo',
      'Porque pesa mucho y aplasta las partículas',
    ],
    optionsEn: [
      'Because it cools down solar heat',
      'Because light hydrogen nuclei collide with and absorb high-energy protons',
      'Because it mirrors away cosmic light',
      'Because of water’s heavy mass',
    ],
    correctIndex: 1,
    explanationEs: '¡Exacto! El hidrógeno tiene casi la misma masa que un protón solar. Al chocar, el hidrógeno absorbe el impacto de la radiación sin generar fragmentación peligrosa.',
    explanationEn: 'Spot on! Hydrogen nuclei match the mass of solar protons, absorbing radiation kinetic energy efficiently without hazardous secondary fragmentation.',
    nasaDatasetBadge: 'NASA DONKI Space Radiation Science',
  },
  {
    questionEs: 'En el estudio biológico OSDR OSD-379, ¿por qué las lámparas de cultivo usan luz LED roja y azul?',
    questionEn: 'In NASA OSDR study OSD-379, why do plant chambers use red and blue LED lights?',
    optionsEs: [
      'Porque son los colores de la bandera estadounidense',
      'Porque la clorofila de las plantas absorbe preferentemente esas longitudes de onda para fotosíntesis',
      'Para que no molesten a los astronautas mientras duermen',
      'Porque consumen más energía eléctrica',
    ],
    optionsEn: [
      'Because they represent NASA agency colors',
      'Because plant chlorophyll peaks in light absorption at 660nm (red) and 450nm (blue)',
      'To prevent sleep disruption for astronauts',
      'Because they draw maximum amperage',
    ],
    correctIndex: 1,
    explanationEs: '¡Brillante! La clorofila A y B absorbe casi toda su energía en los picos rojo (660nm) y azul (450nm). El resto de colores se refleja (por eso vemos las plantas verdes).',
    explanationEn: 'Brilliant! Chlorophyll A and B pigments absorb photons predominantly in red and blue wavebands for photosynthetic sugar conversion.',
    nasaDatasetBadge: 'NASA OSDR OSD-379 / Veggie Chamber',
  },
  {
    questionEs: '¿Qué instrumento a bordo del rover Perseverance mide el clima, la presión marciana (610 Pa) y las tormentas de polvo?',
    questionEn: 'Which instrument on Perseverance measures Martian weather, pressure (610 Pa), and dust opacity?',
    optionsEs: [
      'MEDA (Mars Environmental Dynamics Analyzer)',
      'Un barómetro doméstico de mercurio',
      'El helicóptero Ingenuity',
      'El taladro de muestreo de núcleos',
    ],
    optionsEn: [
      'MEDA (Mars Environmental Dynamics Analyzer)',
      'A domestic mercury barometer',
      'The Ingenuity Mars helicopter',
      'The core drill assembly',
    ],
    correctIndex: 0,
    explanationEs: '¡Así es! MEDA registra la velocidad del viento, humedad, temperatura y la opacidad del polvo (Tau) que puede dejar sin energía solar a los rovers y bases.',
    explanationEn: 'Correct! MEDA provides daily atmospheric telemetry, logging wind, humidity, air temperature, and dust optical depth (Tau).',
    nasaDatasetBadge: 'NASA Perseverance MEDA Weather Station',
  },
  {
    questionEs: 'Según el Estudio de Gemelos de la NASA (Twins Study), ¿cuánta densidad ósea pierden los astronautas al mes sin ejercicio?',
    questionEn: 'According to the NASA Twins Study, how much bone density do astronauts lose monthly without countermeasures?',
    optionsEs: [
      '0% (los huesos no cambian en el espacio)',
      'Entre 1% y 1.5% mensual en fémur y vértebras',
      '50% en la primera semana',
      'Los huesos se vuelven más fuertes',
    ],
    optionsEn: [
      '0% (bones remain identical in microgravity)',
      'Between 1% and 1.5% monthly in weight-bearing bones',
      '50% in the first week',
      'Bones naturally harden in space',
    ],
    correctIndex: 1,
    explanationEs: '¡Correcto! Sin la gravedad terrestre que comprime los huesos, el cuerpo reabsorbe calcio. Los astronautas deben ejercitarse 2.5 horas diarias con la máquina ARED.',
    explanationEn: 'Correct! Without gravity loading, bones demineralize at ~1-1.5% per month. Astronauts train 2.5 hours daily on the ARED resistive machine.',
    nasaDatasetBadge: 'NASA Twins Study & OSDR OSD-174',
  },
];

export const NasaQuizModal: React.FC<NasaQuizModalProps> = ({
  isOpen,
  onClose,
  onAddSciencePoints: _onAddSciencePoints,
  onQuizBonus,
  lang,
  hasQuizCompletedToday = false,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const isNavigatingRef = useRef(false);
  const [hasCompletedThisSession, setHasCompletedThisSession] = useState(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      isNavigatingRef.current = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentQ = QUIZ_QUESTIONS[currentQuestionIndex];
  const isRetryDisabled = hasQuizCompletedToday || hasCompletedThisSession;

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(idx);
    setIsAnswered(true);

    if (idx === currentQ.correctIndex) {
      soundFx.playHarvest();
      setScore(s => s + 1);
    } else {
      soundFx.playAlert();
    }
  };

  const handleNextQuestion = () => {
    if (isNavigatingRef.current || isNavigating) return;
    isNavigatingRef.current = true;
    setIsNavigating(true);
    soundFx.playClick();
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(p => p + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsNavigating(false);
      isNavigatingRef.current = false;
    } else {
      // Finished quiz!
      setIsCompleted(true);
      setHasCompletedThisSession(true);

      // Require passing grade (>= 3/5) to award bonus
      if (score >= 3) {
        soundFx.playVictory();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
        // Single unified reward callback: eliminates double reward stacking
        onQuizBonus(20, 20, score);
      } else {
        soundFx.playAlert();
      }

      navigationTimeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        isNavigatingRef.current = false;
      }, 500);
    }
  };

  const handleRestart = () => {
    if (isRetryDisabled) return;
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setIsCompleted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.3)] max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black shadow-md shadow-amber-900/40">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Desafío de Preguntas STEM de la NASA' : 'NASA STEM Knowledge Challenge'}</span>
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  ESCUELAS NASA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'es' 
                  ? 'Pon a prueba tus conocimientos sobre clima espacial, cultivos en órbita y exploración planetaria.' 
                  : 'Test your knowledge on space weather, orbital farming, and deep space mechanics.'}
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

        {!isCompleted ? (
          <div className="my-4">
            {/* Question Progress & Dataset Badge */}
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-mono text-cyan-400 font-bold">
                Pregunta {currentQuestionIndex + 1} de {QUIZ_QUESTIONS.length}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-amber-300">
                {currentQ.nasaDatasetBadge}
              </span>
            </div>

            {/* Question Text */}
            <h3 className="text-sm sm:text-base font-extrabold text-slate-100 mb-4 leading-snug">
              {lang === 'es' ? currentQ.questionEs : currentQ.questionEn}
            </h3>

            {/* Options List */}
            <div className="space-y-2">
              {(lang === 'es' ? currentQ.optionsEs : currentQ.optionsEn).map((opt, idx) => {
                const isChosen = selectedAnswer === idx;
                const isCorrect = idx === currentQ.correctIndex;
                let optStyle = 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300';

                if (isAnswered) {
                  if (isCorrect) {
                    optStyle = 'bg-emerald-950/80 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/50';
                  } else if (isChosen && !isCorrect) {
                    optStyle = 'bg-rose-950/80 border-rose-400 text-rose-200 ring-2 ring-rose-400/50';
                  } else {
                    optStyle = 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-50';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    className={`w-full text-left p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${optStyle}`}
                  >
                    <span>{opt}</span>
                    {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    {isAnswered && isChosen && !isCorrect && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation box on answered */}
            {isAnswered && (
              <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-xs animate-fadeIn">
                <span className="font-bold text-cyan-300 block mb-1">
                  💡 {lang === 'es' ? 'Fundamento Científico NASA:' : 'NASA Science Debrief:'}
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {lang === 'es' ? currentQ.explanationEs : currentQ.explanationEn}
                </p>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleNextQuestion}
                    disabled={isNavigating}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs shadow-md transition-all"
                  >
                    <span>{currentQuestionIndex < QUIZ_QUESTIONS.length - 1 ? (lang === 'es' ? 'Siguiente Pregunta' : 'Next Question') : (lang === 'es' ? 'Ver Resultados' : 'View Results')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Completion Screen */
          <div className="my-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/30 border-2 border-white">
              🎓
            </div>
            <h3 className="text-xl font-black text-amber-300">
              {lang === 'es' ? '¡Desafío STEM Completado!' : 'STEM Challenge Completed!'}
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              {lang === 'es'
                ? `Acertaste ${score} de ${QUIZ_QUESTIONS.length} preguntas correctamente. ¡Has demostrado un dominio sobresaliente de los datos abiertos y misiones de la NASA!`
                : `You scored ${score} out of ${QUIZ_QUESTIONS.length} questions correctly. Outstanding mastery of NASA open science!`}
            </p>

            {score >= 3 ? (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 max-w-sm mx-auto space-y-1">
                <span className="text-xs text-slate-400 block font-semibold">
                  {lang === 'es' ? 'Bono STEM de la NASA Obtenido:' : 'NASA STEM Bonus Awarded:'}
                </span>
                <span className="text-2xl font-black text-cyan-400 block">
                  +20 pts Ciencia NASA
                </span>
                <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-600/50 inline-block mt-1">
                  🎉 +20% Ánimo & Moral para toda la tripulación
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-800/60 max-w-sm mx-auto space-y-1 text-center">
                <span className="text-xs text-rose-300 block font-semibold">
                  {lang === 'es' ? 'Puntuación Insuficiente (< 3/5 aciertos)' : 'Score Below Passing Grade (< 3/5 correct)'}
                </span>
                <span className="text-base font-black text-rose-400 block">
                  0 pts Ciencia
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {lang === 'es'
                    ? 'Se requiere un mínimo de 3/5 para reclamar el bono de ciencia y moral.'
                    : 'A minimum of 3/5 correct answers is required to claim the bonus.'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRestart}
                disabled={isRetryDisabled}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isRetryDisabled
                    ? 'bg-slate-800/40 border border-slate-700/40 text-slate-500 opacity-60 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isRetryDisabled ? (lang === 'es' ? 'Quiz ya completado en este Sol (1 intento por Sol)' : 'Quiz already completed this Sol (1 per Sol)') : undefined}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {isRetryDisabled
                    ? (lang === 'es' ? 'Completado este Sol' : 'Completed This Sol')
                    : (lang === 'es' ? 'Reintentar Quiz' : 'Retry Quiz')}
                </span>
              </button>

              <button
                onClick={() => {
                  soundFx.playClick();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md transition-all"
              >
                <span>{lang === 'es' ? 'Volver al Simulador' : 'Return to Base'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
