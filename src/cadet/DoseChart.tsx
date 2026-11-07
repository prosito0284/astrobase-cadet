// "Tu radiación día a día": barras de la dosis de cada día de la misión.
// Días de tormenta en ámbar con ☀️ debajo (no solo color); se toca una barra para ver el detalle.
import { useState } from 'react';
import type { Lang, T } from './data';
import type { CadetState } from './engine';
import { xrays } from './engine';

const W = 320;
const H = 150;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 18;
const PAD_B = 30;
const EARTH_DAY_MSV = 2.4 / 365;

const TXT: Record<string, T> = {
  title: { es: 'Tu radiación día a día', en: 'Your radiation day by day' },
  storm: { es: 'día de tormenta', en: 'storm day' },
  normal: { es: 'día normal', en: 'normal day' },
  tap: { es: 'Toca una barra para ver ese día.', en: 'Tap a bar to see that day.' },
  day: { es: 'Día', en: 'Day' },
  shield: { es: 'escudo', en: 'shield' },
  xr: { es: 'radiografías', en: 'X-rays' },
  earth: {
    es: 'Un día normal en la Tierra: {e} mSv (¡casi no se vería en la gráfica!).',
    en: 'A normal day on Earth: {e} mSv (it would barely show on the chart!).',
  },
  lesson: {
    es: 'Mira los días ☀️: cuando el escudo estaba alto, la barra quedó más baja.',
    en: 'Look at the ☀️ days: when the shield was high, the bar stayed lower.',
  },
};

export default function DoseChart({ game, lang }: { game: CadetState; lang: Lang }) {
  const tr = (t: T) => t[lang];
  const days = game.history.filter(h => typeof h.doseMSv === 'number');
  const [sel, setSel] = useState<number | null>(null);
  if (days.length === 0) return null;

  const max = Math.max(1.5, ...days.map(d => d.doseMSv!));
  const slot = (W - PAD_L - PAD_R) / game.totalDays;
  const barW = Math.min(22, slot - 6);
  const y = (v: number) => H - PAD_B - (v / max) * (H - PAD_T - PAD_B);
  const peak = days.reduce((a, b) => (b.doseMSv! > a.doseMSv! ? b : a));
  const s = sel !== null ? days.find(d => d.day === sel) : undefined;

  return (
    <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-left space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-black text-white">☢️ {tr(TXT.title)}</h3>
        <div className="flex gap-3 text-[11px] text-slate-300">
          <span className="flex items-center gap-1"><span aria-hidden className="inline-block w-3 h-3 rounded-sm bg-amber-400" />☀️ {tr(TXT.storm)}</span>
          <span className="flex items-center gap-1"><span aria-hidden className="inline-block w-3 h-3 rounded-sm bg-violet-400" />{tr(TXT.normal)}</span>
        </div>
      </div>
      <p className="text-xs text-slate-300 tabular-nums min-h-[1rem]" aria-live="polite">
        {s
          ? <><b className="text-white">{tr(TXT.day)} {s.day}</b>{s.storm ? ' ☀️' : ''}: {s.doseMSv!.toFixed(2)} mSv ({xrays(s.doseMSv!)} {tr(TXT.xr)}){typeof s.shield === 'number' ? ` · ${tr(TXT.shield)} ${s.shield}` : ''}</>
          : tr(TXT.tap)}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label={`${tr(TXT.title)}: ${days.map(d => `${tr(TXT.day)} ${d.day} ${d.doseMSv!.toFixed(2)} mSv${d.storm ? ' ☀️' : ''}`).join(', ')}`}>
        <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="#334155" strokeWidth={1} />
        {Array.from({ length: game.totalDays }, (_, i) => {
          const day = i + 1;
          const d = days.find(x => x.day === day);
          const cx = PAD_L + slot * i + slot / 2;
          return (
            <g key={day}>
              {d && (
                <>
                  <rect
                    x={cx - barW / 2}
                    y={y(d.doseMSv!)}
                    width={barW}
                    height={Math.max(2, H - PAD_B - y(d.doseMSv!))}
                    rx={4}
                    fill={d.storm ? '#fbbf24' : '#a78bfa'}
                    stroke={sel === day ? '#f8fafc' : 'none'}
                    strokeWidth={2}
                  />
                  {/* zona de toque más grande que la barra */}
                  <rect
                    x={cx - slot / 2}
                    y={PAD_T - 10}
                    width={slot}
                    height={H - PAD_T}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onPointerEnter={() => setSel(day)}
                    onPointerDown={() => setSel(day)}
                  />
                  {d === peak && (
                    <text x={cx} y={y(d.doseMSv!) - 4} textAnchor="middle" fontSize="9" fontWeight="800" fill="#e2e8f0">{d.doseMSv!.toFixed(1)}</text>
                  )}
                </>
              )}
              <text x={cx} y={H - PAD_B + 12} textAnchor="middle" fontSize="9" fill="#94a3b8">{day}</text>
              {d?.storm && (
                // Solecito dibujado (no emoji): los emoji dentro de SVG se ven distinto en cada navegador.
                <g aria-hidden transform={`translate(${cx} ${H - PAD_B + 21})`}>
                  {[0, 45, 90, 135].map(a => (
                    <line key={a} x1={-5} x2={5} y1={0} y2={0} stroke="#fbbf24" strokeWidth={1.3} strokeLinecap="round" transform={`rotate(${a})`} />
                  ))}
                  <circle r={2.8} fill="#fbbf24" stroke="#020617" strokeWidth={0.8} />
                </g>
              )}
            </g>
          );
        })}
        <text x={W - PAD_R} y={PAD_T - 6} textAnchor="end" fontSize="9" fill="#94a3b8">mSv</text>
      </svg>
      <p className="text-xs text-amber-200">{tr(TXT.lesson)}</p>
      <p className="text-[11px] text-slate-400">{tr(TXT.earth).replace('{e}', EARTH_DAY_MSV.toFixed(3))}</p>
    </div>
  );
}
