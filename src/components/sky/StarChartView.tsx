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
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { twinkle } from '@/domain/motion';
import { lineFill } from '@/domain/paths';
import {
  depthShift,
  newestStar,
  type ChartConstellation,
  type ChartPlanet,
  type ChartStar,
  type StarChart,
} from '@/domain/starChart';
import type { Explore } from '@/features/sky/depth';
import type { Tilt } from '@/features/sky/useTilt';
import { useTheme } from '@/theme/theme';
import { depth, fontFamily, motion, type Palette } from '@/theme/tokens';

export type ChartFocus = { pathId: string | null; bookId: string | null; planet?: boolean } | null;

/** How far the rest of the sky fades back while one thing is chosen. */
const DIM = 0.78;
/** How much a chosen constellation comes forward. */
const FORWARD = 0.06;

/** Farther stars are fainter: full at the front, a little over half at the back. */
function depthFade(z: number): number {
  return 1 - 0.45 * z;
}

/**
 * The reader's star chart, drawn at chart size. The parent moves and zooms
 * it. Every constellation, and every star in it, has its own distance: near
 * ones are bigger, brighter, warmer and sharper, far ones smaller, fainter,
 * bluer and softer, and as the phone tilts or the chart is dragged, near
 * stars slide a little more than far ones, so each shape has volume.
 * Constellations trace themselves in once, on first sight; a chosen one
 * comes forward and traces again while the rest of the sky fades back.
 */
export function StarChartView({
  chart,
  focus,
  chosen,
  tilt,
  explore,
  close,
}: {
  chart: StarChart;
  focus: ChartFocus;
  /** 0 with nothing chosen, 1 with something chosen. Shared with the backdrop. */
  chosen: SharedValue<number>;
  tilt: Tilt;
  explore: Explore;
  /** 0 on the chart, 1 while the chosen constellation is brought close and shown on its own. */
  close: SharedValue<number>;
}) {
  const { colors, reduceMotion } = useTheme();

  // One slow clock for the whole sky's twinkle.
  const clock = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    clock.set(withRepeat(withTiming(1, { duration: motion.twinkleMs, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(clock);
  }, [reduceMotion, clock]);

  // Only the book finished last breathes: one slow swell every 7 seconds.
  const newest = newestStar(chart);
  const breath = useSharedValue(0.5);
  useEffect(() => {
    if (reduceMotion) {
      breath.set(0.5);
      return;
    }
    breath.set(withRepeat(withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(breath);
  }, [reduceMotion, breath]);
  const look: Look = { colors, reduceMotion, breath, newest, tilt, explore };

  // Far constellations are drawn first, so nearer ones pass in front.
  const ordered = useMemo(
    () => chart.constellations.map((c, i) => ({ c, i })).sort((a, b) => b.c.z - a.c.z),
    [chart.constellations],
  );
  const lone = useMemo(
    () => chart.lone.map((s, i) => ({ s, i })).sort((a, b) => b.s.z - a.s.z),
    [chart.lone],
  );

  return (
    <View style={{ width: chart.width, height: chart.height }} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {lone.map(({ s, i }) => (
          <LoneStar
            key={s.bookId ?? i}
            s={s}
            index={i}
            clock={clock}
            chosen={chosen}
            picked={!!focus?.bookId && focus.bookId === s.bookId}
            look={look}
          />
        ))}
        {chart.planets.map((p) => (
          <PlanetNode
            key={p.bookId}
            p={p}
            chosen={chosen}
            picked={!!focus?.planet && focus.bookId === p.bookId}
            look={look}
          />
        ))}
        {ordered.map(({ c, i }) => (
          <ConstellationNode
            close={close}
            key={c.pathId}
            c={c}
            index={i}
            clock={clock}
            chosen={chosen}
            focused={!!focus && focus.pathId === c.pathId}
            pickedBook={focus?.bookId ?? null}
            look={look}
          />
        ))}
      </Canvas>
      {chart.constellations.map((c) => (
        <ConstellationName
          close={close}
          key={c.pathId}
          c={c}
          chosen={chosen}
          focused={!!focus && focus.pathId === c.pathId}
          look={look}
        />
      ))}
    </View>
  );
}

/** What every star needs from outside the canvas: React context does not reach inside one. */
type Look = {
  colors: Palette;
  reduceMotion: boolean;
  /** 0 to 1 and back, slowly, for the newest star. */
  breath: SharedValue<number>;
  newest: ChartStar | null;
  tilt: Tilt;
  explore: Explore;
};

type Point = { x: number; y: number };

/** Where each of these depths has shifted to right now. Still under Reduce Motion. */
function useShifts(zs: number[], look: Look) {
  const { tilt, explore, reduceMotion } = look;
  return useDerivedValue(() =>
    zs.map((z) =>
      reduceMotion
        ? { x: 0, y: 0 }
        : depthShift(z, explore.dx.get(), explore.dy.get(), tilt.x.get(), tilt.y.get()),
    ),
  );
}

function useDimmed(chosen: SharedValue<number>, lit: boolean) {
  return useDerivedValue(() => (lit ? 1 : 1 - DIM * chosen.get()));
}

function ConstellationNode({
  close,
  c,
  index,
  clock,
  chosen,
  focused,
  pickedBook,
  look,
}: {
  close: SharedValue<number>;
  c: ChartConstellation;
  index: number;
  clock: SharedValue<number>;
  chosen: SharedValue<number>;
  focused: boolean;
  pickedBook: string | null;
  look: Look;
}) {
  const { colors, reduceMotion } = look;
  const dimmed = useDimmed(chosen, focused);
  // Brought close, the constellation leaves the chart for its own view in front.
  const opacity = useDerivedValue(() => dimmed.get() * (focused ? 1 - close.get() : 1));
  const shifts = useShifts(
    c.stars.map((s) => s.z),
    look,
  );

  // Lines trace in on first sight, one constellation after another, and
  // again whenever this one is chosen.
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      draw.set(1);
      return;
    }
    draw.set(0);
    const delay = focused ? 120 : 300 + index * 260;
    draw.set(withDelay(delay, withTiming(1, { duration: motion.draw, easing: Easing.inOut(Easing.cubic) })));
  }, [focused, index, reduceMotion, draw]);

  // A chosen constellation comes forward a little, about its own centre.
  const cx = c.box.x + c.box.w / 2;
  const cy = c.box.y + c.box.h / 2;
  const forward = useDerivedValue(() => {
    const k = 1 + (focused && !reduceMotion ? FORWARD * chosen.get() : 0);
    return [{ translateX: cx }, { translateY: cy }, { scale: k }, { translateX: -cx }, { translateY: -cy }];
  });

  const tw = useDerivedValue(() => twinkle(clock.get(), index));
  const fills = c.stars.map((s) => s.fill);
  const segments = Math.max(1, c.stars.length - 1);

  return (
    <Group opacity={opacity} transform={forward}>
      {c.stars.slice(1).map((b, i) => {
        const a = c.stars[i];
        const t = c.complete ? 1 : lineFill(fills, i);
        return (
          <Group key={`l${i}`}>
            {!c.complete ? (
              // The whole shape as a faint dotted guide, like a chart's pencil lines.
              <GuideLine a={a} b={b} i={i} shifts={shifts} color={colors.starlight} />
            ) : null}
            {t > 0 ? (
              <TracedLine
                a={a}
                b={b}
                i={i}
                shifts={shifts}
                t={t}
                draw={draw}
                segments={segments}
                color={colors.starlight}
                strong={c.complete}
              />
            ) : null}
          </Group>
        );
      })}
      <Group opacity={tw}>
        {c.stars.map((s, i) => (
          <Shifted key={`s${i}`} shifts={shifts} i={i}>
            <StarDot s={s} picked={!!pickedBook && s.bookId === pickedBook} look={look} />
          </Shifted>
        ))}
      </Group>
    </Group>
  );
}

/** Moves its children by the shift of star `i`. */
function Shifted({
  shifts,
  i,
  children,
}: {
  shifts: SharedValue<Point[]>;
  i: number;
  children: React.ReactNode;
}) {
  const transform = useDerivedValue(() => {
    const o = shifts.get()[i] ?? { x: 0, y: 0 };
    return [{ translateX: o.x }, { translateY: o.y }];
  });
  return <Group transform={transform}>{children}</Group>;
}

/** The two ends of the line from star `i` to star `i + 1`, where they are seen now. */
function useEnds(a: ChartStar, b: ChartStar, i: number, shifts: SharedValue<Point[]>) {
  const p1 = useDerivedValue(() => {
    const o = shifts.get()[i] ?? { x: 0, y: 0 };
    return vec(a.x + o.x, a.y + o.y);
  });
  const p2 = useDerivedValue(() => {
    const o = shifts.get()[i + 1] ?? { x: 0, y: 0 };
    return vec(b.x + o.x, b.y + o.y);
  });
  return { p1, p2 };
}

/** A line's light fades with distance: the far end of a line is fainter than the near end. */
function depthColors(color: string, a: ChartStar, b: ChartStar, strength: number): string[] {
  return [withAlpha(color, strength * depthFade(a.z)), withAlpha(color, strength * depthFade(b.z))];
}

function GuideLine({
  a,
  b,
  i,
  shifts,
  color,
}: {
  a: ChartStar;
  b: ChartStar;
  i: number;
  shifts: SharedValue<Point[]>;
  color: string;
}) {
  const { p1, p2 } = useEnds(a, b, i, shifts);
  return (
    <Line p1={p1} p2={p2} strokeWidth={0.8}>
      <LinearGradient start={p1} end={p2} colors={depthColors(color, a, b, 0.24)} />
      <DashPathEffect intervals={[2, 5]} />
    </Line>
  );
}

function TracedLine({
  a,
  b,
  i,
  shifts,
  t,
  draw,
  segments,
  color,
  strong,
}: {
  a: ChartStar;
  b: ChartStar;
  i: number;
  shifts: SharedValue<Point[]>;
  t: number;
  draw: SharedValue<number>;
  segments: number;
  color: string;
  strong: boolean;
}) {
  const { p1, p2: end } = useEnds(a, b, i, shifts);
  // Each line draws during its own slice of `draw`, so the shape traces in order.
  const p2 = useDerivedValue(() => {
    const local = Math.min(Math.max(draw.get() * segments - i, 0), 1);
    const k = t * local;
    const s = p1.get();
    const e = end.get();
    return vec(s.x + (e.x - s.x) * k, s.y + (e.y - s.y) * k);
  });
  // Nearer lines are a touch thicker.
  const width = (strong ? 1.3 : 1) * (1.15 - 0.4 * ((a.z + b.z) / 2));
  return (
    <Group>
      {strong ? (
        // A finished constellation's lines carry a faint outer glow.
        <Line p1={p1} p2={p2} strokeWidth={5} strokeCap="round">
          <LinearGradient start={p1} end={end} colors={depthColors(color, a, b, 0.12)} />
          <BlurMask blur={4} style="normal" />
        </Line>
      ) : null}
      <Line p1={p1} p2={p2} strokeWidth={width} strokeCap="round">
        <LinearGradient start={p1} end={end} colors={depthColors(color, a, b, strong ? 0.72 : 0.5)} />
      </Line>
    </Group>
  );
}

const COOL = [0xdc, 0xe3, 0xff];
const WARM = [0xf4, 0xd2, 0x9c];
/** Far stars take on the blue of the distant sky. */
const FAR = [0xb4, 0xbf, 0xee];

function mix(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function rgb(c: number[]): string {
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!m) return color;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha.toFixed(3)})`;
}

/**
 * The colour of a star's light: cool blue-white for a short book, warm
 * candle for a long one, and bluer the farther away it is.
 */
export function starColor(warmth: number, z: number): string {
  return rgb(mix(mix(COOL, WARM, warmth * (1 - 0.6 * z)), FAR, 0.4 * z));
}

/**
 * A lit star: a tiny hot core, the star's own colour around it, and a soft
 * halo drawn with a screen blend, so where halos overlap the light adds up
 * instead of muddying. Far stars are fainter and softer, near ones crisp.
 * Unlit stars are plain small dots.
 */
function StarDot({ s, picked, look }: { s: ChartStar; picked: boolean; look: Look }) {
  const { colors } = look;
  const lit = s.state === 'finished' || s.state === 'reading';
  const fade = depthFade(s.z);
  const base =
    s.state === 'finished'
      ? 1
      : s.state === 'reading'
        ? 0.7 + 0.3 * s.fill
        : s.state === 'shelf'
          ? 0.55
          : 0.4;
  const o = base * fade;
  const light = lit ? starColor(s.warmth, s.z) : s.state === 'none' ? colors.mist : colors.starlight;
  const isNewest = !!look.newest && look.newest === s;
  const halo = (s.state === 'finished' ? 0.85 : 0.45 * (0.4 + 0.6 * s.fill)) * fade;
  // Far halos spread wider and softer, like light through more air.
  const haloR = s.r * (4 + 2.4 * s.z);
  const soft = Math.max(0, s.z - 0.45) * 2.2;
  const haloOpacity = useDerivedValue(() => (isNewest ? halo * (0.75 + 0.5 * look.breath.get()) : halo));
  return (
    <Group>
      {lit ? (
        <Circle cx={s.x} cy={s.y} r={haloR} opacity={haloOpacity} blendMode="screen">
          <RadialGradient c={vec(s.x, s.y)} r={haloR} colors={[light, 'rgba(0,0,0,0)']} positions={[0, 1]} />
        </Circle>
      ) : null}
      {picked ? <PickedMark s={s} color={colors.aurora} /> : null}
      {picked && !look.reduceMotion ? (
        <Grow s={s} color={light} />
      ) : (
        <Circle cx={s.x} cy={s.y} r={s.r} color={light} opacity={o}>
          {soft > 0 ? <BlurMask blur={soft} style="solid" /> : null}
        </Circle>
      )}
      {s.state === 'finished' ? <Sparkle s={s} color={light} fade={fade} /> : null}
      {lit ? (
        <Circle cx={s.x} cy={s.y} r={s.r * 0.42} color="#FFF9EE" opacity={0.95 * (1 - 0.5 * s.z)} />
      ) : null}
    </Group>
  );
}

/**
 * A finished book's star catches the eye like the bright stars of deep
 * space: thin spikes up, down and to the sides, fading to nothing. Nearer
 * stars have longer spikes.
 */
function Sparkle({ s, color, fade }: { s: ChartStar; color: string; fade: number }) {
  const len = s.r * (3.2 + 2.4 * (1 - s.z));
  const clear = withAlpha('#FFFFFF', 0);
  const bar = (dx: number, dy: number) => {
    const a = vec(s.x - dx * len, s.y - dy * len);
    const b = vec(s.x + dx * len, s.y + dy * len);
    return (
      <Line p1={a} p2={b} strokeWidth={0.8} strokeCap="round">
        <LinearGradient start={a} end={b} colors={[clear, color, clear]} positions={[0, 0.5, 1]} />
      </Line>
    );
  };
  return (
    <Group opacity={0.6 * fade}>
      {bar(1, 0)}
      {bar(0, 0.85)}
    </Group>
  );
}

/** A chosen star comes forward: it grows a little, once, as it is chosen. */
function Grow({ s, color }: { s: ChartStar; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: motion.enter, easing: Easing.out(Easing.cubic) }));
  }, [t]);
  const r = useDerivedValue(() => s.r * (1 + (depth.focusScale - 1) * t.get()));
  return <Circle cx={s.x} cy={s.y} r={r} color={color} />;
}

/** A chosen star: a thin teal ring and four short diagonal rays, clear of the lines. */
function PickedMark({ s, color }: { s: ChartStar; color: string }) {
  const d = Math.SQRT1_2;
  const from = s.r + 7;
  const to = from + s.r * 2.6;
  const ray = (sx: number, sy: number) => (
    <Line
      p1={vec(s.x + sx * from * d, s.y + sy * from * d)}
      p2={vec(s.x + sx * to * d, s.y + sy * to * d)}
      color={color}
      strokeWidth={1}
      strokeCap="round"
    />
  );
  return (
    <Group opacity={0.85}>
      <Circle cx={s.x} cy={s.y} r={s.r + 5} style="stroke" strokeWidth={1} color={color} />
      {ray(1, 1)}
      {ray(-1, 1)}
      {ray(1, -1)}
      {ray(-1, -1)}
    </Group>
  );
}

function LoneStar({
  s,
  index,
  clock,
  chosen,
  picked,
  look,
}: {
  s: ChartStar;
  index: number;
  clock: SharedValue<number>;
  chosen: SharedValue<number>;
  picked: boolean;
  look: Look;
}) {
  const dim = useDimmed(chosen, picked);
  const opacity = useDerivedValue(() => dim.get() * twinkle(clock.get(), index + 1));
  const shifts = useShifts([s.z], look);
  return (
    <Group opacity={opacity}>
      <Shifted shifts={shifts} i={0}>
        <StarDot s={s} picked={picked} look={look} />
      </Shifted>
    </Group>
  );
}

/** Soft planet colours, lit side first: dusty rose, sea glass, sand and lavender. */
const PLANET_TONES: [string, string, string][] = [
  ['#F2C9C4', '#B97C8E', '#3A2547'],
  ['#C8EDE2', '#6FA8A6', '#1E3346'],
  ['#F5E2BF', '#C49A6C', '#3C2A35'],
  ['#DCD3F6', '#8B7DC2', '#262250'],
];

/**
 * A book being read, as a small world: lit from the upper left like the
 * moon is, a thin atmosphere around it, and a leaning ring whose lit part
 * is how far through the book the reader is. The back of the ring passes
 * behind the planet and the front in front, so it reads as round.
 */
function PlanetNode({
  p,
  chosen,
  picked,
  look,
}: {
  p: ChartPlanet;
  chosen: SharedValue<number>;
  picked: boolean;
  look: Look;
}) {
  const { colors } = look;
  const dim = useDimmed(chosen, picked);
  const shifts = useShifts([p.z], look);
  const tone = PLANET_TONES[Math.floor(p.hue * PLANET_TONES.length) % PLANET_TONES.length];
  const fade = depthFade(p.z);
  const rx = p.r * (p.ringed ? 2.3 : 1.9);
  const ry = rx * 0.28;
  const oval = { x: p.x - rx, y: p.y - ry, width: rx * 2, height: ry * 2 };
  const { backArc, frontArc, backLit, frontLit } = useMemo(() => {
    const arc = (start: number, sweep: number) => {
      const path = Skia.PathBuilder.Make();
      if (sweep > 0) path.addArc(oval, start, sweep);
      return path.build();
    };
    const sweep = 360 * p.fill;
    return {
      backArc: arc(180, 180),
      frontArc: arc(0, 180),
      // Progress runs from the left, over the back, and round the front.
      backLit: arc(180, Math.min(sweep, 180)),
      frontLit: arc(0, Math.max(0, sweep - 180)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.x, p.y, rx, ry, p.fill]);
  const lean = [
    { translateX: p.x },
    { translateY: p.y },
    { rotate: p.lean },
    { translateX: -p.x },
    { translateY: -p.y },
  ];
  const ringW = p.ringed ? 2.4 : 1;
  const ring = (path: SkPath, lit: boolean) => (
    <Path
      path={path}
      style="stroke"
      strokeWidth={lit ? ringW + 0.4 : ringW}
      strokeCap="round"
      color={lit ? colors.candlelight : withAlpha(colors.starlight, p.ringed ? 0.22 : 0.16)}
      opacity={lit ? 0.9 * fade : fade}
    />
  );
  return (
    <Group opacity={dim}>
      <Shifted shifts={shifts} i={0}>
        <Group transform={lean}>
          {ring(backArc, false)}
          {ring(backLit, true)}
        </Group>
        {/* A thin atmosphere. */}
        <Circle cx={p.x} cy={p.y} r={p.r * 2.1} opacity={0.5 * fade} blendMode="screen">
          <RadialGradient
            c={vec(p.x, p.y)}
            r={p.r * 2.1}
            colors={[withAlpha(tone[1], 0.5), withAlpha(tone[1], 0)]}
            positions={[0.45, 1]}
          />
        </Circle>
        <Circle cx={p.x} cy={p.y} r={p.r} opacity={0.6 + 0.4 * fade}>
          <RadialGradient
            c={vec(p.x - p.r * 0.4, p.y - p.r * 0.45)}
            r={p.r * 1.7}
            colors={[tone[0], tone[1], tone[2]]}
            positions={[0, 0.45, 1]}
          />
        </Circle>
        <Group transform={lean}>
          {ring(frontArc, false)}
          {ring(frontLit, true)}
        </Group>
        {picked ? (
          <Circle
            cx={p.x}
            cy={p.y}
            r={rx + 6}
            style="stroke"
            strokeWidth={1}
            color={colors.aurora}
            opacity={0.8}
          />
        ) : null}
      </Shifted>
    </Group>
  );
}

/**
 * A constellation's name, lettered under it in italic serif the way star
 * atlases name theirs. A finished shape is named in full; one still being
 * read is quieter and says how far along it is. Names sit at their
 * constellation's distance: smaller and fainter farther back, and they
 * move with it.
 */
function ConstellationName({
  close,
  c,
  chosen,
  focused,
  look,
}: {
  close: SharedValue<number>;
  c: ChartConstellation;
  chosen: SharedValue<number>;
  focused: boolean;
  look: Look;
}) {
  const width = Math.min(c.box.w, 260);
  const { tilt, explore, reduceMotion } = look;
  const size = 1.1 - 0.3 * c.z;
  const fade = 1 - 0.35 * c.z;
  const style = useAnimatedStyle(() => {
    const o = reduceMotion
      ? { x: 0, y: 0 }
      : depthShift(c.z, explore.dx.get(), explore.dy.get(), tilt.x.get(), tilt.y.get());
    return {
      opacity: (focused ? 1 - close.get() : 1 - DIM * chosen.get()) * fade,
      // Names stay upright however the sky is turned.
      transform: [{ translateX: o.x }, { translateY: o.y }, { rotate: `${-explore.rot.get()}rad` }],
    };
  });
  return (
    <Animated.View style={[styles.name, { left: c.label.x - width / 2, top: c.label.y - 10, width }, style]}>
      <Text
        style={[
          styles.nameText,
          !c.complete && styles.nameQuiet,
          // Sized as text, not scaled as a picture, so the letters stay crisp.
          { fontSize: (c.complete ? 17 : 15) * size, lineHeight: (c.complete ? 22 : 20) * size },
        ]}
        tone={c.complete ? 'starlight' : 'mist'}
        numberOfLines={2}>
        {c.title}
      </Text>
      {!c.complete ? (
        <Text variant="caption" style={styles.center}>
          {c.finished} of {c.total} stars
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  name: { position: 'absolute', alignItems: 'center', gap: 2 },
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
