# Phase 12: Paper books, and the sky at the centre

**Status:** shipped

The app is now built around readers of physical books, and around the night
sky. A session is counted two ways: by **time** (the lamp, or "about how long"
when logging) and by **pages** (where the reader stopped). Both fill the sky.

## The sky is the first screen

The first tab, **Sky** (`src/app/(tabs)/index.tsx`), holds:

- **Your sky:** one star for every night read. Nothing in it ever goes dark.
- **In your hands:** the book being read, with its star and ring, where the
  reader is, and a gentle "about 3 weeks to go at your pace" once there is a
  pace to go on.
- **Two ways to count tonight:** *Light the lamp* (a timed session) and
  *Log pages* (reading already done without the lamp).
- **Your constellation:** the followed path that holds the book in hand, or
  else the newest followed path still to finish, filling page by page.
- **This week:** the moons, plus minutes, pages and pages a week lately.
- **All your nights:** lifetime nights, minutes, books and stardust.

The tabs are now Sky, Shelf, Paths and Journal. The shelf moved from a pushed
screen into its own tab (`/shelf` still works everywhere it was linked). The
old Tonight and Sky tabs are merged into the new first screen.

## Adding a paper book by its barcode

`src/app/barcode.tsx` reads the EAN-13 barcode on the back cover with
`expo-camera` (no photo is taken) and looks the ISBN up in Open Library
(`src/services/openLibrary.ts`). The ISBN finds the reader's **edition**, so
the page count in the app matches the book in their hands. There is a typed
ISBN fallback (checked with `src/domain/isbn.ts`), and when the catalog does
not know a book, a hand entry form prefilled with the ISBN.

Storage: migration 2 adds `books.isbn` with a unique index. Adding the same
book twice (by ISBN or by catalog work) keeps one book and pins it to the
scanned edition.

## Counting pages

- **PageStepper** (`src/components/PageStepper.tsx`): "Stopped on page" in a
  couple of taps. The page is big and editable, minus and plus nudge it,
  +5 / +10 / +20 jump ahead, and it says how many pages that makes this
  session. Used after the lamp and when logging.
- **Log reading** (`src/app/log.tsx`): book, tonight or last night, about how
  long (5 to 60 minutes) and the page reached. It fills the same moon, star
  and constellation as a timed session. Reaching the last page marks the book
  finished and plays the ignite moment.

## Stars and constellations fill page by page

`src/domain/paths.ts`:

- `starFill(book)`: 0..1. A finished book is a whole star; a book being read
  fills with `currentPage / pageCount`, held just short of whole until the
  reader marks it finished.
- `pathProgress` now returns `fills` per star and `fraction` for the whole
  constellation, so a path shows "5% of the way" after the first evening.
- `lineFill(fills, i)`: the line to the next star starts drawing once a star is
  whole and reaches the next star as that book is read.

`Constellation` draws this: the book being read grows and brightens with every
page, with a thin arc around it showing how far in the reader is, and lines
trace themselves in. A book's own star already brightens with completion.

## Pace

`src/domain/pace.ts` (`readingPace`, `weeksToFinish`, `finishLine`), fed by
`paceSessions` in `src/data/sessions.ts`. Pages per session are
`page_to - page_from`; a session without a stopping page counts time only.

- Pages and minutes this week (the 7 nights ending tonight).
- Pages a week, averaged over four weeks, quiet weeks included.
- Pages an hour, only after at least 20 minutes of timed reading with pages.

Shown on the Sky screen and in a new "Your pace" section of the Moon Log. It is
only ever descriptive: no "behind", nothing to catch up on.

## Tests

`src/__tests__/isbn.test.ts`, `openLibrary.test.ts`, `pace.test.ts` and the
new cases in `paths.test.ts` (fills, lines, tonight's constellation).
