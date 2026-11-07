// Tabla "¿Luna o Marte?" + calculadora "¿Cuánto pesarías?" (el peso no se guarda).
import { useState } from 'react';
import type { Lang, T } from './data';
import { SITE_INFO } from './data';
import { GRAVITY_SOURCES, jumpTimes, weightOn } from './compare';
import { lightDelaySeconds, MOON_KM } from './orbit';

const TXT: Record<string, T> = {
  what: { es: 'Dato', en: 'Fact' },
  distance: { es: '📏 Distancia a la Tierra', en: '📏 Distance to Earth' },
  message: { es: '📡 Un mensaje tarda', en: '📡 A message takes' },
  trip: { es: '🚀 Viaje', en: '🚀 Trip' },
  gravity: { es: '🪶 Gravedad', en: '🪶 Gravity' },
  day: { es: '🌗 Un día completo', en: '🌗 One full day' },
  air: { es: '🫁 Aire', en: '🫁 Air' },
  radiation: { es: '☢️ Radiación en el suelo', en: '☢️ Radiation on the ground' },
  weightQ: { es: '¿Cuánto pesas en la Tierra? (kg)', en: 'How much do you weigh on Earth? (kg)' },
  weightA: {
    es: 'En la Luna la báscula marcaría {m} kg y en Marte {r} kg. ¡Podrías saltar unas {jm} veces más alto en la Luna y {jr} en Marte!',
    en: 'On the Moon the scale would show {m} kg and on Mars {r} kg. You could jump about {jm} times higher on the Moon and {jr} on Mars!',
  },
  private: { es: 'Tu peso no se guarda ni se envía a ningún lado.', en: 'Your weight is not saved or sent anywhere.' },
};

export default function CompareSites({ lang, marsKm, marsMin }: { lang: Lang; marsKm: number; marsMin: number }) {
  const tr = (t: T) => t[lang];
  const [kg, setKg] = useState('30');
  const n = Number(kg.replace(',', '.'));
  const valid = Number.isFinite(n) && n >= 5 && n <= 200;
  const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

  const rows: { label: T; moon: T; mars: T }[] = [
    { label: TXT.distance, moon: { es: `${MOON_KM.toLocaleString('es-MX')} km`, en: `${MOON_KM.toLocaleString('en-US')} km` }, mars: { es: `hoy ~${marsKm} millones de km`, en: `today ~${marsKm} million km` } },
    { label: TXT.message, moon: { es: `${lightDelaySeconds(MOON_KM).toFixed(1)} segundos`, en: `${lightDelaySeconds(MOON_KM).toFixed(1)} seconds` }, mars: { es: `hoy ~${marsMin} minutos`, en: `today ~${marsMin} minutes` } },
    { label: TXT.trip, moon: { es: 'unos 3 días (Apolo)', en: 'about 3 days (Apollo)' }, mars: { es: 'casi 7 meses (Perseverance)', en: 'almost 7 months (Perseverance)' } },
    { label: TXT.gravity, moon: { es: '1/6 de la Tierra', en: '1/6 of Earth' }, mars: { es: '38% de la Tierra', en: '38% of Earth' } },
    { label: TXT.day, moon: { es: 'casi un mes de la Tierra', en: 'almost an Earth month' }, mars: { es: '24 h y 40 min (un "sol")', en: '24 h 40 min (a "sol")' } },
    { label: TXT.air, moon: { es: 'casi nada', en: 'almost none' }, mars: { es: 'muy delgado, casi todo CO₂', en: 'very thin, mostly CO₂' } },
    { label: TXT.radiation, moon: { es: `${SITE_INFO.moon.dailyDoseMSv} mSv al día`, en: `${SITE_INFO.moon.dailyDoseMSv} mSv a day` }, mars: { es: `${SITE_INFO.mars.dailyDoseMSv} mSv al día`, en: `${SITE_INFO.mars.dailyDoseMSv} mSv a day` } },
  ];

  return (
    <div className="space-y-3">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-slate-400">
            <th scope="col" className="text-left font-bold pb-1"><span className="sr-only">{tr(TXT.what)}</span></th>
            <th scope="col" className="text-left font-bold pb-1">🌕 {SITE_INFO.moon.name[lang]}</th>
            <th scope="col" className="text-left font-bold pb-1">🔴 {SITE_INFO.mars.name[lang]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label.es} className="border-t border-slate-800 align-top">
              <th scope="row" className="text-left font-bold text-slate-300 py-1.5 pr-2">{tr(r.label)}</th>
              <td className="py-1.5 pr-2 text-slate-100">{tr(r.moon)}</td>
              <td className="py-1.5 text-slate-100">{tr(r.mars)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rounded-2xl border border-cyan-500/40 bg-slate-950/60 p-3 space-y-2">
        <label className="block text-sm font-bold text-slate-100">
          ⚖️ {tr(TXT.weightQ)}
          <input
            type="number"
            inputMode="decimal"
            min={5}
            max={200}
            value={kg}
            onChange={e => setKg(e.target.value)}
            className="mt-1 w-28 block rounded-xl bg-slate-950 border border-slate-600 px-3 py-2 text-lg font-black text-white"
          />
        </label>
        {valid && (
          <p className="text-sm text-slate-100" aria-live="polite">
            {fill(tr(TXT.weightA), { m: weightOn('moon', n), r: weightOn('mars', n), jm: jumpTimes('moon'), jr: jumpTimes('mars') })}
          </p>
        )}
        <p className="text-[11px] text-slate-400">{tr(TXT.private)}</p>
      </div>
      <p className="text-[11px] text-slate-400">
        <a href={GRAVITY_SOURCES.moon.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-dotted">{GRAVITY_SOURCES.moon.name}</a>
        {' · '}
        <a href={GRAVITY_SOURCES.mars.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-dotted">{GRAVITY_SOURCES.mars.name}</a>
      </p>
    </div>
  );
}
