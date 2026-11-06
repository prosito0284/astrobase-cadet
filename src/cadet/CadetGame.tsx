// ─────────────────────────────────────────────────────────────────────────────
// MODO CADETE (7–12 años) — Una decisión por día, tres barras, datos reales.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  choose,
  createGame,
  currentCard,
  energyFactor,
  dailyRoutine,
  hint,
  isValidSave,
  LEVELS,
  fetchLiveStorm,
  medal,
  previewStormDamage,
  STORM_DAYS,
  xrays,
} from './engine';
import type { CadetState, Level } from './engine';
import { earthMarsDistanceKm, lightDelaySeconds, marsDelayMinutes, MOON_KM } from './orbit';
import { addResult, parseRecords } from './records';
import type { Records } from './records';
import TeacherGuide from './TeacherGuide';
import SunPanel from './SunPanel';
import BaseScene from './BaseScene';
import { fetchSunNow } from './spaceweather';
import type { SunNow } from './spaceweather';
import { awardBadges, awardManual, BADGES, parseBadges } from './badges';
import { buildQuiz } from './quiz';
import { playSound } from './sound';
import type { SoundKind } from './sound';
import { DATA_SOURCES, GLOSSARY, REAL_STORMS, SITE_INFO } from './data';
import type { Effects, Lang, Site, SolarStorm, T } from './data';

const SAVE_KEY = 'astrobase_cadet_game_v1';
const LANG_KEY = 'astrobase_cadet_lang';
const LIVE_KEY = 'astrobase_cadet_live_storm_v1';
const TUTORIAL_KEY = 'astrobase_cadet_tutorial_done';
const NAME_KEY = 'astrobase_cadet_name';
const RECORDS_KEY = 'astrobase_cadet_records_v1';
const SOUND_KEY = 'astrobase_cadet_sound';
const LEVEL_KEY = 'astrobase_cadet_level';
const BADGES_KEY = 'astrobase_cadet_badges_v1';
const COMM_CARDS = ['air_alarm', 'call_home'];

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
    const s: unknown = JSON.parse(raw);
    return isValidSave(s) ? s : null;
  } catch { return null; }
}

/** Resultado de DONKI ya consultado en esta sesión del navegador (para no gastar la cuota de la API). */
function readCachedLive(): { status: LiveStatus; storm?: SolarStorm } | null {
  try {
    const cached = sessionStorage.getItem(LIVE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as SolarStorm | null;
    // Solo se guardan los éxitos: un fallo pasajero se vuelve a intentar al recargar.
    return parsed ? { status: 'ok', storm: parsed } : null;
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
  liveSwpc: { es: 'EN VIVO · NOAA/GOES', en: 'LIVE · NOAA/GOES' },
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
    es: 'Conectado a NASA DONKI: tu primera tormenta será la llamarada REAL más fuerte del último mes ({c}, {d}).',
    en: 'Connected to NASA DONKI: your first storm will be the strongest REAL flare of the last month ({c}, {d}).',
  },
  liveOkSwpc: {
    es: 'DONKI no respondió, pero los satélites GOES (NOAA) sí: tu primera tormenta será la llamarada REAL más fuerte de esta semana ({c}, {d}).',
    en: 'DONKI did not answer, but the GOES satellites (NOAA) did: your first storm will be this week\'s strongest REAL flare ({c}, {d}).',
  },
  liveFail: {
    es: 'Sin conexión con DONKI ni con NOAA ahora: usaremos 6 llamaradas reales guardadas (2017 y 2024).',
    en: 'No connection to DONKI or NOAA right now: we will use 6 real stored flares (2017 and 2024).',
  },
  liveTag: { es: 'en vivo', en: 'live' },
  storedTag: { es: 'guardado', en: 'stored' },
  why: { es: 'Para qué se usa', en: 'What it\'s for' },
  sourceLabel: { es: 'Fuente', en: 'Source' },
  newStorm: { es: 'Se acerca una tormenta solar', en: 'A solar storm is coming' },
  dose: { es: 'Dosis de hoy', en: 'Dose today' },
  xr: { es: 'radiografías', en: 'X-rays' },
  howTo: { es: 'Cómo jugar', en: 'How to play' },
  tipNext: { es: 'Siguiente', en: 'Next' },
  tipDone: { es: '¡Entendido!', en: 'Got it!' },
  tipSkip: { es: 'Saltar', en: 'Skip' },
  diploma: { es: 'Mi diploma', en: 'My certificate' },
  diplomaTitleWon: { es: 'Diploma de Cadete Espacial', en: 'Space Cadet Certificate' },
  diplomaTitleLost: { es: 'Certificado de Entrenamiento Espacial', en: 'Space Training Certificate' },
  diplomaWon: {
    es: 'completó una misión de 10 días {x} y mantuvo a salvo a 4 astronautas.',
    en: 'completed a 10-day mission {x} and kept 4 astronauts safe.',
  },
  diplomaLost: {
    es: 'entrenó {n} días {x} y aprendió a cuidar el aire, la energía y el escudo.',
    en: 'trained for {n} days {x} and learned to manage air, energy and shielding.',
  },
  yourName: { es: 'Tu nombre (opcional, solo se guarda en este equipo)', en: 'Your name (optional, only saved on this device)' },
  namePlaceholder: { es: 'Cadete', en: 'Cadet' },
  print: { es: 'Imprimir', en: 'Print' },
  back: { es: 'Volver', en: 'Back' },
  signalTitle: { es: 'Prueba: envía un mensaje a la Tierra', en: 'Try it: send a message to Earth' },
  signalSend: { es: '📡 Enviar mensaje', en: '📡 Send message' },
  signalGoing: { es: 'El mensaje viaja a la velocidad de la luz…', en: 'The message travels at the speed of light…' },
  signalBack: { es: 'La Tierra responde…', en: 'Earth is answering…' },
  signalDone: { es: '¡Respuesta recibida! Ida y vuelta: {t}.', en: 'Answer received! Round trip: {t}.' },
  signalFast: { es: 'Acelerado: aquí 1 segundo = 1 minuto real', en: 'Sped up: here 1 second = 1 real minute' },
  signalReal: { es: 'Tiempo real', en: 'Real time' },
  marsToday: {
    es: 'Hoy Marte está a unos {km} millones de km: un mensaje tarda ~{m} min (cálculo con las órbitas de JPL, no es dato en vivo).',
    en: 'Today Mars is about {km} million km away: a message takes ~{m} min (calculated from JPL orbits, not live data).',
  },
  today: { es: 'hoy', en: 'today' },
  records: { es: 'Tus récords en este equipo', en: 'Your records on this device' },
  plays: { es: 'Partidas', en: 'Games' },
  wins: { es: 'Victorias', en: 'Wins' },
  bestMedal: { es: 'Mejor medalla', en: 'Best medal' },
  bestStars: { es: 'Más descubrimientos', en: 'Most discoveries' },
  lowestDose: { es: 'Menor radiación (ganando)', en: 'Lowest radiation (winning)' },
  teachers: { es: 'Guía para maestros y familias', en: 'Guide for teachers and families' },
  soundOn: { es: 'Silenciar sonidos', en: 'Mute sounds' },
  pickLevel: { es: '¿Qué nivel quieres?', en: 'Which level do you want?' },
  easy: { es: 'Fácil', en: 'Easy' },
  easyAge: { es: '7 a 9 años · con ayuda de Control de Misión', en: 'Ages 7–9 · with help from Mission Control' },
  normal: { es: 'Normal', en: 'Normal' },
  normalAge: { es: '10 a 12 años · decides tú solo', en: 'Ages 10–12 · you decide on your own' },
  askHint: { es: '🎧 Pedir ayuda a Control de Misión', en: '🎧 Ask Mission Control for help' },
  hintPick: { es: '🎧 Control de Misión: te recomendamos la opción {x}.', en: '🎧 Mission Control: we recommend option {x}.' },
  hintStorm: { es: 'Viene una tormenta: protege a tu equipo.', en: 'A storm is coming: protect your crew.' },
  hintPlan: { es: 'Así todavía tendrás aire y energía para los próximos días.', en: 'That way you\'ll still have air and energy for the next days.' },
  hintHard: {
    es: '🎧 Control de Misión: la misión está muy difícil. ¡Elige lo que creas mejor y aprende para la próxima!',
    en: '🎧 Mission Control: the mission is very hard now. Choose what you think is best and learn for next time!',
  },
  recommended: { es: 'Recomendada', en: 'Recommended' },
  badges: { es: 'Tus insignias', en: 'Your badges' },
  routine: {
    es: 'Cada día, pase lo que pase: 🫁 {a} de aire · ⚡ {e} de energía (paneles +{s}, máquinas −{m})',
    en: 'Every day, no matter what: 🫁 {a} air · ⚡ {e} energy (panels +{s}, machines −{m})',
  },
  newBadge: { es: '¡Nueva!', en: 'New!' },
  share: { es: 'Compartir mi resultado', en: 'Share my result' },
  quizTitle: { es: 'Bitácora del cadete: ¿qué aprendiste?', en: 'Cadet log: what did you learn?' },
  quizRight: { es: '✅ ¡Correcto!', en: '✅ Correct!' },
  quizWrong: { es: '❌ La respuesta era: {a}', en: '❌ The answer was: {a}' },
  quizScore: { es: 'Acertaste {n} de {t}.', en: 'You got {n} out of {t}.' },
  quizPerfect: { es: '¡Perfecto! Eres Sabelotodo espacial. 🧠', en: 'Perfect! You are a Space know-it-all. 🧠' },
  copied: { es: '¡Copiado! Pégalo donde quieras.', en: 'Copied! Paste it anywhere.' },
  shareWon: {
    es: '¡Completé una misión de 10 días {x} en ASTROBASE CADET! {m} · Descubrimientos: {s} · Radiación: {d} mSv. ¿Puedes superarlo?',
    en: 'I completed a 10-day mission {x} in ASTROBASE CADET! {m} · Discoveries: {s} · Radiation: {d} mSv. Can you beat it?',
  },
  shareLost: {
    es: 'Entrené {n} días {x} en ASTROBASE CADET y aprendí a protegerme de las tormentas solares. ¿Lo intentas?',
    en: 'I trained for {n} days {x} in ASTROBASE CADET and learned to protect myself from solar storms. Want to try?',
  },
  soundOff: { es: 'Activar sonidos', en: 'Turn sounds on' },
  diplomaData: {
    es: "Datos reales de NASA: DONKI (tormentas solares), Curiosity RAD y Chang'e 4 (radiación), OSDR y DSN.",
    en: "Real NASA data: DONKI (solar storms), Curiosity RAD and Chang'e 4 (radiation), OSDR and DSN.",
  },
};

const TIPS: T[] = [
  {
    es: '👋 Estas 4 barras son tu base. Si el aire o la salud llegan a 0, la misión termina. Toca una barra para saber qué significa.',
    en: '👋 These 4 bars are your base. If air or health reaches 0, the mission ends. Tap a bar to learn what it means.',
  },
  {
    es: '☀️ En el calendario, los días con sol traen una tormenta solar real. Guarda energía para subir el escudo ese día.',
    en: '☀️ On the calendar, days with a sun bring a real solar storm. Save energy to raise the shield on those days.',
  },
  {
    es: '🅰️🅱️ Cada opción muestra lo que cuesta: verde suma y rojo resta. Ninguna es gratis. ¡Elige con cuidado!',
    en: '🅰️🅱️ Each option shows what it costs: green adds and red takes away. None is free. Choose carefully!',
  },
];

/** "en la Luna" / "en Marte" / "on the Moon" / "on Mars". */
const SITE_IN: Record<Site, T> = {
  moon: { es: 'en la Luna', en: 'on the Moon' },
  mars: { es: 'en Marte', en: 'on Mars' },
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
      aria-label={`${label}: ${value} / 100${low ? ' ⚠️' : ''}`}
      className={`text-left rounded-2xl border p-2.5 sm:p-3 bg-slate-900/80 transition-colors ${low ? 'border-red-500/70 cadet-glow-red' : 'border-slate-700/70 hover:border-slate-500'}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold text-sm sm:text-base text-slate-100 truncate">
          <span aria-hidden className="mr-1">{icon}</span>{label}
          <span className="ml-1 text-[10px] text-slate-400 align-top">ⓘ</span>
        </span>
        <span className={`font-black text-base sm:text-lg tabular-nums ${low ? 'text-red-400' : 'text-slate-100'}`}>{value}</span>
      </div>
      <div className="mt-1.5 h-3 rounded-full bg-slate-800 overflow-hidden">
        <div aria-hidden className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
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

function SignalRace({ site, lang, marsMin, sfx }: { site: Site; lang: Lang; marsMin: number; sfx: (k: SoundKind) => void }) {
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

function RecordsTable({ records, lang }: { records: Records; lang: Lang }) {
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
  const [tip, setTip] = useState<number | null>(() => (safeGet(TUTORIAL_KEY) ? null : 0));
  const [level, setLevel] = useState<Level>(() => (safeGet(LEVEL_KEY) === 'easy' ? 'easy' : 'normal'));
  const [hintDay, setHintDay] = useState<number | null>(null);
  const [showDiploma, setShowDiploma] = useState(false);
  const [diplomaTime, setDiplomaTime] = useState(0);
  const [records, setRecords] = useState<Records>(() => parseRecords(safeGet(RECORDS_KEY)));
  const [badges, setBadges] = useState<string[]>(() => parseBadges(safeGet(BADGES_KEY)));
  const [freshBadges, setFreshBadges] = useState<string[]>([]);
  const [sun, setSun] = useState<SunNow | undefined>(undefined);
  const [shareMsg, setShareMsg] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [teacherPage, setTeacherPage] = useState(false);
  const [marsNow] = useState(() => {
    const t = Date.now();
    return { km: Math.round(earthMarsDistanceKm(t) / 1e6), min: marsDelayMinutes(t) };
  });
  const [cadetName, setCadetName] = useState(() => safeGet(NAME_KEY) ?? '');

  const [cachedLive] = useState(readCachedLive);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(cachedLive ? cachedLive.status : 'loading');
  const [liveStorm, setLiveStorm] = useState<SolarStorm | undefined>(cachedLive?.storm);
  const [liveAttempt, setLiveAttempt] = useState(0);

  useEffect(() => {
    safeSet(LANG_KEY, lang);
    document.documentElement.lang = lang; // lectores de pantalla y traductores usan el idioma correcto
  }, [lang]);

  // Al cambiar de pantalla, callar la lectura en voz alta de la pantalla anterior.
  const screenKey = `${game?.day ?? 0}-${game?.status ?? 'none'}-${showReport}`;
  useEffect(() => {
    try { window.speechSynthesis?.cancel(); } catch { /* sin voz */ }
  }, [screenKey]);

  // Evita que un doble toque en "Siguiente día" elija sin querer la opción que aparece
  // justo debajo del dedo: las opciones ignoran toques durante 450 ms.
  const cardShownAt = useRef(0);

  // Rayos X del Sol de las últimas 24 h (NOAA GOES). Si falla, el panel no se muestra.
  useEffect(() => {
    let cancelled = false;
    fetchSunNow().then(s => { if (!cancelled) setSun(s); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { safeSet(SAVE_KEY, game ? JSON.stringify(game) : null); }, [game]);
  useEffect(() => { safeSet(NAME_KEY, cadetName.trim() ? cadetName.slice(0, 40) : null); }, [cadetName]);

  const endTips = () => { setTip(null); safeSet(TUTORIAL_KEY, '1'); };

  const [soundOn, setSoundOn] = useState(() => safeGet(SOUND_KEY) !== '0');
  useEffect(() => { safeSet(SOUND_KEY, soundOn ? null : '0'); }, [soundOn]);
  const sfx = useCallback((k: SoundKind) => { if (soundOn) playSound(k); }, [soundOn]);

  // Llamarada en vivo desde NASA DONKI (una vez por sesión del navegador).
  useEffect(() => {
    if (cachedLive) return;
    let cancelled = false;
    fetchLiveStorm().then(storm => {
      if (cancelled) return;
      setLiveStorm(storm);
      setLiveStatus(storm ? 'ok' : 'fail');
      if (storm) {
        try { sessionStorage.setItem(LIVE_KEY, JSON.stringify(storm)); } catch { /* ignorar */ }
      }
    });
    return () => { cancelled = true; };
  }, [cachedLive, liveAttempt]);

  const startGame = (where: Site) => {
    setSite(where);
    setShowReport(false);
    setShowDiploma(false);
    setFreshBadges([]);
    setShareMsg('');
    setQuizAnswers({});
    safeSet(LEVEL_KEY, level);
    setHintDay(null);
    setGame(createGame(where, Math.floor(Math.random() * 2 ** 31), liveStatus === 'ok' ? liveStorm : undefined, level));
  };

  const card = useMemo(() => (game && game.status === 'playing' ? currentCard(game) : null), [game]);
  const hints = !!game && LEVELS[game.level ?? 'normal'].hints;
  const quiz = useMemo(() => (game && game.status !== 'playing' ? buildQuiz(game) : []), [game]);

  const answerQuiz = (qi: number, oi: number) => {
    if (quizAnswers[qi] !== undefined) return;
    const next = { ...quizAnswers, [qi]: oi };
    setQuizAnswers(next);
    sfx(oi === quiz[qi].answer ? 'good' : 'bad');
    const done = quiz.every((_, i) => next[i] !== undefined);
    if (done && quiz.every((q, i) => next[i] === q.answer)) {
      const award = awardManual(badges, 'quiz_master');
      if (award.fresh.length) {
        setBadges(award.all);
        setFreshBadges(f => [...f, ...award.fresh]);
        safeSet(BADGES_KEY, JSON.stringify(award.all));
        sfx('win');
      }
    }
  };
  const advice = useMemo(() => (game && hints && hintDay === game.day ? hint(game) : undefined), [game, hints, hintDay]);

  const pick = (i: 0 | 1, at: number) => {
    if (!game) return;
    if (at - cardShownAt.current < 450) return;
    const next = choose(game, i);
    if (next.status !== 'playing') {
      const updated = addResult(records, next);
      setRecords(updated);
      safeSet(RECORDS_KEY, JSON.stringify(updated));
      const award = awardBadges(badges, next, updated);
      setBadges(award.all);
      setFreshBadges(award.fresh);
      safeSet(BADGES_KEY, JSON.stringify(award.all));
    }
    if (next.status === 'won') sfx('win');
    else if (next.status === 'lost') sfx('lose');
    else {
      const lines = next.lastReport?.lines ?? [];
      const bad = lines.filter(l => l.tone === 'bad').length;
      const good = lines.filter(l => l.tone === 'good').length;
      sfx(bad > good ? 'bad' : 'good');
    }
    setGame(next);
    setShowReport(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Teclado: A / 1 elige la opción A y B / 2 la opción B en la tarjeta del día.
  const cardOpen = !!card && !showReport && !modal && !teacherPage;
  useEffect(() => {
    if (!cardOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === 'a' || k === '1') pick(0, e.timeStamp);
      else if (k === 'b' || k === '2') pick(1, e.timeStamp);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
        {game && game.status === 'playing' && (
          <button type="button" onClick={() => { setShowReport(false); setTip(0); }} className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700">
            ❓ {tr(UI.howTo)}
          </button>
        )}
        <button
          type="button"
          onClick={() => { setSoundOn(!soundOn); if (!soundOn) playSound('tap'); }}
          aria-pressed={soundOn}
          aria-label={soundOn ? tr(UI.soundOn) : tr(UI.soundOff)}
          title={soundOn ? tr(UI.soundOn) : tr(UI.soundOff)}
          className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
        <button type="button" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700" aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}>
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
      {liveStatus === 'ok' && liveStorm && <>☀️ {fill(tr(liveStorm.liveSource === 'swpc' ? UI.liveOkSwpc : UI.liveOk), { c: liveStorm.classType, d: liveStorm.date })}</>}
      {liveStatus === 'fail' && (
        <>
          💾 {tr(UI.liveFail)}{' '}
          <button
            type="button"
            onClick={() => { setLiveStatus('loading'); setLiveAttempt(n => n + 1); }}
            className="ml-1 px-2 py-0.5 rounded-lg text-xs font-black bg-slate-700 text-slate-100 hover:bg-slate-600"
          >
            🔄 {lang === 'es' ? 'Reintentar' : 'Retry'}
          </button>
        </>
      )}
    </p>
  );

  // ── Modales ──
  let modalNode: React.ReactNode = null;
  if (modal === 'sources') {
    modalNode = (
      <Modal title={tr(UI.sources)} onClose={() => setModal(null)} closeLabel={tr(UI.close)}>
        <div className="space-y-3">
          {liveBanner}
          {sun && <SunPanel sun={sun} lang={lang} />}
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
          <div className="rounded-2xl border border-slate-700 p-3 bg-slate-950/60">
            <p className="text-sm text-slate-200">🔴 {fill(tr(UI.marsToday), { km: marsNow.km, m: marsNow.min })}</p>
            <a href="https://ssd.jpl.nasa.gov/planets/approx_pos.html" target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline decoration-dotted">{tr(UI.sourceLabel)}: NASA/JPL — Approximate Positions of the Planets</a>
          </div>
          <button type="button" onClick={() => { setModal(null); setTeacherPage(true); }} className="w-full py-2.5 rounded-2xl text-sm font-bold bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700">
            👩‍🏫 {tr(UI.teachers)}
          </button>
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
    <div lang={lang} className="cadet-root min-h-screen bg-[#060913] text-slate-100 px-4 py-4 sm:py-6" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <main className="max-w-2xl mx-auto space-y-4">
        {header}
        {children}
      </main>
      {modalNode}
    </div>
  );

  // ── Guía para maestros ──
  if (teacherPage) {
    return shell(
      <TeacherGuide
        lang={lang}
        marsKm={marsNow.km}
        onBack={() => setTeacherPage(false)}
        labels={{ title: tr(UI.teachers), print: tr(UI.print), back: tr(UI.back) }}
      />,
    );
  }

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
        {site === 'mars' && (
          <p className="text-sm text-slate-300 rounded-2xl px-3 py-2 border border-orange-500/30 bg-orange-500/10">
            🔴 {fill(tr(UI.marsToday), { km: marsNow.km, m: marsNow.min })}
          </p>
        )}
        <h2 className="text-xl font-black text-white">{tr(UI.pickLevel)}</h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={tr(UI.pickLevel)}>
          {(['easy', 'normal'] as Level[]).map(l => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              onClick={() => setLevel(l)}
              className={`rounded-3xl p-3 border-2 text-left transition-all ${level === l ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/70 hover:border-slate-500'}`}
            >
              <div className="text-lg font-black">{l === 'easy' ? '🌱' : '🚀'} {tr(l === 'easy' ? UI.easy : UI.normal)}</div>
              <div className="text-xs text-slate-400 mt-0.5">{tr(l === 'easy' ? UI.easyAge : UI.normalAge)}</div>
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
        <button type="button" onClick={() => setTeacherPage(true)} className="w-full py-2.5 rounded-2xl text-sm font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white">
          👩‍🏫 {tr(UI.teachers)}
        </button>
        {sun && <SunPanel sun={sun} lang={lang} />}
      </section>,
    );
  }

  // ── Barras y calendario (siempre visibles durante la partida) ──
  const stormToday = game.status === 'playing' && !showReport && game.deck[game.day - 1]?.kind === 'storm';
  const stats = (
    <section className="space-y-2.5">
      <BaseScene site={game.site} air={game.air} energy={game.energy} shield={game.shield} health={game.health} storm={stormToday} lang={lang} />
      <div className="flex items-center justify-between gap-2">
        <span className="font-black text-white">
          {game.site === 'moon' ? '🌕' : '🔴'} {tr(UI.day)} {Math.min(game.day, game.totalDays)} {tr(UI.of)} {game.totalDays}
          <span className="ml-2 align-middle text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300">
            {(game.level ?? 'normal') === 'easy' ? `🌱 ${tr(UI.easy)}` : `🚀 ${tr(UI.normal)}`}
          </span>
        </span>
        <span className="font-black text-amber-300">⭐ {game.stars} <span className="text-xs text-slate-400 font-bold">{tr(UI.discoveries)}</span></span>
      </div>
      <div className="flex gap-1" role="list" aria-label={`${tr(UI.day)} 1–${game.totalDays}. ☀️ = ${tr(UI.stormDay)}`}>
        {Array.from({ length: game.totalDays }, (_, i) => {
          const d = i + 1;
          const storm = STORM_DAYS.includes(d);
          const done = d < game.day || (d === game.day && game.status !== 'playing');
          const now = d === game.day && game.status === 'playing';
          return (
            <div
              key={d}
              role="listitem"
              title={storm ? tr(UI.stormDay) : `${tr(UI.day)} ${d}`}
              aria-label={`${tr(UI.day)} ${d}${storm ? ` · ${tr(UI.stormDay)}` : ''}`}
              aria-current={now ? 'step' : undefined}
              className={`flex-1 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${now ? 'border-white bg-white/15' : done ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-700 bg-slate-900'}`}
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
      {game.status === 'playing' && (() => {
        const r = dailyRoutine(game);
        const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
        return <p className="text-xs text-slate-400">🔁 {fill(tr(UI.routine), { a: sign(r.air), e: sign(r.energy), s: r.solar, m: r.machines })}</p>;
      })()}
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
        <section aria-live="polite" className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5 space-y-3">
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
                {r.storm?.live ? tr(r.storm.liveSource === 'swpc' ? UI.liveSwpc : UI.live) : tr(UI.stored)}
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-100">{tr(r.fact)}</p>
            <a href={r.source.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline decoration-dotted mt-1 inline-block">{tr(UI.sourceLabel)}: {r.source.name}</a>
          </div>
          <button
            type="button"
            onClick={e => {
              cardShownAt.current = e.timeStamp;
              setShowReport(false);
              if (game.status === 'playing' && currentCard(game).storm) sfx('storm');
              else sfx('tap');
            }}
            className="w-full py-3.5 rounded-2xl text-lg font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110"
          >
            {ended ? tr(UI.finish) : `${tr(UI.next)} →`}
          </button>
        </section>
      </>,
    );
  }

  // ── Diploma imprimible ──
  if (game.status !== 'playing' && showDiploma) {
    const won = game.status === 'won';
    const m = medal(game);
    const where = `${tr(SITE_IN[game.site])} (${tr(SITE_INFO[game.site].place)})`;
    const today = new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(diplomaTime);
    return shell(
      <section className="space-y-3">
        <label className="block text-sm text-slate-300">
          {tr(UI.yourName)}
          <input
            type="text"
            value={cadetName}
            maxLength={40}
            autoComplete="off"
            onChange={e => setCadetName(e.target.value)}
            placeholder={tr(UI.namePlaceholder)}
            className="mt-1 w-full rounded-2xl bg-slate-900 border border-slate-600 px-3 py-2.5 text-lg text-white"
          />
        </label>
        <div id="cadet-diploma" className="cadet-print rounded-3xl border-4 border-double border-cyan-500/70 bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 text-center space-y-3">
          <p className="text-xs font-black tracking-[0.3em] uppercase text-cyan-400">🚀 ASTROBASE CADET</p>
          <h2 className="text-2xl sm:text-3xl font-black">{won ? tr(UI.diplomaTitleWon) : tr(UI.diplomaTitleLost)}</h2>
          <p className="text-3xl sm:text-4xl font-black text-amber-300 break-words" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            {cadetName.trim() || tr(UI.namePlaceholder)}
          </p>
          <p className="text-base sm:text-lg">
            {won
              ? fill(tr(UI.diplomaWon), { x: where })
              : fill(tr(UI.diplomaLost), { n: game.history.length, x: where })}
          </p>
          {won && <p className="text-4xl" aria-label={`${m} / 3`}>{'⭐'.repeat(m)}<span className="opacity-25">{'⭐'.repeat(3 - m)}</span></p>}
          <p className="text-sm">⭐ {tr(UI.discoveries)}: {game.stars} · ☢️ {game.doseMSv.toFixed(2)} mSv</p>
          <p className="text-xs opacity-70">{tr(UI.diplomaData)}</p>
          <p className="text-xs opacity-70">{today} · Troncos Intergalácticos · NASA Space Apps Challenge</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => window.print()} className="py-3.5 rounded-2xl text-lg font-black bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 hover:brightness-110">
            🖨️ {tr(UI.print)}
          </button>
          <button type="button" onClick={() => setShowDiploma(false)} className="py-3.5 rounded-2xl text-lg font-black bg-slate-800 border border-slate-600 text-white hover:bg-slate-700">
            ← {tr(UI.back)}
          </button>
        </div>
      </section>,
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
          {quiz.length > 0 && (
            <div className="rounded-2xl bg-indigo-950/40 border border-indigo-500/40 p-3 text-left space-y-3">
              <h3 className="font-black text-white">🧠 {tr(UI.quizTitle)}</h3>
              {quiz.map((q, qi) => {
                const picked = quizAnswers[qi];
                return (
                  <fieldset key={qi} className="space-y-1.5">
                    <legend className="text-sm font-bold text-slate-100 mb-1">{qi + 1}. {tr(q.q)}</legend>
                    <div className="grid gap-1.5">
                      {q.options.map((o, oi) => {
                        const state = picked === undefined ? 'idle' : oi === q.answer ? 'right' : oi === picked ? 'wrong' : 'off';
                        return (
                          <button
                            key={oi}
                            type="button"
                            disabled={picked !== undefined}
                            aria-pressed={picked === oi}
                            onClick={() => answerQuiz(qi, oi)}
                            className={`text-left text-sm rounded-xl px-3 py-2 border transition-colors ${
                              state === 'right' ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100'
                                : state === 'wrong' ? 'border-rose-400 bg-rose-500/15 text-rose-100'
                                  : state === 'off' ? 'border-slate-800 text-slate-400'
                                    : 'border-slate-600 bg-slate-900 text-slate-100 hover:border-cyan-400'
                            }`}
                          >
                            {tr(o)}
                          </button>
                        );
                      })}
                    </div>
                    {picked !== undefined && (
                      <p role="status" className={`text-xs font-bold ${picked === q.answer ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {picked === q.answer ? tr(UI.quizRight) : fill(tr(UI.quizWrong), { a: tr(q.options[q.answer]) })}
                      </p>
                    )}
                  </fieldset>
                );
              })}
              {quiz.every((_, i) => quizAnswers[i] !== undefined) && (
                <p className="text-sm font-black text-white">
                  {fill(tr(UI.quizScore), { n: quiz.filter((q, i) => quizAnswers[i] === q.answer).length, t: quiz.length })}
                  {quiz.every((q, i) => quizAnswers[i] === q.answer) && <span className="block text-amber-300">{tr(UI.quizPerfect)}</span>}
                </p>
              )}
            </div>
          )}
          <RecordsTable records={records} lang={lang} />
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3 text-left">
            <h3 className="font-black text-white mb-2">🏅 {tr(UI.badges)} <span className="text-slate-400 text-sm">{badges.length}/{BADGES.length}</span></h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BADGES.map(b => {
                const has = badges.includes(b.id);
                const fresh = freshBadges.includes(b.id);
                return (
                  <li
                    key={b.id}
                    className={`rounded-xl p-2 border text-center ${fresh ? 'border-amber-400 bg-amber-500/15 cadet-glow-amber' : has ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/60'}`}
                  >
                    <div className={`text-2xl ${has ? '' : 'grayscale opacity-30'}`} aria-hidden>{b.icon}</div>
                    <div className={`text-xs font-black ${has ? 'text-white' : 'text-slate-400'}`}>
                      {tr(b.name)}{fresh && <span className="ml-1 text-amber-300">{tr(UI.newBadge)}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">{has ? '✅' : '🔒'} {tr(b.how)}</div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="text-left">
            <h3 className="font-black text-white mb-1.5">{tr(UI.learned)}</h3>
            <ol className="space-y-1">
              {game.history.map(h => (
                <li key={h.day} className="text-sm text-slate-300"><b className="text-slate-100">{tr(UI.day)} {h.day}:</b> {tr(h.title)} → {tr(h.choice)}</li>
              ))}
            </ol>
          </div>
          <button type="button" onClick={() => { setDiplomaTime(Date.now()); setShowDiploma(true); }} className="w-full py-3.5 rounded-2xl text-lg font-black bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 hover:brightness-110">
            📜 {tr(UI.diploma)}
          </button>
          <button
            type="button"
            onClick={async () => {
              // Sin nombre ni datos personales: solo el resultado de la misión y el enlace.
              const where = tr(SITE_IN[game.site]);
              const text = won
                ? fill(tr(UI.shareWon), { x: where, m: '⭐'.repeat(m) || '—', s: game.stars, d: game.doseMSv.toFixed(2) })
                : fill(tr(UI.shareLost), { n: game.history.length, x: where });
              const url = `${window.location.origin}${window.location.pathname}`;
              try {
                if (navigator.share) { await navigator.share({ title: 'ASTROBASE CADET', text, url }); return; }
                await navigator.clipboard.writeText(`${text} ${url}`);
                setShareMsg(tr(UI.copied));
              } catch { /* el niño canceló o el navegador no deja: no pasa nada */ }
            }}
            className="w-full py-3 rounded-2xl text-base font-black bg-slate-800 border border-slate-600 text-white hover:bg-slate-700"
          >
            📣 {tr(UI.share)}
          </button>
          {shareMsg && <p role="status" className="text-sm text-emerald-300">{shareMsg}</p>}
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
  const tipBox = tip !== null && (
    <div role="status" className="rounded-2xl border-2 border-emerald-400/70 bg-emerald-500/10 p-3 space-y-2">
      <p className="text-base text-emerald-50">{tr(TIPS[tip])}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-emerald-300">{tip + 1} / {TIPS.length}</span>
        <div className="flex gap-2">
          <button type="button" onClick={endTips} className="px-3 py-1.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white">{tr(UI.tipSkip)}</button>
          <button
            type="button"
            autoFocus
            onClick={() => (tip + 1 < TIPS.length ? setTip(tip + 1) : endTips())}
            className="px-3 py-1.5 rounded-xl text-sm font-black bg-emerald-400 text-slate-950 hover:brightness-110"
          >
            {tip + 1 < TIPS.length ? `${tr(UI.tipNext)} →` : tr(UI.tipDone)}
          </button>
        </div>
      </div>
    </div>
  );
  return shell(
    <>
      {tipBox}
      {stats}
      <section className={`rounded-3xl border-2 p-4 sm:p-5 space-y-3 ${c.storm ? 'border-amber-400/70 bg-gradient-to-b from-amber-500/15 to-slate-900/80' : 'border-cyan-500/40 bg-slate-900/80'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-4xl leading-none" aria-hidden>{c.icon}</span>
            <div className="min-w-0">
              {c.storm && (
                <span className={`inline-block mb-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${c.storm.live ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-200'}`}>
                  {c.storm.live ? tr(c.storm.liveSource === 'swpc' ? UI.liveSwpc : UI.live) : `${tr(UI.stored)} · DONKI ${c.storm.date}`}
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
        {COMM_CARDS.includes(c.id) && <SignalRace key={`${game.day}-${game.site}`} site={game.site} lang={lang} marsMin={marsNow.min} sfx={sfx} />}
        {hints && !advice && (
          <button type="button" onClick={() => setHintDay(game.day)} className="w-full py-2.5 rounded-2xl text-sm font-black bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/25">
            {tr(UI.askHint)}
          </button>
        )}
        {advice && (
          <p role="status" className="rounded-2xl px-3 py-2.5 text-sm sm:text-base border border-emerald-400/60 bg-emerald-500/10 text-emerald-50">
            {advice.canWin
              ? <>{fill(tr(UI.hintPick), { x: advice.option === 0 ? 'A' : 'B' })} {tr(c.storm ? UI.hintStorm : UI.hintPlan)}</>
              : tr(UI.hintHard)}
          </p>
        )}
        <p className="text-sm font-bold text-slate-400">{tr(UI.choose)}:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {c.options.map((o, i) => {
            const idx = i as 0 | 1;
            const factor = energyFactor(game.energy, o.effects);
            const hit = previewStormDamage(game, idx);
            const rec = advice?.canWin && advice.option === idx;
            return (
              <button
                key={i}
                type="button"
                onClick={e => pick(idx, e.timeStamp)}
                aria-keyshortcuts={idx === 0 ? 'A' : 'B'}
                className={`text-left rounded-2xl p-4 border-2 bg-slate-950/70 hover:border-cyan-400 hover:bg-slate-900 active:scale-[0.99] transition-all ${rec ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-slate-600'}`}
              >
                {rec && <div className="mb-1 inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-400 text-slate-950">🎧 {tr(UI.recommended)}</div>}
                <div className="text-lg font-black text-white">
                  {i === 0 ? '🅰️' : '🅱️'} {tr(o.label)}
                  <kbd className="hidden sm:inline ml-2 align-middle text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-600 text-slate-400">{i === 0 ? 'A' : 'B'}</kbd>
                </div>
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
