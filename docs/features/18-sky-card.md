# Phase 18: Sky card

**Status:** shipped

Readers can share a picture of their reading sky: a story-sized card (9:16,
1080 x 1920, for Instagram and TikTok stories) or a square (1080 x 1080). It
is the first step towards growth through sharing: every shared card carries
the small wordmark at its foot.

## How it works

- On the Sky screen, a small share icon sits beside the gear (only once the
  sky has at least one star). It opens **Share your sky**.
- The screen shows a preview of the card and three quiet choices:
  - **Story** or **Square**.
  - **This month** or **All time**. With This month, the month's stars are
    bright and older stars stay faint, so the month is seen inside the
    whole sky.
  - **Book titles**, off by default. When on, up to three titles read in the
    period appear (books finished first, then the most recently read).
- **Share** makes the image on the phone and opens the share sheet. Saving
  to Photos, Instagram, TikTok, Messages and so on all come from there.

## What is on the card

The whimsical night look: an indigo sky fading to plum, faint dust stars, a
Milky Way haze, the cream crescent moon with a plum cloud, a cloud bank at
the foot, and wide-tracked capitals. Then:

- "My reading sky" and the period ("November 2026" or "All my nights").
- The reader's own stars, laid out exactly like the Sky screen (same spiral,
  same sizes and brightness), with the newest star glowing.
- Up to three numbers: nights read, pages (if any were logged), and books
  finished in the period (or time read when no book was finished).
- Book titles, only if turned on.
- The wordmark, `CARD_WORDMARK` in `src/domain/skyCard.ts` (now
  "Stellibria", see [phase 19](19-stellibria.md)).

Journal entries, quotes, notes, reflections, and the teal "you wrote that
night" rings never appear on the card.

## Technical notes

- `SkyCard` draws everything with `react-native-svg` and plain text, not
  Skia, so the view can be captured reliably on iOS and Android. It always
  uses the night palette, even in dawn mode.
- The card is designed on a 360-point-wide grid and scales to any width. The
  preview is fitted to the screen; a second copy is drawn behind the screen
  at exactly 1080 pixels wide, and that copy is what `react-native-view-shot`
  captures, so the image is sharp. `expo-sharing` hands it to the share sheet.
- `react-native-view-shot` (6.1.1, the version bundled with SDK 58) is
  included in Expo Go and in dev builds; no new config plugin is needed.
- On the web, the screen is a preview only (`shareCard.web.ts`); view-shot
  would need an extra web-only package.

## Files

- `src/domain/skyCard.ts`: sizes, period maths, `cardSummary`, `cardFigures`
  (tested in `src/__tests__/skyCard.test.ts`).
- `src/data/sessions.ts`: `cardSessions` reads only night, time, pages and
  book for each session.
- `src/features/share/SkyCard.tsx`: the card.
- `src/features/share/shareCard.ts` (+ `.web.ts`): capture and share.
- `src/app/sky-card.tsx`: the preview screen.
- `src/app/(tabs)/index.tsx`: the share icon on the Sky screen.

## Still to check on a phone

- Share to Instagram Stories and TikTok from the share sheet on iPhone and
  on the Android emulator.
- That the 1080-pixel copy behind the screen is captured crisply on Android.
