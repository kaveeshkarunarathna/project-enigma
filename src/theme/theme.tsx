import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { dawn, night, type Palette } from './tokens';

export type SchemePreference = 'system' | 'night' | 'dawn';

type Theme = {
  colors: Palette;
  scheme: 'night' | 'dawn';
  /** True when the OS asks for less motion. Every animation must check it. */
  reduceMotion: boolean;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  preference = 'night',
  children,
}: {
  /** Stellibria is a night app, so night is the default even in light mode. */
  preference?: SchemePreference;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const reduceMotion = useReducedMotion();

  const value = useMemo<Theme>(() => {
    const scheme = preference === 'system' ? (system === 'light' ? 'dawn' : 'night') : preference;
    return { colors: scheme === 'dawn' ? dawn : night, scheme, reduceMotion };
  }, [preference, system, reduceMotion]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}
