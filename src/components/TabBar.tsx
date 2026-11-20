import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BooksIcon, FeatherIcon, PathIcon, StarIcon, type Icon } from './icons';
import { StyleSheet, View } from 'react-native';

import { Pressable } from './Pressable';
import { Text } from './Text';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const TABS: Record<string, { label: string; icon: Icon }> = {
  index: { label: 'Sky', icon: StarIcon },
  shelf: { label: 'Shelf', icon: BooksIcon },
  paths: { label: 'Paths', icon: PathIcon },
  journal: { label: 'Journal', icon: FeatherIcon },
};

/**
 * A floating capsule tab bar. Minimal: night surface, one hairline edge,
 * Phosphor light icons, starlight for the active tab and mist for the rest.
 */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <View
        accessibilityRole="tablist"
        style={[styles.bar, { backgroundColor: colors.raised, borderColor: colors.hairline }]}>
        {state.routes.map((route, i) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const active = state.index === i;
          const Icon = tab.icon;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (!active) navigateToTab(route.key);
              }}
              style={styles.tab}>
              <Icon
                size={24}
                weight={active ? 'regular' : 'light'}
                color={active ? colors.starlight : colors.mist}
              />
              <Text variant="caption" tone={active ? 'starlight' : 'mist'} style={styles.label}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    gap: space.xs,
  },
  tab: {
    minWidth: 72,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: { fontSize: 11, lineHeight: 14, fontStyle: 'normal' },
});
