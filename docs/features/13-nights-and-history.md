# Phase 13: Every star tells its night

**Status:** shipped

The sky is now something to look back through, not only a picture. Every
star opens the night it stands for, every session can be fixed, and every
book shows its pages over time.

## Tap a star, open its night

On the Sky screen, tapping near a star opens that night
(`src/app/night/[night].tsx`). Tapping empty sky opens the newest night, and
for screen readers the whole sky is one button that does the same. The nearest
star within 28 points wins (`nearestStar` in `src/domain/nights.ts`).
Moons in the Moon Log's month open their night too.

A night shows:

- its moon, with the minutes and pages read;
- each sitting: which book, when, how long, and which pages
  (`SessionRow`, `src/features/sessions/SessionRow.tsx`);
- anything written in the journal that night;
- arrows to the reading nights before and after (`neighbourNights`).

A night with no reading says so kindly: "A quiet night".

## Fix or delete a session

Tapping a sitting opens it (`src/app/session/[id].tsx`): minutes read, and the
page the reader stopped on with the same page stepper as the lamp. Saving
calls `updateSession`; deleting asks once, inline, then calls `deleteSession`
(`src/data/sessions.ts`).

Rules, tested in `src/__tests__/nights.test.ts`:

- Minutes change the session's stardust by the usual one per minute, and its
  book's stardust by the same amount.
- A new page on the book's **latest** session with a page moves the book
  there, even backwards, since it is a correction. Correcting an older session
  leaves the book where it is. A page added to a session that had none only
  ever moves the book forward.
- Deleting a session takes its stardust off its book. If it was the book's
  latest stopping page, the book goes back to the previous one.

## A book's reading history

The book screen has a "Reading history" section: a `PageTrail`
(`src/components/sky/PageTrail.tsx`), a faint line of light climbing toward
the last page with a small star for each night, then the sittings, newest
first (8, then "Show all"). The trail comes from `pageSeries`, which keeps the
furthest page reached so it never dips.

## Also

- `IconButton` takes `disabled` (faint, inert), used for the night arrows.
- `listEntries` can filter by night.
