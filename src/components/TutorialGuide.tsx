import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  CheckCircle2, 
  TreePine
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface TutorialGuideProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'es' | 'en';
}

export const TutorialGuide: React.FC<TutorialGuideProps> = ({ isOpen, onClose, lang }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      titleEs: '¡Bienvenido a la Base Espacial, Cadete!',
      titleEn: 'Welcome to the Space Outpost, Cadet!',
      icon: '🚀',
      contentEs: 'Soy NOVA, el asistente de vuelo inteligente desarrollado por el equipo Troncos Intergalácticos para el Desafío de la NASA. Tu misión es administrar una colonia humana permanente en la Luna o en Marte. Cada decisión que tomes implica sacrificios reales de ingeniería.',
      contentEn: 'I am NOVA, your flight director created by team Troncos Intergalácticos for the NASA Challenge. Your mission is to command a permanent human base on the Moon or Mars. Every choice requires real engineering trade-offs.',
      tipEs: 'Consejo: Revisa tus reservas de Oxígeno, Batería y Agua antes de pasar al siguiente Sol.',
      tipEn: 'Pro Tip: Check your Oxygen, Battery, and Water reserves before advancing to the next Sol.',
    },
    {
      titleEs: 'Energía: El Pulso de la Base',
      titleEn: 'Energy: The Pulse of the Colony',
      icon: '⚡',
      contentEs: 'Los paneles solares generan electricidad durante las horas de luz solar. Pero en la Luna la noche dura 14 días terrestres continuos, y en Marte las tormentas de polvo pueden tapar el Sol durante semanas. Si tus baterías se descargan a cero, el soporte vital se apagará.',
      contentEn: 'Solar panels generate power during daylight hours. But on the Moon, night lasts 14 continuous Earth days, and on Mars, dust storms can blot out the Sun for weeks. If your batteries hit 0%, life support shuts down.',
      tipEs: 'Consejo: Apaga el Laboratorio de Ciencias o la Antena si necesitas ahorrar batería para la calefacción.',
      tipEn: 'Pro Tip: Switch off the Science Lab or Comm Antenna if you need to reserve battery power for thermal survival.',
    },
    {
      titleEs: 'Soporte Vital y el Invernadero Veggie (OSDR)',
      titleEn: 'Life Support & Veggie Greenhouse (OSDR)',
      icon: '🌱',
      contentEs: 'Los astronautas consumen oxígeno y generan dióxido de carbono. El sistema ECLSS recicla el aire usando agua y filtros de zeolita. Además, el invernadero hidropónico (basado en el estudio OSDR OSD-379 de la NASA) cultiva lechugas frescas que generan oxígeno natural y mantienen alta la moral de la tripulación.',
      contentEn: 'Astronauts consume oxygen and breathe out CO2. The ECLSS system recycles air using water electrolysis and zeolite scrubbers. The Veggie hydroponics dome (based on NASA OSDR study OSD-379) grows fresh salad greens, converts CO2, and keeps crew morale high.',
      tipEs: 'Consejo: Las verduras frescas previenen enfermedades por deficiencia vitamínica y pérdida ósea en baja gravedad.',
      tipEn: 'Pro Tip: Fresh greens prevent nutritional degradation and combat low-gravity bone mineral loss.',
    },
    {
      titleEs: 'Radiación y Alertas DONKI',
      titleEn: 'Radiation & DONKI Solar Flare Alerts',
      icon: '☢️',
      contentEs: 'El Sol emite llamaradas y eyecciones de masa coronal (CME). En la Tierra el campo magnético nos protege, pero en la Luna y Marte estás expuesto a protones letales. Cuando la base detecte una alerta DONKI, debes activar la cúpula de regolito o refugiar a la tripulación en el búnker subterráneo.',
      contentEn: 'The Sun unleashes flares and coronal mass ejections (CME). Earth’s magnetic field shields us, but on the Moon and Mars, you face lethal energetic protons. When a DONKI alert fires, activate regolith shielding or retreat to the subterranean bunker.',
      tipEs: 'Consejo: El agua y el regolito compactado son tus mejores escudos naturales contra los rayos cósmicos.',
      tipEn: 'Pro Tip: Water and compacted lunar/martian dust (regolith) are your strongest shields against cosmic rays.',
    },
    {
      titleEs: 'Retraso de Radio: Autonomía de la Tripulación',
      titleEn: 'Radio Latency: Crew Autonomy in Deep Space',
      icon: '📡',
      contentEs: 'En la Luna, la señal de radio viaja en solo 1.3 segundos. Pero en Marte, la distancia con la Tierra provoca un retraso de hasta 20 minutos por la velocidad finita de la luz. Cuando ocurra una emergencia en Marte, no puedes esperar a que Houston te diga qué hacer: ¡debes actuar de inmediato!',
      contentEn: 'On the Moon, radio waves arrive in just 1.3 seconds. But on Mars, speed-of-light delays range from 4 to 22 minutes each way. When an alarm rings on Mars, you cannot wait for Houston: you must act with decisive autonomy!',
      tipEs: 'Consejo: Practica el Modo Comandante para aprender a tomar decisiones rápidas bajo presión.',
      tipEn: 'Pro Tip: Play in Commander Mode to hone fast, calculated decision-making under deep space latency.',
    },
  ];

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-[0_0_50px_rgba(16,185,129,0.35)] relative">
        {/* Close Button */}
        <button aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* NOVA Bot Avatar & Title */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30 border border-emerald-300/40">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-100">
                Capcom NOVA
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300">
                Troncos Intergalácticos
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'es' ? 'Manual de Operaciones para Astronautas Jóvenes' : 'Flight Manual for Junior Astronauts'}
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
          <span>{lang === 'es' ? `Paso ${currentStep + 1} de ${steps.length}` : `Step ${currentStep + 1} of ${steps.length}`}</span>
          <div className="flex items-center gap-1">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep ? 'bg-emerald-400 w-4' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Card Content */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 my-2">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-2xl">{current.icon}</span>
            <h4 className="text-sm sm:text-base font-black text-emerald-200">
              {lang === 'es' ? current.titleEs : current.titleEn}
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'es' ? current.contentEs : current.contentEn}
          </p>

          <div className="mt-3 p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs text-amber-300 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{lang === 'es' ? current.tipEs : current.tipEn}</span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-4 pt-2">
          <button
            onClick={() => {
              soundFx.playClick();
              setCurrentStep(p => Math.max(0, p - 1));
            }}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{lang === 'es' ? 'Anterior' : 'Previous'}</span>
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => {
                soundFx.playClick();
                setCurrentStep(p => Math.min(steps.length - 1, p + 1));
              }}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-900/40 transition-all"
            >
              <span>{lang === 'es' ? 'Siguiente' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                soundFx.playVictory();
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/40 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'es' ? '¡Listo para el Despegue!' : 'Ready for Launch!'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
