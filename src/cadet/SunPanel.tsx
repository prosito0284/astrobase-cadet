// Panel "¿Cómo está el Sol ahora?": gráfica de rayos X de GOES de las últimas 24 h.
import { useState } from 'react';
import type { Lang, T } from './data';
import { flarePower, stormDamage } from './engine';
import type { SunNow } from './spaceweather';
import { fluxToClass, XRAYS_URL } from './spaceweather';

const W = 320;
const H = 132;
const PAD_L = 22;
const PAD_R = 6;
const PAD_T = 6;
const PAD_B = 18;
const LOG_MIN = -8; // clase A
const LOG_MAX = -3; // por encima de X1

const BANDS = ['A', 'B', 'C', 'M', 'X'];

const TXT: Record<string, T> = {
  title: { es: '¿Cómo está el Sol ahora?', en: 'How is the Sun right now?' },
  live: { es: 'EN VIVO · NOAA GOES', en: 'LIVE · NOAA GOES' },
  calm: { es: 'Hoy el Sol está tranquilo. 🙂', en: 'The Sun is calm today. 🙂' },
  active: { es: 'Hoy el Sol lanzó llamaradas medianas (clase M). 😮', en: 'Today the Sun fired medium flares (class M). 😮' },
  storm: { es: '¡Hoy el Sol lanzó una llamarada FUERTE (clase X)! 😱', en: 'Today the Sun fired a STRONG flare (class X)! 😱' },
  now: { es: 'Ahora', en: 'Now' },
  peak: { es: 'Lo más fuerte en 24 h', en: 'Strongest in 24 h' },
  at: { es: 'a las', en: 'at' },
  game: {
    es: 'En tu base, una llamarada así quitaría {n} de salud sin escudo.',
    en: 'At your base, a flare like that would take {n} health with no shield.',
  },
  ago: { es: 'hace 24 h', en: '24 h ago' },
  nowAxis: { es: 'ahora', en: 'now' },
  explain: {
    es: 'La línea muestra los rayos X que manda el Sol. Cuanto más alta, más fuerte la llamarada: A y B son pequeñas, C mediana-baja, M mediana y X fuerte.',
    en: 'The line shows the X-rays the Sun sends. The higher it goes, the stronger the flare: A and B are small, C low-medium, M medium and X strong.',
  },
  source: { es: 'Fuente', en: 'Source' },
  hover: { es: 'Toca la gráfica para ver cada hora.', en: 'Touch the chart to see each hour.' },
};

const clampLog = (f: number) => Math.min(LOG_MAX, Math.max(LOG_MIN, Math.log10(f)));

export default function SunPanel({ sun, lang }: { sun: SunNow; lang: Lang }) {
  const tr = (t: T) => t[lang];
  const [hover, setHover] = useState<number | null>(null);
  const t0 = sun.points[0].t;
  const t1 = sun.points[sun.points.length - 1].t;
  const span = Math.max(1, t1 - t0);
  const x = (t: number) => PAD_L + ((t - t0) / span) * (W - PAD_L - PAD_R);
  const y = (f: number) => PAD_T + ((LOG_MAX - clampLog(f)) / (LOG_MAX - LOG_MIN)) * (H - PAD_T - PAD_B);
  const path = sun.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.flux).toFixed(1)}`).join('');
  const time = (t: number) => new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(t);
  const hurt = stormDamage(flarePower(sun.peak), 0);
  const hp = hover !== null ? sun.points[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const t = t0 + ((px - PAD_L) / (W - PAD_L - PAD_R)) * span;
    let best = 0;
    for (let i = 1; i < sun.points.length; i++) {
      if (Math.abs(sun.points[i].t - t) < Math.abs(sun.points[best].t - t)) best = i;
    }
    setHover(best);
  };

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-slate-950/70 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-black text-white">☀️ {tr(TXT.title)}</h3>
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
          {tr(TXT.live)}{sun.satellite ? `-${sun.satellite}` : ''}
        </span>
      </div>
      <p className="text-sm text-slate-100">{tr(TXT[sun.mood])}</p>
      <p className="text-xs text-slate-300 tabular-nums" aria-live="polite">
        {hp
          ? <><b className="text-white">{time(hp.t)}</b> · {fluxToClass(hp.flux)}</>
          : <>{tr(TXT.now)}: <b className="text-white">{sun.current}</b> · {tr(TXT.peak)}: <b className="text-white">{sun.peak}</b> {tr(TXT.at)} {time(sun.peakTime)}</>}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none select-none"
        role="img"
        aria-label={`${tr(TXT.title)} ${tr(TXT.now)}: ${sun.current}. ${tr(TXT.peak)}: ${sun.peak}.`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {BANDS.map((b, i) => {
          const top = y(10 ** (LOG_MIN + i + 1));
          const bottom = y(10 ** (LOG_MIN + i));
          return (
            <g key={b}>
              <rect x={PAD_L} y={top} width={W - PAD_L - PAD_R} height={bottom - top} fill={i % 2 ? '#1e293b' : '#0f172a'} opacity={0.7} />
              <text x={PAD_L - 6} y={(top + bottom) / 2 + 3.5} textAnchor="end" fontSize="10" fontWeight="800" fill={b === 'X' || b === 'M' ? '#fcd34d' : '#94a3b8'}>{b}</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hp && (
          <>
            <line x1={x(hp.t)} x2={x(hp.t)} y1={PAD_T} y2={H - PAD_B} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="2 2" />
            <circle cx={x(hp.t)} cy={y(hp.flux)} r={4.5} fill="#fbbf24" stroke="#020617" strokeWidth={2} />
          </>
        )}
        <text x={PAD_L} y={H - 4} fontSize="9" fill="#94a3b8">{tr(TXT.ago)}</text>
        <text x={W - PAD_R} y={H - 4} fontSize="9" fill="#94a3b8" textAnchor="end">{tr(TXT.nowAxis)}</text>
      </svg>
      <p className="text-[11px] text-slate-400">{tr(TXT.explain)} {tr(TXT.hover)}</p>
      <p className="text-xs text-amber-200">🛡️ {tr(TXT.game).replace('{n}', String(hurt))}</p>
      <a href={XRAYS_URL} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline decoration-dotted">
        {tr(TXT.source)}: NOAA SWPC — GOES X-ray flux
      </a>
    </div>
  );
}
