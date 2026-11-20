# Phase 6: Tonight, Your sky, and the finished-book moment

**Status:** shipped

## Tonight

Tonight follows the "one hero per screen" rule:

- **The hero** is the star of the book you are most likely to read tonight
  (the reading book with the latest session). It is the 3D book star from
  phase 4, with its chapter ring turning once every 90 seconds. Tap it to open
  the book.
- Under it are the title, the author and one progress caption, then the only
  starlight button: **Read now**, which opens the lamp.
- With no book yet, an unlit star says "Your sky is still dark" with **Find a
  book**.
- **This week** shows the Moon Log strip (phase 5). Tap it for the Moon Log.
- **Also reading** lists any other books in progress.

The hero has the screen's one orchestrated entrance: it fades in and grows
slightly, like a star brightening (`Ignite`). There are no per-card
animations. Under Reduce Motion it simply appears.

## Your sky

The Sky tab shows **one star for every night you read**
(`src/domain/sky.ts`, `src/components/sky/NightSky.tsx`):

- Stars are placed on a golden-angle spiral, so the sky fills from the centre
  outwards. The whole sky zooms out as it grows, so a few nights still fill the
  view and every star keeps its place relative to the others.
- Longer nights are larger and brighter, up to twice the nightly goal.
- The newest star breathes very slowly (a 6-second glow). It is still under
  Reduce Motion.
- Below the sky: nights, minutes, books and stardust (tap for the Moon Log),
  then **Stars that ignited**, your finished books.

## A star ignites

Finishing a book is one of the app's two celebrations, the other being a full
moon. `/ignite` shows the book's star fully lit. It swells gently and settles
over about three seconds, with one success haptic. Then the title fades in
with the nights, minutes and stardust it took. **Back to tonight** returns home.

It opens when:

- you mark a book as finished on its page, or
- after a lamp session you tick "I finished this book", or you log the last
  page or chapter.

Under Reduce Motion the star and the text simply appear.

## Tests

The sky layout tests check that old stars keep their direction as the sky
grows and that every star stays inside the canvas, even with 400 nights.
