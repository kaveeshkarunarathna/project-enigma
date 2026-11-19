# Night Atlas (codename: project-enigma)

A calm reading companion that helps new readers fall in love with reading,
journaling and thinking, with a focus on philosophy, classics, fantasy and
science fiction.

Books are stars, reading paths are constellations, and every night you read
adds a star to your own sky. Nothing ever resets and nothing turns red.

## Principles

- **No copyrighted book text is processed, stored or summarized.** Book info
  comes from open catalog data (Open Library): title, author, cover, page count.
  Quotes in the journal are short passages the reader picks themselves, kept
  privately on their phone.
- **No runtime AI and near-zero running costs.** Prompts and reading paths are
  written in advance and bundled with the app.
- **Your data stays on your phone.** Everything is stored locally in SQLite.
  Optional cloud backup comes later.
- **Calm by design.** Slow motion, no streak punishment, and Reduce Motion is
  always respected.

## Running the app

You need Node 20+ and the free **Expo Go** app on your iPhone.

```bash
npm install
npx expo start
```

Scan the QR code with the iPhone camera and the app opens in Expo Go.

- **Android:** start an emulator from Android Studio on your Mac, then press `a`
  in the terminal.
- **The page scanner** uses native code, so it needs a development build:
  `npx expo run:ios --device` with Xcode and a free Apple ID. Step by step in
  [the scanner notes](docs/features/09-scanner.md#running-it-on-your-devices).
  Everything else runs in Expo Go.

## Web preview

For checking screens without a phone: `npx expo export --platform web`, then
serve the `dist` folder with COOP/COEP headers (see
[the lamp notes](docs/features/04-lamp.md#web-preview)). The real app is iOS
and Android.

## Checks

```bash
npx tsc --noEmit   # types
npx eslint .       # lint
npm test           # unit tests (from phase 2)
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md): how the code is organized
- [Design system](docs/DESIGN-SYSTEM.md): colours, type, motion, rules
- [Feature notes](docs/features/): one page per shipped phase
- [Roadmap](docs/ROADMAP.md): what is built and what comes next
- [Privacy policy draft](docs/PRIVACY.md): what stays on the phone and what does not
