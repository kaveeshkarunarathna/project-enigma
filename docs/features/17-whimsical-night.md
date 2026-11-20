# Phase 17: Whimsical Night

**Status:** shipped

The whole app now looks like a page from a storybook night: an indigo sky
that fades to a warm plum floor, tiny scattered stars, a flat sand-coloured
crescent moon, soft plum clouds, and titles set in wide-tracked capitals in
warm cream. It follows a reference illustration Kaveesh chose, and the
mockup he approved before any code was written.

The Night Atlas idea is unchanged: one star for every night read, books as
stars with chapter rings, paths as constellations, the Moon Log, calm
motion. Only the look changed.

## What changed

- **Sky behind every screen.** `SkyBackdrop` draws the gradient, the stars
  and a few clouds. Each screen gets one of three hand-made scenes, picked by
  its title, so it never shifts between visits.
- **The moon.** A flat crescent sits beside the title of screens with no
  button there, and hangs in the sky on the home screen. It is never drawn
  over text.
- **Clouds.** Soft plum clouds fade out at the bottom and drift sideways
  very slowly (a 90 second cycle). With Reduce Motion they stay still.
- **Cloud bank.** The tab bar now rests on a row of clouds at the foot of
  the screen instead of a capsule; scrolling content sinks into it.
- **Type.** Lato replaces Gloock and Literata in the interface. Titles,
  headings, labels and buttons are capitals with wide letter spacing; body
  text and captions stay in sentence case. Literata stays for reading and
  writing: journal prompts and entries, quotes, and the classics reader.
- **Empty states** are centred, with a small moon by a cloud above them.
- **Colours** moved from navy to indigo and plum; the cream text is a
  little warmer. Dawn mode gets matching light versions.

No image files were added: every illustration is vector art drawn with
`react-native-svg`, so it is sharp on any screen and adds almost nothing to
the app size.

## Files

- `src/theme/tokens.ts`: new palette roles (`skyTop`, `skyFloor`, `cloud`,
  `cloudDeep`, `moon`) and the Lato type scale, with `label`, `number`,
  `chip` and `prose` variants.
- `src/components/art/`: `SkyBackdrop`, `Crescent`, `Cloud`, `CloudBank`.
- `src/components/Screen.tsx`, `TabBar.tsx`, `EmptyState.tsx`, `Section.tsx`,
  `Stat.tsx`, `Chip.tsx`, `Button.tsx`, `PageStepper.tsx`: the new look.
- `src/app/_layout.tsx`: loads Lato (Light, Regular, Bold) and Literata
  (Regular, Italic). Gloock was removed.

See `docs/DESIGN-SYSTEM.md` for the full token and type tables.
