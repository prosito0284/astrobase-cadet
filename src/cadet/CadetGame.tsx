// ─────────────────────────────────────────────────────────────────────────────
// MODO CADETE (7–12 años) — Una decisión por día, tres barras, datos reales.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import {
  choose,
  createGame,
  currentCard,
  energyFactor,
  fetchLiveStorm,
  medal,
  previewStormDamage,
  STORM_DAYS,
  xrays,
} from './engine';
import type { CadetState } from './engine';
import { DATA_SOURCES, GLOSSARY, REAL_STORMS, SITE_INFO } from './data';
import type { Effects, Lang, Site, SolarStorm, T } from './data';

const SAVE_KEY = 'astrobase_cadet_game_v1';
const LANG_KEY = 'astrobase_cadet_lang';
const LIVE_KEY = 'astrobase_cadet_live_storm_v1';

type LiveStatus = 'loading' | 'ok' | 'fail';

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* almacenamiento bloqueado: el juego sigue funcionando */ }
}

function loadGame(): CadetState | null {
  const raw = safeGet(SAVE_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as CadetState;
    if (!s || !Array.isArray(s.deck) || s.deck.length === 0 || typeof s.day !== 'number') return null;
    return s;
  } catch { return null; }
}

/** Resultado de DONKI ya consultado en esta sesión del navegador (para no gastar la cuota de la API). */
function readCachedLive(): { status: LiveStatus; storm?: SolarStorm } | null {
  try {
    const cached = sessionStorage.getItem(LIVE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as SolarStorm | null;
    return parsed ? { status: 'ok', storm: parsed } : { status: 'fail' };
  } catch {
    return null;
  }
}

const UI = {
  subtitle: { es: 'Entrenador de Misiones para Jóvenes Astronautas', en: 'Junior Astronaut Mission Trainer' },
  pickSite: { es: '¿Dónde quieres construir tu base?', en: 'Where do you want to build your base?' },
  intro: {
    es: 'Durante 10 días cuidarás a 4 astronautas. Cada día tendrás que tomar UNA decisión. Ninguna es gratis: todo cuesta aire, energía o escudo.',
    en: 'For 10 days you will look after 4 astronauts. Each day you will make ONE decision. None of them is free: everything costs air, energy or shield.',
  },
  start: { es: '¡Empezar misión!', en: 'Start mission!' },
  day: { es: 'Día', en: 'Day' },
  of: { es: 'de', en: 'of' },
  stormDay: { es: 'Día de tormenta solar', en: 'Solar storm day' },
  air: { es: 'Aire', en: 'Air' },
  energy: { es: 'Energía', en: 'Energy' },
  shield: { es: 'Escudo', en: 'Shield' },
  health: { es: 'Salud del equipo', en: 'Crew health' },
  discoveries: { es: 'Descubrimientos', en: 'Discoveries' },
  choose: { es: 'Elige una opción', en: 'Choose an option' },
  stormHits: { es: 'tormenta', en: 'storm' },
  halfWarn: { es: 'Solo tienes {n} de energía: funcionará a medias', en: 'You only have {n} energy: it will only half work' },
  whatHappened: { es: '¿Qué pasó hoy?', en: 'What happened today?' },
  yourChoice: { es: 'Tu decisión', en: 'Your choice' },
  realStory: { es: 'Esto pasó de verdad', en: 'This really happened' },
  live: { es: 'EN VIVO · NASA DONKI', en: 'LIVE · NASA DONKI' },
  stored: { es: 'Dato real guardado', en: 'Real stored data' },
  next: { es: 'Siguiente día', en: 'Next day' },
  finish: { es: 'Ver el final', en: 'See the ending' },
  readAloud: { es: 'Leer en voz alta', en: 'Read aloud' },
  sources: { es: '¿De dónde salen los datos?', en: 'Where does the data come from?' },
  words: { es: 'Palabras difíciles', en: 'Tricky words' },
  expert: { es: 'Modo Experto', en: 'Expert Mode' },
  close: { es: 'Cerrar', en: 'Close' },
  won: { es: '¡Misión cumplida!', en: 'Mission accomplished!' },
  wonText: { es: 'Tu equipo sobrevivió los 10 días.', en: 'Your crew survived all 10 days.' },
  lost: { es: 'La misión volvió a casa antes de tiempo', en: 'The mission came home early' },
  lostAir: {
    es: 'Se acabó el aire. Pista: las plantas, el hielo y la máquina MOXIE dan aire, pero cuestan energía. ¡Planea antes de gastar!',
    en: 'The air ran out. Tip: plants, ice and the MOXIE machine make air, but they cost energy. Plan before you spend!',
  },
  lostHealth: {
    es: 'El equipo se enfermó por la radiación y el cansancio. Pista: guarda energía para subir el escudo en los días de tormenta (☀️).',
    en: 'The crew got sick from radiation and tiredness. Tip: save energy to raise the shield on storm days (☀️).',
  },
  totalDose: { es: 'Radiación total del equipo', en: 'Total crew radiation' },
  earthCompare: {
    es: 'En la Tierra una persona recibe unos 2.4 mSv en todo un año.',
    en: 'On Earth a person gets about 2.4 mSv in a whole year.',
  },
  learned: { es: 'Tus decisiones', en: 'Your decisions' },
  again: { es: 'Jugar otra vez', en: 'Play again' },
  switchSite: { es: 'Probar en {x}', en: 'Try on {x}' },
  liveLoading: { es: 'Preguntando a la NASA por el clima del Sol de hoy…', en: 'Asking NASA about today\'s space weather…' },
  liveOk: {
    es: 'Conectado: tu primera tormenta será la llamarada REAL más fuerte del último mes ({c}, {d}).',
    en: 'Connected: your first storm will be the strongest REAL flare of the last month ({c}, {d}).',
  },
  liveFail: {
    es: 'Sin conexión con DONKI ahora: usaremos 6 llamaradas reales guardadas (2017 y 2024).',
    en: 'No connection to DONKI right now: we will use 6 real stored flares (2017 and 2024).',
  },
  liveTag: { es: 'en vivo', en: 'live' },
  storedTag: { es: 'guardado', en: 'stored' },
  why: { es: 'Para qué se usa', en: 'What it\'s for' },
  sourceLabel: { es: 'Fuente', en: 'Source' },
  newStorm: { es: 'Se acerca una tormenta solar', en: 'A solar storm is coming' },
  dose: { es: 'Dosis de hoy', en: 'Dose today' },
  xr: { es: 'radiografías', en: 'X-rays' },
};

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

function speak(text: string, lang: Lang) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-MX' : 'en-US';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { /* sin voz disponible */ }
}

// ── Piezas visuales ──

function Bar({ icon, label, value, color, term, onTerm }: {
  icon: string; label: string; value: number; color: string; term: string; onTerm: (k: string) => void;
}) {
  const low = value < 25;
  return (
    <button
      type="button"
      onClick={() => onTerm(term)}
      className={`text-left rounded-2xl border p-2.5 sm:p-3 bg-slate-900/80 transition-colors ${low ? 'border-red-500/70 animate-pulse' : 'border-slate-700/70 hover:border-slate-500'}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold text-sm sm:text-base text-slate-100 truncate">
          <span aria-hidden className="mr-1">{icon}</span>{label}
          <span className="ml-1 text-[10px] text-slate-500 align-top">ⓘ</span>
        </span>
        <span className={`font-black text-base sm:text-lg tabular-nums ${low ? 'text-red-400' : 'text-slate-100'}`}>{value}</span>
      </div>
      <div className="mt-1.5 h-3 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </button>
  );
}

function EffectChips({ effects, stormHit, lang }: { effects: Effects; stormHit?: number; lang: Lang }) {
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

function Modal({ title, onClose, closeLabel, children }: { title: string; onClose: () => void; closeLabel: string; children: React.ReactNode }) {
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
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-bold hover:bg-slate-700">
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Juego ──

export default function CadetGame({ onExpert }: { onExpert: () => void }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = safeGet(LANG_KEY);
    if (saved === 'es' || saved === 'en') return saved;
    return typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'es';
  });
  const tr = (t: T) => t[lang];

  const [game, setGame] = useState<CadetState | null>(() => loadGame());
  const [site, setSite] = useState<Site>(() => loadGame()?.site ?? 'moon');
  const [showReport, setShowReport] = useState(false);
  const [modal, setModal] = useState<null | 'sources' | 'words' | string>(null);

  const [cachedLive] = useState(readCachedLive);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(cachedLive ? cachedLive.status : 'loading');
  const [liveStorm, setLiveStorm] = useState<SolarStorm | undefined>(cachedLive?.storm);

  useEffect(() => { safeSet(LANG_KEY, lang); }, [lang]);
  useEffect(() => { safeSet(SAVE_KEY, game ? JSON.stringify(game) : null); }, [game]);

  // Llamarada en vivo desde NASA DONKI (una vez por sesión del navegador).
  useEffect(() => {
    if (cachedLive) return;
    let cancelled = false;
    fetchLiveStorm().then(storm => {
      if (cancelled) return;
      setLiveStorm(storm);
      setLiveStatus(storm ? 'ok' : 'fail');
      try { sessionStorage.setItem(LIVE_KEY, JSON.stringify(storm ?? null)); } catch { /* ignorar */ }
    });
    return () => { cancelled = true; };
  }, [cachedLive]);

  const startGame = (where: Site) => {
    setSite(where);
    setShowReport(false);
    setGame(createGame(where, Math.floor(Math.random() * 2 ** 31), liveStatus === 'ok' ? liveStorm : undefined));
  };

  const card = useMemo(() => (game && game.status === 'playing' ? currentCard(game) : null), [game]);

  const pick = (i: 0 | 1) => {
    if (!game) return;
    setGame(choose(game, i));
    setShowReport(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const header = (
    <header className="flex items-center justify-between gap-2 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
          🚀 ASTROBASE <span className="text-cyan-400">CADET</span>
        </h1>
        <p className="text-xs text-slate-400">{tr(UI.subtitle)} · Troncos Intergalácticos</p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button type="button" onClick={() => setModal('sources')} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-900">
          🛰️ {tr(UI.sources)}
        </button>
        <button type="button" onClick={() => setModal('words')} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700">
          📖 {tr(UI.words)}
        </button>
        <button type="button" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700" aria-label="Language">
          {lang === 'es' ? 'EN' : 'ES'}
        </button>
        <button type="button" onClick={onExpert} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-slate-400 hover:text-white">
          {tr(UI.expert)} →
        </button>
      </div>
    </header>
  );

  const liveBanner = (
    <p className={`text-sm rounded-2xl px-3 py-2 border ${liveStatus === 'ok' ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : liveStatus === 'fail' ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}>
      {liveStatus === 'loading' && <>⏳ {tr(UI.liveLoading)}</>}
      {liveStatus === 'ok' && liveStorm && <>☀️ {fill(tr(UI.liveOk), { c: liveStorm.classType, d: liveStorm.date })}</>}
      {liveStatus === 'fail' && <>💾 {tr(UI.liveFail)}</>}
    </p>
  );

  // ── Modales ──
  let modalNode: React.ReactNode = null;
  if (modal === 'sources') {
    modalNode = (
      <Modal title={tr(UI.sources)} onClose={() => setModal(null)} closeLabel={tr(UI.close)}>
        <div className="space-y-3">
          {liveBanner}
          {DATA_SOURCES.map(src => (
            <div key={src.name} className="rounded-2xl border border-slate-700 p-3 bg-slate-950/60">
              <div className="flex items-start justify-between gap-2">
                <a href={src.url} target="_blank" rel="noreferrer" className="font-bold text-cyan-300 underline decoration-dotted text-sm">{src.name}</a>
                <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${src.mode === 'live' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>
                  {src.mode === 'live' ? `${tr(UI.liveTag)} + ${tr(UI.storedTag)}` : tr(UI.storedTag)}
                </span>
              </div>
              <p className="text-sm text-slate-200 mt-1">{tr(src.what)}</p>
              <p className="text-xs text-slate-400 mt-1"><b>{tr(UI.why)}:</b> {tr(src.why)}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-slate-700 p-3 bg-slate-950/60">
            <p className="text-xs text-slate-400 mb-1">☀️ {lang === 'es' ? 'Llamaradas reales guardadas' : 'Real stored flares'}:</p>
            <p className="text-sm text-slate-200">{REAL_STORMS.map(s => `${s.classType} (${s.date})`).join(' · ')}</p>
          </div>
        </div>
      </Modal>
    );
  } else if (modal === 'words') {
    modalNode = (
      <Modal title={tr(UI.words)} onClose={() => setModal(null)} closeLabel={tr(UI.close)}>
        <ul className="space-y-2">
          {Object.entries(GLOSSARY).map(([k, t]) => (
            <li key={k} className="text-sm text-slate-200 rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">{tr(t)}</li>
          ))}
        </ul>
      </Modal>
    );
  } else if (modal && GLOSSARY[modal]) {
    modalNode = (
      <Modal title="📖" onClose={() => setModal(null)} closeLabel={tr(UI.close)}>
        <p className="text-base text-slate-100">{tr(GLOSSARY[modal])}</p>
      </Modal>
    );
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#060913] text-slate-100 px-4 py-4 sm:py-6" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div className="max-w-2xl mx-auto space-y-4">
        {header}
        {children}
      </div>
      {modalNode}
    </div>
  );

  // ── Pantalla de inicio ──
  if (!game) {
    return shell(
      <section className="space-y-4">
        <p className="text-lg text-slate-200 leading-relaxed">{tr(UI.intro)}</p>
        <h2 className="text-xl font-black text-white">{tr(UI.pickSite)}</h2>
        <div className="grid grid-cols-2 gap-3">
          {(['moon', 'mars'] as Site[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSite(s)}
              className={`rounded-3xl p-4 border-2 text-left transition-all ${site === s ? (s === 'moon' ? 'border-cyan-400 bg-cyan-500/10' : 'border-orange-400 bg-orange-500/10') : 'border-slate-700 bg-slate-900/70 hover:border-slate-500'}`}
            >
              <div className="text-4xl" aria-hidden>{s === 'moon' ? '🌕' : '🔴'}</div>
              <div className="text-lg font-black mt-1">{tr(SITE_INFO[s].name)}</div>
              <div className="text-xs text-slate-400">{tr(SITE_INFO[s].place)}</div>
              <div className="text-xs text-slate-300 mt-2">📡 {lang === 'es' ? 'Mensajes a la Tierra' : 'Messages to Earth'}: <b>{tr(SITE_INFO[s].commDelay)}</b></div>
            </button>
          ))}
        </div>
        {liveBanner}
        <button
          type="button"
          onClick={() => startGame(site)}
          className="w-full py-4 rounded-3xl text-xl font-black bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-900/40 hover:brightness-110 active:scale-[0.99]"
        >
          {tr(UI.start)}
        </button>
      </section>,
    );
  }

  // ── Barras y calendario (siempre visibles durante la partida) ──
  const stats = (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-black text-white">
          {game.site === 'moon' ? '🌕' : '🔴'} {tr(UI.day)} {Math.min(game.day, game.totalDays)} {tr(UI.of)} {game.totalDays}
        </span>
        <span className="font-black text-amber-300">⭐ {game.stars} <span className="text-xs text-slate-400 font-bold">{tr(UI.discoveries)}</span></span>
      </div>
      <div className="flex gap-1" aria-label={tr(UI.stormDay)}>
        {Array.from({ length: game.totalDays }, (_, i) => {
          const d = i + 1;
          const storm = STORM_DAYS.includes(d);
          const done = d < game.day || (d === game.day && game.status !== 'playing');
          const now = d === game.day && game.status === 'playing';
          return (
            <div
              key={d}
              title={storm ? tr(UI.stormDay) : `${tr(UI.day)} ${d}`}
              className={`flex-1 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${now ? 'border-white bg-white/15' : done ? 'border-slate-700 bg-slate-800 text-slate-500' : 'border-slate-700 bg-slate-900'}`}
            >
              {storm ? '☀️' : d}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Bar icon="🫁" label={tr(UI.air)} value={game.air} color="bg-cyan-400" term="aire" onTerm={setModal} />
        <Bar icon="⚡" label={tr(UI.energy)} value={game.energy} color="bg-amber-400" term="energia" onTerm={setModal} />
        <Bar icon="🛡️" label={tr(UI.shield)} value={game.shield} color="bg-violet-400" term="escudo" onTerm={setModal} />
        <Bar icon="❤️" label={tr(UI.health)} value={game.health} color="bg-rose-400" term="radiacion" onTerm={setModal} />
      </div>
    </section>
  );

  // ── Reporte del día ──
  if (showReport && game.lastReport) {
    const r = game.lastReport;
    const ended = game.status !== 'playing';
    const storyText = `${tr(r.outcome)} ${r.lines.map(l => tr(l.text)).join(' ')} ${tr(UI.realStory)}: ${tr(r.fact)}`;
    return shell(
      <>
        {stats}
        <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-black text-white">{tr(UI.whatHappened)}</h2>
            <button type="button" onClick={() => speak(storyText, lang)} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 border border-slate-600 hover:bg-slate-700">🔊 {tr(UI.readAloud)}</button>
          </div>
          <p className="text-sm text-slate-400">{tr(UI.yourChoice)}: <b className="text-slate-100">{tr(r.choice)}</b></p>
          <p className="text-lg text-slate-100">{tr(r.outcome)}</p>
          <ul className="space-y-1.5">
            {r.lines.map((l, i) => (
              <li key={i} className={`flex gap-2 text-sm sm:text-base rounded-xl px-3 py-2 ${l.tone === 'good' ? 'bg-emerald-500/10 text-emerald-100' : l.tone === 'bad' ? 'bg-rose-500/10 text-rose-100' : 'bg-slate-800/60 text-slate-200'}`}>
                <span aria-hidden>{l.icon}</span><span>{tr(l.text)}</span>
              </li>
            ))}
          </ul>
          <div className={`rounded-2xl p-3 border ${r.storm?.live ? 'border-amber-400/60 bg-amber-500/10' : 'border-indigo-500/40 bg-indigo-500/10'}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wide text-indigo-200">🛰️ {tr(UI.realStory)}</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${r.storm?.live ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-200'}`}>
                {r.storm?.live ? tr(UI.live) : tr(UI.stored)}
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-100">{tr(r.fact)}</p>
            <a href={r.source.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline decoration-dotted mt-1 inline-block">{tr(UI.sourceLabel)}: {r.source.name}</a>
          </div>
          <button
            type="button"
            onClick={() => setShowReport(false)}
            className="w-full py-3.5 rounded-2xl text-lg font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110"
          >
            {ended ? tr(UI.finish) : `${tr(UI.next)} →`}
          </button>
        </section>
      </>,
    );
  }

  // ── Final ──
  if (game.status !== 'playing') {
    const won = game.status === 'won';
    const m = medal(game);
    const other: Site = game.site === 'moon' ? 'mars' : 'moon';
    return shell(
      <>
        {stats}
        <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 space-y-4 text-center">
          <div className="text-5xl" aria-hidden>{won ? '🏅' : '🛬'}</div>
          <h2 className="text-2xl font-black text-white">{won ? tr(UI.won) : tr(UI.lost)}</h2>
          {won ? (
            <>
              <p className="text-lg text-slate-200">{tr(UI.wonText)}</p>
              <p className="text-4xl" aria-label={`${m} / 3`}>{'⭐'.repeat(m)}<span className="opacity-25">{'⭐'.repeat(3 - m)}</span></p>
            </>
          ) : (
            <p className="text-lg text-slate-200">{game.lostReason === 'air' ? tr(UI.lostAir) : tr(UI.lostHealth)}</p>
          )}
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-left">
            <p className="text-sm text-slate-300">☢️ {tr(UI.totalDose)}: <b className="text-white">{game.doseMSv.toFixed(2)} mSv</b> ({xrays(game.doseMSv)} {tr(UI.xr)})</p>
            <p className="text-xs text-slate-400 mt-1">{tr(UI.earthCompare)}</p>
            <p className="text-xs text-slate-400 mt-1">{tr(SITE_INFO[game.site].doseFact)}</p>
          </div>
          <div className="text-left">
            <h3 className="font-black text-white mb-1.5">{tr(UI.learned)}</h3>
            <ol className="space-y-1">
              {game.history.map(h => (
                <li key={h.day} className="text-sm text-slate-300"><b className="text-slate-100">{tr(UI.day)} {h.day}:</b> {tr(h.title)} → {tr(h.choice)}</li>
              ))}
            </ol>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <button type="button" onClick={() => startGame(game.site)} className="py-3.5 rounded-2xl text-lg font-black bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:brightness-110">
              🔁 {tr(UI.again)}
            </button>
            <button type="button" onClick={() => startGame(other)} className="py-3.5 rounded-2xl text-lg font-black bg-slate-800 border border-slate-600 text-white hover:bg-slate-700">
              {other === 'moon' ? '🌕' : '🔴'} {fill(tr(UI.switchSite), { x: tr(SITE_INFO[other].name) })}
            </button>
          </div>
        </section>
      </>,
    );
  }

  // ── Tarjeta de decisión del día ──
  const c = card!;
  const cardText = `${tr(c.title)}. ${tr(c.text)} ${c.options.map(o => `${tr(o.label)}: ${tr(o.detail)}.`).join(' ')}`;
  return shell(
    <>
      {stats}
      <section className={`rounded-3xl border-2 p-4 sm:p-5 space-y-3 ${c.storm ? 'border-amber-400/70 bg-gradient-to-b from-amber-500/15 to-slate-900/80' : 'border-cyan-500/40 bg-slate-900/80'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-4xl leading-none" aria-hidden>{c.icon}</span>
            <div className="min-w-0">
              {c.storm && (
                <span className={`inline-block mb-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${c.storm.live ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-200'}`}>
                  {c.storm.live ? tr(UI.live) : `${tr(UI.stored)} · DONKI ${c.storm.date}`}
                </span>
              )}
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">{tr(c.title)}</h2>
            </div>
          </div>
          <button type="button" onClick={() => speak(cardText, lang)} className="shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 border border-slate-600 hover:bg-slate-700" aria-label={tr(UI.readAloud)}>🔊</button>
        </div>
        <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
          {tr(c.text)}
          {c.storm && (
            <>
              {' '}
              <button type="button" onClick={() => setModal('llamarada')} className="underline decoration-dotted text-amber-300">{lang === 'es' ? '¿Qué es una llamarada?' : 'What is a flare?'}</button>
            </>
          )}
        </p>
        <p className="text-sm font-bold text-slate-400">{tr(UI.choose)}:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {c.options.map((o, i) => {
            const idx = i as 0 | 1;
            const factor = energyFactor(game.energy, o.effects);
            const hit = previewStormDamage(game, idx);
            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(idx)}
                className="text-left rounded-2xl p-4 border-2 border-slate-600 bg-slate-950/70 hover:border-cyan-400 hover:bg-slate-900 active:scale-[0.99] transition-all"
              >
                <div className="text-lg font-black text-white">{i === 0 ? '🅰️' : '🅱️'} {tr(o.label)}</div>
                <div className="text-sm text-slate-300 mt-0.5">{tr(o.detail)}</div>
                <EffectChips effects={o.effects} stormHit={hit} lang={lang} />
                {factor < 1 && (
                  <div className="mt-2 text-xs font-bold text-amber-300">⚠️ {fill(tr(UI.halfWarn), { n: game.energy })}</div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </>,
  );
}
