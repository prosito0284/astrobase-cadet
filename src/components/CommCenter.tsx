import React, { useState, useRef, useEffect } from 'react';
import { BaseLocation } from '../types/game';
import { 
  Radio, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare,
  Bot,
  Zap,
  Globe2
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface CommCenterProps {
  location: BaseLocation;
  currentDay: number;
  oxygenLevel: number;
  energyLevel: number;
  lang: 'es' | 'en';
}

interface MessageItem {
  sender: 'Houston' | 'Capcom' | 'Crew';
  textEs: string;
  textEn: string;
  time: string;
  delayNotice?: string;
}

export const CommCenter: React.FC<CommCenterProps> = ({
  location,
  currentDay,
  oxygenLevel,
  energyLevel,
  lang,
}) => {
  const isMars = location === 'mars';
  const [isTransmitting, setIsTransmitting] = useState(false);
  const commTimerRef = useRef<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      sender: 'Houston',
      textEs: location === 'moon' 
        ? 'Houston Capcom a Base Artemis. Enlace de telemetría DSN activo con 1.3s de latencia. Todos los subsistemas nominales.' 
        : 'Houston Capcom a Base Jezero. Enlace de telemetría a través del orbitador MAVEN activo. Latencia actual de velocidad de luz: 12 minutos.',
      textEn: location === 'moon'
        ? 'Houston Capcom to Artemis Base. DSN telemetry link nominal with 1.3s latency. Systems looking green.'
        : 'Houston Capcom to Jezero Outpost. Mars relay via MAVEN orbiter nominal. Speed-of-light radio delay: 12 minutes.',
      time: '08:00',
    },
  ]);

  const [simulatedDelayProgress, setSimulatedDelayProgress] = useState<number | null>(null);

  // Clear timers on unmount or location change
  useEffect(() => {
    return () => {
      if (commTimerRef.current) {
        clearInterval(commTimerRef.current);
        clearTimeout(commTimerRef.current);
        commTimerRef.current = null;
      }
      setIsTransmitting(false);
      setSimulatedDelayProgress(null);
    };
  }, [location]);

  // Handle visibility changes so Mars timer completes if backgrounded
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isTransmitting && isMars) {
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed >= 5000) {
          if (commTimerRef.current) {
            clearInterval(commTimerRef.current);
            commTimerRef.current = null;
          }
          setIsTransmitting(false);
          setSimulatedDelayProgress(null);
          soundFx.playRadioBeep();
          const houstonResponse: MessageItem = {
            sender: 'Houston',
            textEs: 'Houston a Base Jezero: Recibimos su transmisión con 12 minutos de retraso. Ingenieros recomiendan priorizar calefacción del hábitat y mantener reservas de agua para electrólisis.',
            textEn: 'Houston to Jezero: Copy report with 12 min radio lag. Engineering flight team advises preserving habitat heat and conserving water electrolysis.',
            time: 'T+12m',
            delayNotice: 'Retraso de señal: 12 min ida y vuelta (300.000 km/s)',
          };
          setMessages(p => [...p, houstonResponse]);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isTransmitting, isMars]);

  const handleRequestGuidance = () => {
    if (isTransmitting) return;

    soundFx.playQuindarTone('intro');
    soundFx.playRadioBeep();
    setIsTransmitting(true);

    const userMessage: MessageItem = {
      sender: 'Crew',
      textEs: `Reporte Día ${currentDay}: Oxígeno al ${Math.round(oxygenLevel)}%, Batería al ${Math.round(energyLevel)}%. Solicitamos confirmación de protocolo de soporte vital.`,
      textEn: `Day ${currentDay} Report: O2 at ${Math.round(oxygenLevel)}%, Battery at ${Math.round(energyLevel)}%. Requesting ECLSS priority check.`,
      time: 'Ahora',
    };

    setMessages(prev => [...prev, userMessage]);

    // Communication delay simulation
    if (isMars) {
      setSimulatedDelayProgress(5);
      startTimeRef.current = Date.now();
      const totalDelay = 5000;

      const finishTransmission = () => {
        if (commTimerRef.current) {
          clearInterval(commTimerRef.current);
          commTimerRef.current = null;
        }
        setIsTransmitting(false);
        setSimulatedDelayProgress(null);
        soundFx.playQuindarTone('outro');
        soundFx.playRadioBeep();

        const houstonResponse: MessageItem = {
          sender: 'Houston',
          textEs: 'Houston a Base Jezero: Recibimos su transmisión con 12 minutos de retraso. Ingenieros recomiendan priorizar calefacción del hábitat y mantener reservas de agua para electrólisis.',
          textEn: 'Houston to Jezero: Copy report with 12 min radio lag. Engineering flight team advises preserving habitat heat and conserving water electrolysis.',
          time: 'T+12m',
          delayNotice: 'Retraso de señal: 12 min ida y vuelta (300.000 km/s)',
        };
        setMessages(p => [...p, houstonResponse]);
      };

      commTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed >= totalDelay) {
          finishTransmission();
        } else {
          const remaining = Math.max(1, 5 - Math.floor(elapsed / 1000));
          setSimulatedDelayProgress(remaining);
        }
      }, 250);
    } else {
      // Moon delay simulation: fast 1.3s
      commTimerRef.current = setTimeout(() => {
        setIsTransmitting(false);
        soundFx.playQuindarTone('outro');
        soundFx.playRadioBeep();
        const houstonResponse: MessageItem = {
          sender: 'Houston',
          textEs: 'Houston copia fuerte y claro Base Artemis. Respuesta inmediata (1.3s): Niveles de oxígeno adecuados. Recuerden verificar el extractor de hielo en el cráter Shackleton.',
          textEn: 'Houston copies loud and clear Artemis. Immediate downlink (1.3s): Oxygen reserves acceptable. Ensure ice drill inspection at Shackleton rim.',
          time: 'T+1.3s',
        };
        setMessages(p => [...p, houstonResponse]);
        commTimerRef.current = null;
      }, 1300);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-100 flex items-center gap-2">
              <span>{lang === 'es' ? 'Terminal de Espacio Profundo (DSN)' : 'Deep Space Comm Terminal'}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isMars 
                  ? 'bg-amber-950/60 border-amber-500/60 text-amber-300' 
                  : 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300'
              }`}>
                {isMars ? 'Latencia Crítica (12 min)' : 'Latencia Mínima (1.3 s)'}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {lang === 'es' 
                ? 'Comunicaciones con el Centro Espacial Johnson en Houston (Texas)' 
                : 'Radio links with Johnson Space Center in Houston, Texas'}
            </p>
          </div>
        </div>

        {/* Speed-of-light educational tag */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>c = 299.792 km/s</span>
        </div>
      </div>

      {/* Message Chat Log */}
      <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 h-48 overflow-y-auto space-y-2.5 font-sans scrollbar-thin">
        {messages.map((m, idx) => (
          <div 
            key={idx}
            className={`flex flex-col text-xs p-2.5 rounded-xl border ${
              m.sender === 'Crew'
                ? 'bg-cyan-950/40 border-cyan-500/30 ml-6 text-cyan-100'
                : 'bg-slate-900/90 border-slate-700/80 mr-6 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                {m.sender === 'Crew' ? '🧑‍🚀 Tripulación Base' : '🌐 NASA Houston Flight Director'}
              </span>
              <span>{m.time}</span>
            </div>
            <p className="leading-relaxed">
              {lang === 'es' ? m.textEs : m.textEn}
            </p>
            {m.delayNotice && (
              <span className="text-[9px] text-amber-400 font-mono mt-1">
                📡 {m.delayNotice}
              </span>
            )}
          </div>
        ))}

        {isTransmitting && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs animate-pulse">
            <Radio className="w-3.5 h-3.5 animate-spin" />
            <span>
              {isMars 
                ? (lang === 'es' 
                    ? `Transmitiendo a través de la Red de Espacio Profundo... Señal viajando por el cosmos (${simulatedDelayProgress}s restantes)`
                    : `Beaming through Deep Space Network... Waves traversing interplanetary void (${simulatedDelayProgress}s left)`)
                : (lang === 'es' ? 'Recibiendo respuesta de Houston (1.3s)...' : 'Awaiting Houston voice reply (1.3s)...')}
            </span>
          </div>
        )}
      </div>

      {/* Guidance Request Button */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-400 italic">
          {isMars 
            ? (lang === 'es' 
                ? '⚠️ En Marte, consultar a la Tierra no detiene una fuga de oxígeno: ¡aprende a liderar con autonomía!'
                : '⚠️ On Mars, asking Earth won’t stop an oxygen breach in time: lead autonomously!')
            : (lang === 'es' 
                ? 'ℹ️ En la Luna, Houston puede monitorear cada segundo de tu misión.'
                : 'ℹ️ On the Moon, Houston can monitor your telemetry nearly in real-time.')}
        </div>

        <button
          onClick={handleRequestGuidance}
          disabled={isTransmitting}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-900/40 border border-indigo-400/30 disabled:opacity-50 transition-all flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{lang === 'es' ? 'Consultar a Houston' : 'Ping Houston'}</span>
        </button>
      </div>
    </div>
  );
};
