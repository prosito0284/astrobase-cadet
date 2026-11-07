// "¿Luna o Marte?": datos para comparar los dos sitios antes de elegir.
// Gravedad: Luna = 1/6 de la Tierra (NASA, Moon facts); Marte = 0.38 (NASA: "si pesas
// 100 libras en la Tierra, pesarías 38 en Marte").
import type { Site } from './data';

export const GRAVITY: Record<Site, number> = { moon: 1 / 6, mars: 0.38 };

export const GRAVITY_SOURCES = {
  moon: { name: 'NASA — Moon facts', url: 'https://science.nasa.gov/moon/facts/' },
  mars: { name: 'NASA — Humans to Mars', url: 'https://www.nasa.gov/humans-in-space/humans-to-mars/' },
};

/** "Peso" en otro mundo (lo que marcaría una báscula de la Tierra), redondeado a 1 decimal. */
export function weightOn(site: Site, earthKg: number): number {
  if (!Number.isFinite(earthKg) || earthKg <= 0) return 0;
  return Math.round(earthKg * GRAVITY[site] * 10) / 10;
}

/** Cuántas veces más alto podrías saltar (misma fuerza de piernas, sin aire que frene). */
export function jumpTimes(site: Site): number {
  return Math.round((1 / GRAVITY[site]) * 10) / 10;
}
