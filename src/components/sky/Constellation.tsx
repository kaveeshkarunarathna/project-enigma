import { BlurMask, Canvas, Circle, Group, Line, vec } from '@shopify/react-native-skia';

import { constellationPoints, type PathStarState } from '@/domain/paths';
import { useTheme } from '@/theme/theme';

type Props = {
  pathId: string;
  states: PathStarState[];
  width: number;
  height: number;
  /** Highlight one star, for example the one the reader should start with. */
  focus?: number | null;
  accessibilityLabel?: string;
};

/**
 * A reading path as a constellation. Finished books are bright stars,
 * the book being read glows softly, books on the shelf are faint, the rest
 * are pinpricks. Lines between lit stars are drawn brighter, so the shape
 * appears as the path is read.
 */
export function Constellation({ pathId, states, width, height, focus, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const pts = constellationPoints(pathId, states.length).map((p) => ({ x: p.x * width, y: p.y * height }));
  const lit = (s: PathStarState) => s === 'finished';

  return (
    <Canvas
      style={{ width, height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      <Group>
        {pts.slice(1).map((p, i) => {
          const a = pts[i];
          const both = lit(states[i]) && lit(states[i + 1]);
          return (
            <Line
              key={`l${i}`}
              p1={vec(a.x, a.y)}
              p2={vec(p.x, p.y)}
              color={colors.starlight}
              strokeWidth={both ? 1.2 : 0.8}
              opacity={both ? 0.55 : 0.22}
            />
          );
        })}
        {pts.map((p, i) => {
          const s = states[i];
          const r = s === 'finished' ? 5 : s === 'reading' ? 4 : s === 'shelf' ? 3.2 : 2.6;
          const o = s === 'finished' ? 1 : s === 'reading' ? 0.85 : s === 'shelf' ? 0.7 : 0.5;
          return (
            <Group key={`s${i}`}>
              {s === 'finished' || s === 'reading' ? (
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={r * 3.2}
                  color={colors.candlelight}
                  opacity={s === 'finished' ? 0.4 : 0.22}>
                  <BlurMask blur={r * 2.4} style="normal" />
                </Circle>
              ) : null}
              {focus === i ? (
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={r + 7}
                  style="stroke"
                  strokeWidth={1}
                  color={colors.aurora}
                  opacity={0.6}
                />
              ) : null}
              <Circle
                cx={p.x}
                cy={p.y}
                r={r}
                color={s === 'none' ? colors.mist : colors.starlight}
                opacity={o}
              />
            </Group>
          );
        })}
      </Group>
    </Canvas>
  );
}
