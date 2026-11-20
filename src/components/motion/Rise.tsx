import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/theme';
import { motion } from '@/theme/tokens';

/**
 * Content settling into place as a screen opens: a short fade while it rises
 * a few points. Runs once, on mount. Instant under Reduce Motion.
 */
export function Rise({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { reduceMotion } = useTheme();
  const t = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      t.set(1);
      return;
    }
    t.set(withDelay(delay, withTiming(1, { duration: motion.enter, easing: Easing.out(Easing.cubic) })));
  }, [reduceMotion, delay, t]);

  const animated = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ translateY: (1 - t.get()) * motion.rise }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
