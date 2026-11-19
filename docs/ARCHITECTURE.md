# Architecture

**Stack:** Expo SDK 58, React Native 0.88, TypeScript (strict), Expo Router.

| Concern | Library |
| --- | --- |
| Navigation | Expo Router (`src/app`), JS tabs with a custom tab bar |
| Drawing (stars, moons, orbits) | `@shopify/react-native-skia` |
| Motion | `react-native-reanimated` 4 |
| Storage | `expo-sqlite` (from phase 2) |
| Fonts | `@expo-google-fonts/gloock`, `@expo-google-fonts/literata` |
| Icons | `phosphor-react-native` (light weight) |
| Haptics | `expo-haptics` |

Everything above runs in Expo Go, so the app can be tested on an iPhone
without a paid developer account.

## Folders

```
src/
  app/             Routes only. Every file is a screen; _layout files are navigators.
    _layout.tsx    Loads fonts, provides the theme, root stack.
    (tabs)/        Tonight, Paths, Journal, Sky.
  components/      Shared UI: Text, Button, Pressable, Screen, StarField, TabBar.
  theme/           Design tokens and the theme provider.
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
