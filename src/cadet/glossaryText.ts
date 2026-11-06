// Encuentra las palabras difíciles dentro de un texto para volverlas tocables
// (abren su explicación del glosario). Solo la PRIMERA vez que aparece cada palabra,
// para no llenar el texto de enlaces.
import type { Lang } from './data';

export interface Segment { text: string; term?: string }

/** Palabra (o raíz) → clave del glosario, por idioma. Se aceptan plurales simples. */
const TERMS: Record<Lang, [RegExp, string][]> = {
  es: [
    [/radiaci[oó]n(es)?/i, 'radiacion'],
    [/escudos?/i, 'escudo'],
    [/mSv/, 'msv'],
    [/llamaradas?( solar(es)?)?/i, 'llamarada'],
    [/DONKI/, 'donki'],
  ],
  en: [
    [/radiation/i, 'radiacion'],
    [/shields?/i, 'escudo'],
    [/mSv/, 'msv'],
    [/(solar )?flares?/i, 'llamarada'],
    [/DONKI/, 'donki'],
  ],
};

const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);

export function glossarySegments(text: string, lang: Lang): Segment[] {
  type Hit = { start: number; end: number; term: string };
  const hits: Hit[] = [];
  for (const [re, term] of TERMS[lang]) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of text.matchAll(g)) {
      const start = m.index!;
      const end = start + m[0].length;
      // Palabra completa: no tocar "escudos" dentro de otra palabra más larga.
      if (isWordChar(text[start - 1]) || isWordChar(text[end])) continue;
      hits.push({ start, end, term });
      break; // solo la primera aparición de cada término
    }
  }
  hits.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const h of hits) {
    if (h.start < pos) continue; // se solapa con otra palabra ya marcada
    if (h.start > pos) out.push({ text: text.slice(pos, h.start) });
    out.push({ text: text.slice(h.start, h.end), term: h.term });
    pos = h.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}
