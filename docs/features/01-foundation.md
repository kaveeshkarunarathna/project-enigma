# Phase 1: Foundation

**Status:** shipped

## What it does

Sets up the app shell everything else is built on:

- An Expo Router app with four tabs: **Tonight**, **Paths**, **Journal** and
  **Your sky**, each with a quiet empty state.
- A floating capsule tab bar using Phosphor light icons, with starlight for the
  active tab and mist for the rest.
- The Night Atlas minimal look: a flat night background with a sparse, faint
  star field drawn with Skia. The star field is seeded, so the sky looks the
  same on every launch.
- Gloock and Literata loaded at startup; the splash screen stays up until they
  are ready.

## Building blocks

| Component | Purpose |
| --- | --- |
| `ThemeProvider` / `useTheme` | Night or dawn palette, plus the Reduce Motion flag |
| `Text` | Type scale variants and colour tones |
| `Button` | `primary` (solid starlight, once per screen) or `quiet` (hairline) |
| `Pressable` | Spring press and light haptic, with no spring under Reduce Motion |
| `Screen` | Background, stars, title and caption, safe areas, tab bar spacing |
| `StarField` | Sparse static stars, hidden in dawn mode |
| `EmptyState` | A heading, a line of text and an optional action |

## Accessibility

- The tab bar uses `tablist` and `tab` roles with a selected state.
- Screen titles have the `header` role.
- Text scales with the system font size, capped at 1.6x so layouts hold.
- Every touch target is at least 52pt tall.

## How to test

Run `npx expo start` and open the app in Expo Go. Check that you can switch
between all four tabs, that pressing a tab gives a light tap and a slight
press, and that with Reduce Motion on (Settings > Accessibility > Motion) the
press no longer animates.
