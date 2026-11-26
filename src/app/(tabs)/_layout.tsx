import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useTheme } from '@/theme/theme';

export default function TabsLayout() {
  const { reduceMotion } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      // Tabs crossfade, like the sky changing, rather than sliding.
      screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="moonlog" />
      <Tabs.Screen name="shelf" />
      <Tabs.Screen name="paths" />
      <Tabs.Screen name="journal" />
    </Tabs>
  );
}
