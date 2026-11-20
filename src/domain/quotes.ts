/**
 * Quote rules. A journal quote is a short passage the reader picks for
 * themselves, kept privately with the book and page. It is never a way to
 * store whole pages, so length is capped.
 *
 * - Up to SOFT_LIMIT words: fine.
 * - Up to HARD_LIMIT words: allowed, with a gentle nudge to trim.
 * - Over HARD_LIMIT words: not saved.
 */
export const QUOTE_SOFT_LIMIT_WORDS = 60;
export const QUOTE_HARD_LIMIT_WORDS = 120;

export type QuoteCheck = {
  status: 'empty' | 'ok' | 'long' | 'too-long';
  words: number;
  /** Whitespace-normalized text, with line-break hyphens joined. */
  text: string;
};

export function normalizeQuote(raw: string): string {
  return raw
    .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2') // join words hyphenated across lines
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function checkQuote(raw: string): QuoteCheck {
  const text = normalizeQuote(raw);
  const words = countWords(text);
  if (words === 0) return { status: 'empty', words, text };
  if (words > QUOTE_HARD_LIMIT_WORDS) return { status: 'too-long', words, text };
  if (words > QUOTE_SOFT_LIMIT_WORDS) return { status: 'long', words, text };
  return { status: 'ok', words, text };
}
