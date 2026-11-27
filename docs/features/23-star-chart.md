# Phase 23: The sky as a star chart of your books

**Status:** shipped

The sky used to show a star for every night read, which grew into a dense
cloud of dots that said little. Nights already have their home in the Moon
Log. The sky now shows what the reader has read: every finished book is a
star, and the books of a path join into its constellation.

## What the reader sees

- **Header:** "Your sky" in italic serif, with "14 books read, 3
  constellations complete" under it.
- **Books are stars.** Longer books are slightly bigger stars.
- **Paths are constellations.** A path appears once one of its books is
  finished. Read end to end, its lines are solid and its name is lettered
  under it in italic serif, the way star atlases name constellations. A path
  still being read is a faint dotted outline with "2 of 5 stars".
- **Lone stars:** finished books in no path sit in the gaps between shapes.
- **Room to breathe.** The chart is larger than the screen. It opens on the
  constellation finished last, with the next one peeking in from the side.
  Drag to wander, pinch to zoom, double tap to come home.
- **Choosing.** Tap a constellation (a star, its name or the space around
  it): the rest of the sky fades back, the view glides to it and its lines
  trace in again. Its name, "All 4 stars lit, finished October 2026" (or the
  next book to read) and **Open path** rest on the clouds where the book in
  hand usually sits. Tap a star for its title, author, when it was finished
  and **Open book**. Tap open sky to let go. A light haptic tick confirms a
  choice.
- **Empty sky:** "Your first star is waiting. Finish a book and it lights up
  here. Follow a path and its books join into a constellation."

## How the chart is laid out

`layoutStarChart` in `src/domain/starChart.ts` (pure, tested):

- Paths shown: followed, made by the reader, or already complete, and only
  once a book in them is finished. Complete ones come first.
- Constellations sit in a two-column grid of cells a little narrower than
  the screen, odd columns dropped a little and every cell jittered by a
  stable hash, so it reads as a sky, not a grid. Each shape is the path's
  existing `constellationPoints`, so it matches the Paths tab.
- Lone stars are placed by hash, kept clear of every constellation and of
  each other.
- `hitStarChart` answers a tap: a star first, then a constellation's name or
  box, else open sky. `homeConstellation` picks where the chart opens.

## Code

- `src/domain/starChart.ts`, tests in `src/__tests__/starChart.test.ts`.
- `src/components/sky/StarChartView.tsx` draws the chart (Skia) and the
  names (text, so they stay sharp and accessible).
- `src/features/sky/useStarChart.ts` keeps the chart live.
- `src/app/(tabs)/index.tsx`: camera, gestures, the chosen card. The whole
  sky is one accessible image whose label lists the complete
  constellations and how far along the others are.
