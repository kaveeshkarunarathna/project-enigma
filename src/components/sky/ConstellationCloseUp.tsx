import {
  BlurMask,
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { starColor, withAlpha } from './StarChartView';
import { Text } from '@/components/Text';
import {
  igniteAt,
  orbitRadius,
  project,
  solidOfBox,
  type Projected,
  type Vec3,
} from '@/domain/orbit';
import type { ChartConstellation, ChartStar } from '@/domain/starChart';
import { useTheme } from '@/theme/theme';
import { fontFamily, type Palette } from '@/theme/tokens';

export type CloseUpCamera = {
  /** The turn about the vertical axis as seen, in radians: the reader's turn plus a slow sway. */
  yaw: SharedValue<number>;
  /** How far the shape is tipped back, in radians. */
  pitch: SharedValue<number>;
  /** Points per chart point: grows from the chart's scale to the close-up's. */
  zoom: SharedValue<number>;
  /** 0 on the chart, 1 fully close. */
  open: SharedValue<number>;
  /** Stars lit so far, counting up one by one as the close-up opens. */
  lit: SharedValue<number>;
};

/**
 * A constellation brought close: the stars of a reading path as a small
 * solid the reader can turn with a finger. Near stars are bigger, warmer and
 * in front; far ones smaller, bluer and behind. Stars light one after
 * another as it opens.
 */
export function ConstellationCloseUp({
  c,
  width,
  height,
  centre,
  camera,
  picked,
}: {
  c: ChartConstellation;
  width: number;
  height: number;
  /** Where the shape's centre sits in the view. */
  centre: { x: number; y: number };
  camera: CloseUpCamera;
  picked: string | null;
}) {
  const { colors } = useTheme();
  const solid = useMemo(() => solidOfBox(c.stars, c.box), [c]);

  const { yaw, pitch, zoom, open, lit } = camera;
  const cx = centre.x;
  const cy = centre.y;
  const view = useDerivedValue(() => ({
    yaw: yaw.get(),
    pitch: pitch.get(),
    k: zoom.get(),
  }));
  const points = useDerivedValue(() => {
    const v = view.get();
    return solid.map((p: Vec3) => {
      const q = project(p, v.yaw, v.pitch);
      return { x: cx + q.x * v.k, y: cy + q.y * v.k, z: q.z, s: q.s };
    });
  });

  const radius = orbitRadius(c.box);
  const glowR = useDerivedValue(() => radius * 1.25 * zoom.get());
  const fade = useDerivedValue(() => open.get());

  const light = colors.starlight;
  const segments = c.stars.slice(1).map((b, i) => ({ a: c.stars[i], b, i }));

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Group opacity={fade}>
          {/* A soft glow behind the shape, as if it hung in a faint nebula. */}
          <Circle cx={cx} cy={cy} r={glowR} opacity={0.5}>
            <RadialGradient
              c={vec(cx, cy)}
              r={glowR}
              colors={['rgba(120, 96, 170, 0.32)', 'rgba(70, 60, 130, 0.12)', 'rgba(0,0,0,0)']}
              positions={[0, 0.55, 1]}
            />
          </Circle>
          {segments.map(({ a, b, i }) => (
            <Connection
              key={`l${i}`}
              a={a}
              b={b}
              i={i}
              points={points}
              lit={lit}
              color={light}
              joined={a.state === 'finished' && b.state === 'finished'}
            />
          ))}
          {c.stars.map((s, i) => (
            <Star3D
              key={`s${i}`}
              s={s}
              i={i}
              points={points}
              lit={lit}
              zoom={zoom}
              colors={colors}
              picked={!!picked && (s.bookId ?? `entry:${s.title}`) === picked}
            />
          ))}
        </Group>
      </Canvas>
      {c.stars.map((s, i) => (
        <StarLabel
          key={`t${i}`}
          s={s}
          i={i}
          points={points}
          open={open}
          picked={!!picked && (s.bookId ?? `entry:${s.title}`) === picked}
        />
      ))}
    </View>
  );
}

/** How bright a star is once lit: finished books fully, a book being read by how far along it is. */
function brightness(s: ChartStar): number {
  if (s.state === 'finished') return 1;
  if (s.state === 'reading') return 0.35 + 0.55 * s.fill;
  return 0;
}

function Star3D({
  s,
  i,
  points,
  lit,
  zoom,
  colors,
  picked,
}: {
  colors: Palette;
  s: ChartStar;
  i: number;
  points: SharedValue<Projected[]>;
  lit: SharedValue<number>;
  zoom: SharedValue<number>;
  picked: boolean;
}) {
  // React context does not reach inside a canvas, so colours come in as a prop.
  const full = brightness(s);
  const light = full > 0 ? starColor(s.warmth, s.z) : colors.mist;
  // Sizes grow with perspective but not with zoom in full, so near stars never turn to blobs.
  const base = Math.max(s.r, 2.6) * 1.25;
  const p = useDerivedValue(() => points.get()[i] ?? { x: 0, y: 0, z: 0, s: 1 });
  const x = useDerivedValue(() => p.get().x);
  const y = useDerivedValue(() => p.get().y);
  const near = useDerivedValue(() => p.get().s);
  const glow = useDerivedValue(() => full * igniteAt(lit.get(), i));
  const r = useDerivedValue(() => base * near.get() * Math.sqrt(zoom.get()));
  const haloR = useDerivedValue(() => r.get() * 5.5);
  const haloO = useDerivedValue(() => 0.85 * glow.get() * Math.min(1, near.get()));
  const coreO = useDerivedValue(() => 0.3 + 0.7 * glow.get());
  const hot = useDerivedValue(() => r.get() * 0.42);
  const hotO = useDerivedValue(() => 0.95 * glow.get());
  const ringR = useDerivedValue(() => r.get() + 5);
  const markR = useDerivedValue(() => r.get() + 9);
  const centre = useDerivedValue(() => vec(x.get(), y.get()));
  const fill = s.state === 'reading' ? s.fill : 0;
  const arc = useDerivedValue(() => {
    const path = Skia.PathBuilder.Make();
    if (fill <= 0) return path.build();
    const rr = ringR.get();
    path.addArc({ x: x.get() - rr, y: y.get() - rr, width: rr * 2, height: rr * 2 }, -90, 360 * fill);
    return path.build();
  });
  return (
    <Group>
      {full > 0 ? (
        <Circle cx={x} cy={y} r={haloR} opacity={haloO} blendMode="screen">
          <RadialGradient c={centre} r={haloR} colors={[light, 'rgba(0,0,0,0)']} positions={[0, 1]} />
        </Circle>
      ) : null}
      {full > 0 ? (
        <Circle cx={x} cy={y} r={r} color={light} opacity={coreO} />
      ) : (
        // A book not yet read: an outline waiting for its light.
        <Circle cx={x} cy={y} r={r} style="stroke" strokeWidth={1} color={withAlpha(colors.starlight, 0.5)} />
      )}
      {full > 0 ? <Circle cx={x} cy={y} r={hot} color="#FFF9EE" opacity={hotO} /> : null}
      {fill > 0 ? (
        <Group>
          <Circle
            cx={x}
            cy={y}
            r={ringR}
            style="stroke"
            strokeWidth={1}
            color={withAlpha(colors.starlight, 0.14)}
          />
          <Path path={arc} style="stroke" strokeWidth={1.4} strokeCap="round" color={colors.candlelight} />
        </Group>
      ) : null}
      {picked ? (
        <Circle cx={x} cy={y} r={markR} style="stroke" strokeWidth={1} color={colors.aurora} opacity={0.9} />
      ) : null}
    </Group>
  );
}

/** A luminous thread between two lit stars, a faint dotted guide otherwise. */
function Connection({
  a,
  b,
  i,
  points,
  lit,
  color,
  joined,
}: {
  a: ChartStar;
  b: ChartStar;
  i: number;
  points: SharedValue<Projected[]>;
  lit: SharedValue<number>;
  color: string;
  joined: boolean;
}) {
  const p1 = useDerivedValue(() => {
    const q = points.get()[i];
    return vec(q?.x ?? 0, q?.y ?? 0);
  });
  const end = useDerivedValue(() => {
    const q = points.get()[i + 1];
    return vec(q?.x ?? 0, q?.y ?? 0);
  });
  // The thread draws itself once the star after it has lit.
  const p2 = useDerivedValue(() => {
    const k = igniteAt(lit.get(), i + 1);
    const s = p1.get();
    const e = end.get();
    return vec(s.x + (e.x - s.x) * k, s.y + (e.y - s.y) * k);
  });
  const depthAlpha = (z: number) => 1 - 0.45 * z;
  if (!joined) {
    return (
      <Line p1={p1} p2={end} strokeWidth={0.9}>
        <LinearGradient start={p1} end={end} colors={[withAlpha(color, 0.3), withAlpha(color, 0.18)]} />
        <DashPathEffect intervals={[2, 5]} />
      </Line>
    );
  }
  const colorsAB = [withAlpha(color, 0.85 * depthAlpha(a.z)), withAlpha(color, 0.85 * depthAlpha(b.z))];
  return (
    <Group>
      <Line p1={p1} p2={p2} strokeWidth={7} strokeCap="round" color={withAlpha(color, 0.12)}>
        <BlurMask blur={5} style="normal" />
      </Line>
      <Line p1={p1} p2={p2} strokeWidth={1.5} strokeCap="round">
        <LinearGradient start={p1} end={end} colors={colorsAB} />
      </Line>
    </Group>
  );
}

/** A book's title beside its star, nearer titles brighter, so the shape's books can be read at a glance. */
function StarLabel({
  s,
  i,
  points,
  open,
  picked,
}: {
  s: ChartStar;
  i: number;
  points: SharedValue<Projected[]>;
  open: SharedValue<number>;
  picked: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const p = points.get()[i] ?? { x: 0, y: 0, z: 0, s: 1 };
    const near = Math.min(1, Math.max(0.35, (p.s - 0.75) / 0.5));
    return {
      opacity: open.get() * (picked ? 1 : 0.35 + 0.5 * near),
      transform: [{ translateX: p.x - LABEL_W / 2 }, { translateY: p.y + 14 + 6 * p.s }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.label, style]}>
      <Text
        variant="caption"
        tone={picked ? 'starlight' : 'mist'}
        style={[styles.labelText, picked && styles.labelPicked]}
        numberOfLines={2}>
        {s.title}
      </Text>
    </Animated.View>
  );
}

const LABEL_W = 116;

const styles = StyleSheet.create({
  label: { position: 'absolute', left: 0, top: 0, width: LABEL_W, alignItems: 'center' },
  labelText: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
  labelPicked: { fontFamily: fontFamily.serifItalic, fontSize: 13, lineHeight: 16 },
});
