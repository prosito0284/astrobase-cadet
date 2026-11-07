// Lectura en voz alta (si el navegador tiene voces).
import type { Lang } from './data';

interface VoiceLike { lang: string; name: string; localService?: boolean }

const PREFERRED: Record<Lang, string[]> = {
  es: ['es-MX', 'es-US', 'es-419', 'es-CO', 'es-AR', 'es-ES'],
  en: ['en-US', 'en-GB', 'en-AU', 'en-CA'],
};

/**
 * Elige la mejor voz del navegador para el idioma: primero acentos latinoamericanos
 * (es-MX, es-US…), luego cualquier voz de ese idioma. Si no hay ninguna, undefined
 * (el navegador usará la que tenga, y en inglés leería mal el español).
 */
export function pickVoice<V extends VoiceLike>(voices: V[], lang: Lang): V | undefined {
  const norm = (s: string) => s.replace('_', '-').toLowerCase();
  for (const tag of PREFERRED[lang]) {
    const matches = voices.filter(v => norm(v.lang) === tag.toLowerCase());
    if (matches.length) return matches.find(v => v.localService) ?? matches[0];
  }
  return voices.find(v => norm(v.lang).startsWith(lang));
}

export function speak(text: string, lang: Lang) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-MX' : 'en-US';
    const voice = pickVoice(window.speechSynthesis.getVoices(), lang);
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { /* sin voz disponible */ }
}
