// ─────────────────────────────────────────────────────────────────────────────
// MODO CADETE (7–12 años) — Una decisión por día, tres barras, datos reales.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  choose,
  createGame,
  currentCard,
  energyFactor,
  bestWhatIf,
  dailyRoutine,
  hint,
  LEVELS,
  fetchLiveStorm,
  medal,
  previewStormDamage,
  SHIELD_UP,
  STORM_DAYS,
  xrays,
} from './engine';
import type { CadetState, Level } from './engine';
import { earthMarsDistanceKm, marsDelayMinutes } from './orbit';
import { addResult, parseRecords } from './records';
import type { Records } from './records';
import TeacherGuide from './TeacherGuide';
import PaperMission from './PaperMission';
import CompareSites from './CompareSites';
import SunPanel from './SunPanel';
import DoseChart from './DoseChart';
import LaunchOverlay from './LaunchOverlay';
import BaseScene from './BaseScene';
import { fetchSunNow } from './spaceweather';
import type { SunNow } from './spaceweather';
import { awardBadges, awardManual, BADGES, parseBadges } from './badges';
import { buildQuiz } from './quiz';
import { formatMissionCode, MAX_SEED, MIN_SEED, parseMissionCode, randomSeed } from './missionCode';
import type { MissionCode } from './missionCode';
import { playSound } from './sound';
import type { SoundKind } from './sound';
import { DATA_SOURCES, GLOSSARY, REAL_STORMS, SITE_INFO } from './data';
import type { Lang, Site, SolarStorm, T } from './data';
import { AUTOREAD_KEY, THEME_KEY, BADGES_KEY, CLASS_KEY, LANG_KEY, LEVEL_KEY, LIVE_KEY, loadGame, NAME_KEY, readCachedLive, RECORDS_KEY, safeGet, safeSet, SAVE_KEY, SOUND_KEY, TUTORIAL_KEY } from './storage';
import type { LiveStatus } from './storage';
import { fill, SITE_IN, TIPS, UI } from './strings';
import { Bar, EffectChips, Modal, RecordsTable, RichText, SignalRace } from './widgets';
import { speak } from './speech';


const COMM_CARDS = ['air_alarm', 'call_home'];

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
  const [prevStats, setPrevStats] = useState<{ air: number; energy: number; shield: number; health: number } | null>(null);
  const [codeInput, setCodeInput] = useState(() => {
    try { return (new URLSearchParams(window.location.search).get('mision') ?? '').toUpperCase(); } catch { return ''; }
  });
  const [codeError, setCodeError] = useState(false);
  const [launching, setLaunching] = useState(false);
  const endLaunch = useCallback(() => setLaunching(false), []);
  const [teacherPage, setTeacherPage] = useState(false);
  const [paperPage, setPaperPage] = useState(false);
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
  // Modo clase: letra más grande para proyectar y votación A/B de todo el grupo.
  const [classMode, setClassMode] = useState(() => safeGet(CLASS_KEY) === '1');
  // Lectura automática: para quienes todavía leen despacio (7–8 años).
  const [autoRead, setAutoRead] = useState(() => safeGet(AUTOREAD_KEY) === '1');
  const [light, setLight] = useState(() => safeGet(THEME_KEY) === 'light');
  useEffect(() => { safeSet(THEME_KEY, light ? 'light' : null); }, [light]);
  useEffect(() => { safeSet(AUTOREAD_KEY, autoRead ? '1' : null); }, [autoRead]);
  useEffect(() => {
    safeSet(CLASS_KEY, classMode ? '1' : null);
    document.documentElement.style.fontSize = classMode ? '125%' : '';
    return () => { document.documentElement.style.fontSize = ''; };
  }, [classMode]);
  const [votes, setVotes] = useState<{ day: number; a: number; b: number }>({ day: 0, a: 0, b: 0 });
  const [voteMsg, setVoteMsg] = useState('');
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

  const startGame = (where: Site, code?: MissionCode) => {
    setSite(where);
    setPrevStats(null);
    setCodeError(false);
    setVotes({ day: 0, a: 0, b: 0 }); // los votos de la partida anterior no pasan a la nueva
    setVoteMsg('');
    setShowReport(false);
    setShowDiploma(false);
    setFreshBadges([]);
    setShareMsg('');
    setQuizAnswers({});
    safeSet(LEVEL_KEY, level);
    setHintDay(null);
    if (code) {
      // Misma misión para toda la clase: sin tormenta en vivo (cambiaría según el día).
      setLevel(code.level);
      setGame(createGame(code.site, code.seed, undefined, code.level));
      setLaunching(true);
      return;
    }
    setGame(createGame(where, randomSeed(), liveStatus === 'ok' ? liveStorm : undefined, level));
    setLaunching(true);
  };

  const card = useMemo(() => (game && game.status === 'playing' ? currentCard(game) : null), [game]);
  // Texto que se lee solo cuando la lectura automática está activada.
  const autoText = useMemo(() => {
    if (!game) return '';
    const t = (x: T) => x[lang];
    if (showReport && game.lastReport) {
      const r = game.lastReport;
      return `${t(r.outcome)} ${t(UI.realStory)}: ${t(r.fact)}`;
    }
    if (card) return `${t(card.title).replace(/[.!?¡¿]*$/, '')}. ${t(card.text)} ${card.options.map((o, i) => `${i === 0 ? 'A' : 'B'}: ${t(o.label)}.`).join(' ')}`;
    return '';
  }, [game, showReport, card, lang]);
  useEffect(() => {
    if (autoRead && !launching && autoText) speak(autoText, lang);
  }, [autoText, autoRead, launching, lang]);

  const hints = !!game && LEVELS[game.level ?? 'normal'].hints;
  const quiz = useMemo(() => (game && game.status !== 'playing' ? buildQuiz(game) : []), [game]);
  const whatIf = useMemo(() => (game && game.status !== 'playing' ? bestWhatIf(game) : undefined), [game]);

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
    setVoteMsg(''); // un "¡Empate!" de hoy no debe aparecer en la tarjeta de mañana
    const next = choose(game, i);
    setPrevStats({ air: game.air, energy: game.energy, shield: game.shield, health: game.health });
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
  const cardOpen = !!card && !showReport && !modal && !teacherPage && !paperPage;
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
          onClick={() => setModal('settings')}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          ⚙️ {tr(UI.settings)}
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
  const settingRow = (icon: string, on: boolean, toggle: () => void, labelOn: T, labelOff: T, help: T) => (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
      <div className="min-w-0">
        <p className="font-bold text-slate-100"><span aria-hidden>{icon}</span> {tr(labelOff)}</p>
        <p className="text-xs text-slate-400">{tr(help)}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={tr(labelOff)}
        title={on ? tr(labelOn) : tr(labelOff)}
        onClick={toggle}
        className={`shrink-0 w-14 h-8 rounded-full border-2 relative transition-colors ${on ? 'bg-cyan-400 border-cyan-400' : 'bg-slate-800 border-slate-600'}`}
      >
        <span aria-hidden className={`absolute top-0.5 w-6 h-6 rounded-full bg-slate-100 shadow transition-all ${on ? 'left-6' : 'left-0.5'}`} />
      </button>
    </li>
  );
  if (modal === 'settings') {
    modalNode = (
      <Modal title={`⚙️ ${tr(UI.settings)}`} onClose={() => setModal(null)} closeLabel={tr(UI.close)}>
        <ul className="space-y-2">
          <li className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
            <p className="font-bold text-slate-100">🌐 {tr(UI.language)}</p>
            <div className="flex gap-1.5" role="group" aria-label={tr(UI.language)}>
              {(['es', 'en'] as Lang[]).map(l => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  lang={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-black border ${lang === l ? 'bg-cyan-400 text-slate-950 border-cyan-400' : 'bg-slate-800 border-slate-600 text-slate-200'}`}
                >
                  {l === 'es' ? 'Español' : 'English'}
                </button>
              ))}
            </div>
          </li>
          {settingRow('🔊', soundOn, () => { setSoundOn(!soundOn); if (!soundOn) playSound('tap'); }, UI.soundOn, UI.soundLabel, UI.soundHelp)}
          {settingRow('🗣️', autoRead, () => setAutoRead(!autoRead), UI.autoOn, UI.autoOff, UI.autoHelp)}
          {settingRow('☀️', light, () => setLight(!light), UI.lightOn, UI.lightOff, UI.lightHelp)}
          {settingRow('🏫', classMode, () => setClassMode(!classMode), UI.classOn, UI.classOff, UI.classHelp)}
        </ul>
      </Modal>
    );
  } else if (modal === 'compare') {
    modalNode = (
      <Modal title={`🌕🔴 ${tr(UI.compare)}`} onClose={() => setModal(null)} closeLabel={tr(UI.close)}>
        <CompareSites lang={lang} marsKm={marsNow.km} marsMin={marsNow.min} />
      </Modal>
    );
  } else if (modal === 'sources') {
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
    <div lang={lang} className={`cadet-root${light ? ' cadet-light' : ''} min-h-screen bg-[#060913] text-slate-100 px-4 py-4 sm:py-6`} style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <main className="max-w-2xl mx-auto space-y-4">
        {header}
        {children}
      </main>
      {modalNode}
      {launching && game && <LaunchOverlay site={game.site} lang={lang} onDone={endLaunch} />}
    </div>
  );

  // ── Misión en papel ──
  if (paperPage) {
    return shell(<PaperMission lang={lang} onBack={() => setPaperPage(false)} />);
  }

  // ── Guía para maestros ──
  if (teacherPage) {
    return shell(
      <TeacherGuide
        lang={lang}
        marsKm={marsNow.km}
        onBack={() => setTeacherPage(false)}
        onPaper={() => { setTeacherPage(false); setPaperPage(true); }}
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
        <button type="button" onClick={() => setModal('compare')} className="w-full py-2.5 rounded-2xl text-sm font-bold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white">
          🌕🔴 {tr(UI.compare)}
        </button>
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
        <details className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3" open={!!codeInput}>
          <summary className="cursor-pointer text-sm font-bold text-slate-200">{tr(UI.codeAsk)}</summary>
          <form
            className="mt-2 flex gap-2 flex-wrap"
            onSubmit={e => {
              e.preventDefault();
              const code = parseMissionCode(codeInput);
              if (!code) { setCodeError(true); return; }
              startGame(code.site, code);
            }}
          >
            <input
              type="text"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(false); }}
              placeholder={tr(UI.codePlaceholder)}
              aria-label={tr(UI.codeAsk)}
              aria-invalid={codeError}
              autoComplete="off"
              maxLength={12}
              className="flex-1 min-w-0 rounded-xl bg-slate-950 border border-slate-600 px-3 py-2 text-lg font-black tracking-widest text-white uppercase"
            />
            <button type="submit" className="px-3 py-2 rounded-xl text-sm font-black bg-cyan-400 text-slate-950 hover:brightness-110">{tr(UI.codePlay)}</button>
          </form>
          {codeError && <p role="alert" className="mt-1 text-xs font-bold text-rose-300">{tr(UI.codeBad)}</p>}
          <p className="mt-1 text-[11px] text-slate-400">{tr(UI.codeNoLive)}</p>
        </details>
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
        <Bar icon="🫁" label={tr(UI.air)} value={game.air} delta={showReport && prevStats ? game.air - prevStats.air : undefined} color="bg-cyan-400" term="aire" onTerm={setModal} />
        <Bar icon="⚡" label={tr(UI.energy)} value={game.energy} delta={showReport && prevStats ? game.energy - prevStats.energy : undefined} color="bg-amber-400" term="energia" onTerm={setModal} />
        <Bar icon="🛡️" label={tr(UI.shield)} value={game.shield} delta={showReport && prevStats ? game.shield - prevStats.shield : undefined} color="bg-violet-400" term="escudo" onTerm={setModal} />
        <Bar icon="❤️" label={tr(UI.health)} value={game.health} delta={showReport && prevStats ? game.health - prevStats.health : undefined} color="bg-rose-400" term="radiacion" onTerm={setModal} />
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
            <p className="text-sm sm:text-base text-slate-100"><RichText text={tr(r.fact)} lang={lang} onTerm={setModal} /></p>
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
          <DoseChart game={game} lang={lang} />
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
          {game.seed >= MIN_SEED && game.seed <= MAX_SEED && (
            <div className="rounded-2xl bg-slate-950/70 border border-cyan-500/40 p-3 text-left">
              <p className="text-sm text-slate-300">🎟️ {tr(UI.codeThis)}:</p>
              <p className="text-2xl font-black tracking-widest text-cyan-300 tabular-nums">
                {formatMissionCode({ site: game.site, level: game.level ?? 'normal', seed: game.seed })}
              </p>
              <p className="text-xs text-slate-400 mt-1">{tr(UI.codeShare)}</p>
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
          {(whatIf || (game.status === 'won' && game.history.every(h => h.pick !== undefined))) && (
            <div className="rounded-2xl bg-slate-950/70 border border-violet-500/40 p-3 text-left space-y-1">
              <h3 className="font-black text-white">🔁 {tr(UI.whatIfTitle)}</h3>
              {whatIf ? (
                <p className="text-sm text-slate-200">
                  {fill(tr(UI.whatIfIntro), { d: whatIf.day, t: tr(whatIf.title), a: tr(whatIf.actual), o: tr(whatIf.other) })}{' '}
                  <b className="text-white">
                    {whatIf.otherEnd.status === 'won' && whatIf.actualEnd.status !== 'won'
                      ? fill(tr(UI.whatIfWin), { h: whatIf.otherEnd.health })
                      : whatIf.otherEnd.status === 'won'
                        ? fill(tr(UI.whatIfBetter), { h: whatIf.otherEnd.health, s: whatIf.otherEnd.stars, ha: whatIf.actualEnd.health, sa: whatIf.actualEnd.stars })
                        : fill(tr(UI.whatIfLonger), { d: whatIf.otherEnd.day, da: whatIf.actualEnd.day })}
                  </b>
                </p>
              ) : (
                <p className="text-sm text-emerald-200">{tr(UI.whatIfNone)}</p>
              )}
              <p className="text-[11px] text-slate-400">{tr(UI.whatIfHow)}</p>
            </div>
          )}
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
          <RichText text={tr(c.text)} lang={lang} onTerm={setModal} />
          {c.storm && (
            <>
              {' '}
              <button type="button" onClick={() => setModal('llamarada')} className="underline decoration-dotted text-amber-300">{lang === 'es' ? '¿Qué es una llamarada?' : 'What is a flare?'}</button>
            </>
          )}
        </p>
        {COMM_CARDS.includes(c.id) && <SignalRace key={`${game.seed}-${game.day}-${game.site}`} site={game.site} lang={lang} marsMin={marsNow.min} sfx={sfx} />}
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
        {!c.storm && STORM_DAYS.includes(game.day + 1) && game.day < game.totalDays && (
          <p className="rounded-2xl px-3 py-2 text-sm border border-amber-400/60 bg-amber-500/10 text-amber-100">
            {fill(tr(UI.stormTomorrow), { c: -SHIELD_UP.energy, e: game.energy })}
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
        {classMode && (() => {
          const v = votes.day === game.day ? votes : { day: game.day, a: 0, b: 0 };
          const change = (k: 'a' | 'b', d: number) => { setVoteMsg(''); setVotes({ ...v, [k]: Math.max(0, v[k] + d) }); };
          return (
            <div className="rounded-2xl border-2 border-cyan-500/50 bg-slate-950/70 p-3 space-y-2">
              <p className="font-black text-white">🙋 {tr(UI.votes)}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['a', 'b'] as const).map(k => {
                  const name = k === 'a' ? 'A' : 'B';
                  return (
                    <div key={k} className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 border border-slate-700 px-2 py-1.5">
                      <span className="text-lg font-black text-white">{k === 'a' ? '🅰️' : '🅱️'} <span className="tabular-nums" aria-live="polite">{v[k]}</span></span>
                      <span className="flex gap-1">
                        <button type="button" onClick={() => change(k, -1)} aria-label={fill(tr(UI.voteLess), { x: name })} className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-600 text-white font-black">−</button>
                        <button type="button" onClick={() => change(k, 1)} aria-label={fill(tr(UI.voteFor), { x: name })} className="w-9 h-9 rounded-lg bg-cyan-400 text-slate-950 font-black">+</button>
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={e => {
                  if (v.a + v.b === 0) { setVoteMsg(tr(UI.noVotes)); return; }
                  if (v.a === v.b) { setVoteMsg(tr(UI.tie)); return; }
                  setVoteMsg('');
                  pick(v.a > v.b ? 0 : 1, e.timeStamp);
                }}
                className="w-full py-2.5 rounded-xl text-base font-black bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:brightness-110"
              >
                {tr(UI.decide)}
              </button>
              {voteMsg && <p role="status" className="text-sm font-bold text-amber-200">{voteMsg}</p>}
            </div>
          );
        })()}
      </section>
    </>,
  );
}
