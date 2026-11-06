// "Misión en papel": reglas, tabla de llamaradas, hoja de registro y todas las
// tarjetas, listas para imprimir y jugar sin computadoras.
import { useState } from 'react';
import type { Effects, Lang, Site, T } from './data';
import { SITE_INFO } from './data';
import type { Level } from './engine';
import { STORM_DAYS, TOTAL_DAYS } from './engine';
import { paperCards, paperFlares, paperRules } from './paper';

const TXT: Record<string, T> = {
  title: { es: 'Misión en papel', en: 'Paper mission' },
  intro: {
    es: 'Para jugar en grupo sin computadoras: impriman, recorten las tarjetas y usen la hoja de registro. Son las mismas reglas y números que el juego.',
    en: 'To play in groups without computers: print, cut out the cards and use the log sheet. Same rules and numbers as the game.',
  },
  rules: { es: 'Reglas', en: 'Rules' },
  flares: { es: 'Llamaradas reales (saquen una en cada día ☀️)', en: 'Real flares (draw one on each ☀️ day)' },
  cls: { es: 'Clase', en: 'Class' },
  date: { es: 'Fecha', en: 'Date' },
  power: { es: 'Fuerza', en: 'Strength' },
  sheet: { es: 'Hoja de registro', en: 'Log sheet' },
  day: { es: 'Día', en: 'Day' },
  choice: { es: 'Decisión', en: 'Choice' },
  cards: { es: 'Tarjetas', en: 'Cards' },
  print: { es: 'Imprimir', en: 'Print' },
  back: { es: 'Volver', en: 'Back' },
  easy: { es: 'Fácil', en: 'Easy' },
  normal: { es: 'Normal', en: 'Normal' },
  real: { es: 'Esto pasó de verdad', en: 'This really happened' },
};

const ICONS: [keyof Effects, string][] = [['air', '🫁'], ['energy', '⚡'], ['shield', '🛡️'], ['health', '❤️'], ['stars', '⭐']];
const effectText = (e: Effects) =>
  ICONS.filter(([k]) => e[k]).map(([k, icon]) => `${e[k]! > 0 ? '+' : '−'}${Math.abs(e[k]!)} ${icon}`).join('  ') || '—';

export default function PaperMission({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const tr = (t: T) => t[lang];
  const [site, setSite] = useState<Site>('moon');
  const [level, setLevel] = useState<Level>('normal');
  const toggle = 'px-3 py-1.5 rounded-xl text-sm font-black border';
  const on = 'bg-cyan-400 text-slate-950 border-cyan-400';
  const off = 'bg-slate-900 text-slate-200 border-slate-600';

  return (
    <section className="cadet-print rounded-3xl border border-slate-700 bg-slate-900/80 p-5 space-y-5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-xs font-black tracking-[0.3em] uppercase text-cyan-400">🚀 ASTROBASE CADET</p>
          <h2 className="text-2xl font-black text-white">✂️ {tr(TXT.title)} · {SITE_INFO[site].name[lang]} · {tr(level === 'easy' ? TXT.easy : TXT.normal)}</h2>
        </div>
        <div className="cadet-no-print flex gap-2">
          <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-xl text-sm font-black bg-amber-400 text-slate-950 hover:brightness-110">🖨️ {tr(TXT.print)}</button>
          <button type="button" autoFocus onClick={onBack} className="px-3 py-2 rounded-xl text-sm font-bold bg-slate-800 border border-slate-600 text-white hover:bg-slate-700">← {tr(TXT.back)}</button>
        </div>
      </div>
      <p className="text-sm text-slate-300">{tr(TXT.intro)}</p>
      <div className="cadet-no-print flex flex-wrap gap-2">
        {(['moon', 'mars'] as Site[]).map(s => (
          <button key={s} type="button" aria-pressed={site === s} onClick={() => setSite(s)} className={`${toggle} ${site === s ? on : off}`}>
            {s === 'moon' ? '🌕' : '🔴'} {SITE_INFO[s].name[lang]}
          </button>
        ))}
        {(['easy', 'normal'] as Level[]).map(l => (
          <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={`${toggle} ${level === l ? on : off}`}>
            {l === 'easy' ? '🌱' : '🚀'} {tr(l === 'easy' ? TXT.easy : TXT.normal)}
          </button>
        ))}
      </div>

      <div>
        <h3 className="font-black text-white mb-1.5">📜 {tr(TXT.rules)}</h3>
        <ol className="list-decimal pl-5 space-y-1">
          {paperRules(site, level).map((r, i) => <li key={i} className="text-sm text-slate-200 leading-relaxed">{r[lang]}</li>)}
        </ol>
      </div>

      <div className="paper-block">
        <h3 className="font-black text-white mb-1.5">☀️ {tr(TXT.flares)}</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-slate-400 text-left">
              <th scope="col" className="border border-slate-700 px-2 py-1">{tr(TXT.cls)}</th>
              <th scope="col" className="border border-slate-700 px-2 py-1">{tr(TXT.date)}</th>
              <th scope="col" className="border border-slate-700 px-2 py-1">{tr(TXT.power)}</th>
            </tr>
          </thead>
          <tbody>
            {paperFlares().map(f => (
              <tr key={f.classType + f.date} className="text-slate-200">
                <td className="border border-slate-700 px-2 py-1 font-black">{f.classType}</td>
                <td className="border border-slate-700 px-2 py-1">{f.date}</td>
                <td className="border border-slate-700 px-2 py-1 tabular-nums">{f.power}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="paper-block">
        <h3 className="font-black text-white mb-1.5">✏️ {tr(TXT.sheet)}</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-slate-400">
              <th scope="col" className="border border-slate-700 px-1 py-1">{tr(TXT.day)}</th>
              <th scope="col" className="border border-slate-700 px-1 py-1">{tr(TXT.choice)}</th>
              <th scope="col" className="border border-slate-700 px-1 py-1">🫁</th>
              <th scope="col" className="border border-slate-700 px-1 py-1">⚡</th>
              <th scope="col" className="border border-slate-700 px-1 py-1">🛡️</th>
              <th scope="col" className="border border-slate-700 px-1 py-1">❤️</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: TOTAL_DAYS }, (_, i) => (
              <tr key={i} className="h-8">
                <th scope="row" className="border border-slate-700 px-1 text-slate-200">{i + 1}{STORM_DAYS.includes(i + 1) ? ' ☀️' : ''}</th>
                <td className="border border-slate-700 w-2/5" />
                <td className="border border-slate-700" />
                <td className="border border-slate-700" />
                <td className="border border-slate-700" />
                <td className="border border-slate-700" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="font-black text-white mb-1.5">🃏 {tr(TXT.cards)}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {paperCards(site).map(c => (
            <article key={c.id} className="paper-card rounded-2xl border-2 border-dashed border-slate-500 p-3 space-y-1.5">
              <h4 className="font-black text-white">{c.icon} {c.title[lang]}</h4>
              <p className="text-xs text-slate-300">{c.text[lang]}</p>
              {c.options.map((o, i) => (
                <p key={i} className="text-sm text-slate-100">
                  <b>{i === 0 ? 'A' : 'B'}.</b> {o.label[lang]} <span className="font-black tabular-nums">({effectText(o.effects)})</span>
                </p>
              ))}
              <p className="text-[11px] text-slate-400"><b>{tr(TXT.real)}:</b> {c.fact[lang]} — {c.source}</p>
            </article>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-400">Troncos Intergalácticos · NASA Space Apps Challenge · astrobase-cadet-y2hf.vercel.app</p>
    </section>
  );
}
