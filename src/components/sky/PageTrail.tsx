import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/theme';

type Props = {
  /** The furthest page reached, night by night, oldest first. */
  points: { night: string; page: number }[];
  /** Pages in the edition, so the trail climbs towards the top. */
  total: number | null;
  width: number;
  height: number;
  accessibilityLabel?: string;
};

/**
 * A book's pages over time, drawn as a faint trail of light climbing toward
 * the last page. Each night with a stopping page is a small star on it.
 */
export function PageTrail({ points, total, width, height, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const pad = 6;
  const top = Math.max(total ?? 0, ...points.map((p) => p.page), 1);
  const placed = useMemo(() => {
    const n = points.length;
    return points.map((p, i) => ({
      x: pad + (n === 1 ? (width - pad * 2) / 2 : (i / (n - 1)) * (width - pad * 2)),
      y: height - pad - (p.page / top) * (height - pad * 2),
    }));
  }, [points, top, width, height]);
  const path = useMemo(() => {
    if (placed.length < 2) return null;
    const d = placed.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
    return Skia.Path.MakeFromSVGString(d);
  }, [placed]);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Canvas style={{ width, height }} pointerEvents="none">
        {total ? (
          <Path
            path={Skia.Path.MakeFromSVGString(`M ${pad} ${pad} L ${width - pad} ${pad}`)!}
            style="stroke"
            strokeWidth={1}
            color={colors.hairline}
          />
        ) : null}
        {path ? (
          <Path path={path} style="stroke" strokeWidth={1.4} color={colors.starlight} opacity={0.55} />
        ) : null}
        {placed.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === placed.length - 1 ? 3.2 : 2}
            color={colors.starlight}
            opacity={i === placed.length - 1 ? 1 : 0.7}
          />
        ))}
      </Canvas>
    </View>
  );
}
