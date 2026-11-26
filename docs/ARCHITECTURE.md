# Architecture

**Stack:** Expo SDK 58, React Native 0.88, TypeScript (strict), Expo Router.

| Concern | Library |
| --- | --- |
| Navigation | Expo Router (`src/app`), JS tabs with a custom tab bar |
| Drawing (stars, moons, orbits) | `@shopify/react-native-skia` |
| Motion | `react-native-reanimated` 4 |
| Storage | `expo-sqlite` |
| Tests | Jest (`jest-expo` preset), `node:sqlite` for data tests |
| Fonts | `@expo-google-fonts/gloock`, `@expo-google-fonts/literata` |
| Icons | `phosphor-react-native` (light weight) |
| Haptics | `expo-haptics` |
| Search by meaning (optional) | `react-native-executorch` (all-MiniLM-L6-v2 on the phone) |

Everything above runs in Expo Go except the page scanner and search by
meaning, which need a development build (`npx expo run:ios --device` with a
free Apple ID). Both fall back calmly in Expo Go, so the rest of the app can
be tested there without a paid developer account.

## Folders

```
src/
  app/             Routes only. Every file is a screen; _layout files are navigators.
    _layout.tsx    Loads fonts, provides the theme, root stack.
    (tabs)/        Sky (first screen), Shelf, Paths, Journal.
    shelf.tsx      Your shelf.
    search.tsx     Find a book (Open Library).
    book/          Book page and add-by-hand form.
  components/      Shared UI: Text, Button, Pressable, Screen, StarField, TabBar.
  content/         Writing bundled with the app: reflection prompts, curated paths, the classics catalog, the suggestion catalogue.
  data/            SQLite schema, migrations and repositories (books, sessions,
                   journal, paths, settings), plus useLiveQuery.
  features/        Feature helpers shared by several screens (formatting, hooks).
  services/        Device and network services: the Open Library catalog (book facts and covers), Project Gutenberg downloads for the free classics, and the on-device page scanner.
  domain/          Pure rules: nights, Moon Log, progress, quotes. No React, no SQL.
  theme/           Design tokens and the theme provider.
  __tests__/       Unit tests (Jest). Data tests run on in-memory SQLite.
docs/              Architecture, design system, feature notes, roadmap.
```

Non-route code never lives in `src/app/`. Imports use the `@/` alias for `src/`.

## Conventions

- Colours, spacing, type and motion values come from `src/theme/tokens.ts`.
  No hard-coded hex values in screens.
- Every animation checks `useTheme().reduceMotion` and becomes instant when it
  is on.
- Shared values are read and written with `.get()` and `.set()` so the React
  Compiler stays happy.
- `ios/` and `android/` are generated. Configure native behaviour in `app.json`.

## Data flow

Screens call repository functions with the database from `useDb()`. Reads go
through `useLiveQuery(query, tables)`. Writes call `notifyChanged(tables)`, and
any live query reading those tables runs again. Rules that decide numbers
(moon fill, beads, stardust) live in `src/domain` so they are tested once and
shown the same everywhere.
