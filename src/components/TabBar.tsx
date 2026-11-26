import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BooksIcon, FeatherIcon, MoonIcon, PathIcon, StarIcon, type Icon } from './icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { CloudBank } from './art/CloudBank';
import { Glass } from './Glass';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

const TABS: Record<string, { label: string; icon: Icon }> = {
  index: { label: 'Sky', icon: StarIcon },
  moonlog: { label: 'Moons', icon: MoonIcon },
  shelf: { label: 'Shelf', icon: BooksIcon },
  paths: { label: 'Paths', icon: PathIcon },
  journal: { label: 'Journal', icon: FeatherIcon },
};

/**
 * The tab bar is a pane of night glass floating just above a bank of soft
 * clouds, clear of the screen's edges, so the sky runs on beneath it.
 * Phosphor light icons, tracked capital labels, starlight for the active tab
 * and mist for the rest; a small star glides to the active tab and glows.
 */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { colors, reduceMotion } = useTheme();
  // A small light glides under the active tab.
  const [slots, setSlots] = useState<Record<number, { x: number; w: number }>>({});
  const x = useSharedValue(-1);
  const active = slots[state.index];
  useEffect(() => {
    if (!active) return;
    const target = active.x + active.w / 2 - GLOW / 2;
    if (reduceMotion || x.get() < 0) x.set(target);
    else x.set(withSpring(target, { damping: 20, stiffness: 180, mass: 0.8 }));
  }, [active, reduceMotion, x]);
  const indicator = useAnimatedStyle(() => ({
    opacity: x.get() < 0 ? 0 : 1,
    transform: [{ translateX: x.get() }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <CloudBank height={96 + insets.bottom} />
      <Glass radius={30} style={styles.glass}>
        <View accessibilityRole="tablist" style={styles.bar}>
          <Animated.View pointerEvents="none" style={[styles.indicator, indicator]}>
            <View style={[styles.glow, { backgroundColor: colors.starlight }]} />
            <View style={[styles.dot, { backgroundColor: colors.starlight }]} />
          </Animated.View>
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
                onLayout={(e) => {
                  const { x: lx, width } = e.nativeEvent.layout;
                  setSlots((s) =>
                    s[i]?.x === lx && s[i]?.w === width ? s : { ...s, [i]: { x: lx, w: width } },
                  );
                }}
                style={styles.tab}>
                <Icon
                  size={24}
                  weight={active ? 'regular' : 'light'}
                  color={active ? colors.starlight : colors.mist}
                />
                <Text variant="label" tone={active ? 'starlight' : 'mist'} style={styles.label}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}

/** The size of the glow under the active tab's star. */
const GLOW = 14;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  glass: { marginBottom: space.xs },
  bar: {
    flexDirection: 'row',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    gap: 2,
  },
  tab: {
    minWidth: 62,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: { fontSize: 9, lineHeight: 13, letterSpacing: 2.2 },
  // The active tab's star rests on the glass's top edge.
  indicator: {
    position: 'absolute',
    top: -GLOW / 2,
    left: 0,
    width: GLOW,
    height: GLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', width: GLOW, height: GLOW, borderRadius: GLOW / 2, opacity: 0.16 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
