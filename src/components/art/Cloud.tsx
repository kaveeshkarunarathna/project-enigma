import { useEffect, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { cloudPath } from './cloudPath';

import { useSvgId } from './svgId';
import { useTheme } from '@/theme/theme';
import { motion } from '@/theme/tokens';

/** Puffs of a cloud on a 100 x 50 grid: [cx, cy, r]. They merge into one outline with a flat base. */
const SHAPES = {
  wide: [
    [14, 36, 10],
    [32, 26, 15],
    [54, 20, 18],
    [74, 28, 14],
    [89, 35, 9],
  ],
  tall: [
    [18, 34, 11],
    [36, 24, 16],
    [58, 18, 20],
    [80, 32, 12],
  ],
  small: [
    [24, 36, 10],
    [44, 27, 15],
    [64, 30, 12],
    [80, 37, 8],
  ],
} as const;

export type CloudShape = keyof typeof SHAPES;

type Props = {
  width: number;
  shape?: CloudShape;
  /** Overall strength, 0 to 1. Far clouds are fainter. */
  opacity?: number;
  /** Drift sideways by this many points, very slowly. Off under Reduce Motion. */
  drift?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * One soft storybook cloud: plum at the top, fading to nothing at the bottom.
 * Drawn as vectors so it is sharp at any size and needs no image files.
 */
export function Cloud({ width, shape = 'wide', opacity = 0.8, drift = 0, style }: Props) {
  const { colors, reduceMotion } = useTheme();
  const id = useSvgId('cl');
  const height = width / 2;
  const s = width / 100;
  const d = useMemo(
    () =>
      cloudPath(
        SHAPES[shape].map(([cx, cy, r]) => [cx * s, cy * s, r * s] as const),
        { base: 44 * s },
      ),
    [shape, s],
  );

  const x = useSharedValue(0);
  useEffect(() => {
    if (!drift || reduceMotion) {
      cancelAnimation(x);
      x.set(0);
      return;
    }
    x.set(
      withRepeat(
        withTiming(1, { duration: motion.ambientMs * 2, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(x);
  }, [drift, reduceMotion, x]);
  const moving = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * drift }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ width, height, opacity }, style, moving]}>
      <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Defs>
          <LinearGradient id={id} x1="0" y1={0} x2="0" y2={height} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.cloud} stopOpacity={0.95} />
            <Stop offset="1" stopColor={colors.cloud} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={d} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}
