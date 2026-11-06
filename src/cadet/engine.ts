// ─────────────────────────────────────────────────────────────────────────────
// MODO CADETE — Motor del juego (lógica pura, sin React; probado en tests/)
//
// Tres recursos que el niño ve: Aire, Energía y Escudo. La salud del equipo es
// la consecuencia. Cada día llega UNA tarjeta con DOS opciones y ninguna es
// gratis. Al final del día se explica, línea por línea, por qué cambió cada cosa.
// ─────────────────────────────────────────────────────────────────────────────

import {
  DECISION_CARDS,
  DONKI_SOURCE,
  REAL_STORMS,
  SITE_INFO,
  XRAY_MSV,
} from './data';
import type { CardOption, DecisionCard, Effects, Site, SolarStorm, Source, T } from './data';

export const TOTAL_DAYS = 10;
export const STORM_DAYS = [1, 4, 7, 10];
export const START = { air: 75, energy: 70, shield: 40, health: 100 };

/**
 * Niveles: "Fácil" para 7–9 años y "Normal" para 10–12. Fácil empieza con un poco
 * más de energía y escudo, y Control de Misión da una pista cada día (ver hint()).
 * Las tormentas hacen el mismo daño: ignorarlas sigue terminando mal en los dos
 * niveles, que es la lección principal.
 */
export type Level = 'easy' | 'normal';
export const LEVELS: Record<Level, { start: typeof START; airUse: number; stormFactor: number; hints: boolean }> = {
  easy: { start: { air: 75, energy: 80, shield: 45, health: 100 }, airUse: 6, stormFactor: 1, hints: true },
  normal: { start: START, airUse: 6, stormFactor: 1, hints: false },
};

/** Aire que respira el equipo cada día (neto, con el reciclador funcionando). */
export const DAILY_AIR_USE = 6;
/** Energía que gastan cada día las máquinas que mantienen viva la base. */
export const DAILY_LIFE_SUPPORT_ENERGY = 15;
/** Opción "subir el escudo" en una tormenta. */
export const SHIELD_UP = { energy: -30, shield: 35 };
/** Cuánto escudo se desgasta al frenar una tormenta. */
export const SHIELD_WEAR_PER_STORM = 10;

export type Status = 'playing' | 'won' | 'lost';
export type LostReason = 'air' | 'health';

export type DeckEntry =
  | { kind: 'storm'; storm: SolarStorm }
  | { kind: 'card'; cardId: string };

export interface ReportLine {
  icon: string;
  text: T;
  tone: 'good' | 'bad' | 'neutral';
}

export interface DayReport {
  day: number;
  title: T;
  choice: T;
  outcome: T;
  lines: ReportLine[];
  fact: T;
  source: Source;
  doseTodayMSv: number;
  storm?: SolarStorm;
}

export interface CadetState {
  site: Site;
  day: number;
  totalDays: number;
  air: number;
  energy: number;
  shield: number;
  health: number;
  stars: number;
  doseMSv: number;
  seed: number;
  deck: DeckEntry[];
  status: Status;
  level?: Level;            // sin nivel (partidas guardadas antiguas) = 'normal'
  lostReason?: LostReason;
  lastReport?: DayReport;
  history: { day: number; title: T; choice: T }[];
}

export interface CardView {
  id: string;
  icon: string;
  title: T;
  text: T;
  options: { label: T; detail: T; effects: Effects }[];
  fact: T;
  source: Source;
  storm?: SolarStorm;
}

// ── Utilidades ──

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<X>(items: X[], rng: () => number): X[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/**
 * Convierte la clase de una llamarada real (A, B, C, M, X + número) en la
 * fuerza de la tormenta en el juego. Las clase X son 10 veces más fuertes que
 * las M, y así sucesivamente; aquí se comprime a una escala jugable 1–45.
 */
export function flarePower(classType: string): number {
  const m = /^([ABCMX])\s*(\d+(?:\.\d+)?)/i.exec(classType.trim());
  if (!m) return 10;
  const letter = m[1].toUpperCase();
  const n = parseFloat(m[2]);
  let power: number;
  switch (letter) {
    case 'X': power = 10 + 3 * n; break;
    case 'M': power = 5 + 0.5 * n; break;
    case 'C': power = 3; break;
    default: power = 1;
  }
  return Math.min(45, Math.round(power));
}

/**
 * Fracción (0–1) con la que funciona una opción según la energía disponible.
 * Una opción que pide 30 de energía cuando solo hay 15 rinde al 50%.
 */
export function energyFactor(available: number, eff: Effects): number {
  const need = -(eff.energy ?? 0);
  if (need <= 0 || available >= need) return 1;
  return Math.max(0, available) / need;
}

/** Salud que quita una tormenta según lo fuerte que es y el escudo que tienes. */
export function stormDamage(power: number, shield: number): number {
  return Math.round(power * (1 - clamp(shield) / 100));
}

/** Dosis de radiación de fondo de un día, reducida por el escudo (máx. 70%). */
export function dailyDose(site: Site, shield: number): number {
  const base = SITE_INFO[site].dailyDoseMSv;
  return Math.round(base * (1 - (clamp(shield) / 100) * 0.7) * 100) / 100;
}

/** Dosis extra de una tormenta (mSv) — escala del juego. */
export function stormDose(power: number, shield: number): number {
  return Math.round(power * 0.05 * (1 - clamp(shield) / 100) * 100) / 100;
}

export function xrays(mSv: number): number {
  return Math.round(mSv / XRAY_MSV);
}

// ── Mazo ──

export function buildDeck(site: Site, seed: number, liveStorm?: SolarStorm): DeckEntry[] {
  const rng = mulberry32(seed);
  const storms = shuffle(REAL_STORMS, rng);
  if (liveStorm) storms.unshift(liveStorm);
  const cards = shuffle(DECISION_CARDS.filter(c => c.sites.includes(site)), rng);

  const deck: DeckEntry[] = [];
  let s = 0;
  let c = 0;
  for (let day = 1; day <= TOTAL_DAYS; day++) {
    if (STORM_DAYS.includes(day)) {
      deck.push({ kind: 'storm', storm: storms[s++ % storms.length] });
    } else {
      deck.push({ kind: 'card', cardId: cards[c++ % cards.length].id });
    }
  }
  return deck;
}

export function createGame(site: Site, seed: number, liveStorm?: SolarStorm, level: Level = 'normal'): CadetState {
  return {
    site,
    level,
    day: 1,
    totalDays: TOTAL_DAYS,
    ...LEVELS[level].start,
    stars: 0,
    doseMSv: 0,
    seed,
    deck: buildDeck(site, seed, liveStorm),
    status: 'playing',
    history: [],
  };
}

// ── Validar una partida guardada ──

const isNum = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/**
 * Comprueba que una partida leída del navegador se puede jugar sin romper nada:
 * números en rango, mazo de 10 días con tarjetas que existen y son de ese sitio.
 * Si algo no cuadra (versión vieja, datos dañados o editados a mano) se descarta.
 */
export function isValidSave(x: unknown): x is CadetState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<CadetState>;
  if (s.site !== 'moon' && s.site !== 'mars') return false;
  if (s.totalDays !== TOTAL_DAYS || !isNum(s.day, 1, TOTAL_DAYS + 1)) return false;
  for (const k of ['air', 'energy', 'shield', 'health'] as const) if (!isNum(s[k], 0, 100)) return false;
  if (!isNum(s.stars, 0, 99) || !isNum(s.doseMSv, 0, 10_000) || !isNum(s.seed, 0, 2 ** 32)) return false;
  if (s.status !== 'playing' && s.status !== 'won' && s.status !== 'lost') return false;
  if (s.level !== undefined && s.level !== 'easy' && s.level !== 'normal') return false;
  if (s.status === 'playing' && (s.day as number) > TOTAL_DAYS) return false;
  if (!Array.isArray(s.history) || !Array.isArray(s.deck) || s.deck.length !== TOTAL_DAYS) return false;
  return s.deck.every((e, i) => {
    if (!e || typeof e !== 'object') return false;
    if (e.kind === 'storm') {
      return STORM_DAYS.includes(i + 1) && typeof e.storm?.classType === 'string' && typeof e.storm?.story?.es === 'string';
    }
    if (e.kind === 'card') {
      const card = DECISION_CARDS.find(c => c.id === e.cardId);
      return !!card && card.sites.includes(s.site!);
    }
    return false;
  });
}

// ── Tarjeta del día ──

function cardById(id: string): DecisionCard {
  const card = DECISION_CARDS.find(c => c.id === id);
  if (!card) throw new Error(`Unknown card ${id}`);
  return card;
}

function optionEffects(opt: CardOption, site: Site): Effects {
  return { ...opt.effects, ...(opt.effectsBySite?.[site] ?? {}) };
}

export function stormCard(storm: SolarStorm): CardView {
  return {
    id: `storm:${storm.id}`,
    icon: '☀️',
    title: {
      es: `¡Llamarada solar ${storm.classType}!`,
      en: `Solar flare ${storm.classType}!`,
    },
    text: {
      es: 'El Sol lanzó una explosión. Sus partículas llegan a tu base esta noche.',
      en: 'The Sun fired an explosion. Its particles reach your base tonight.',
    },
    options: [
      {
        label: { es: 'Subir el escudo', en: 'Raise the shield' },
        detail: {
          es: 'El equipo queda protegido, pero gasta mucha energía',
          en: 'The crew is protected, but it uses a lot of energy',
        },
        effects: { ...SHIELD_UP },
      },
      {
        label: { es: 'Ahorrar energía', en: 'Save energy' },
        detail: {
          es: 'Guardas la energía, pero el equipo recibe más radiación',
          en: 'You keep the energy, but the crew gets more radiation',
        },
        effects: {},
      },
    ],
    fact: storm.story,
    source: DONKI_SOURCE,
    storm,
  };
}

export function currentCard(state: CadetState): CardView {
  const entry = state.deck[state.day - 1];
  if (entry.kind === 'storm') return stormCard(entry.storm);
  const card = cardById(entry.cardId);
  return {
    id: card.id,
    icon: card.icon,
    title: card.title,
    text: card.textBySite?.[state.site] ?? card.text,
    options: card.options.map(o => ({
      label: o.label,
      detail: o.detail,
      effects: optionEffects(o, state.site),
    })),
    fact: card.factBySite?.[state.site] ?? card.fact,
    source: card.source,
  };
}

const levelOf = (state: CadetState) => LEVELS[state.level ?? 'normal'];
const levelDamage = (state: CadetState, dmg: number) => Math.round(dmg * levelOf(state).stormFactor);

/**
 * Lo que pasa cada día pase lo que pase (para mostrarlo bajo las barras):
 * el equipo respira y las máquinas gastan energía, los paneles recargan.
 */
export function dailyRoutine(state: CadetState): { air: number; energy: number; solar: number; machines: number } {
  const solar = SITE_INFO[state.site].solarGain;
  return { air: -levelOf(state).airUse, energy: solar - DAILY_LIFE_SUPPORT_ENERGY, solar, machines: DAILY_LIFE_SUPPORT_ENERGY };
}

/** Lo que el niño ve ANTES de elegir: cuánto le quitará la tormenta con cada opción. */
export function previewStormDamage(state: CadetState, optionIndex: 0 | 1): number | undefined {
  const entry = state.deck[state.day - 1];
  if (entry.kind !== 'storm') return undefined;
  const view = currentCard(state);
  const eff = view.options[optionIndex].effects;
  const shieldAfter = clamp(state.shield + (eff.shield ?? 0) * energyFactor(state.energy, eff));
  return levelDamage(state, stormDamage(flarePower(entry.storm.classType), shieldAfter));
}

// ── Elegir una opción y cerrar el día ──

export function choose(state: CadetState, optionIndex: 0 | 1): CadetState {
  if (state.status !== 'playing') return state;

  const entry = state.deck[state.day - 1];
  const view = currentCard(state);
  const opt = view.options[optionIndex];
  const eff = opt.effects;
  const lines: ReportLine[] = [];

  let { air, energy, shield, health, stars, doseMSv } = state;

  // 1) Lo que cuesta y da la decisión. No se puede gastar energía que no hay:
  //    si falta, la acción solo rinde en proporción a la energía disponible.
  const power = energyFactor(energy, eff);
  if (power < 1) {
    lines.push({
      icon: '🪫',
      tone: 'bad',
      text: {
        es: `Solo tenías ${energy} de energía y hacían falta ${-(eff.energy ?? 0)}: la acción solo funcionó al ${Math.round(power * 100)}%.`,
        en: `You only had ${energy} energy and ${-(eff.energy ?? 0)} was needed: the action only worked at ${Math.round(power * 100)}%.`,
      },
    });
  }
  const gain = (v: number | undefined) => (v ?? 0) > 0 ? (v ?? 0) * power : (v ?? 0);
  air = clamp(air + gain(eff.air));
  energy = clamp(energy + (eff.energy ?? 0));
  shield = clamp(shield + gain(eff.shield));
  health = clamp(health + gain(eff.health));
  stars += power >= 1 ? (eff.stars ?? 0) : 0;

  const decisionChips = [
    ['🫁', air - state.air],
    ['⚡', energy - state.energy],
    ['🛡️', shield - state.shield],
    ['❤️', health - state.health],
    ['⭐', stars - state.stars],
  ]
    .filter(([, d]) => d !== 0)
    .map(([icon, d]) => `${(d as number) > 0 ? '+' : '−'}${Math.abs(d as number)} ${icon}`)
    .join('  ');
  if (decisionChips) {
    lines.unshift({
      icon: '🎯',
      tone: 'neutral',
      text: { es: `Tu decisión: ${decisionChips}`, en: `Your decision: ${decisionChips}` },
    });
  }

  let outcome: T;
  if (entry.kind === 'card') {
    const card = cardById(entry.cardId);
    const o = card.options[optionIndex];
    outcome = o.outcomeBySite?.[state.site] ?? o.outcome;
  } else {
    outcome = optionIndex === 0
      ? { es: 'Subiste el escudo y la base se preparó para la tormenta.', en: 'You raised the shield and the base got ready for the storm.' }
      : { es: 'Guardaste la energía y esperaste la tormenta sin protección extra.', en: 'You kept the energy and waited for the storm with no extra protection.' };
  }

  // 2) Llega la tormenta (si la hay)
  let doseToday = 0;
  if (entry.kind === 'storm') {
    const power = flarePower(entry.storm.classType);
    const dmg = levelDamage(state, stormDamage(power, shield));
    const sDose = stormDose(power, shield);
    health = clamp(health - dmg);
    doseToday += sDose;
    lines.push(
      shield >= 60
        ? {
            icon: '🛡️',
            tone: 'good',
            text: {
              es: `El escudo frenó casi toda la tormenta: solo −${dmg} de salud.`,
              en: `The shield stopped almost all of the storm: only −${dmg} health.`,
            },
          }
        : {
            icon: '☢️',
            tone: 'bad',
            text: {
              es: `La tormenta atravesó el escudo débil: −${dmg} de salud para el equipo.`,
              en: `The storm got through the weak shield: −${dmg} health for the crew.`,
            },
          },
    );
    shield = clamp(shield - SHIELD_WEAR_PER_STORM);
    lines.push({
      icon: '🧱',
      tone: 'neutral',
      text: {
        es: `Frenar la tormenta desgastó el escudo: −${SHIELD_WEAR_PER_STORM}.`,
        en: `Stopping the storm wore down the shield: −${SHIELD_WEAR_PER_STORM}.`,
      },
    });
  }

  // 3) La rutina de cada día
  const airUse = levelOf(state).airUse;
  air = clamp(air - airUse);
  lines.push({
    icon: '🫁',
    tone: 'neutral',
    text: { es: `El equipo respiró: −${airUse} de aire.`, en: `The crew breathed: −${airUse} air.` },
  });

  const solar = SITE_INFO[state.site].solarGain;
  energy = clamp(energy + solar - DAILY_LIFE_SUPPORT_ENERGY);
  lines.push({
    icon: '☀️',
    tone: solar >= DAILY_LIFE_SUPPORT_ENERGY ? 'good' : 'bad',
    text: {
      es: `Los paneles solares dieron +${solar} y las máquinas de la base gastaron −${DAILY_LIFE_SUPPORT_ENERGY} de energía.`,
      en: `The solar panels gave +${solar} and the base machines used −${DAILY_LIFE_SUPPORT_ENERGY} energy.`,
    },
  });

  const bg = dailyDose(state.site, shield);
  doseToday += bg;
  const bgHarm = bg >= 1 ? 2 : 1;
  health = clamp(health - bgHarm);
  lines.push({
    icon: '☢️',
    tone: 'neutral',
    text: {
      es: `Radiación de hoy: ${bg.toFixed(2)} mSv, como ${xrays(bg)} radiografías de pecho (−${bgHarm} de salud).`,
      en: `Radiation today: ${bg.toFixed(2)} mSv, like ${xrays(bg)} chest X-rays (−${bgHarm} health).`,
    },
  });

  if (energy <= 0) {
    air = clamp(air - 12);
    health = clamp(health - 8);
    lines.push({
      icon: '🔌',
      tone: 'bad',
      text: {
        es: 'Sin energía se apagaron el reciclador de aire y la calefacción: −12 de aire y −8 de salud.',
        en: 'With no energy, the air recycler and the heaters shut down: −12 air and −8 health.',
      },
    });
  }

  if (air > 0 && air < 25) {
    health = clamp(health - 8);
    lines.push({
      icon: '😮‍💨',
      tone: 'bad',
      text: { es: 'Queda poco aire y cuesta respirar: −8 de salud.', en: 'Air is low and breathing is hard: −8 health.' },
    });
  } else if (air >= 40 && energy > 0) {
    health = clamp(health + 3);
    lines.push({
      icon: '😴',
      tone: 'good',
      text: { es: 'Con aire y energía, el equipo durmió bien: +3 de salud.', en: 'With air and energy, the crew slept well: +3 health.' },
    });
  }

  doseMSv = Math.round((doseMSv + doseToday) * 100) / 100;

  const report: DayReport = {
    day: state.day,
    title: view.title,
    choice: opt.label,
    outcome,
    lines,
    fact: view.fact,
    source: view.source,
    doseTodayMSv: Math.round(doseToday * 100) / 100,
    storm: view.storm,
  };

  let status: Status = 'playing';
  let lostReason: LostReason | undefined;
  let day = state.day;
  if (air <= 0) {
    status = 'lost';
    lostReason = 'air';
  } else if (health <= 0) {
    status = 'lost';
    lostReason = 'health';
  } else if (state.day >= state.totalDays) {
    status = 'won';
  } else {
    day = state.day + 1;
  }

  return {
    ...state,
    day,
    air,
    energy,
    shield,
    health,
    stars,
    doseMSv,
    status,
    lostReason,
    lastReport: report,
    history: [...state.history, { day: state.day, title: view.title, choice: opt.label }],
  };
}

/** Medalla final: 1 a 3 estrellas según salud del equipo y descubrimientos. */
// ── Pista de Control de Misión (nivel Fácil) ──

/** Mejor resultado alcanzable desde aquí: salud final + 10 por descubrimiento; −1 si ya no se puede ganar. */
export function bestScore(state: CadetState): number {
  if (state.status === 'won') return state.health + 10 * state.stars;
  if (state.status === 'lost') return -1;
  return Math.max(bestScore(choose(state, 0)), bestScore(choose(state, 1)));
}

/**
 * La opción que recomienda Control de Misión: la que todavía permite ganar con el
 * mejor resultado. Mira todas las combinaciones de los días que faltan (como mucho
 * 2^10 = 1024), así que es exacta y rápida. Devuelve undefined si la partida terminó.
 */
export function hint(state: CadetState): { option: 0 | 1; canWin: boolean } | undefined {
  if (state.status !== 'playing') return undefined;
  const a = bestScore(choose(state, 0));
  const b = bestScore(choose(state, 1));
  return { option: b > a ? 1 : 0, canWin: Math.max(a, b) >= 0 };
}

export function medal(state: CadetState): number {
  if (state.status !== 'won') return 0;
  let m = 1;
  if (state.health >= 50) m++;
  if (state.stars >= 2) m++;
  return m;
}

// ── Llamarada en vivo desde NASA DONKI ──

export interface DonkiFlare {
  flrID?: string;
  classType?: string;
  peakTime?: string;
  beginTime?: string;
}

const CLASS_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, M: 3, X: 4 };

export function flareRank(classType: string): number {
  const m = /^([ABCMX])\s*(\d+(?:\.\d+)?)/i.exec(classType.trim());
  if (!m) return -1;
  return CLASS_ORDER[m[1].toUpperCase()] * 100 + parseFloat(m[2]);
}

/** Elige la llamarada más fuerte de una respuesta de DONKI y la convierte en tormenta del juego. */
export function stormFromDonki(flares: DonkiFlare[]): SolarStorm | undefined {
  const valid = flares.filter(f => typeof f.classType === 'string' && flareRank(f.classType) >= 0);
  if (valid.length === 0) return undefined;
  const best = valid.reduce((a, b) => (flareRank(b.classType!) > flareRank(a.classType!) ? b : a));
  const date = (best.peakTime ?? best.beginTime ?? '').slice(0, 10);
  const cls = best.classType!;
  return {
    id: best.flrID ?? `live-${date}`,
    classType: cls,
    date,
    live: true,
    story: {
      es: `Esta llamarada ${cls} es REAL: el Sol la lanzó el ${date}, hace pocos días. Los datos llegaron en vivo desde DONKI de la NASA al empezar tu partida.`,
      en: `This ${cls} flare is REAL: the Sun fired it on ${date}, just days ago. The data came live from NASA's DONKI when your game started.`,
    },
  };
}

/** Llamarada tal como la publica NOAA SWPC (satélites GOES). */
export interface SwpcFlare {
  max_class?: string;
  max_time?: string;
  begin_time?: string;
}

const isWeak = (cls: string) => flareRank(cls) < CLASS_ORDER.M * 100;

/** Respaldo en vivo: la llamarada más fuerte de los últimos 7 días según NOAA SWPC. */
export function stormFromSwpc(flares: SwpcFlare[]): SolarStorm | undefined {
  const valid = flares.filter(f => typeof f.max_class === 'string' && flareRank(f.max_class) >= 0);
  if (valid.length === 0) return undefined;
  const best = valid.reduce((a, b) => (flareRank(b.max_class!) > flareRank(a.max_class!) ? b : a));
  const date = (best.max_time ?? best.begin_time ?? '').slice(0, 10);
  const cls = best.max_class!;
  const calm = isWeak(cls);
  return {
    id: `swpc-${cls}-${date}`,
    classType: cls,
    date,
    live: true,
    liveSource: 'swpc',
    story: {
      es: `Esta llamarada ${cls} es REAL: los satélites GOES la midieron el ${date}. Los datos llegaron en vivo desde NOAA SWPC al empezar tu partida.${calm ? ' Fue pequeña: esta semana el Sol estuvo bastante tranquilo.' : ''}`,
      en: `This ${cls} flare is REAL: the GOES satellites measured it on ${date}. The data came live from NOAA SWPC when your game started.${calm ? ' It was small: the Sun was fairly calm this week.' : ''}`,
    },
  };
}

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const SWPC_FLARES_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json';

/**
 * Intenta traer la llamarada más fuerte de los últimos 30 días desde NASA DONKI.
 * Si DONKI no responde, prueba NOAA SWPC (últimos 7 días). Si ninguno responde,
 * devuelve undefined y el juego usa solo llamaradas guardadas (y lo dice).
 */
export async function fetchLiveStorm(timeoutMs = 6000): Promise<SolarStorm | undefined> {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000);
  const donki = await getJson(
    `https://api.nasa.gov/DONKI/FLR?startDate=${isoDate(start)}&endDate=${isoDate(end)}&api_key=DEMO_KEY`,
    timeoutMs,
  );
  const fromDonki = Array.isArray(donki) ? stormFromDonki(donki as DonkiFlare[]) : undefined;
  if (fromDonki) return fromDonki;
  const swpc = await getJson(SWPC_FLARES_URL, timeoutMs);
  return Array.isArray(swpc) ? stormFromSwpc(swpc as SwpcFlare[]) : undefined;
}
