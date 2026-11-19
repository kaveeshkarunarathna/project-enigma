import { Gloock_400Regular } from '@expo-google-fonts/gloock';
import {
  Literata_400Regular,
  Literata_400Regular_Italic,
  Literata_500Medium,
  Literata_600SemiBold,
  useFonts,
} from '@expo-google-fonts/literata';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DataProvider } from '@/data/DataProvider';
import { useSkiaReady } from '@/features/platform/useSkiaReady';
import { ThemeProvider, useTheme } from '@/theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { colors, scheme, reduceMotion } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'night' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.night },
          animation: reduceMotion ? 'none' : 'slide_from_right',
        }}>
        <Stack.Screen name="(tabs)" options={{ animation: reduceMotion ? 'none' : 'fade' }} />
        <Stack.Screen
          name="lamp"
          options={{ presentation: 'fullScreenModal', animation: reduceMotion ? 'none' : 'fade' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Gloock_400Regular,
    Literata_400Regular,
    Literata_400Regular_Italic,
    Literata_500Medium,
    Literata_600SemiBold,
  });

  const skiaReady = useSkiaReady();
  const ready = (fontsLoaded || fontError) && skiaReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Suspense fallback={null}>
          <DataProvider>
            <RootStack />
          </DataProvider>
        </Suspense>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
