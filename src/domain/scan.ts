/**
 * Rules for the page scanner. Recognition gives back lines of text from a
 * photo of one page. The reader then picks a few sentences to keep as a
 * quote. Everything here works on that text in memory. Nothing is stored
 * until the reader saves the passage they chose, and the quote limits in
 * `quotes.ts` still apply.
 */

/** A line that is only a page number, like "214" or "- 214 -". */
const PAGE_NUMBER = /^[\s\-–—|•.]*(\d{1,4})[\s\-–—|•.]*$/;

/**
 * The printed page number, when a page's first or last line is just a number.
 * Used to prefill the page field, which the reader can change.
 */
export function guessPageNumber(lines: string[]): number | null {
  const trimmed = lines.map((l) => l.trim()).filter(Boolean);
  for (const line of [trimmed[trimmed.length - 1], trimmed[0]]) {
    const m = line ? PAGE_NUMBER.exec(line) : null;
    if (m) {
      const n = Number(m[1]);
      if (n > 0 && n < 5000) return n;
    }
  }
  return null;
}

/**
 * The page a scan starts on, when the reader scanned one page or two (a
 * quote that runs over the page). The first page's own number wins; else
 * one less than the second page's.
 */
export function guessFirstPage(pages: string[][]): number | null {
  const first = pages[0] ? guessPageNumber(pages[0]) : null;
  if (first) return first;
  const second = pages[1] ? guessPageNumber(pages[1]) : null;
  return second && second > 1 ? second - 1 : null;
}

/**
 * Joins recognised lines into running text. Page-number lines are dropped,
 * words hyphenated across a line break are joined, and spacing is tidied.
 * Headings in capitals are kept on their own line.
 */
export function joinScannedLines(lines: string[]): string {
  let text = '';
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line || PAGE_NUMBER.test(line)) continue;
    // A heading in capitals ("CHAPTER TWO") stands on its own line.
    const heading = /[A-Z]{2}/.test(line) && !/[a-z]/.test(line);
    if (heading) text = text ? `${text}\n${line}\n` : `${line}\n`;
    else if (!text || text.endsWith('\n')) text += line;
    else if (/[a-z]-$/i.test(text) && /^[a-z]/.test(line)) text = text.slice(0, -1) + line;
    else text = `${text} ${line}`;
  }
  return text.trim();
}

const ENDS_SENTENCE = /[.!?…]["'”’)\]]*$/;
/** Abbreviations that end in a full stop but rarely end a sentence. */
const ABBREVIATIONS = new Set([
  'mr.',
  'mrs.',
  'ms.',
  'dr.',
  'st.',
  'mt.',
  'vs.',
  'etc.',
  'e.g.',
  'i.e.',
  'p.',
  'pp.',
  'no.',
]);

/**
 * Splits text into sentences, so the reader can tap whole sentences instead
 * of dragging over words. Breaks after . ! ? or … (with closing quotes) when
 * the next word starts a new sentence.
 */
export function splitSentences(text: string): string[] {
  return text.split('\n').flatMap(splitBlock);
}

function splitBlock(block: string): string[] {
  const words = block.split(' ').filter(Boolean);
  const sentences: string[] = [];
  let current: string[] = [];
  words.forEach((word, i) => {
    current.push(word);
    const next = words[i + 1];
    const ends =
      ENDS_SENTENCE.test(word) &&
      !ABBREVIATIONS.has(word.toLowerCase()) &&
      !/^[A-Z]\.$/.test(word) && // an initial, as in "C. S. Lewis"
      (!next || /^["'“‘(\[]?[A-Z0-9]/.test(next));
    if (ends || !next) {
      sentences.push(current.join(' '));
      current = [];
    }
  });
  return sentences;
}

/** A contiguous run of sentences, by index, inclusive. */
export type Selection = { start: number; end: number } | null;

/**
 * What a tap on sentence `i` does:
 * - nothing selected: select it;
 * - outside the selection: stretch the selection to reach it;
 * - the first or last selected sentence: let go of it;
 * - inside the selection: start again from it.
 */
export function tapSentence(sel: Selection, i: number): Selection {
  if (!sel) return { start: i, end: i };
  if (i < sel.start) return { start: i, end: sel.end };
  if (i > sel.end) return { start: sel.start, end: i };
  if (sel.start === sel.end) return null;
  if (i === sel.start) return { start: i + 1, end: sel.end };
  if (i === sel.end) return { start: sel.start, end: i - 1 };
  return { start: i, end: i };
}

export function selectedText(sentences: string[], sel: Selection): string {
  return sel ? sentences.slice(sel.start, sel.end + 1).join(' ') : '';
}
