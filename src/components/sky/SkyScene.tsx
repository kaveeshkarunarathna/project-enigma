import {
  BlendMode,
  Canvas,
  createPicture,
  PaintStyle,
  Picture,
  Skia,
  StrokeCap,
  TileMode,
  type SkCanvas,
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

import { starColor } from './StarChartView';
import { Text } from '@/components/Text';
import type { Vec3 } from '@/domain/orbit';
import { facing, fog, see, type Scene, type SceneCamera, type Seen } from '@/domain/scene';
import type { ChartStar } from '@/domain/starChart';
import type { Tilt } from '@/features/sky/useTilt';
import { useTheme } from '@/theme/theme';
import { fontFamily } from '@/theme/tokens';

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

/** A colour as plain numbers (red, green, blue, alpha from 0 to 1), so worklets can carry it. */
type Rgba = number[];

function rgbaOf(color: string): Rgba {
  return Array.from(Skia.Color(color));
}

/** The colour at an opacity, as Skia wants it. */
function tint(c: Rgba, a: number): Float32Array {
  'worklet';
  return Float32Array.of(c[0], c[1], c[2], c[3] * Math.max(0, Math.min(1, a)));
}

const SCREEN = BlendMode.Screen;
const STROKE = PaintStyle.Stroke;
const ROUND = StrokeCap.Round;
const CLAMP = TileMode.Clamp;
const HOT: Rgba = [1, 249 / 255, 238 / 255, 1];
const CLEAR: Rgba = [0, 0, 0, 0];
/** Nearer dust bands are brighter and warmer; the farthest is blue and faint. */
const DUST: { color: Rgba; alpha: number }[] = [
  { color: [233 / 255, 226 / 255, 244 / 255, 1], alpha: 0.55 },
  { color: [201 / 255, 207 / 255, 240 / 255, 1], alpha: 0.4 },
  { color: [169 / 255, 179 / 255, 230 / 255, 1], alpha: 0.28 },
];

/** What a star needs to be drawn, worked out once on the JS thread. */
type StarLook = {
  /** Its place in the list of seen points. */
  i: number;
  /** 0 unread, up to 1 finished. */
  full: number;
  finished: boolean;
  light: Rgba;
  base: number;
  picked: boolean;
  newest: boolean;
};

type ThreadLook = { a: number; b: number; joined: boolean };

/** How bright a star is: finished books fully, a book being read by how far along it is. */
function brightness(s: ChartStar): number {
  if (s.state === 'finished') return 1;
  if (s.state === 'reading') return 0.35 + 0.55 * s.fill;
  return 0;
}

/**
 * The reader's sky as a small world in 3D, seen through a camera the reader
 * turns with a finger. Constellations are solids of glowing stars joined by
 * luminous threads; near stars are bigger, warmer and brighter, far ones
 * smaller, bluer and fainter, and as the sky turns, near things swing past
 * far ones.
 *
 * Everything is recorded into one Skia picture per frame by a single
 * worklet, so turning the sky costs one pass on the UI thread instead of
 * dozens of animated props per star.
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
  bleed = { top: 0, bottom: 0 },
}: {
  scene: Scene;
  camera: SceneCameraValues;
  tilt: Tilt;
  width: number;
  height: number;
  centre: { x: number; y: number };
  /**
   * How far the drawing reaches past the view above and below, so stars and
   * far dust turning out of the view drift on to the screen's edge instead
   * of being cut off at a straight line.
   */
  bleed?: { top: number; bottom: number };
  /** 1 shown, 0 hidden (while a constellation is brought close). */
  visible: SharedValue<number>;
  /** The chosen book, if any. */
  picked: string | null;
}) {
  const { colors, reduceMotion } = useTheme();
  // Drawn in a canvas taller than the view; everything inside it is shifted down by the top bleed.
  const drawHeight = height + bleed.top + bleed.bottom;
  const at = useMemo(() => ({ x: centre.x, y: centre.y + bleed.top }), [centre, bleed.top]);

  // Every point that moves, in one list, so one worklet projects them all each frame.
  const index = useMemo(() => {
    const points: Vec3[] = [];
    const starAt: number[][] = [];
    for (const k of scene.constellations) {
      starAt.push(k.stars.map((p) => points.push(p) - 1));
    }
    const loneAt = scene.lone.map((l) => points.push(l.p) - 1);
    const labelAt = scene.constellations.map((k) => points.push(k.label) - 1);
    return { points, starAt, loneAt, labelAt };
  }, [scene]);

  // Only the book finished last breathes, once every 7 seconds.
  const newest = useMemo(() => {
    let best: ChartStar | null = null;
    for (const s of [...scene.constellations.flatMap((k) => k.c.stars), ...scene.lone.map((l) => l.star)]) {
      if (s.state === 'finished' && s.finishedAt && (!best || s.finishedAt > (best.finishedAt ?? '')))
        best = s;
    }
    return best;
  }, [scene]);

  // What to draw, in back-to-front order within each constellation.
  const looks = useMemo(() => {
    const look = (s: ChartStar, i: number): StarLook => {
      const full = brightness(s);
      return {
        i,
        full,
        finished: s.state === 'finished',
        light: rgbaOf(full > 0 ? starColor(s.warmth, 0) : colors.mist),
        base: Math.max(s.r, 2.4) * 0.95,
        picked: !!picked && s.bookId === picked,
        newest: s === newest,
      };
    };
    const threads: ThreadLook[] = [];
    const stars: StarLook[] = [];
    scene.constellations.forEach((k, ci) => {
      k.c.stars.forEach((s, j) => {
        if (j > 0) {
          const a = k.c.stars[j - 1];
          threads.push({
            a: index.starAt[ci][j - 1],
            b: index.starAt[ci][j],
            joined: a.state === 'finished' && s.state === 'finished',
          });
        }
        stars.push(look(s, index.starAt[ci][j]));
      });
    });
    scene.lone.forEach((l, j) => stars.push(look(l.star, index.loneAt[j])));
    return {
      threads,
      stars,
      starlight: rgbaOf(colors.starlight),
      aurora: rgbaOf(colors.aurora),
    };
  }, [scene, index, colors, picked, newest]);

  const cam = useDerivedValue(() => cameraNow(camera, tilt));
  const seen = useDerivedValue(() => {
    const c = cam.get();
    return index.points.map((p) => {
      const q = see(p, c);
      return { x: at.x + q.x, y: at.y + q.y, z: q.z, s: q.s };
    });
  });

  const breath = useSharedValue(0.5);
  useEffect(() => {
    if (reduceMotion) return;
    breath.set(withRepeat(withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(breath);
  }, [reduceMotion, breath]);

  const dust = scene.dust;
  const picture = useDerivedValue(() => {
    const vis = visible.get();
    const c = cam.get();
    const pts = seen.get();
    const br = breath.get();
    return createPicture(
      (canvas) => {
        if (vis <= 0.01) return;
        drawDust(canvas, dust, c, at, vis);
        drawThreads(canvas, looks.threads, pts, looks.starlight, vis);
        drawStars(canvas, looks.stars, pts, looks.starlight, looks.aurora, br, vis);
      },
      { width, height: drawHeight },
    );
  });

  return (
    <View
      pointerEvents="none"
      style={[styles.bleed, { top: -bleed.top, width, height: drawHeight }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
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

/** Faint far stars, one path of tiny dots per depth band. */
function drawDust(
  canvas: SkCanvas,
  bands: Vec3[][],
  c: SceneCamera,
  centre: { x: number; y: number },
  vis: number,
) {
  'worklet';
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  for (let b = 0; b < bands.length; b++) {
    const path = Skia.PathBuilder.Make();
    for (const v of bands[b]) {
      const q = see(v, c);
      if (q.s <= 0) continue;
      path.addCircle(centre.x + q.x, centre.y + q.y, Math.max(0.45, 0.9 * q.s));
    }
    paint.setColor(tint(DUST[b].color, DUST[b].alpha * vis));
    canvas.drawPath(path.build(), paint);
  }
}

/** Luminous threads between finished stars, fading towards their farther end; faint dotted guides to stars not yet lit. */
function drawThreads(canvas: SkCanvas, threads: ThreadLook[], pts: Seen[], light: Rgba, vis: number) {
  'worklet';
  const glow = Skia.Paint();
  glow.setAntiAlias(true);
  glow.setStyle(STROKE);
  glow.setStrokeCap(ROUND);
  glow.setStrokeWidth(6);
  glow.setColor(tint(light, 0.06 * vis));
  const line = Skia.Paint();
  line.setAntiAlias(true);
  line.setStyle(STROKE);
  line.setStrokeCap(ROUND);
  const dashed = Skia.Paint();
  dashed.setAntiAlias(true);
  dashed.setStyle(STROKE);
  dashed.setPathEffect(Skia.PathEffect.MakeDash([2, 5], 0));
  for (const t of threads) {
    const qa = pts[t.a];
    const qb = pts[t.b];
    if (!qa || !qb || qa.s <= 0 || qb.s <= 0) continue;
    const k = t.joined ? 0.8 : 0.3;
    const width = (t.joined ? 1.4 : 0.9) * Math.min(1.6, (qa.s + qb.s) / 2);
    const paint = t.joined ? line : dashed;
    paint.setStrokeWidth(width);
    paint.setShader(
      Skia.Shader.MakeLinearGradient(
        { x: qa.x, y: qa.y },
        { x: qb.x, y: qb.y },
        [tint(light, k * fog(qa.z) * vis), tint(light, k * fog(qb.z) * vis)],
        null,
        CLAMP,
      ),
    );
    if (t.joined) canvas.drawLine(qa.x, qa.y, qb.x, qb.y, glow);
    canvas.drawLine(qa.x, qa.y, qb.x, qb.y, paint);
  }
}

/**
 * Stars as points of light in space: a soft halo that adds up where it
 * overlaps another (screen blend), its own colour, a tiny hot core, and four
 * fine rays on finished books. A book not yet read is an outline waiting for
 * its light. Size and brightness follow its distance.
 */
function drawStars(
  canvas: SkCanvas,
  stars: StarLook[],
  pts: Seen[],
  starlight: Rgba,
  aurora: Rgba,
  breath: number,
  vis: number,
) {
  'worklet';
  const halo = Skia.Paint();
  halo.setAntiAlias(true);
  halo.setBlendMode(SCREEN);
  const fill = Skia.Paint();
  fill.setAntiAlias(true);
  const stroke = Skia.Paint();
  stroke.setAntiAlias(true);
  stroke.setStyle(STROKE);
  for (const st of stars) {
    const q = pts[st.i];
    if (!q || q.s <= 0) continue;
    const f = fog(q.z) * vis;
    const r = st.base * Math.min(q.s, 2.2);
    const coreO = st.full > 0 ? (0.45 + 0.55 * st.full) * f : 0.45 * f;
    if (st.full > 0) {
      const haloR = r * 5.5;
      const haloO = 0.8 * st.full * f * (st.newest ? 0.75 + 0.5 * breath : 1);
      halo.setShader(
        Skia.Shader.MakeRadialGradient(
          { x: q.x, y: q.y },
          haloR,
          [tint(st.light, haloO), tint(CLEAR, 0)],
          [0, 1],
          CLAMP,
        ),
      );
      canvas.drawCircle(q.x, q.y, haloR, halo);
    }
    if (st.finished) {
      const l = r * 4.2;
      stroke.setStrokeWidth(0.7);
      stroke.setColor(tint(st.light, 0.35 * f));
      canvas.drawLine(q.x - l, q.y, q.x + l, q.y, stroke);
      canvas.drawLine(q.x, q.y - l, q.x, q.y + l, stroke);
    }
    if (st.full > 0) {
      fill.setColor(tint(st.light, coreO));
      canvas.drawCircle(q.x, q.y, r, fill);
      fill.setColor(tint(HOT, coreO));
      canvas.drawCircle(q.x, q.y, r * 0.42, fill);
    } else {
      stroke.setStrokeWidth(1);
      stroke.setColor(tint(starlight, 0.5 * coreO));
      canvas.drawCircle(q.x, q.y, r, stroke);
    }
    if (st.picked) {
      stroke.setStrokeWidth(1);
      stroke.setColor(tint(aurora, 0.9 * vis));
      canvas.drawCircle(q.x, q.y, r + 8, stroke);
    }
  }
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
  bleed: { position: 'absolute', left: 0 },
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
