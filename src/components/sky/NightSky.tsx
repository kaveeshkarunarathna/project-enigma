import { BlurMask, Canvas, Circle, Group } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { nearestStar } from '@/domain/nights';
import { layoutSky } from '@/domain/sky';
import { useTheme } from '@/theme/theme';

type Props = {
  nights: { night: string; seconds: number }[];
  width: number;
  height: number;
  goalMinutes: number;
  /** The newest star breathes very slowly. Off under Reduce Motion. */
  breatheNewest?: boolean;
  /**
   * Makes the stars tappable: a tap opens the night of the nearest star. For
   * screen readers the whole sky is one button that opens the newest night.
   */
  onPressNight?: (night: string) => void;
};

/** The reader's own sky: one star for every night they read. */
export function NightSky({ nights, width, height, goalMinutes, breatheNewest = true, onPressNight }: Props) {
  const { colors, reduceMotion } = useTheme();
  const stars = useMemo(
    () => layoutSky(nights, width, height, goalMinutes),
    [nights, width, height, goalMinutes],
  );
  const newest = stars[stars.length - 1];

  const pulse = useSharedValue(0.6);
  useEffect(() => {
    if (!breatheNewest || reduceMotion) {
      cancelAnimation(pulse);
      pulse.set(0.6);
      return;
    }
    pulse.set(withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(pulse);
  }, [breatheNewest, reduceMotion, pulse]);
  const newestGlow = useDerivedValue(() => pulse.get() * 0.5);

  const canvas = (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Group>
        {stars.map((s) => (
          <Group key={s.night}>
            <Circle cx={s.x} cy={s.y} r={s.r * 3} color={colors.candlelight} opacity={s.brightness * 0.18}>
              <BlurMask blur={s.r * 2} style="normal" />
            </Circle>
            <Circle cx={s.x} cy={s.y} r={s.r} color={colors.starlight} opacity={s.brightness} />
          </Group>
        ))}
        {newest ? (
          <Circle
            cx={newest.x}
            cy={newest.y}
            r={newest.r * 5}
            color={colors.candlelight}
            opacity={newestGlow}>
            <BlurMask blur={newest.r * 4} style="normal" />
          </Circle>
        ) : null}
      </Group>
    </Canvas>
  );
  if (!onPressNight || !stars.length) return canvas;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Your sky, ${stars.length} ${stars.length === 1 ? 'star' : 'stars'}`}
      accessibilityHint="Opens your latest night. Tap a star to open its night."
      onPress={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        const hit = nearestStar(stars, locationX, locationY);
        // Empty sky (or a screen reader's tap) opens the newest night.
        const night = hit?.night ?? newest?.night;
        if (night) onPressNight(night);
      }}>
      {canvas}
    </Pressable>
  );
}
