// Piezas visuales pequeñas del Modo Cadete: barras, chips de efectos, ventanas,
// simulador de señal y tabla de récords.
import { useEffect, useState } from 'react';
import type { Effects, Lang, Site, T } from './data';
import { SITE_INFO } from './data';
import { lightDelaySeconds, MOON_KM } from './orbit';
import type { Records } from './records';
import type { SoundKind } from './sound';
import { fill, UI } from './strings';
import { glossarySegments } from './glossaryText';



export function Bar({ icon, label, value, color, term, onTerm, delta }: {
  icon: string; label: string; value: number; color: string; term: string; onTerm: (k: string) => void; delta?: number;
}) {
  const low = value < 25;
  const showDelta = delta !== undefined && delta !== 0;
  return (
    <button
      type="button"
      onClick={() => onTerm(term)}
      aria-label={`${label}: ${value} / 100${showDelta ? ` (${delta! > 0 ? '+' : '−'}${Math.abs(delta!)})` : ''}${low ? ' ⚠️' : ''}`}
      className={`text-left rounded-2xl border p-2.5 sm:p-3 bg-slate-900/80 transition-colors ${low ? 'border-red-500/70 cadet-glow-red' : 'border-slate-700/70 hover:border-slate-500'}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold text-sm sm:text-base text-slate-100 truncate">
          <span aria-hidden className="mr-1">{icon}</span>{label}
          <span className="ml-1 text-[10px] text-slate-400 align-top">ⓘ</span>
        </span>
        <span className="flex items-center gap-1.5">
          {showDelta && (
            <span className={`text-xs font-black tabular-nums px-1.5 rounded-md ${delta! > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
              {delta! > 0 ? '+' : '−'}{Math.abs(delta!)}
            </span>
          )}
          <span className={`font-black text-base sm:text-lg tabular-nums ${low ? 'text-red-400' : 'text-slate-100'}`}>{value}</span>
        </span>
      </div>
      <div className="mt-1.5 h-3 rounded-full bg-slate-800 overflow-hidden">
        <div aria-hidden className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </button>
  );
}

export function EffectChips({ effects, stormHit, lang }: { effects: Effects; stormHit?: number; lang: Lang }) {
  const chips: { t: string; good: boolean }[] = [];
  const add = (v: number | undefined, icon: string) => {
    if (!v) return;
    chips.push({ t: `${v > 0 ? '+' : '−'}${Math.abs(v)} ${icon}`, good: v > 0 });
  };
  add(effects.air, '🫁');
  add(effects.energy, '⚡');
  add(effects.shield, '🛡️');
  add(effects.health, '❤️');
  if (effects.stars) chips.push({ t: `+${effects.stars} ⭐`, good: true });
  if (stormHit !== undefined) chips.push({ t: `−${stormHit} ❤️ ${UI.stormHits[lang]}`, good: stormHit === 0 });
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`px-2 py-0.5 rounded-lg text-sm font-black tabular-nums ${c.good ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'}`}
        >
          {c.t}
        </span>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, closeLabel, children }: { title: string; onClose: () => void; closeLabel: string; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-black text-white">{title}</h2>
          <button type="button" autoFocus onClick={onClose} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-bold hover:bg-slate-700">
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SignalRace({ site, lang, marsMin, sfx }: { site: Site; lang: Lang; marsMin: number; sfx: (k: SoundKind) => void }) {
  const [phase, setPhase] = useState<'idle' | 'go' | 'back' | 'done'>('idle');
  const [progress, setProgress] = useState(0); // 0–1 dentro del tramo actual
  const moonS = lightDelaySeconds(MOON_KM);
  // Luna: tiempo real. Marte: acelerado, 1 segundo en pantalla = 1 minuto real.
  const animS = site === 'moon' ? moonS : marsMin;

  useEffect(() => {
    if (phase !== 'go' && phase !== 'back') return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const f = Math.min(1, (now - t0) / (animS * 1000));
      setProgress(f);
      if (f < 1) raf = requestAnimationFrame(tick);
      else {
        setProgress(0);
        setPhase(phase === 'go' ? 'back' : 'done');
        sfx('ping');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, animS, sfx]);

  const moving = phase === 'go' || phase === 'back';
  const pos = phase === 'go' ? progress * 100 : phase === 'back' ? (1 - progress) * 100 : 0;
  const legs = phase === 'back' ? 1 + progress : phase === 'go' ? progress : phase === 'done' ? 2 : 0;
  const elapsed = site === 'moon' ? `${(legs * moonS).toFixed(1)} s` : `${Math.round(legs * marsMin)} min`;
  const roundTrip = site === 'moon' ? `${(moonS * 2).toFixed(1)} s` : `${Math.round(marsMin * 2)} min`;
  const status =
    phase === 'go' ? UI.signalGoing[lang]
      : phase === 'back' ? UI.signalBack[lang]
        : phase === 'done' ? fill(UI.signalDone[lang], { t: roundTrip })
          : '';
  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-black text-cyan-200">{UI.signalTitle[lang]}</span>
        <span className="text-[10px] font-bold uppercase text-slate-400">{site === 'moon' ? UI.signalReal[lang] : UI.signalFast[lang]}</span>
      </div>
      <div className="flex items-center gap-2" aria-hidden>
        <span className="text-2xl">{site === 'moon' ? '🌕' : '🔴'}</span>
        <div className="relative flex-1 h-1 rounded bg-slate-700">
          <span
            className="absolute -top-1.5 w-4 h-4 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]"
            style={{ left: `calc(${pos}% - 8px)`, opacity: phase === 'idle' ? 0.35 : 1 }}
          />
        </div>
        <span className="text-2xl">🌍</span>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-slate-200">
          {phase !== 'idle' && <b className="tabular-nums text-cyan-200 mr-2">⏱️ {elapsed}</b>}
          <span aria-live="polite">{status}</span>
        </span>
        <button
          type="button"
          disabled={moving}
          onClick={() => { sfx('tap'); setPhase('go'); }}
          className="px-3 py-1.5 rounded-xl text-sm font-black bg-cyan-400 text-slate-950 disabled:opacity-40 hover:brightness-110"
        >
          {UI.signalSend[lang]}
        </button>
      </div>
    </div>
  );
}

export function RecordsTable({ records, lang }: { records: Records; lang: Lang }) {
  const rows: { label: T; value: (site: Site) => string }[] = [
    { label: UI.plays, value: s => String(records[s].plays) },
    { label: UI.wins, value: s => String(records[s].wins) },
    { label: UI.bestMedal, value: s => (records[s].bestMedal ? '⭐'.repeat(records[s].bestMedal) : '—') },
    { label: UI.bestStars, value: s => String(records[s].bestStars) },
    { label: UI.lowestDose, value: s => (records[s].lowestDose === null ? '—' : `${records[s].lowestDose!.toFixed(2)} mSv`) },
  ];
  return (
    <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-left overflow-x-auto">
      <h3 className="font-black text-white mb-2">🏆 {UI.records[lang]}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400">
            <th scope="col" className="text-left font-bold pb-1"><span className="sr-only">—</span></th>
            <th scope="col" className="text-right font-bold pb-1">🌕 {SITE_INFO.moon.name[lang]}</th>
            <th scope="col" className="text-right font-bold pb-1">🔴 {SITE_INFO.mars.name[lang]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label.es} className="border-t border-slate-800">
              <th scope="row" className="text-left font-normal text-slate-300 py-1">{r.label[lang]}</th>
              <td className="text-right font-black tabular-nums text-slate-100">{r.value('moon')}</td>
              <td className="text-right font-black tabular-nums text-slate-100">{r.value('mars')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


/** Texto con las palabras difíciles subrayadas: al tocarlas se abre su explicación. */
export function RichText({ text, lang, onTerm }: { text: string; lang: Lang; onTerm: (k: string) => void }) {
  return (
    <>
      {glossarySegments(text, lang).map((seg, i) =>
        seg.term ? (
          <button
            key={i}
            type="button"
            onClick={() => onTerm(seg.term!)}
            aria-label={lang === 'es' ? `${seg.text}: ¿qué significa?` : `${seg.text}: what does it mean?`}
            className="inline underline decoration-dotted decoration-2 underline-offset-4 decoration-amber-300/80 hover:text-amber-200"
          >
            {seg.text}
          </button>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
