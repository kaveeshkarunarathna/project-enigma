# Phase 22: The Moon Log in the tab bar, and a full sample sky

**Status:** shipped

The Moon Log is the habit tracker, and it was two taps deep (pull up
tonight, tap the week strip). It is now a tab of its own, so the nightly
habit is always one tap away.

## What the reader sees

- The tabs are **Sky, Moons, Shelf, Paths, Journal**. Moons uses the
  Phosphor moon icon and opens the same Moon Log as before, without a back
  arrow.
- Links that used to push the Moon Log (the week strip under tonight, the
  goal link in Settings) now switch to the tab.
- Tabs are a little narrower (`minWidth` 64) so five fit, with room to spare
  on an iPhone SE.

## Dev tools: Load a full sky

Development builds get a second sample next to **Load a sample sky**:
**Load a full sky**, about five months of nightly reading. It reads three
curated paths end to end (First Steps with the Stoics, Short Classics for
Long Evenings, Doors into Other Worlds), leaves Classic Science Fiction,
Gently part way (Fahrenheit 451 at page 92 of 158), and writes reflections
and a few short quotes along the way. It reuses a book already on the shelf
with the same title, so loading twice never doubles a book.
**Erase everything** now also unfollows curated paths.

## Code

- `src/app/(tabs)/moonlog.tsx` (moved from `src/app/moonlog.tsx`; the
  `/moonlog` route is unchanged), `src/app/(tabs)/_layout.tsx`,
  `src/components/TabBar.tsx`, `src/components/icons.ts`.
- `loadFullSky` in `src/features/dev/sampleData.ts`, button in
  `src/app/dev.tsx`.
