import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useSvgId } from './svgId';
import { useTheme } from '@/theme/theme';
import { motion } from '@/theme/tokens';

/** Puffs of a cloud on a 100 x 50 grid: [cx, cy, r]. The base is a rounded bar. */
const SHAPES = {
  wide: [
    [22, 30, 15],
    [44, 20, 20],
    [68, 28, 15],
    [84, 31, 12],
  ],
  tall: [
    [26, 30, 14],
    [50, 18, 22],
    [74, 30, 14],
  ],
  small: [
    [30, 30, 13],
    [52, 24, 16],
    [72, 31, 11],
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
        <G fill={`url(#${id})`}>
          {SHAPES[shape].map(([cx, cy, r], i) => (
            <Circle key={i} cx={cx * s} cy={cy * s} r={r * s} />
          ))}
          <Rect x={10 * s} y={30 * s} width={84 * s} height={14 * s} rx={7 * s} />
        </G>
      </Svg>
    </Animated.View>
  );
}
