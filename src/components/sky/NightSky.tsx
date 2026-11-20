import { BlurMask, Canvas, Circle, Group } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { layoutSky } from '@/domain/sky';
import { useTheme } from '@/theme/theme';

type Props = {
  nights: { night: string; seconds: number }[];
  width: number;
  height: number;
  goalMinutes: number;
  /** The newest star breathes very slowly. Off under Reduce Motion. */
  breatheNewest?: boolean;
};

/** The reader's own sky: one star for every night they read. */
export function NightSky({ nights, width, height, goalMinutes, breatheNewest = true }: Props) {
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

  return (
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
}
