import { BlurMask, Canvas, Circle, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { constellationPoints, lineFill, type PathStarState } from '@/domain/paths';
import { useTheme } from '@/theme/theme';

type Props = {
  pathId: string;
  states: PathStarState[];
  /** 0..1 per star, page by page. Without it, only finished books count. */
  fills?: number[];
  width: number;
  height: number;
  /** Highlight one star, for example the one the reader should start with. */
  focus?: number | null;
  accessibilityLabel?: string;
};

/**
 * A reading path as a constellation. Finished books are bright stars. The
 * book being read grows and brightens with every page, with a thin arc
 * around it showing how far in the reader is. Books on the shelf are faint,
 * the rest are pinpricks. The line to the next star draws itself in as that
 * book is read, so the shape appears page by page.
 */
export function Constellation({ pathId, states, fills, width, height, focus, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const pts = constellationPoints(pathId, states.length).map((p) => ({ x: p.x * width, y: p.y * height }));
  const fill = useMemo(() => states.map((s, i) => fills?.[i] ?? (s === 'finished' ? 1 : 0)), [states, fills]);

  return (
    <Canvas
      style={{ width, height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      <Group>
        {pts.slice(1).map((p, i) => {
          const a = pts[i];
          const t = lineFill(fill, i);
          return (
            <Group key={`l${i}`}>
              <Line
                p1={vec(a.x, a.y)}
                p2={vec(p.x, p.y)}
                color={colors.starlight}
                strokeWidth={0.8}
                opacity={0.2}
              />
              {t > 0 ? (
                <Line
                  p1={vec(a.x, a.y)}
                  p2={vec(a.x + (p.x - a.x) * t, a.y + (p.y - a.y) * t)}
                  color={colors.starlight}
                  strokeWidth={1.2}
                  opacity={0.6}
                />
              ) : null}
            </Group>
          );
        })}
        {pts.map((p, i) => {
          const s = states[i];
          const f = fill[i];
          // A book being read grows from a shelf star towards a whole one.
          const r = s === 'finished' ? 5 : s === 'reading' ? 3.4 + 1.6 * f : s === 'shelf' ? 3.2 : 2.6;
          const o = s === 'finished' ? 1 : s === 'reading' ? 0.75 + 0.25 * f : s === 'shelf' ? 0.7 : 0.5;
          return (
            <Group key={`s${i}`}>
              {s === 'finished' || s === 'reading' ? (
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={r * 3.2}
                  color={colors.candlelight}
                  opacity={s === 'finished' ? 0.4 : 0.14 + 0.22 * f}>
                  <BlurMask blur={r * 2.4} style="normal" />
                </Circle>
              ) : null}
              {s === 'reading' && f > 0 ? (
                <Path
                  path={arc(p.x, p.y, r + 4.5, f)}
                  style="stroke"
                  strokeWidth={1.2}
                  strokeCap="round"
                  color={colors.starlight}
                  opacity={0.7}
                />
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

/** A clockwise arc from twelve o'clock, `t` of the way round. */
function arc(cx: number, cy: number, r: number, t: number) {
  const a = Math.min(Math.max(t, 0), 0.999) * Math.PI * 2;
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  const large = a > Math.PI ? 1 : 0;
  return Skia.Path.MakeFromSVGString(`M ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y}`)!;
}
