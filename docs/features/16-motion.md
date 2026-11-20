# Phase 16: Calm motion

**Status:** shipped

The app now moves the way a night sky does: slowly, and only when something
is worth noticing. Every animation either confirms what the reader just did
or shows them progress they earned. Nothing loops fast, nothing flashes, and
with Reduce Motion on every one of them becomes instant.

## Shared timings

`motion` in `src/theme/tokens.ts` holds every duration: `fade` 240 ms,
`enter` 460 ms, `stagger` 90 ms, `select` 180 ms, `count` 700 ms, `draw`
1200 ms, and the ambient loops (`ambientMs` 45 s, `twinkleMs` 60 s). The maths
used on the UI thread lives in `src/domain/motion.ts`, with tests in
`src/__tests__/motion.test.ts`.

## Moving between screens

- **Screens settle in.** `Screen` wraps its title in `Rise` (a short fade
  while it rises 10 points), and the body follows one beat later as one
  piece (`src/components/motion/Rise.tsx`).
- **Tabs crossfade** instead of cutting (`src/app/(tabs)/_layout.tsx`).
- **The tab bar has a small star** above the current tab that springs to the
  next one when you switch (`src/components/TabBar.tsx`).

## The sky comes alive

All in `src/components/sky/NightSky.tsx`:

- **Twinkle.** Stars are split into four groups, each softening and
  brightening on its own slow rhythm (8 to 15 seconds). A star dims to 82% at
  most, so it never blinks out. One shared clock drives every star, so a sky
  of hundreds costs the same as a sky of ten.
- **First sight.** The first time the sky is opened after launch, it fills in
  from the centre outwards, which is also from the oldest nights to the
  newest.
- **A star is born.** When a session adds tonight's star while the app is
  open, the star grows into place and a ring of light spreads from it and
  fades.
- **A shooting star.** Every 40 to 90 seconds a faint meteor crosses part of
  the sky in under a second. It is rare on purpose.

## Progress you can see grow

- **Constellation lines draw themselves in**, star to star in reading order,
  when a path is shown (`Constellation.tsx`).
- **Chapter beads light one after another** when a session lights more of the
  ring, each with a brief swell as it catches the light (`BookStar.tsx`).
- **Numbers count up** to their value, easing as they arrive: the week's
  minutes and pages on the sky, the Moon Log's totals, and each night's
  minutes and pages (`CountUp`, used by the shared `Stat` component). Screen
  readers hear only the final number.
- **The page number ticks** with a small bump each time it changes in the
  page stepper.

## Quiet confirmations

- **Choices ease.** A chip's outline and background fade in over 180 ms
  instead of snapping (`Chip.tsx`).
- **Whispers.** Saving says so once, at the bottom of the screen, with a
  success haptic, then fades on its own: "Tonight's star is in your sky"
  after logging pages or a lamp session, "Your night is updated" after a
  correction, "Kept in your journal" after writing, and "A copy of your sky
  is saved" after a backup. Screen readers announce the same line
  (`whisper()` and `WhisperHost` in `src/components/motion/Whisper.tsx`).

## Not animated, on purpose

- No card-by-card entrances, no bounces, no confetti.
- Celebrations stay where they were: a finished book (Ignite) and a full moon.
- Nothing moves faster than it needs to, and nothing repeats in under eight
  seconds.
