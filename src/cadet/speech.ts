// Lectura en voz alta (si el navegador tiene voces).
import type { Lang } from './data';

export function speak(text: string, lang: Lang) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-MX' : 'en-US';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { /* sin voz disponible */ }
}
