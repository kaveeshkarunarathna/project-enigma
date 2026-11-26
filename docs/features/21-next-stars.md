# Phase 21: Next stars, book suggestions from what you read and write

**Status:** shipped

Readers asked "what should I read next?" This phase answers on the phone,
from the books they have read and the journal they keep, with one calm line
saying why. Nothing about the reader leaves the phone, and no book text is
used.

## What the reader sees

- **Paths tab, "Next stars for you".** The top two suggestions, above the
  reader's paths, with **More** opening the full list (`/suggestions`, up to
  ten).
- Each suggestion shows the title, the author, and one reason, for example:
  - "Next on First Steps with the Stoics, after Meditations."
  - "Also by Kazuo Ishiguro, whose Klara and the Sun you finished."
  - "Close to something you wrote on Thu 19 Nov." (search by meaning on)
  - "You have been writing about time."
  - "Like Frankenstein, a book about what makes us human."
  - "More science fiction, a kind of book you come back to."
  - "A gentle first step into philosophy." (a new reader)
- Three quiet actions: **Want to read** (onto the shelf, with the cover from
  Open Library when online), **Add to a path** (the reader's own paths as
  chips right there, or **A new path**, which opens the new path form and
  starts the path with this book), and **Not for me** (set aside; the full
  list offers to bring set-aside books back).
- Tapping a title that belongs to a curated path opens that path.

Screenshots: project files `phase21/`.

## The catalogue

`src/content/catalogue.ts`: about 70 books in the app's four niches
(philosophy, classics, fantasy, science fiction). It holds every book in the
curated paths and the free classics, plus more of the same kind. Each entry
is a title, author, genre, two to four theme words from a fixed list of 20,
an optional "short" flag, and one sentence **written by us**. No book text is
quoted or summarised (a test checks notes stay short and quote-free).

Why a bundled catalogue rather than an online source: it works offline, sends
nothing about the reader anywhere, every line is ours (no licensing question
for descriptions), and it stays inside the niches Stellibria is about. Open
Library is still used only for covers and page counts when a suggestion goes
onto the shelf, as with every other book. Growing the catalogue is a content
task: add entries, the tests check the shape.

## How suggestions are chosen

`suggestBooks` in `src/domain/suggest.ts` (pure, tested). Books already on
the shelf (any status) and set-aside books are never suggested. Each other
catalogue book gathers points from:

| Signal | Weight | Reason line |
| --- | --- | --- |
| Next unread book on a curated path after the last one read | 0.30 | Next on … after … |
| Shares a curated path with a book read | 0.12 | Next on … after … |
| Same author as a book finished or being read | 0.25 | Also by … |
| Close in meaning to a journal entry (search by meaning on) | up to 0.40 | Close to something you wrote on … |
| A theme the reader's own journal words keep touching | up to 0.20 | You have been writing about … |
| A theme of books they read | up to 0.20 | Like …, a book about … |
| A genre they read (and the genre of paths they follow) | up to 0.15 | More …, a kind of book you come back to. |
| New reader: opens a curated path, or a short book, in their genre | 0.30 / 0.15 | A gentle first step into … |

Finished books count 1, reading 0.7, paused 0.3. The strongest signal gives
the reason line. For variety, one author fills at most two places, and when a
reason would repeat word for word, the book gives its next true reason
instead.

**With search by meaning on** (Phase 20), each catalogue sentence plus its
title, author and themes (`catalogueText`, our words only) is embedded once
per app launch with the same on-device model, and compared with the vectors
of the reader's journal entries. The closest entry's date becomes the reason.
**With it off**, journal themes come from plain theme words
(`THEME_WORDS`), so suggestions still listen to what the reader writes.

Only the reader's own words are read: a quote entry's passage never counts,
just as in search.

## Privacy and backups

All of it runs on the phone; no network is used to choose suggestions.
Set-aside books are a plain setting (`dismissedSuggestions`), so they travel
with a backup. Catalogue vectors are kept in memory only.

## Tests

`src/__tests__/suggest.test.ts` (14 tests): the catalogue holds every path
book and classic once, with known themes and short, quote-free notes; the
embedded text is metadata and our note only; first steps for a new reader;
next on a path and never a shelf book; same author; journal themes; meaning
match with its date; set-aside books and the author limit; reason wording; no
needless repeated reasons; set-aside list saved, backed up and cleared.
