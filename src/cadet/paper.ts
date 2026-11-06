// ─────────────────────────────────────────────────────────────────────────────
// "Misión en papel": las MISMAS reglas del motor, escritas para jugar sin
// computadoras. Todos los números salen de las constantes de engine.ts, así que si
// el juego cambia, la versión impresa cambia con él (y los tests lo comprueban).
// ─────────────────────────────────────────────────────────────────────────────
import type { Effects, Site, T } from './data';
import { DECISION_CARDS, REAL_STORMS, SITE_INFO } from './data';
import type { Level } from './engine';
import { dailyDose, DAILY_LIFE_SUPPORT_ENERGY, flarePower, LEVELS, optionEffects, SHIELD_UP, SHIELD_WEAR_PER_STORM, STORM_DAYS, TOTAL_DAYS } from './engine';

/** Escudo mínimo con el que la radiación de fondo solo quita 1 de salud (en la Luna); 0 si siempre quita 1. */
export function radiationShieldThreshold(site: Site): number {
  for (let s = 0; s <= 100; s++) if (dailyDose(site, s) < 1) return s;
  return 101;
}

const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export function paperRules(site: Site, level: Level): T[] {
  const L = LEVELS[level];
  const solar = SITE_INFO[site].solarGain;
  const thr = radiationShieldThreshold(site);
  const where: T = site === 'moon' ? { es: 'la Luna', en: 'the Moon' } : { es: 'Marte', en: 'Mars' };
  return [
    {
      es: `Empiezan con: 🫁 Aire ${L.start.air} · ⚡ Energía ${L.start.energy} · 🛡️ Escudo ${L.start.shield} · ❤️ Salud ${L.start.health}. Ninguna barra pasa de 100.`,
      en: `Start with: 🫁 Air ${L.start.air} · ⚡ Energy ${L.start.energy} · 🛡️ Shield ${L.start.shield} · ❤️ Health ${L.start.health}. No bar goes above 100.`,
    },
    {
      es: `La misión dura ${TOTAL_DAYS} días. Los días ${STORM_DAYS.join(', ')} llega una tormenta solar: saquen una llamarada de la tabla.`,
      en: `The mission lasts ${TOTAL_DAYS} days. On days ${STORM_DAYS.join(', ')} a solar storm arrives: draw a flare from the table.`,
    },
    {
      es: `En una tormenta pueden subir el escudo (${sign(SHIELD_UP.energy)} energía, ${sign(SHIELD_UP.shield)} escudo) o no. Daño a la salud = fuerza × (100 − escudo) ÷ 100, redondeado. Después el escudo baja ${SHIELD_WEAR_PER_STORM}.`,
      en: `In a storm you may raise the shield (${sign(SHIELD_UP.energy)} energy, ${sign(SHIELD_UP.shield)} shield) or not. Health damage = strength × (100 − shield) ÷ 100, rounded. Then the shield drops ${SHIELD_WEAR_PER_STORM}.`,
    },
    {
      es: 'Los demás días saquen una tarjeta al azar, léanla en voz alta y elijan A o B. Apliquen sus números.',
      en: 'On the other days draw a random card, read it aloud and choose A or B. Apply its numbers.',
    },
    {
      es: 'Si una opción pide más energía de la que tienen, su parte buena solo funciona en proporción (con la mitad de la energía, la mitad del beneficio, redondeado) y no cuenta el descubrimiento.',
      en: 'If an option needs more energy than you have, its good part only works in proportion (half the energy, half the benefit, rounded) and the discovery does not count.',
    },
    {
      es: `Al final de CADA día: 🫁 ${sign(-L.airUse)} aire · ⚡ +${solar} de los paneles y −${DAILY_LIFE_SUPPORT_ENERGY} de las máquinas · ❤️ radiación: ${thr > 100 ? '−1' : thr === 0 ? '−1' : `−2 si el escudo es menor que ${thr}, si no −1`}.`,
      en: `At the end of EACH day: 🫁 ${sign(-L.airUse)} air · ⚡ +${solar} from the panels and −${DAILY_LIFE_SUPPORT_ENERGY} for the machines · ❤️ radiation: ${thr > 100 ? '−1' : thr === 0 ? '−1' : `−2 if the shield is below ${thr}, otherwise −1`}.`,
    },
    {
      es: 'Si la energía llega a 0: −12 aire y −8 salud. Si el aire queda entre 1 y 24: −8 salud. Si no, y el aire es 40 o más y hay energía: +3 salud.',
      en: 'If energy reaches 0: −12 air and −8 health. If air is between 1 and 24: −8 health. Otherwise, if air is 40 or more and there is energy: +3 health.',
    },
    {
      es: `Si el aire o la salud llegan a 0, la misión vuelve a casa. Si terminan el día ${TOTAL_DAYS}, ¡ganan! Base en ${where.es}.`,
      en: `If air or health reaches 0, the mission comes home. If you finish day ${TOTAL_DAYS}, you win! Base on ${where.en}.`,
    },
  ];
}

export interface PaperCard {
  id: string;
  icon: string;
  title: T;
  text: T;
  options: { label: T; effects: Effects }[];
  fact: T;
  source: string;
}

export function paperCards(site: Site): PaperCard[] {
  return DECISION_CARDS.filter(c => c.sites.includes(site)).map(c => ({
    id: c.id,
    icon: c.icon,
    title: c.title,
    text: c.textBySite?.[site] ?? c.text,
    options: c.options.map(o => ({ label: o.label, effects: optionEffects(o, site) })),
    fact: c.factBySite?.[site] ?? c.fact,
    source: c.source.name,
  }));
}

export function paperFlares(): { classType: string; date: string; power: number }[] {
  return REAL_STORMS.map(s => ({ classType: s.classType, date: s.date, power: flarePower(s.classType) }));
}
