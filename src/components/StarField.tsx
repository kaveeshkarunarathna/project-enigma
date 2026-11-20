import { Canvas, Circle, Group } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { mulberry32 } from '@/domain/random';
import { useTheme } from '@/theme/theme';

type Props = {
  /** Stars per 100k square points. The minimal look keeps this sparse. */
  density?: number;
  seed?: number;
};

/**
 * The minimal Night Atlas background: a flat night with sparse, faint stars.
 * Static by design. Ambient motion is added per screen, never here.
 */
export function StarField({ density = 9, seed = 7 }: Props) {
  const { width, height } = useWindowDimensions();
  const { colors, scheme } = useTheme();

  const stars = useMemo(() => {
    const rand = mulberry32(seed);
    const count = Math.round(((width * height) / 100_000) * density);
    return Array.from({ length: count }, () => ({
      x: rand() * width,
      y: rand() * height,
      r: 0.4 + rand() ** 3 * 1.1,
      o: 0.25 + rand() * 0.6,
    }));
  }, [width, height, density, seed]);

  if (scheme === 'dawn') return null;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group>
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} color={colors.faintStar} opacity={s.o} />
        ))}
      </Group>
    </Canvas>
  );
}
