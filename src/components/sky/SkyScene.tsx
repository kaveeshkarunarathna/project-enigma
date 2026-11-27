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
  type SkPath,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { starColor, withAlpha } from './StarChartView';
import { Text } from '@/components/Text';
import type { Vec3 } from '@/domain/orbit';
import { facing, fog, see, type Scene, type SceneCamera, type Seen } from '@/domain/scene';
import type { ChartPlanet, ChartStar } from '@/domain/starChart';
import type { Tilt } from '@/features/sky/useTilt';
import { useTheme } from '@/theme/theme';
import { fontFamily, type Palette } from '@/theme/tokens';

/** The camera as shared values, so turning never waits for JavaScript. */
export type SceneCameraValues = {
  yaw: SharedValue<number>;
  pitch: SharedValue<number>;
  zoom: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  tz: SharedValue<number>;
};

/** How far the phone's tilt turns the sky, in radians at full tilt. */
const TILT_YAW = 0.07;
const TILT_PITCH = 0.05;

/** The camera as seen this frame: the reader's turn plus a touch of the phone's tilt. */
export function cameraNow(cam: SceneCameraValues, tilt: Tilt): SceneCamera {
  'worklet';
  return {
    yaw: cam.yaw.get() + tilt.x.get() * TILT_YAW,
    pitch: cam.pitch.get() - tilt.y.get() * TILT_PITCH,
    zoom: cam.zoom.get(),
    target: { x: cam.tx.get(), y: cam.ty.get(), z: cam.tz.get() },
  };
}

type Ctx = {
  colors: Palette;
  /** Each thing's position this frame, in view points. */
  seen: SharedValue<Seen[]>;
  cx: number;
  cy: number;
};

/**
 * The reader's sky as a small world in 3D, seen through a camera the reader
 * turns with a finger. Constellations are solids of glowing stars joined by
 * luminous threads; near stars are bigger, warmer and brighter, far ones
 * smaller, bluer and fainter, and as the sky turns, near things swing past
 * far ones. A wide orbit rings the whole scene, its far half behind the
 * stars and its near half in front, and each finished constellation has its
 * own small orbit. Planets are the books being read outside any path.
 * Drawn in one Skia canvas from shared values.
 */
export function SkyScene({
  scene,
  camera,
  tilt,
  width,
  height,
  centre,
  visible,
  picked,
}: {
  scene: Scene;
  camera: SceneCameraValues;
  tilt: Tilt;
  width: number;
  height: number;
  centre: { x: number; y: number };
  /** 1 shown, 0 hidden (while a constellation is brought close). */
  visible: SharedValue<number>;
  /** The chosen book or planet, if any. */
  picked: string | null;
}) {
  const { colors, reduceMotion } = useTheme();

  // Every point that moves, in one list, so one worklet projects them all each frame.
  const index = useMemo(() => {
    const points: Vec3[] = [];
    const starAt: number[][] = [];
    for (const k of scene.constellations) {
      starAt.push(k.stars.map((p) => points.push(p) - 1));
    }
    const loneAt = scene.lone.map((l) => points.push(l.p) - 1);
    const planetAt = scene.planets.map((p) => points.push(p.p) - 1);
    const labelAt = scene.constellations.map((k) => points.push(k.label) - 1);
    const centreAt = scene.constellations.map((k) => points.push(k.centre) - 1);
    return { points, starAt, loneAt, planetAt, labelAt, centreAt };
  }, [scene]);

  const cam = useDerivedValue(() => cameraNow(camera, tilt));
  const seen = useDerivedValue(() => {
    const c = cam.get();
    return index.points.map((p) => {
      const q = see(p, c);
      return { x: centre.x + q.x, y: centre.y + q.y, z: q.z, s: q.s };
    });
  });
  const ctx: Ctx = { colors, seen, cx: centre.x, cy: centre.y };

  // Only the book finished last breathes, once every 7 seconds.
  const breath = useSharedValue(0.5);
  useEffect(() => {
    if (reduceMotion) return;
    breath.set(withRepeat(withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(breath);
  }, [reduceMotion, breath]);

  const fade = useDerivedValue(() => visible.get());
  const newest = useMemo(() => {
    let best: ChartStar | null = null;
    for (const s of [...scene.constellations.flatMap((k) => k.c.stars), ...scene.lone.map((l) => l.star)]) {
      if (s.state === 'finished' && s.finishedAt && (!best || s.finishedAt > (best.finishedAt ?? '')))
        best = s;
    }
    return best;
  }, [scene]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { width, height }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group opacity={fade}>
          {scene.dust.map((band, b) => (
            <Dust key={b} band={band} b={b} cam={cam} centre={centre} />
          ))}
          <SceneRing radius={scene.ring} cam={cam} centre={centre} colors={colors} far />
          {scene.constellations.map((k, ci) => (
            <Group key={k.c.pathId}>
              {k.c.complete ? <SmallOrbit k={k} cam={cam} centre={centre} colors={colors} far /> : null}
              {k.stars.slice(1).map((_, i) => (
                <Thread
                  key={`t${i}`}
                  a={k.c.stars[i]}
                  b={k.c.stars[i + 1]}
                  ia={index.starAt[ci][i]}
                  ib={index.starAt[ci][i + 1]}
                  ctx={ctx}
                />
              ))}
              {k.c.stars.map((s, i) => (
                <GlowStar
                  key={`s${i}`}
                  s={s}
                  i={index.starAt[ci][i]}
                  ctx={ctx}
                  picked={!!picked && s.bookId === picked}
                  breath={breath}
                  newest={s === newest}
                />
              ))}
              {k.c.complete ? <SmallOrbit k={k} cam={cam} centre={centre} colors={colors} /> : null}
            </Group>
          ))}
          {scene.lone.map((l, i) => (
            <GlowStar
              key={l.star.bookId ?? i}
              s={l.star}
              i={index.loneAt[i]}
              ctx={ctx}
              picked={!!picked && l.star.bookId === picked}
              breath={breath}
              newest={l.star === newest}
            />
          ))}
          {scene.planets.map((p, i) => (
            <Planet
              key={p.planet.bookId}
              p={p.planet}
              i={index.planetAt[i]}
              ctx={ctx}
              picked={picked === p.planet.bookId}
            />
          ))}
          <SceneRing radius={scene.ring} cam={cam} centre={centre} colors={colors} />
        </Group>
      </Canvas>
      {scene.constellations.map((k, ci) => (
        <Name
          key={k.c.pathId}
          title={k.c.title}
          complete={k.c.complete}
          progress={`${k.c.finished} of ${k.c.total} stars`}
          i={index.labelAt[ci]}
          seen={seen}
          cam={cam}
          visible={visible}
        />
      ))}
    </View>
  );
}

/** Faint far stars in one depth band, as one path of tiny dots. */
function Dust({
  band,
  b,
  cam,
  centre,
}: {
  band: Vec3[];
  b: number;
  cam: SharedValue<SceneCamera>;
  centre: { x: number; y: number };
}) {
  const path = useDerivedValue(() => {
    const p = Skia.PathBuilder.Make();
    const c = cam.get();
    for (const v of band) {
      const q = see(v, c);
      if (q.s <= 0) continue;
      p.addCircle(centre.x + q.x, centre.y + q.y, Math.max(0.45, 0.9 * q.s));
    }
    return p.build();
  });
  // Nearer bands are brighter and warmer; the farthest is blue and faint.
  const tones = ['#E9E2F4', '#C9CFF0', '#A9B3E6'];
  const alpha = [0.55, 0.4, 0.28];
  return <Path path={path} color={tones[b]} opacity={alpha[b]} />;
}

/** The half of a ring that lies behind (`far`) or in front of the point the camera looks at. */
function ringHalf(pts: Seen[], far: boolean): SkPath {
  'worklet';
  const p = Skia.PathBuilder.Make();
  let down = false;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a.s <= 0 || b.s <= 0) {
      down = false;
      continue;
    }
    if (a.z + b.z > 0 === far) {
      if (!down) p.moveTo(a.x, a.y);
      p.lineTo(b.x, b.y);
      down = true;
    } else down = false;
  }
  return p.build();
}

/** A circle of `radius` about `o`, leaning by `lean`, as seen now. */
function ringPoints(
  o: Vec3,
  radius: number,
  lean: number,
  c: SceneCamera,
  cx: number,
  cy: number,
  count = 96,
): Seen[] {
  'worklet';
  const out: Seen[] = [];
  const cl = Math.cos(lean);
  const sl = Math.sin(lean);
  for (let i = 0; i <= count; i++) {
    const a = (2 * Math.PI * i) / count;
    const x = radius * Math.cos(a);
    const flat = radius * Math.sin(a);
    const q = see({ x: o.x + x, y: o.y + flat * sl, z: o.z + flat * cl }, c);
    out.push({ x: cx + q.x, y: cy + q.y, z: q.z, s: q.s });
  }
  return out;
}

/**
 * The wide orbit around the whole scene, like the ecliptic on a planetarium
 * dome: a fine teal line, its far half fainter and behind the stars, its
 * near half brighter and in front of them.
 */
function SceneRing({
  radius,
  cam,
  centre,
  colors,
  far = false,
}: {
  radius: number;
  cam: SharedValue<SceneCamera>;
  centre: { x: number; y: number };
  colors: Palette;
  far?: boolean;
}) {
  const path = useDerivedValue(() => {
    const c = cam.get();
    // The ring circles the middle of the scene, not the constellation being looked at.
    const pts = ringPoints({ x: 0, y: 40, z: 60 }, radius, 0.3, c, centre.x, centre.y, 140);
    return ringHalf(pts, far);
  });
  return (
    <Group>
      <Path
        path={path}
        style="stroke"
        strokeWidth={far ? 4 : 6}
        color={withAlpha(colors.aurora, far ? 0.05 : 0.09)}>
        <BlurMask blur={4} style="normal" />
      </Path>
      <Path
        path={path}
        style="stroke"
        strokeWidth={far ? 0.7 : 1.1}
        color={withAlpha(colors.aurora, far ? 0.28 : 0.5)}
      />
    </Group>
  );
}

/** A finished constellation's own small orbit, leaning, front half in front of its stars. */
function SmallOrbit({
  k,
  cam,
  centre,
  colors,
  far = false,
}: {
  k: Scene['constellations'][number];
  cam: SharedValue<SceneCamera>;
  centre: { x: number; y: number };
  colors: Palette;
  far?: boolean;
}) {
  const path = useDerivedValue(() => {
    const pts = ringPoints(k.centre, k.orbit, 0.42, cam.get(), centre.x, centre.y, 72);
    // Halves are split about the constellation's own centre.
    const mid = see(k.centre, cam.get()).z;
    return ringHalf(
      pts.map((p) => ({ ...p, z: p.z - mid })),
      far,
    );
  });
  return (
    <Path
      path={path}
      style="stroke"
      strokeWidth={far ? 0.6 : 0.9}
      color={withAlpha(colors.candlelight, far ? 0.16 : 0.32)}
    />
  );
}

/** A luminous thread between two finished stars; a faint dotted guide to a star not yet lit. */
function Thread({ a, b, ia, ib, ctx }: { a: ChartStar; b: ChartStar; ia: number; ib: number; ctx: Ctx }) {
  const p1 = useDerivedValue(() => {
    const q = ctx.seen.get()[ia];
    return vec(q?.x ?? 0, q?.y ?? 0);
  });
  const p2 = useDerivedValue(() => {
    const q = ctx.seen.get()[ib];
    return vec(q?.x ?? 0, q?.y ?? 0);
  });
  const joined = a.state === 'finished' && b.state === 'finished';
  // The thread's light fades towards its farther end.
  const rgb = hexRgb(ctx.colors.starlight);
  const colorsAB = useDerivedValue(() => {
    const qa = ctx.seen.get()[ia];
    const qb = ctx.seen.get()[ib];
    const k = joined ? 0.8 : 0.3;
    return [rgba(rgb, k * fog(qa?.z ?? 0)), rgba(rgb, k * fog(qb?.z ?? 0))];
  });
  const width = useDerivedValue(() => {
    const qa = ctx.seen.get()[ia];
    const qb = ctx.seen.get()[ib];
    return (joined ? 1.4 : 0.9) * Math.min(1.6, ((qa?.s ?? 1) + (qb?.s ?? 1)) / 2);
  });
  if (!joined) {
    return (
      <Line p1={p1} p2={p2} strokeWidth={width}>
        <LinearGradient start={p1} end={p2} colors={colorsAB} />
        <DashPathEffect intervals={[2, 5]} />
      </Line>
    );
  }
  return (
    <Group>
      <Line p1={p1} p2={p2} strokeWidth={7} strokeCap="round" color={withAlpha(ctx.colors.starlight, 0.1)}>
        <BlurMask blur={5} style="normal" />
      </Line>
      <Line p1={p1} p2={p2} strokeWidth={width} strokeCap="round">
        <LinearGradient start={p1} end={p2} colors={colorsAB} />
      </Line>
    </Group>
  );
}

/** A colour's red, green and blue, read once on the JS thread. */
function hexRgb(color: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [234, 219, 193];
}

/** The colour at an opacity, built on the UI thread each frame. */
function rgba(c: [number, number, number], a: number): string {
  'worklet';
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a.toFixed(3)})`;
}

/** How bright a star is: finished books fully, a book being read by how far along it is. */
function brightness(s: ChartStar): number {
  if (s.state === 'finished') return 1;
  if (s.state === 'reading') return 0.35 + 0.55 * s.fill;
  return 0;
}

/**
 * A star as a point of light in space: a soft halo that adds up where it
 * overlaps another (screen blend), its own colour, a tiny hot core, and four
 * fine rays on finished books. A book not yet read is an outline waiting for
 * its light. Size and brightness follow its distance.
 */
function GlowStar({
  s,
  i,
  ctx,
  picked,
  breath,
  newest,
}: {
  s: ChartStar;
  i: number;
  ctx: Ctx;
  picked: boolean;
  breath: SharedValue<number>;
  /** The book finished last: the one star that breathes. */
  newest: boolean;
}) {
  const { colors } = ctx;
  const full = brightness(s);
  const light = full > 0 ? starColor(s.warmth, 0) : colors.mist;
  const base = Math.max(s.r, 2.4) * 0.95;
  const p = useDerivedValue(() => ctx.seen.get()[i] ?? { x: -100, y: -100, z: 0, s: 0 });
  const x = useDerivedValue(() => p.get().x);
  const y = useDerivedValue(() => p.get().y);
  const near = useDerivedValue(() => Math.min(p.get().s, 2.2));
  const f = useDerivedValue(() => fog(p.get().z));
  const r = useDerivedValue(() => base * near.get());
  const haloR = useDerivedValue(() => r.get() * 5.5);
  const haloO = useDerivedValue(() => 0.8 * full * f.get() * (newest ? 0.75 + 0.5 * breath.get() : 1));
  const coreO = useDerivedValue(() => (full > 0 ? (0.45 + 0.55 * full) * f.get() : 0.45 * f.get()));
  const hot = useDerivedValue(() => r.get() * 0.42);
  const centre = useDerivedValue(() => vec(x.get(), y.get()));
  const ray = useDerivedValue(() => r.get() * 4.2);
  const rays = useDerivedValue(() => {
    const path = Skia.PathBuilder.Make();
    if (s.state !== 'finished') return path.build();
    const cx = x.get();
    const cy = y.get();
    const l = ray.get();
    path
      .moveTo(cx - l, cy)
      .lineTo(cx + l, cy)
      .moveTo(cx, cy - l)
      .lineTo(cx, cy + l);
    return path.build();
  });
  const raysO = useDerivedValue(() => 0.35 * f.get());
  const markR = useDerivedValue(() => r.get() + 8);
  return (
    <Group>
      {full > 0 ? (
        <Circle cx={x} cy={y} r={haloR} opacity={haloO} blendMode="screen">
          <RadialGradient c={centre} r={haloR} colors={[light, 'rgba(0,0,0,0)']} positions={[0, 1]} />
        </Circle>
      ) : null}
      {s.state === 'finished' ? (
        <Path path={rays} style="stroke" strokeWidth={0.7} color={light} opacity={raysO} />
      ) : null}
      {full > 0 ? (
        <Circle cx={x} cy={y} r={r} color={light} opacity={coreO} />
      ) : (
        <Circle
          cx={x}
          cy={y}
          r={r}
          style="stroke"
          strokeWidth={1}
          color={withAlpha(colors.starlight, 0.5)}
          opacity={coreO}
        />
      )}
      {full > 0 ? <Circle cx={x} cy={y} r={hot} color="#FFF9EE" opacity={coreO} /> : null}
      {picked ? (
        <Circle cx={x} cy={y} r={markR} style="stroke" strokeWidth={1} color={colors.aurora} opacity={0.9} />
      ) : null}
    </Group>
  );
}

const PLANET_TONES: [string, string, string][] = [
  ['#F2C9C4', '#B97C8E', '#3A2547'],
  ['#C8EDE2', '#6FA8A6', '#1E3346'],
  ['#F5E2BF', '#C49A6C', '#3C2A35'],
  ['#DCD3F6', '#8B7DC2', '#262250'],
];

/**
 * A book being read, as a small world in space: lit from the upper left, a
 * thin atmosphere, and a leaning ring lit as far as the reader has read; the
 * back of the ring passes behind the planet and the front in front. Drawn
 * about its own centre, then moved and scaled to where it is seen.
 */
function Planet({ p, i, ctx, picked }: { p: ChartPlanet; i: number; ctx: Ctx; picked: boolean }) {
  const { colors } = ctx;
  const tone = PLANET_TONES[Math.floor(p.hue * PLANET_TONES.length) % PLANET_TONES.length];
  const R = p.r * 1.3;
  const rx = R * (p.ringed ? 2.3 : 1.9);
  const ry = rx * 0.28;
  const arcs = useMemo(() => {
    const oval = { x: -rx, y: -ry, width: rx * 2, height: ry * 2 };
    const arc = (start: number, sweep: number) => {
      const path = Skia.PathBuilder.Make();
      if (sweep > 0) path.addArc(oval, start, sweep);
      return path.build();
    };
    const sweep = 360 * p.fill;
    return {
      back: arc(180, 180),
      front: arc(0, 180),
      backLit: arc(180, Math.min(sweep, 180)),
      frontLit: arc(0, Math.max(0, sweep - 180)),
    };
  }, [rx, ry, p.fill]);
  const transform = useDerivedValue(() => {
    const q = ctx.seen.get()[i] ?? { x: -100, y: -100, s: 0 };
    return [{ translateX: q.x }, { translateY: q.y }, { scale: Math.min(q.s, 2) }];
  });
  const opacity = useDerivedValue(() => fog(ctx.seen.get()[i]?.z ?? 0));
  const lean = [{ rotate: p.lean }];
  const ringW = p.ringed ? 2.4 : 1;
  const ring = (path: SkPath, lit: boolean) => (
    <Path
      path={path}
      style="stroke"
      strokeWidth={lit ? ringW + 0.4 : ringW}
      strokeCap="round"
      color={lit ? colors.candlelight : withAlpha(colors.starlight, p.ringed ? 0.24 : 0.18)}
      opacity={lit ? 0.9 : 1}
    />
  );
  return (
    <Group transform={transform} opacity={opacity}>
      <Group transform={lean}>
        {ring(arcs.back, false)}
        {ring(arcs.backLit, true)}
      </Group>
      <Circle cx={0} cy={0} r={R * 2.1} opacity={0.5} blendMode="screen">
        <RadialGradient
          c={vec(0, 0)}
          r={R * 2.1}
          colors={[withAlpha(tone[1], 0.5), withAlpha(tone[1], 0)]}
          positions={[0.45, 1]}
        />
      </Circle>
      <Circle cx={0} cy={0} r={R}>
        <RadialGradient
          c={vec(-R * 0.4, -R * 0.45)}
          r={R * 1.7}
          colors={[tone[0], tone[1], tone[2]]}
          positions={[0, 0.45, 1]}
        />
      </Circle>
      <Group transform={lean}>
        {ring(arcs.front, false)}
        {ring(arcs.frontLit, true)}
      </Group>
      {picked ? (
        <Circle cx={0} cy={0} r={rx + 6} style="stroke" strokeWidth={1} color={colors.aurora} opacity={0.8} />
      ) : null}
    </Group>
  );
}

/**
 * A constellation's name in italic serif under its shape, the way star
 * atlases name theirs. It follows the shape through space, smaller and
 * fainter when far, and fades as the shape turns edge on.
 */
function Name({
  title,
  complete,
  progress,
  i,
  seen,
  cam,
  visible,
}: {
  title: string;
  complete: boolean;
  progress: string;
  i: number;
  seen: SharedValue<Seen[]>;
  cam: SharedValue<SceneCamera>;
  visible: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const q = seen.get()[i] ?? { x: -999, y: -999, z: 0, s: 0 };
    const face = facing(cam.get());
    // Text is never scaled up, so it stays crisp; far names shrink.
    const k = Math.min(Math.max(q.s, 0.6), 1);
    return {
      opacity: visible.get() * fog(q.z) * Math.min(1, face * 1.6 - 0.2) * (complete ? 1 : 0.8),
      transform: [{ translateX: q.x - NAME_W / 2 }, { translateY: q.y - 10 }, { scale: k }],
    };
  });
  return (
    <Animated.View style={[styles.name, style]}>
      <Text
        style={[styles.nameText, !complete && styles.nameQuiet]}
        tone={complete ? 'starlight' : 'mist'}
        numberOfLines={2}>
        {title}
      </Text>
      {!complete ? (
        <Text variant="caption" style={styles.center}>
          {progress}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const NAME_W = 240;

const styles = StyleSheet.create({
  name: { position: 'absolute', left: 0, top: 0, width: NAME_W, alignItems: 'center', gap: 2 },
  nameText: {
    fontFamily: fontFamily.serifItalic,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  nameQuiet: { fontSize: 15, lineHeight: 20 },
  center: { textAlign: 'center' },
});
