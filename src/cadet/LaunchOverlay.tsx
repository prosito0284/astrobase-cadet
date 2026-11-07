// Cuenta regresiva y viaje al empezar la misión (3, 2, 1, ¡despegue!, viaje real).
// Dura unos 5 segundos; se puede saltar. Con "menos movimiento" no hay animaciones,
// solo cambia el texto.
import { useEffect, useState } from 'react';
import type { Lang, Site, T } from './data';

const STEPS = ['3', '2', '1', 'go', 'trip'] as const;
const STEP_MS = [700, 700, 700, 900, 2200];

const TXT: Record<string, T> = {
  go: { es: '¡Despegue!', en: 'Liftoff!' },
  moonTrip: {
    es: 'Viajando a la Luna… Las naves Apolo tardaban unos 3 días en llegar.',
    en: 'Flying to the Moon… The Apollo spacecraft took about 3 days to get there.',
  },
  marsTrip: {
    es: 'Viajando a Marte… El rover Perseverance tardó casi 7 meses en llegar (de julio de 2020 a febrero de 2021).',
    en: 'Flying to Mars… The Perseverance rover took almost 7 months to get there (July 2020 to February 2021).',
  },
  skip: { es: 'Saltar', en: 'Skip' },
};

export default function LaunchOverlay({ site, lang, onDone }: { site: Site; lang: Lang; onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => (step + 1 < STEPS.length ? setStep(step + 1) : onDone()), STEP_MS[step]);
    return () => window.clearTimeout(id);
  }, [step, onDone]);

  // Esc salta la cuenta regresiva.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const s = STEPS[step];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={TXT.go[lang]}
      className="fixed inset-0 z-[250] bg-slate-950/95 flex flex-col items-center justify-center gap-6 p-6 text-center"
    >
      <div
        aria-hidden
        className="text-7xl transition-transform duration-[900ms] ease-in"
        style={{ transform: s === 'go' || s === 'trip' ? 'translateY(-40px) scale(1.15)' : 'none' }}
      >
        🚀
      </div>
      <p aria-live="assertive" className="font-black text-white text-6xl tabular-nums min-h-[4rem]" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        {s === 'go' ? TXT.go[lang] : s === 'trip' ? (site === 'moon' ? '🌕' : '🔴') : s}
      </p>
      {s === 'trip' && <p className="text-lg text-slate-200 max-w-md">{TXT[site === 'moon' ? 'moonTrip' : 'marsTrip'][lang]}</p>}
      <button type="button" autoFocus onClick={onDone} className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700">
        {TXT.skip[lang]} →
      </button>
    </div>
  );
}
