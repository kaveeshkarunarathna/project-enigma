import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BooksIcon, FeatherIcon, PathIcon, StarIcon, type Icon } from './icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { CloudBank } from './art/CloudBank';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

const TABS: Record<string, { label: string; icon: Icon }> = {
  index: { label: 'Sky', icon: StarIcon },
  shelf: { label: 'Shelf', icon: BooksIcon },
  paths: { label: 'Paths', icon: PathIcon },
  journal: { label: 'Journal', icon: FeatherIcon },
};

/**
 * The tab bar rests on a bank of soft clouds at the foot of the screen.
 * Phosphor light icons, tracked capital labels, starlight for the active tab
 * and mist for the rest.
 */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { colors, reduceMotion } = useTheme();
  // A small light glides under the active tab.
  const [slots, setSlots] = useState<Record<number, { x: number; w: number }>>({});
  const x = useSharedValue(-1);
  const active = slots[state.index];
  useEffect(() => {
    if (!active) return;
    const target = active.x + active.w / 2 - 2;
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
      <CloudBank height={112 + insets.bottom} />
      <View accessibilityRole="tablist" style={styles.bar}>
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { backgroundColor: colors.starlight }, indicator]}
        />
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
  label: { fontSize: 9, lineHeight: 13, letterSpacing: 2.2 },
  indicator: { position: 'absolute', top: 5, left: 0, width: 4, height: 4, borderRadius: 2 },
});
