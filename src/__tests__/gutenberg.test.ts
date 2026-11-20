/// <reference types="jest" />
import { CLASSICS, findClassic } from '@/content/classics';
import {
  isHeading,
  parseGutenberg,
  readingMinutes,
  stripBoilerplate,
  titleMatches,
  toParagraphs,
} from '@/domain/gutenberg';

// A made-up file in the shape of a Project Gutenberg plain-text book.
const words = (n: number, seed: string) => Array.from({ length: n }, (_, i) => `${seed}${i % 7}`).join(' ');
const wrap = (text: string) => text.replace(/(.{1,70})(\s|$)/g, '$1\n').trim();

const FILE = [
  '﻿The Project Gutenberg eBook of The Lantern Keeper',
  '',
  'This ebook is for the use of anyone anywhere in the United States.',
  '',
  'Title: The Lantern Keeper',
  '',
  'Author: A. N. Example',
  '',
  '*** START OF THE PROJECT GUTENBERG EBOOK THE LANTERN KEEPER ***',
  '',
  'Produced by Volunteers at a Distributed Proofreading site.',
  '',
  'CONTENTS',
  '',
  'CHAPTER I. The Hill',
  '',
  'CHAPTER II. The Shop',
  '',
  'CHAPTER I.',
  '',
  'The Hill',
  '',
  wrap(`The keeper climbed the hill with a _small_ lamp. ${words(60, 'hill')}.`),
  '',
  '    A lamp upon the hill,',
  '    A book upon the knee,',
  '    The night is long and still.',
  '',
  '[Illustration: A lamp on a hill]',
  '',
  'CHAPTER II.',
  '',
  'The Shop',
  '',
  wrap(`Orrin kept the shop below the hill. ${words(80, 'shop')}.`),
  '',
  '*** END OF THE PROJECT GUTENBERG EBOOK THE LANTERN KEEPER ***',
  '',
  'Updated editions will replace the previous one. Project Gutenberg licence text follows.',
].join('\r\n');

describe('Gutenberg parsing', () => {
  it('keeps only the text between the markers', () => {
    const body = stripBoilerplate(FILE);
    expect(body).not.toContain('START OF');
    expect(body).not.toContain('Updated editions');
    expect(body).not.toContain('\r');
  });

  it('unwraps prose, keeps verse lines, drops credits and italics marks', () => {
    const paras = toParagraphs(stripBoilerplate(FILE));
    expect(paras.some((p) => p.startsWith('Produced by'))).toBe(false);
    expect(paras.some((p) => p.includes('Illustration'))).toBe(false);
    const prose = paras.find((p) => p.startsWith('The keeper'))!;
    expect(prose).not.toContain('\n');
    expect(prose).toContain('a small lamp');
    expect(paras).toContain('A lamp upon the hill,\nA book upon the knee,\nThe night is long and still.');
  });

  it('finds chapters, skips the contents list and joins subtitles', () => {
    const book = parseGutenberg(FILE);
    expect(book.title).toBe('The Lantern Keeper');
    expect(book.author).toBe('A. N. Example');
    expect(book.chapters.map((c) => c.title)).toEqual(['Chapter I: The Hill', 'Chapter II: The Shop']);
    expect(book.chapters[0].paragraphs).toHaveLength(2);
    expect(book.chapters[1].words).toBeGreaterThan(80);
    for (const c of book.chapters) for (const p of c.paragraphs) expect(p).not.toMatch(/gutenberg/i);
  });

  it('recognises common heading shapes, and not prose', () => {
    for (const h of ['CHAPTER XII', 'Chapter 3', 'BOOK ONE', 'LETTER IV', 'IV.', 'Stave I: Marley’s Ghost'])
      expect(isHeading(h)).toBe(true);
    expect(isHeading('Chapter after chapter, she read on, slowly, into the night.')).toBe(false);
    expect(isHeading('I')).toBe(true);
    expect(isHeading('It was late.')).toBe(false);
  });

  it('cuts a text without headings into parts', () => {
    const file = `*** START OF THE PROJECT GUTENBERG EBOOK X ***\n\n${Array.from({ length: 8 }, () => words(1000, 'w')).join('\n\n')}\n\n*** END OF THE PROJECT GUTENBERG EBOOK X ***`;
    const book = parseGutenberg(file);
    expect(book.chapters.map((c) => c.title)).toEqual(['Part 1', 'Part 2', 'Part 3']);
  });

  it('checks the downloaded title', () => {
    expect(titleMatches('Frankenstein; Or, The Modern Prometheus', 'Frankenstein')).toBe(true);
    expect(titleMatches('Alice’s Adventures in Wonderland', 'Alice')).toBe(true);
    expect(titleMatches('Dracula', 'Frankenstein')).toBe(false);
    expect(titleMatches(null, 'Frankenstein')).toBe(false);
    expect(readingMinutes(2300)).toBe(10);
  });

  it('has a sound catalog', () => {
    expect(new Set(CLASSICS.map((c) => c.id)).size).toBe(CLASSICS.length);
    expect(new Set(CLASSICS.map((c) => c.gutenbergId)).size).toBe(CLASSICS.length);
    for (const c of CLASSICS) expect(titleMatches(c.title, c.expect)).toBe(true);
  });
});

describe('findClassic', () => {
  it('matches path and shelf books by title and surname', () => {
    expect(findClassic('Frankenstein', 'Mary Shelley')?.id).toBe('frankenstein');
    expect(findClassic('The Time Machine', 'H. G. Wells')?.id).toBe('time-machine');
    expect(findClassic('Meditations', null)?.id).toBe('meditations');
    expect(findClassic('Meditations', 'René Descartes')).toBeNull();
    expect(findClassic('Dune', 'Frank Herbert')).toBeNull();
  });
});
