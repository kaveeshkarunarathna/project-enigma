# Phase 4: The Lamp, the reading timer

**Status:** shipped

## What it does

Open the lamp with **Read now** on Tonight or on a book page (`/lamp?bookId=...`).

1. **Choose a length:** 10, 15, 20 or 30 minutes, or **Open**, which counts up.
2. **Light the lamp.** The screen dims, the status bar hides, the phone stays
   awake, and a small light circles the book's star while stardust gathers.
3. **Pause** and **Resume** whenever you need. **End** finishes early, and every
   minute still counts.
4. **When the time is up** there is one soft success haptic and the session
   **saves itself**: minutes go to tonight's moon and stardust goes to the book.
5. **Afterwards**, an optional sheet asks for:
   - the page you stopped on,
   - chapters finished (a − and + stepper, shown when the book has chapters),
   - whether you finished the book (also set automatically when you reach the
     last page or chapter),
   - a thought, saved to the journal as a note linked to the book and session.

   **Keep reading** starts an open, count-up session. It is saved separately
   when you end it, so the first session stays as it was.

The first session of a night says "A new star in your sky". Later ones say
"Tonight's moon is fuller".

## Reliability

- Time is kept as timestamps (`src/domain/lamp.ts`), not ticks, so the timer is
  right after the phone sleeps or the app is in the background.
- A running lamp is remembered. If the app is closed mid-session, opening the
  lamp for the same book brings it back, and if the time ran out meanwhile it
  completes and saves straight away.
- Sessions under 20 seconds are not saved, so an accidental tap leaves no trace.
- The closing X explains that time keeps counting while the lamp is open.

## The book star

`src/components/sky/BookStar.tsx` draws the star with Skia: a softly lit sphere
(light from the upper left, a warm glow, a faint rim), with **chapter beads on
a tilted orbit**. Beads in front of the star are larger and brighter; beads
behind are smaller, dimmer and hidden by the star. Lit beads glow in
candlelight. The ring turns once every 90 seconds when idle and stops while you
read. Under Reduce Motion nothing moves.

## Not yet included

- The Android ongoing notification with a Pause button, and the optional
  Do Not Disturb, come with reminders in phase 10.
- A soft bell sound (sound is off by default) comes in phase 10.

## Tests

`src/__tests__/lamp.test.ts` covers pauses, sleeping phones, completing at
exactly the target, ending early, keep reading, ignored actions and clock
formatting. The data tests cover recording the page after the lamp saved a
session, and the stardust for newly lit beads.

## Web preview

The app now also builds for the web (`npx expo export --platform web`), only
so screens can be checked and screenshotted without a phone. Skia loads its
WebAssembly from `public/canvaskit.wasm`. The preview needs the
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` headers for the web database.

Running the whole flow in the preview caught a real bug: the database provider
re-opened the database on every render. `onInit` is now a stable function.
