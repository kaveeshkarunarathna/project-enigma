# Phase 15: Quotes straight from the book

**Status:** shipped (the document scanner needs a development build, like the
page scanner in phase 9)

The journal now lives next to the book in your hands. A line worth keeping is
one tap away wherever you are, the scanner reads the page the way a person
holds an open book, and every book shows what you kept from it.

## Scanning from the open book

`src/services/scanner.ts` now uses the phone's **document scanner** when it
has one: VisionKit's document camera on iOS, the ML Kit document scanner on
Android (`CameraView.scanDocumentAsync` in `expo-camera`). It finds the page's
edges, flattens the curve of an open book and can capture automatically.

- **Up to two pages.** A quote that runs over the page break can be scanned as
  two pages. Their lines are joined, so a word hyphenated across the break is
  mended (`joinScannedLines`), and the page number comes from the first page,
  or one before the second (`guessFirstPage` in `src/domain/scan.ts`). Pages
  beyond the second are not read.
- **Photos are still never kept.** The scanner's page images are written to
  the app's cache and deleted as soon as the text is read, along with the
  picker's copies (`discardPhoto`). Recognition stays on the phone, through
  `expo-text-extractor`. No network, no AI.
- **Fallbacks.** Without a document scanner the screen offers "Take a photo";
  "Choose a photo" is always there for a page already photographed.

The legal rules from phase 9 are unchanged: only the sentences the reader
picks leave the scanner, quotes are capped at 120 words (a nudge from 60), and
they stay private on the phone.

## One tap to "Scan a quote"

Opening `/scan?auto=1&bookId=…` launches the scanner straight away. It is
offered from:

- **the Journal tab**: a scan button at the top, and a "Scan a quote from the
  page" row under tonight's question, for the book in hand;
- **the sky**: "A line worth keeping? Scan it from the page" under the book in
  your hands;
- **each book's screen**: "Scan a quote from the page" in its journal.

With a book given, the scanner names it, and the quote editor opens with that
book chosen. The page is the printed page number when the scan finds one, or
else the page the reader is on in that book.

## Each book's journal

The book screen has a "Your journal" section: quotes, notes and reflections
linked to the book, newest first (5, then "Show all"), with **Scan a quote**
and **Write a note** links. The Journal tab gains a row of books to filter by
("All books" first).

## Writing glows in the sky

`readingNights` now marks nights with a journal entry, and the sky draws those
stars with a faint teal ring. The sky's caption says so once there is one.

## Tests

`scan.test.ts` (first page from one or two pages, a sentence mended across
the page break) and `nights.test.ts` (nights you wrote about).
