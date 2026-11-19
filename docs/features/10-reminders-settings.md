# Phase 10: Evening reminders, settings, app icon

**Status:** shipped

## Evening reminder

One quiet notification at a time the reader picks: 7, 8, 9 or 10 PM, or off
(the default). It is a **local notification**: scheduled on the phone with
`expo-notifications`, with no server, no push token and no account.

Rules (`src/domain/reminders.ts`, tested in `src/__tests__/reminders.test.ts`):

- **Never on a night you have already read.** If a session is logged tonight,
  tonight's reminder is dropped.
- **No streaks, no guilt.** Seven lines written in advance, in the app's voice,
  chosen by date so they vary. None mentions missed nights.
- **Silent.** No sound, no vibration, no badge. On Android it uses its own
  "Evening reminder" channel, which the reader can tune in system settings.

How it is kept up to date (`src/features/reminders/reminders.ts`): the next 7
evenings are scheduled at once. They are planned again when the app opens, when
the reminder time changes, and when a reading session is logged
(`SettingsBridge` in `src/app/_layout.tsx`). Planning clears every scheduled
notification first, since the app has no others. Planning runs one at a time
so quick changes cannot overlap. A reader who stops opening the app gets at
most a week of reminders, then silence, which is the polite outcome.

Permission is only asked when the reader picks a time. If it is refused, the
setting stays off and the screen explains where to allow it.

## Settings

`/settings`, from the gear on Tonight:

| Section | What it does |
| --- | --- |
| Reading goal | Shows the goal and weekly moons, and links to the Moon Log where they are set (one place to change them). |
| Evening reminder | Off, 7, 8, 9 or 10 PM. |
| Sky | Night (default), Dawn, or Match my phone. Applied app-wide, live. |
| Your words | Says plainly that everything stays on the phone, and offers **Export your journal as text** through the system share sheet (`src/features/journal/exportText.ts`). |
| About | Version, Open Library credit, prompts and notes by Kaveesh, the scanner's photo rule. Dev tools link in development builds. |

The chosen sky now drives `ThemeProvider` (it was fixed to Night before). The
bridge sits inside the data provider, so the very first frame uses Night until
settings load, which is the right default for a night app.

## App icon and splash

A new mark replaces the Expo template art: the app's **book star**, a softly
shaded starlight sphere with a tilted aurora orbit and one bead (a chapter
read), on the night background. No gold.

| File | Use |
| --- | --- |
| `assets/images/icon.png` | iOS and store icon, 1024 px |
| `android-icon-foreground/background/monochrome.png` | Android adaptive and themed icons |
| `splash-icon.png` | Splash, on #0C1322 |
| `notification-icon.png` | Android notification (white silhouette) |
| `favicon.png` | Web |

All are drawn by `scripts/make-icons.py` (Pillow), so they can be changed and
redrawn: `python3 scripts/make-icons.py assets/images`.

## Privacy

See [PRIVACY.md](../PRIVACY.md), a plain-language policy draft for the store
listings.

## Not yet

- A custom reminder time beyond the four choices.
- An ongoing Android notification while the lamp is lit.
- An optional soft bell at the end of a session (`soundOn` is reserved in
  settings but has no switch yet).
