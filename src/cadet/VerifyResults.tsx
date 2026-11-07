// Página para maestros: pegar los códigos de resultado de la clase y verlos
// verificados (cada misión se vuelve a jugar con las decisiones del código).
// Los nombres que escriba la maestra NO se guardan ni se envían: solo están en pantalla.
import { useMemo, useState } from 'react';
import type { Lang, T } from './data';
import { SITE_INFO } from './data';
import { verifyResult } from './resultCode';

const TXT: Record<string, T> = {
  title: { es: 'Verificar resultados de la clase', en: 'Verify class results' },
  how: {
    es: 'Pega un código por línea. Puedes poner el nombre antes, así: «Ana: R-1A2B-3C4D-5E6F». Cada misión se vuelve a jugar con las decisiones del código, así que el resultado no se puede inventar ni editar.',
    en: 'Paste one code per line. You can put the name first, like: “Ana: R-1A2B-3C4D-5E6F”. Each mission is replayed with the code’s decisions, so the result cannot be made up or edited.',
  },
  privacy: { es: 'Los nombres no se guardan ni se envían a ningún lado.', en: 'Names are not saved or sent anywhere.' },
  label: { es: 'Códigos de resultado', en: 'Result codes' },
  who: { es: 'Quién', en: 'Who' },
  mission: { es: 'Misión', en: 'Mission' },
  result: { es: 'Resultado', en: 'Result' },
  health: { es: 'Salud', en: 'Health' },
  stars: { es: 'Descubr.', en: 'Discov.' },
  dose: { es: 'Radiación', en: 'Radiation' },
  won: { es: '🏅 Ganó', en: '🏅 Won' },
  lost: { es: '🛬 Volvió el día {d}', en: '🛬 Came home day {d}' },
  invalid: { es: '❌ Código no válido (revisa que esté bien copiado)', en: '❌ Invalid code (check it was copied correctly)' },
  dup: { es: '(repetido)', en: '(duplicate)' },
  summary: { es: '{v} válidos · {w} misiones ganadas · {i} no válidos', en: '{v} valid · {w} missions won · {i} invalid' },
  print: { es: 'Imprimir', en: 'Print' },
  back: { es: 'Volver', en: 'Back' },
  easy: { es: 'Fácil', en: 'Easy' },
  normal: { es: 'Normal', en: 'Normal' },
};
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

export default function VerifyResults({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const tr = (t: T) => t[lang];
  const [text, setText] = useState('');
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 60).map(line => {
      const m = /^(.*?)[:\t,;]\s*(R?[\s-]*[0-9A-Za-z][0-9A-Za-z\s-]{10,20})$/.exec(line);
      const name = m ? m[1].trim().slice(0, 30) : '';
      const code = (m ? m[2] : line).trim();
      const v = verifyResult(code);
      const key = code.toUpperCase().replace(/[^0-9A-Z]/g, '');
      const dup = seen.has(key); seen.add(key);
      return { name, code, v, dup };
    });
  }, [text]);
  const valid = rows.filter(r => r.v);

  return (
    <section className="cadet-print rounded-3xl border border-slate-700 bg-slate-900/80 p-5 space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-xs font-black tracking-[0.3em] uppercase text-cyan-400">🚀 ASTROBASE CADET</p>
          <h2 className="text-2xl font-black text-white">✅ {tr(TXT.title)}</h2>
        </div>
        <div className="cadet-no-print flex gap-2">
          <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-xl text-sm font-black bg-amber-400 text-slate-950 hover:brightness-110">🖨️ {tr(TXT.print)}</button>
          <button type="button" onClick={onBack} className="px-3 py-2 rounded-xl text-sm font-bold bg-slate-800 border border-slate-600 text-white hover:bg-slate-700">← {tr(TXT.back)}</button>
        </div>
      </div>
      <p className="text-sm text-slate-300">{tr(TXT.how)}</p>
      <label className="cadet-no-print block text-sm font-bold text-slate-100">
        {tr(TXT.label)}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={6}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          placeholder={'Ana: R-1A2B-3C4D-5E6F\nLuis: R-…'}
          className="mt-1 w-full rounded-2xl bg-slate-950 border border-slate-600 px-3 py-2 font-mono text-sm text-white"
        />
      </label>
      <p className="text-[11px] text-slate-400">🔒 {tr(TXT.privacy)}</p>
      {rows.length > 0 && (
        <>
          <p className="text-sm font-black text-white" aria-live="polite">
            {fill(tr(TXT.summary), { v: valid.length, w: valid.filter(r => r.v!.status === 'won').length, i: rows.length - valid.length })}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-slate-400">
                  {[TXT.who, TXT.mission, TXT.result, TXT.health, TXT.stars, TXT.dose].map(h => (
                    <th key={h.es} scope="col" className="border-b border-slate-700 px-2 py-1">{tr(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-800 align-top">
                    <td className="px-2 py-1.5 text-slate-100">{r.name || '—'} {r.dup && <span className="text-xs text-amber-300">{tr(TXT.dup)}</span>}</td>
                    {r.v ? (
                      <>
                        <td className="px-2 py-1.5 text-slate-200 whitespace-nowrap">
                          {r.v.site === 'moon' ? '🌕' : '🔴'} {SITE_INFO[r.v.site].name[lang]} · {tr(r.v.level === 'easy' ? TXT.easy : TXT.normal)}
                          <span className="block text-[11px] text-slate-400 font-mono">{r.v.missionCode}{r.v.liveClass ? ` · ☀️ ${r.v.liveClass}` : ''}</span>
                        </td>
                        <td className="px-2 py-1.5 text-slate-100 whitespace-nowrap">
                          {r.v.status === 'won' ? `${tr(TXT.won)} ${'⭐'.repeat(r.v.medal)}` : fill(tr(TXT.lost), { d: r.v.daysPlayed })}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-slate-100">{r.v.health}</td>
                        <td className="px-2 py-1.5 tabular-nums text-slate-100">{r.v.stars}</td>
                        <td className="px-2 py-1.5 tabular-nums text-slate-100 whitespace-nowrap">{r.v.doseMSv.toFixed(2)} mSv</td>
                      </>
                    ) : (
                      <td colSpan={5} className="px-2 py-1.5 text-rose-300">{tr(TXT.invalid)} <span className="font-mono text-xs">{r.code.slice(0, 22)}</span></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
