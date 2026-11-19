import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/theme';

/**
 * A single, calm entrance: the child fades in while growing slightly, like a
 * star brightening. Used once per screen for the hero. Instant under Reduce Motion.
 */
export function Ignite({
  children,
  delay = 0,
  duration = 1400,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
}) {
  const { reduceMotion } = useTheme();
  const t = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      t.set(1);
      return;
    }
    t.set(withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) })));
  }, [reduceMotion, delay, duration, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ scale: 0.92 + 0.08 * t.get() }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
