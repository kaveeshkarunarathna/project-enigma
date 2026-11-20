import { BlurMask, Canvas, Circle, Group, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import type { Palette } from '@/theme/tokens';

/** Small fixed craters, as fractions of the radius. */
const CRATERS = [
  { x: -0.32, y: -0.2, r: 0.16, o: 0.16 },
  { x: 0.18, y: 0.28, r: 0.12, o: 0.13 },
  { x: 0.34, y: -0.34, r: 0.08, o: 0.14 },
  { x: -0.08, y: 0.48, r: 0.07, o: 0.11 },
  { x: 0.05, y: -0.05, r: 0.05, o: 0.1 },
];

/**
 * The lit part of the disc for a phase between new (0) and full (1), lit
 * from the right like a waxing moon: a right semicircle closed by the
 * terminator ellipse, which bulges right for a crescent and left for a gibbous.
 */
export function phasePath(cx: number, cy: number, r: number, fill: number) {
  const f = Math.min(Math.max(fill, 0), 1);
  if (f <= 0.001) return null;
  if (f >= 0.999) {
    return Skia.Path.MakeFromSVGString(
      `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`,
    );
  }
  // Below a sliver, show at least a thin crescent so any reading is visible.
  const shown = Math.max(f, 0.08);
  const rx = Math.max(0.01, r * Math.abs(1 - 2 * shown));
  const sweep = shown < 0.5 ? 0 : 1;
  return Skia.Path.MakeFromSVGString(
    `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`,
  );
}

export type MoonDrawing = {
  cx: number;
  cy: number;
  r: number;
  fill: number;
  full?: boolean;
  halo?: boolean;
  today?: boolean;
};

/**
 * Skia elements for one moon, to place inside a Canvas: a shaded sphere with
 * faint craters, a soft terminator and a darker limb. Empty nights are a thin
 * new-moon outline, never red.
 */
export function MoonShape({ cx, cy, r, fill, full, halo, today, colors }: MoonDrawing & { colors: Palette }) {
  const lit = useMemo(() => phasePath(cx, cy, r, fill), [cx, cy, r, fill]);
  const haloColor = halo ? colors.aurora : colors.candlelight;
  const haloR = r * 1.45;

  return (
    <Group>
      {full ? (
        <Circle cx={cx} cy={cy} r={haloR} opacity={halo ? 0.7 : 0.45}>
          <RadialGradient
            c={vec(cx, cy)}
            r={haloR}
            colors={[`${haloColor}AA`, `${haloColor}33`, `${haloColor}00`]}
            positions={[0.62, 0.8, 1]}
          />
        </Circle>
      ) : null}

      <Circle cx={cx} cy={cy} r={r} color={colors.raised} opacity={fill > 0 ? 1 : 0.4} />
      <Circle
        cx={cx}
        cy={cy}
        r={r - 0.5}
        style="stroke"
        strokeWidth={1}
        color={colors.mist}
        opacity={fill > 0 ? 0.25 : 0.5}
      />

      {lit ? (
        <Group clip={lit}>
          <Circle cx={cx} cy={cy} r={r}>
            <RadialGradient
              c={vec(cx + r * 0.3, cy - r * 0.35)}
              r={r * 1.5}
              colors={['#FBF6EA', colors.starlight, '#CFC6B2', '#8E8778']}
              positions={[0, 0.35, 0.75, 1]}
            />
          </Circle>
          {CRATERS.map((k, i) => (
            <Circle key={i} cx={cx + k.x * r} cy={cy + k.y * r} r={k.r * r} color="#6E6A60" opacity={k.o}>
              <BlurMask blur={Math.max(0.4, r * 0.03)} style="normal" />
            </Circle>
          ))}
          <Path
            path={lit}
            style="stroke"
            strokeWidth={Math.max(1, r * 0.12)}
            color={colors.night}
            opacity={0.25}>
            <BlurMask blur={Math.max(1, r * 0.1)} style="normal" />
          </Path>
        </Group>
      ) : null}

      {today ? (
        <Circle
          cx={cx}
          cy={cy}
          r={r + Math.max(3, r * 0.3)}
          style="stroke"
          strokeWidth={1}
          color={colors.starlight}
          opacity={0.4}
        />
      ) : null}
    </Group>
  );
}

/** A single moon in its own canvas. For rows and grids use MoonCanvas. */
export function Moon({
  size,
  accessibilityLabel,
  ...rest
}: Omit<MoonDrawing, 'cx' | 'cy' | 'r'> & { size: number; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  const pad = size * 0.25;
  const box = size + pad * 2;
  return (
    <Canvas
      style={{ width: box, height: box, margin: -pad }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      <MoonShape cx={box / 2} cy={box / 2} r={size / 2} colors={colors} {...rest} />
    </Canvas>
  );
}

export type PlacedMoon = MoonDrawing & { key: string; label: string };

/**
 * Many moons in one canvas (a week strip or a month), which is far lighter
 * than a canvas per moon. Each moon also gets an invisible view carrying its
 * label, so screen readers can step through the nights.
 */
export function MoonCanvas({
  width,
  height,
  moons,
  onPressMoon,
}: {
  width: number;
  height: number;
  moons: PlacedMoon[];
  /** Makes each moon a button, given its key. */
  onPressMoon?: (key: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ width, height }}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {moons.map(({ key, label: _label, ...m }) => (
          <MoonShape key={key} {...m} colors={colors} />
        ))}
      </Canvas>
      {moons.map((m) => {
        const box = {
          position: 'absolute' as const,
          left: m.cx - m.r - 6,
          top: m.cy - m.r - 6,
          width: m.r * 2 + 12,
          height: m.r * 2 + 12,
        };
        return onPressMoon ? (
          <Pressable
            key={m.key}
            accessibilityRole="button"
            accessibilityLabel={m.label}
            accessibilityHint="Opens the night"
            onPress={() => onPressMoon(m.key)}
            style={box}
          />
        ) : (
          <View key={m.key} accessible accessibilityRole="image" accessibilityLabel={m.label} style={box} />
        );
      })}
    </View>
  );
}
