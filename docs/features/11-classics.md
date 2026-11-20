# Phase 11: Free classics, read in the app

**Status:** shipped (downloads not yet tried on a phone, see "Check on a device")

A small library of public-domain classics that the reader downloads once and
reads inside Night Atlas, offline after that. Time in the reader counts just
like a lamp session, and every chapter lights a bead.

## What is in the library

`src/content/classics.ts` lists **14 books**, chosen to match the curated paths:

| Genre | Books |
| --- | --- |
| Philosophy | The Enchiridion (Higginson), Meditations (Casaubon), Apology and Symposium (Jowett) |
| Classics | Candide, Frankenstein, Pride and Prejudice, Jane Eyre, Crime and Punishment and Anna Karenina (Garnett) |
| Fantasy | Alice’s Adventures in Wonderland, The Wonderful Wizard of Oz |
| Science fiction | The Time Machine, The War of the Worlds |

Rules for adding a book:

- **Public domain in most countries, not only the US.** The author and any
  translator must have died more than 70 years ago. That is why, for example,
  Kafka's Metamorphosis (a modern translation) and Russell are not here.
- Give its Project Gutenberg number, the year, a rough length in hours, a
  note in our own words, and `expect`, a word that must appear in the
  downloaded file's title.

> Kaveesh: the Gutenberg numbers are from memory, because gutenberg.org is not
> reachable from the build machine. The `expect` check means a wrong number
> can only fail to download, never show the wrong book. Please try each one
> once on a phone and correct any that fail.

## How a book gets onto the phone

1. The reader opens a classic and taps **Download and read**.
2. `src/services/gutenberg.ts` fetches one plain-text file,
   `gutenberg.org/cache/epub/<n>/pg<n>.txt`. Nothing is sent but the request.
3. `src/domain/gutenberg.ts` turns it into chapters, on the phone:
   - keeps only the text between the `*** START` and `*** END` markers, and
     drops volunteer credits, illustration placeholders and any line naming
     Project Gutenberg (their licence asks this of anyone who passes the
     texts on without their trademark);
   - joins hard-wrapped lines into paragraphs, but keeps the line breaks of
     verse, and removes `_italic_` marks;
   - finds headings ("CHAPTER XII", "Book One", "LETTER IV", "IV.") and joins
     a short subtitle line ("Down the Rabbit-Hole") to its heading;
   - drops "chapters" with almost no words, which is how a table of contents
     is removed;
   - cuts a text without headings into parts of about 3,000 words.
4. If the title does not match `expect`, nothing is saved.
5. `src/data/classics.ts` stores the chapters (migration 2:
   `classic_texts`, `classic_chapters`) and puts the book on the shelf with
   format `classic`, one bead per chapter.

This is the only place the app stores book text, and only for books that are
out of copyright. The rule for everything else is unchanged.

## Reading

`/classics/[id]` (`src/app/classics/[id].tsx`):

- A quiet top bar: back, the book and "Chapter 3 of 24", **Aa** (three text
  sizes, remembered) and **Contents**.
- Literata body text with generous line height, in Night or Dawn.
- The place is remembered: chapter and how far down it.
- **Next chapter** at the end of each chapter marks it read and lights a bead.
  On the last chapter it becomes **Finish the book**, which opens the
  finished-book moment.
- **Press and hold a paragraph** to keep a quote. Long paragraphs offer their
  opening sentences, up to about 60 words, and the quote editor takes over.
- **Contents** lists every chapter with a mark on the ones read, and has
  **Remove the text from this phone** (the shelf book and its progress stay).

### Reading time counts

The reader runs its own clock (`useReadingClock`): only while the screen is in
front and the app is open. When the reader leaves, the time and the chapters
finished are saved as a session with `logSession`, exactly as the Lamp does,
so tonight's moon fills and stardust is earned. Sessions under 20 seconds with
no chapter finished are not saved.

## Where it appears

| Place | What it does |
| --- | --- |
| Shelf | A books icon next to +, and a **Free classics** button on the empty shelf. |
| Path screen | A path book that is in the library offers **Read it here, free** and **I have a copy**. |
| Book screen | A classic shows **Start reading / Keep reading**, opening the reader, and hides the manual page editor. |
| Tonight | **Read now** opens the reader for a classic, the Lamp for any other book. |

Matching between paths, the shelf and the library uses `findClassic`: the
normalised title and the author's surname.

## Check on a device

On the web preview the download is blocked, which shows the offline message
correctly. Dev builds offer **Use a sample text** (a made-up book in
Gutenberg's shape, `src/features/classics/sample.ts`) to try the reader
without a download. On a phone, please download two or three real books and
check that the chapters look right.

## Tests

- `src/__tests__/gutenberg.test.ts`: markers, credits, illustrations,
  unwrapping, verse, headings and subtitles, the contents list, parts,
  title check, catalog rules and `findClassic`.
- `src/__tests__/classics.test.ts`: saving, shelving, chapters, place,
  chapters counted once, downloading again, removing.

## Not yet

- Bookmarks and highlights.
- Search inside a book.
- More books, and an EPUB source with nicer typography (Standard Ebooks).
