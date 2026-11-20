import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Pressable } from './Pressable';
import { Text } from './Text';
import { useTheme } from '@/theme/theme';
import { motion, radius, space } from '@/theme/tokens';

type Props = { label: string; selected: boolean; onPress: () => void; accessibilityLabel?: string };

/**
 * A small choice pill. Selected is a soft starlight outline, never a fill.
 * The outline eases in and out rather than snapping.
 */
export function Chip({ label, selected, onPress, accessibilityLabel }: Props) {
  const { colors, reduceMotion } = useTheme();
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.set(
      withTiming(selected ? 1 : 0, {
        duration: reduceMotion ? 0 : motion.select,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [selected, reduceMotion, on]);

  const { starlight, hairline, raised, night } = colors;
  const eased = useAnimatedStyle(() => ({
    borderColor: interpolateColor(on.get(), [0, 1], [hairline, starlight]),
    backgroundColor: interpolateColor(on.get(), [0, 1], [`${night}00`, raised]),
  }));

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}>
      <Animated.View style={[styles.chip, eased]}>
        <Text variant="button" tone={selected ? 'starlight' : 'mist'}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 52,
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
