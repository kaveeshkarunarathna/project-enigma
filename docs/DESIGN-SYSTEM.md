# Design system: Night Atlas, Whimsical Night

Source of truth: `src/theme/tokens.ts`. Phase 17 restyled the app after a
storybook night illustration: an indigo sky fading to a plum floor, tiny
stars, a flat sand-coloured crescent moon, soft plum clouds, and
wide-tracked capital titles in warm cream.

## Colour roles

| Token | Night | Dawn | Use |
| --- | --- | --- | --- |
| `skyTop` | `#1A1A3E` | `#DCE3F0` | Top of the sky gradient |
| `night` | `#15153A` | `#E9EEF4` | Middle of the sky, flat backgrounds |
| `skyFloor` | `#211838` | `#EFE8EE` | Bottom of the sky gradient |
| `raised` | `#211E46` | `#F4F6F9` | Sheets and inputs |
| `hairline` | cream at 12% | ink at 12% | Separators between groups |
| `starlight` | `#EADBC1` | `#1E1B44` | Main text and the one primary button |
| `mist` | `#A79DBB` | `#5B5F82` | Secondary text, labels, inactive icons |
| `aurora` | `#8FD0C0` | `#2F7F70` | Thinking, reflections, teal moons |
| `candlelight` | `#E9D2AE` | `#C9A774` | Glow only. Never text, never a button |
| `moon` | `#D8BF97` | `#C9A774` | The illustrated crescent |
| `cloud` | `#4C3B5E` | white | Tops of clouds, which fade to nothing |
| `cloudDeep` | `#1F1935` | `#F4EEF2` | The cloud bank under the tab bar |

There is no gold.

## Type

Two families: **Lato** for the interface, **Literata** for reading and
writing (journal prompts, entries, quotes, the classics reader). At most
three sizes on a screen.

| Variant | Font | Size | Case |
| --- | --- | --- | --- |
| `hero` | Lato Light | 56 | big numbers |
| `title` | Lato Bold | 24 | CAPITALS, tracked 0.2em |
| `heading` | Lato Bold | 15 | CAPITALS, tracked 0.16em |
| `label` | Lato | 11 | CAPITALS, tracked 0.3em, mist |
| `number` | Lato Light | 26 | stat numbers |
| `body` | Lato | 16 | sentence case |
| `caption` | Lato | 13 | sentence case, mist |
| `chip` | Lato | 15 | sentence case (chips hold book titles) |
| `button` | Lato Bold | 12 | CAPITALS, tracked 0.14em |
| `prose` | Literata Italic | 17 | journal writing and prompts |

## Illustration kit

All vector, drawn with `react-native-svg`, in `src/components/art/`. No
image files.

- `SkyBackdrop`: the gradient sky, the star field, and a few clouds placed
  from one of three hand-made scenes (chosen by screen name, so a screen
  always looks the same). Behind every `Screen` and the ignite moment.
- `Crescent`: the flat moon with a faint halo. Screens show it beside the
  title (or, on the sky, hanging in the sky); never over text.
- `Cloud`: one soft cloud in three shapes, fading out at the bottom. Can
  drift sideways very slowly (90 second cycle); still under Reduce Motion.
- `CloudBank`: a row of clouds at the foot of the screen that the tab bar
  rests on; content scrolling down sinks into it.
- `EmptyState` shows a small moon by a cloud above a centred heading.

## Layout

- Side margins are 20pt (`space.gutter`).
- Groups are separated by space and hairlines, not boxes.
- At most about three blocks per screen.
- One hero and one primary (starlight) button per screen.

## Motion

- Press: a soft spring to 97% with a light haptic.
- Ambient loops last 45 seconds or more and never flash.
- Celebrations are kept for a finished book and a full moon.
- With Reduce Motion on, every animation becomes instant.
- Every timing lives in `motion` in `src/theme/tokens.ts`; components never
  invent their own durations.
- A screen settles as one piece: the title rises, the body follows a beat
  later. Never card by card.
- Motion confirms or explains: a line drawing in shows progress, beads light
  in the order they were earned, numbers count to what changed.
- Saving something says so once, quietly: a whisper at the bottom of the
  screen with a success haptic. Nothing to dismiss.

## Writing

- No emoji, no stock photos, no filler.
- Reflection prompts are written by hand and signed.
