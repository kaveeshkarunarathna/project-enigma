# Phase 5: Moon Log and 3D moons

**Status:** shipped

## What it does

The Moon Log is the daily habit tracker. **One moon a night**, filled by the
minutes you read against a small goal you choose.

| Moon | Meaning |
| --- | --- |
| Thin outline (new moon) | No reading that night. Never red, never "broken". |
| Crescent to gibbous | Some reading, partway to the goal. Any reading shows at least a sliver. |
| Full moon with a warm halo | Goal met. |
| Full moon with a teal halo | Goal met and a reflection written. |

Instead of streaks there is a **weekly target**: by default 4 full moons in a
Monday to Sunday week. Counts only go up, and the copy never mentions missed
nights ("1 of 4 full moons. 3 more nights this week.").

### Where it shows

- **Tonight** has a "This week" strip of seven moons with weekday initials.
  Tonight's moon has a faint ring. Tap the strip to open the Moon Log.
- **Moon Log** (`/moonlog`):
  - this week's strip and message,
  - the month as a grid of moons, with previous and next month,
  - **Nightly goal**: 5, 10, 15 or 30 minutes,
  - **Full moons for a complete week**: 3 to 7,
  - **Since you began**: nights read, minutes and books finished.

Changing the goal never rewrites past moons, because each night keeps the goal
it was read with (phase 2).

## The 3D moons

`src/components/sky/Moon.tsx` draws each moon with Skia:

- a shaded sphere lit from the upper right, with limb darkening,
- five faint craters,
- a correct phase shape (a semicircle closed by the terminator ellipse,
  bulging right for a crescent and left for a gibbous),
- a softened terminator,
- a halo when full: candlelight, or aurora teal with a reflection.

A whole week or month is drawn in **one canvas** (`MoonCanvas`) instead of a
canvas per moon, which keeps it light on the phone. Invisible views on top
carry a label for each night, so VoiceOver and TalkBack can read "Tuesday:
full moon with a reflection" or "Tonight, Thursday: moon 40 percent full".

## Dev tools

`/dev` (development builds only) can **load a sample sky**, a month of
believable reading with books, sessions, reflections and a quote, or
**erase everything**. It makes every screen easy to see without waiting
weeks. It is hidden in store builds.

## Tests

`monthGrid` (Monday-first, with blanks) has a test, alongside the Moon Log
rules from phase 2.
