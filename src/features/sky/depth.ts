import { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import type { Tilt } from './useTilt';
import { useTheme } from '@/theme/theme';
import type { DepthPlane } from '@/theme/tokens';

/**
 * Where the reader has wandered: how far the star chart has been dragged
 * from where it opened, and how far it is zoomed. Planes take a share of it.
 */
export type Explore = {
  dx: SharedValue<number>;
  dy: SharedValue<number>;
  scale: SharedValue<number>;
  /** How far the reader has turned the sky, in radians. */
  rot: SharedValue<number>;
};

/**
 * A plane of the sky: it follows the reader's drag and zoom by its share
 * `k`, and shifts with tilt by up to `tilt` points. Clouds sit on the
 * horizon, so with `lockY` they slide sideways but barely rise. Under Reduce
 * Motion a plane holds still; only the reader's own stars follow the finger.
 */
export function usePlane(
  tilt: Tilt,
  explore: Explore,
  plane: DepthPlane,
  lockY = false,
  /** The most the plane may slide sideways, so a finite layer never shows its edge. */
  reach = Infinity,
) {
  const { reduceMotion } = useTheme();
  return useAnimatedStyle(() => {
    if (reduceMotion) return { transform: [] };
    const z = 1 + (explore.scale.get() - 1) * Math.min(plane.k, 1) * 0.5;
    return {
      transform: [
        {
          translateX:
            Math.max(-reach, Math.min(reach, explore.dx.get() * plane.k)) - tilt.x.get() * plane.tilt,
        },
        { translateY: explore.dy.get() * plane.k * (lockY ? 0.15 : 1) - tilt.y.get() * plane.tilt },
        { scale: lockY ? 1 : z },
      ],
    };
  });
}
