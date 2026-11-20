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
  Each cloud is one outline traced over its round puffs (`cloudPath.ts`),
  so the soft fill has no seams where puffs overlap.
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
- `src/components/art/`: `SkyBackdrop`, `Crescent`, `Cloud`, `CloudBank`,
  and `cloudPath.ts` (tested in `src/__tests__/cloudPath.test.ts`).
- `src/components/Screen.tsx`, `TabBar.tsx`, `EmptyState.tsx`, `Section.tsx`,
  `Stat.tsx`, `Chip.tsx`, `Button.tsx`, `PageStepper.tsx`: the new look.
- `src/app/_layout.tsx`: loads Lato (Light, Regular, Bold) and Literata
  (Regular, Italic). Gloock was removed.

See `docs/DESIGN-SYSTEM.md` for the full token and type tables.

## Calmer screens

After seeing the first build, Kaveesh found the screens too crowded with
text. Each screen now follows one rule: no explanation line under a tab
screen's title, one short detail line per item, about three groups, and one
main button.

- **Sky:** the sky, the book in your hands with one line (chapter and time
  left), Light the lamp and Log pages, your constellation and this week's
  moons. The scan link lives in Journal, other books on Shelf, all-time
  numbers in the Moon Log. When a backup is due, a small warm dot sits on
  the settings gear instead of a sentence.
- **Book:** cover, chapter, three numbers (read, nights, minutes), Light the
  lamp and Log pages, the last three nights, the last three journal entries.
  Page and chapter boxes sit behind "Edit pages and chapters"; shelf actions
  behind "More options".
- **Log reading:** no caption or helper lines; times are one scrolling row;
  the pages line only appears once pages were read.
- **Journal:** tonight's question, then your entries. Search and filters sit
  behind a search icon; scanning is the header icon. Each entry shows the
  words first, then one small line with the date, book and page.
- **Shelf and Paths:** no caption under the title.

## Immersive sky

The Sky tab is no longer a page you scroll. The sky fills the whole screen,
edge to edge, and only "Your sky" and the settings gear sit on top of it.

- **Depth:** the sky is built from layers at different distances. Far away:
  a faint Milky Way band and fine dust. In the middle: your reading stars,
  then a pale far cloud bank and a deeper mid bank. Close by: dark corner
  clouds and a soft vignette. When you tilt the phone, near layers shift more
  than far ones, a few points at most (parallax).
- **Time of night:** the sky colour follows the clock. A little purple at
  dusk, deepest around midnight, a hint of dawn near morning
  (`src/domain/skyMood.ts`, tested).
- **Explore:** drag to wander, pinch to zoom in (up to 2.6x), double-tap to
  return. Tap a star to ring it and float a small card beside it with the
  night, the minutes, what you wrote, and Open night.
- **Book on the clouds:** the book in your hands rests on the cloud bank with
  its star, title, chapter and a round lamp button. With no book, a barcode
  button adds one.
- **Tonight sheet:** swipe the book up (or tap it) and a sheet rises from the
  clouds with the book, this week's moons and your path. The sky dims behind
  it. Swipe down or tap the sky to close.
- **Calm:** motion only follows your touch or tilt. With Reduce Motion there
  is no tilt and sheets simply appear.

Files: `src/app/(tabs)/index.tsx`, `src/components/sky/Atmosphere.tsx`,
`src/components/sky/DepthClouds.tsx`, `src/features/sky/useTilt.ts`
(expo-sensors DeviceMotion), `src/domain/skyMood.ts`, `src/domain/random.ts`.
