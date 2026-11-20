import { normalizeTitle } from '@/domain/paths';

/**
 * Public-domain classics the reader can download and read inside the app.
 *
 * Every text comes from Project Gutenberg as plain text, downloaded once on
 * the phone. Only books whose author and translator died long ago are listed
 * (over 70 years), so they are public domain in most countries, not just the
 * United States. Notes are our own words.
 *
 * `expect` is a word or phrase that must appear in the downloaded file's
 * title, so a wrong id can never put the wrong book on the shelf.
 */
export type Classic = {
  id: string;
  gutenbergId: number;
  title: string;
  author: string;
  translator?: string;
  /** Year the original was first published. */
  year: number;
  genre: 'philosophy' | 'classics' | 'fantasy' | 'scifi';
  /** Rough length, to set expectations before downloading. */
  hours: number;
  expect: string;
  note: string;
};

export const CLASSICS: Classic[] = [
  {
    id: 'enchiridion',
    gutenbergId: 45109,
    title: 'The Enchiridion',
    author: 'Epictetus',
    translator: 'Thomas Wentworth Higginson',
    year: 135,
    genre: 'philosophy',
    hours: 1,
    expect: 'Enchiridion',
    note: 'Short numbered sections. A good first book to read on your phone.',
  },
  {
    id: 'meditations',
    gutenbergId: 2680,
    title: 'Meditations',
    author: 'Marcus Aurelius',
    translator: 'Meric Casaubon',
    year: 180,
    genre: 'philosophy',
    hours: 5,
    expect: 'Meditations',
    note: 'An older translation with old-fashioned spelling. Read a few entries and stop.',
  },
  {
    id: 'apology',
    gutenbergId: 1656,
    title: 'Apology',
    author: 'Plato',
    translator: 'Benjamin Jowett',
    year: -399,
    genre: 'philosophy',
    hours: 1,
    expect: 'Apology',
    note: 'One evening, one speech. The start of the Questions path.',
  },
  {
    id: 'symposium',
    gutenbergId: 1600,
    title: 'Symposium',
    author: 'Plato',
    translator: 'Benjamin Jowett',
    year: -385,
    genre: 'philosophy',
    hours: 3,
    expect: 'Symposium',
    note: 'Jowett’s long introduction comes first. You can skip ahead to the dinner.',
  },
  {
    id: 'candide',
    gutenbergId: 19942,
    title: 'Candide',
    author: 'Voltaire',
    year: 1759,
    genre: 'classics',
    hours: 3,
    expect: 'Candide',
    note: 'Thirty short chapters that move very fast.',
  },
  {
    id: 'frankenstein',
    gutenbergId: 84,
    title: 'Frankenstein',
    author: 'Mary Shelley',
    year: 1818,
    genre: 'classics',
    hours: 8,
    expect: 'Frankenstein',
    note: 'It begins with letters from a ship in the Arctic. Keep going.',
  },
  {
    id: 'pride-and-prejudice',
    gutenbergId: 1342,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: 1813,
    genre: 'classics',
    hours: 11,
    expect: 'Pride and Prejudice',
    note: 'Short chapters, perfect for a chapter a night.',
  },
  {
    id: 'jane-eyre',
    gutenbergId: 1260,
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    year: 1847,
    genre: 'classics',
    hours: 17,
    expect: 'Jane Eyre',
    note: 'A long book that reads quickly once Jane starts talking to you.',
  },
  {
    id: 'crime-and-punishment',
    gutenbergId: 2554,
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    translator: 'Constance Garnett',
    year: 1866,
    genre: 'classics',
    hours: 18,
    expect: 'Crime and Punishment',
    note: 'Garnett’s translation, the one many readers first met.',
  },
  {
    id: 'anna-karenina',
    gutenbergId: 1399,
    title: 'Anna Karenina',
    author: 'Leo Tolstoy',
    translator: 'Constance Garnett',
    year: 1878,
    genre: 'classics',
    hours: 30,
    expect: 'Anna Karenina',
    note: 'Over two hundred short chapters. One a night is a fine pace.',
  },
  {
    id: 'alice',
    gutenbergId: 11,
    title: 'Alice’s Adventures in Wonderland',
    author: 'Lewis Carroll',
    year: 1865,
    genre: 'fantasy',
    hours: 2,
    expect: 'Alice',
    note: 'The original door into another world. Two or three evenings.',
  },
  {
    id: 'oz',
    gutenbergId: 55,
    title: 'The Wonderful Wizard of Oz',
    author: 'L. Frank Baum',
    year: 1900,
    genre: 'fantasy',
    hours: 3,
    expect: 'Wizard of Oz',
    note: 'Short chapters and a road that keeps going. Good for tired nights.',
  },
  {
    id: 'time-machine',
    gutenbergId: 35,
    title: 'The Time Machine',
    author: 'H. G. Wells',
    year: 1895,
    genre: 'scifi',
    hours: 3,
    expect: 'Time Machine',
    note: 'The first star of the science fiction path, free to read here.',
  },
  {
    id: 'war-of-the-worlds',
    gutenbergId: 36,
    title: 'The War of the Worlds',
    author: 'H. G. Wells',
    year: 1898,
    genre: 'scifi',
    hours: 6,
    expect: 'War of the Worlds',
    note: 'Told like a report from someone who was there.',
  },
];

export function getClassic(id: string | null | undefined): Classic | null {
  return CLASSICS.find((c) => c.id === id) ?? null;
}

const surname = (name: string | null | undefined) =>
  normalizeTitle(name ?? '')
    .split(' ')
    .pop() ?? '';

/** The catalog classic for a book or path entry, matched by title and the author's surname. */
export function findClassic(title: string, author: string | null | undefined): Classic | null {
  const t = normalizeTitle(title);
  return (
    CLASSICS.find(
      (c) => normalizeTitle(c.title) === t && (!author || surname(c.author) === surname(author)),
    ) ?? null
  );
}
