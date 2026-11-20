/**
 * Turns a Project Gutenberg plain-text file into chapters for the reader.
 *
 * The licence header and footer are removed, along with every mention of the
 * Project Gutenberg name, so what is left is the public-domain text alone
 * (as the Project Gutenberg licence asks of anyone who redistributes texts
 * without their trademark). Line-wrapped prose is joined into paragraphs,
 * and chapter headings are found by their usual shapes.
 */

export type ParsedChapter = { title: string; paragraphs: string[]; words: number };
export type ParsedBook = { title: string | null; author: string | null; chapters: ParsedChapter[] };

const START = /^\*{3}\s*START OF (THE|THIS) PROJECT GUTENBERG E-?BOOK.*$/im;
const END = /^\*{3}\s*END OF (THE|THIS) PROJECT GUTENBERG E-?BOOK.*$/im;
const PRODUCED =
  /^(produced by|this e-?book was produced|transcribed from|e-?text prepared by|updated editions will)/i;

export function readHeader(raw: string): { title: string | null; author: string | null } {
  const head = raw.slice(0, 5000);
  const title = /^Title:\s*(.+)$/im.exec(head)?.[1]?.trim() ?? null;
  const author = /^Author:\s*(.+)$/im.exec(head)?.[1]?.trim() ?? null;
  return { title, author };
}

/** The text between the start and end markers, with Windows line endings fixed. */
export function stripBoilerplate(raw: string): string {
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const start = START.exec(text);
  const end = END.exec(text);
  const from = start ? start.index + start[0].length : 0;
  const to = end && end.index > from ? end.index : text.length;
  return text.slice(from, to);
}

/**
 * Blank-line separated blocks, unwrapped into paragraphs. Verse (most lines
 * indented) keeps its line breaks. Credits for the volunteers who prepared
 * the file are left out, as is any line that names Project Gutenberg.
 */
export function toParagraphs(body: string): string[] {
  const out: string[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const lines = block.split('\n').filter((l) => l.trim());
    if (!lines.length) continue;
    const joined = lines.map((l) => l.trim()).join(' ');
    if (PRODUCED.test(joined) || /project gutenberg/i.test(joined)) continue;
    if (/^\[(illustration|picture|frontispiece)[^\]]*\]$/i.test(joined)) continue;
    const indented = lines.filter((l) => /^\s{2,}/.test(l)).length;
    const verse = lines.length > 1 && indented >= lines.length * 0.6;
    const text = verse
      ? lines.map((l) => l.trim()).join('\n')
      : joined
          .replace(/_([^_]+)_/g, '$1') // _italics_ markers
          .replace(/\s+/g, ' ')
          .trim();
    if (text) out.push(text);
  }
  return out;
}

const HEADING =
  /^(chapter|book|part|letter|volume|canto|meditation|stave|section)\b[\s.:]*([ivxlcdm]+|\d+|the\s+\w+|[a-z]+(-[a-z]+)?)?\b[.:]?(\s.*)?$/i;
const ROMAN = /^[IVXLCDM]{1,8}\.?$/;

export function isHeading(p: string): boolean {
  if (p.length > 80 || p.includes('\n')) return false;
  if (ROMAN.test(p)) return true;
  if (!HEADING.test(p)) return false;
  // "Chapter" followed by a full sentence is prose, not a heading.
  return !/[a-z]{3,}[,;]\s/.test(p) && p.split(' ').length <= 10;
}

/** A short line right after a heading, like "Down the Rabbit-Hole", is its subtitle. */
function isSubtitle(p: string): boolean {
  return p.length <= 60 && !p.includes('\n') && !/[.!?:;,]["'”’]?$/.test(p) && !isHeading(p);
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Chapters with fewer words than this are table-of-contents entries, not chapters. */
const MIN_CHAPTER_WORDS = 40;
const PART_WORDS = 3000;

export function splitChapters(paragraphs: string[]): ParsedChapter[] {
  const chapters: ParsedChapter[] = [];
  let current: ParsedChapter = { title: 'Opening', paragraphs: [], words: 0 };
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (isHeading(p)) {
      chapters.push(current);
      let title = tidyHeading(p);
      const next = paragraphs[i + 1];
      if (next && isSubtitle(next) && paragraphs[i + 2] && !isHeading(paragraphs[i + 2])) {
        title = `${title}: ${next}`;
        i++;
      }
      current = { title, paragraphs: [], words: 0 };
    } else {
      current.paragraphs.push(p);
      current.words += countWords(p);
    }
  }
  chapters.push(current);
  const real = chapters.filter((c) => c.words >= MIN_CHAPTER_WORDS);
  return real.length >= 2 ? real : intoParts(paragraphs.filter((p) => !isHeading(p)));
}

function tidyHeading(p: string): string {
  const t = p.replace(/\.$/, '').trim();
  // "CHAPTER IV" reads more calmly as "Chapter IV".
  return t === t.toUpperCase()
    ? t
        .toLowerCase()
        .replace(/\b([a-z])/g, (c) => c.toUpperCase())
        .replace(/\b([ivxlcdm]+)\b/gi, (r) => r.toUpperCase())
    : t;
}

/** For texts without headings: parts of about PART_WORDS words, cut at paragraph ends. */
function intoParts(paragraphs: string[]): ParsedChapter[] {
  const parts: ParsedChapter[] = [];
  let current: ParsedChapter = { title: 'Part 1', paragraphs: [], words: 0 };
  for (const p of paragraphs) {
    current.paragraphs.push(p);
    current.words += countWords(p);
    if (current.words >= PART_WORDS) {
      parts.push(current);
      current = { title: `Part ${parts.length + 1}`, paragraphs: [], words: 0 };
    }
  }
  if (current.paragraphs.length) parts.push(current);
  return parts;
}

export function parseGutenberg(raw: string): ParsedBook {
  const { title, author } = readHeader(raw);
  const chapters = splitChapters(toParagraphs(stripBoilerplate(raw)));
  return { title, author, chapters };
}

/** True when the downloaded file is the book we asked for. */
export function titleMatches(fileTitle: string | null, expect: string): boolean {
  if (!fileTitle) return false;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  return norm(fileTitle).includes(norm(expect));
}

export const WORDS_PER_MINUTE = 230;

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
