# Design system: Night Atlas, minimal

Source of truth: `src/theme/tokens.ts`.

## Colour roles

| Token | Night | Dawn | Use |
| --- | --- | --- | --- |
| `night` | `#0C1322` | `#E9EEF4` | Screen background |
| `raised` | `#131D31` | `#F4F6F9` | Sheets, inputs, the tab bar |
| `hairline` | starlight at 10% | ink at 12% | Separators between groups |
| `starlight` | `#F3EBD8` | `#14203A` | Main text and the one primary button |
| `mist` | `#93A1BB` | `#5B6A85` | Secondary text, inactive icons |
| `aurora` | `#86CDBE` | `#2F7F70` | Thinking, reflections, teal moons |
| `candlelight` | `#E9D2AE` | `#C9A774` | Glow only. Never text, never a button |

There is no gold.

## Type

Two families: **Gloock** for display, **Literata** for everything else.
At most three sizes on a screen.

| Variant | Font | Size |
| --- | --- | --- |
| `hero` | Gloock | 40 |
| `title` | Gloock | 28 |
| `heading` | Literata SemiBold | 18 |
| `body` | Literata | 16 |
| `caption` | Literata Italic | 13 |
| `button` | Literata Medium | 16 |

Captions are sentence case and italic, never all-caps labels.

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

## Writing

- No emoji, no stock photos, no filler.
- Reflection prompts are written by hand and signed.
