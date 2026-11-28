import {
  BlurStyle,
  Canvas,
  Circle,
  createPicture,
  drawAsImage,
  drawAsImageFromPicture,
  Fill,
  Group,
  Image,
  LinearGradient,
  Rect,
  Shader,
  Skia,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect as SvgRect, Stop } from 'react-native-svg';

import { Crescent } from '../art/Crescent';
import { useSvgId } from '../art/svgId';
import { mulberry32 } from '@/domain/random';
import type { SkyMood } from '@/domain/skyMood';
import { usePlane, type Explore } from '@/features/sky/depth';
import type { Tilt } from '@/features/sky/useTilt';
import { useTheme } from '@/theme/theme';
import { depth, motion, type DepthPlane } from '@/theme/tokens';

/** Far stars are cooler than the reader's warm ones, as distant things look bluer. */
const FAR_TINT = '#C4CEF5';
const DUST_TINT = '#B6BEE2';
const BAND_TINT = '#D9DDF5';
/** Pixels per point for the sharp baked stars: crisp on a dense screen, and small in memory. */
const SHARP_DENSITY = Math.min(PixelRatio.get(), 2);

/**
 * Deep space, as a small shader, in the night's own indigo and lavender: a nebula of folded gas (noise
 * warped through itself, so it billows and streams like real clouds of dust),
 * bright wisps where the gas thins into filaments, darker dust lanes through
 * it, and very light grain. Brighter banks drift across the sky with empty
 * dark between them. Drawn once into an image at half size, then still.
 */
const MILKY_SKSL = Skia.RuntimeEffect.Make(`
uniform float2 size;
uniform float intensity;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1, 0)), u.x), mix(hash(i + float2(0, 1)), hash(i + float2(1, 1)), u.x), u.y);
}
float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + float2(1.7, 9.2); a *= 0.5; }
  return v;
}

half4 main(float2 xy) {
  float2 uv = xy / size;
  float aspect = size.x / size.y;
  float2 p = uv * float2(aspect, 1.0) * 2.6;
  // Noise warped through noise: the gas folds and streams.
  float2 q = float2(fbm(p), fbm(p + float2(5.2, 1.3)));
  float2 r = float2(fbm(p + 4.0 * q + float2(1.7, 9.2)), fbm(p + 4.0 * q + float2(8.3, 2.8)));
  float f = fbm(p + 3.5 * r);
  float gas = smoothstep(0.38, 0.92, f);
  // Brighter banks with dark sky between them.
  float bank = smoothstep(0.32, 0.72, fbm(uv * float2(1.4 * aspect, 1.4) + 11.0));
  gas *= 0.25 + 0.95 * bank;
  // Dust lanes.
  float lanes = smoothstep(0.52, 0.8, fbm(p * 2.2 + r * 2.0 + 20.0));
  gas *= 1.0 - 0.7 * lanes;
  // Bright wisps where the gas thins into filaments.
  float ridge = 1.0 - abs(2.0 * fbm(p * 1.6 + q * 3.0 + 4.0) - 1.0);
  float fil = pow(ridge, 7.0) * bank * 0.8;
  // Low and deep the gas is plum; where it thickens it turns lavender.
  float3 deep = mix(float3(0.24, 0.17, 0.40), float3(0.36, 0.23, 0.44), smoothstep(0.4, 1.0, uv.y));
  float3 lit = float3(0.66, 0.62, 0.86);
  float3 rgb = mix(deep, lit, gas) * gas * 0.95 + float3(0.85, 0.83, 0.97) * fil * 0.5;
  float a = clamp(gas * 0.9 + fil * 0.55, 0.0, 1.0);
  float grain = (hash(xy) - 0.5) * 0.04;
  float ga = abs(grain) * 0.5;
  rgb = rgb * intensity + float3(grain > 0.0 ? ga : 0.0);
  return half4(half3(rgb), half(a * intensity + ga));
}`)!;

type Dot = { x: number; y: number; r: number; o: number };

function farStars(w: number, h: number): { baked: Dot[]; twinkling: Dot[] } {
  const rand = mulberry32(11);
  // Deep space is thick with stars: tiny, faint, everywhere.
  const baked = Array.from({ length: Math.round((w * h) / 380) }, () => ({
    x: rand() * w,
    y: rand() * h,
    r: 0.25 + rand() ** 4 * 0.7,
    o: 0.16 + rand() ** 2 * 0.6,
  }));
  // A few slightly brighter ones twinkle; the rest are baked and still.
  const twinkling = Array.from({ length: 40 }, () => ({
    x: rand() * w,
    y: rand() * h,
    r: 0.6 + rand() * 0.5,
    o: 0.3 + rand() * 0.3,
  }));
  return { baked, twinkling };
}

/** A second, nearer field of stars, a little brighter, and faint blue dust grains. */
function milkyStars(w: number, h: number): Dot[] {
  const rand = mulberry32(5);
  const field = Array.from({ length: Math.round((w * h) / 1500) }, () => ({
    x: rand() * w,
    y: rand() * h,
    r: 0.35 + rand() ** 4 * 0.9,
    o: 0.18 + rand() ** 2 * 0.6,
  }));
  const dust = Array.from({ length: Math.round((w * h) / 2600) }, () => ({
    x: rand() * w,
    y: rand() * h,
    r: 0.35 + rand() ** 3 * 0.7,
    o: 0.1 + rand() * 0.3,
  }));
  return [...field, ...dust.map((d) => ({ ...d, o: -d.o }))];
}

type Sparkle = { x: number; y: number; r: number; spike: number; o: number };

/** A few bright stars that catch the eye, each with a four-pointed sparkle. */
function sparkleStars(w: number, h: number): Sparkle[] {
  const rand = mulberry32(23);
  return Array.from({ length: Math.round((w * h) / 26000) }, () => {
    const big = rand() ** 2;
    return {
      x: rand() * w,
      y: rand() * h,
      r: 0.9 + big * 1.3,
      spike: 6 + big * 22,
      o: 0.55 + rand() * 0.4,
    };
  });
}

/**
 * Bright stars baked once: a soft glow, a hot core, and thin spikes up,
 * down and to the sides that fade to nothing, the way a lens sees a bright
 * star.
 */
function bakeSparkles(stars: Sparkle[], w: number, h: number, density: number): SkImage | null {
  const pw = Math.round(w * density);
  const ph = Math.round(h * density);
  const picture = createPicture(
    (canvas) => {
      canvas.scale(density, density);
      const glow = Skia.Paint();
      glow.setAntiAlias(true);
      glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 3, true));
      const core = Skia.Paint();
      core.setAntiAlias(true);
      const spike = Skia.Paint();
      spike.setAntiAlias(true);
      const white = Skia.Color('#F6F2FF');
      const clear = Skia.Color('rgba(246, 242, 255, 0)');
      for (const s of stars) {
        glow.setColor(Skia.Color(BAND_TINT));
        glow.setAlphaf(0.45 * s.o);
        canvas.drawCircle(s.x, s.y, s.r * 3, glow);
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ]) {
          // Each spike is a thin bar, brightest at the star and fading both ways.
          const len = s.spike * (dx ? 1 : 0.85);
          spike.setShader(
            Skia.Shader.MakeLinearGradient(
              vec(s.x - dx * len, s.y - dy * len),
              vec(s.x + dx * len, s.y + dy * len),
              [clear, white, clear],
              [0, 0.5, 1],
              0,
            ),
          );
          spike.setAlphaf(0.75 * s.o);
          const t = 0.35 + s.r * 0.12;
          canvas.drawRect(
            dx
              ? Skia.XYWHRect(s.x - len, s.y - t, len * 2, t * 2)
              : Skia.XYWHRect(s.x - t, s.y - len, t * 2, len * 2),
            spike,
          );
        }
        core.setColor(white);
        core.setAlphaf(s.o);
        canvas.drawCircle(s.x, s.y, s.r, core);
      }
    },
    { width: pw, height: ph },
  );
  return drawAsImageFromPicture(picture, { width: pw, height: ph });
}

/**
 * Draws dots into a still image once, at `density` pixels per point (sharp
 * copies need the screen's density to stay crisp; soft ones do not). A
 * negative opacity marks a dust dot, drawn in the dust tint.
 */
function bake(
  dots: Dot[],
  w: number,
  h: number,
  tint: string,
  blur: number,
  density: number,
): SkImage | null {
  const pw = Math.round(w * density);
  const ph = Math.round(h * density);
  const picture = createPicture(
    (canvas) => {
      canvas.scale(density, density);
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true));
      const main = Skia.Color(tint);
      const dust = Skia.Color(DUST_TINT);
      for (const d of dots) {
        paint.setColor(d.o < 0 ? dust : main);
        paint.setAlphaf(Math.abs(d.o));
        canvas.drawCircle(d.x, d.y, d.r, paint);
      }
    },
    { width: pw, height: ph },
  );
  return drawAsImageFromPicture(picture, { width: pw, height: ph });
}

/**
 * The back of the immersive sky in one Skia canvas, back to front: the
 * night's gradient, a far plane of tiny cool soft stars, then the Milky Way
 * plane with its dust. Each plane farther back is smaller, dimmer, bluer and
 * softer, and takes a smaller share of tilt, drag and zoom. While a star is
 * chosen (`focus` 0 to 1) the backdrop dims and softens behind it. The moon
 * hangs between the Milky Way and the reader's stars. Decorative.
 */
export function Atmosphere({
  mood,
  tilt,
  explore,
  focus,
  showMoon = false,
}: {
  mood: SkyMood;
  tilt: Tilt;
  explore: Explore;
  focus: SharedValue<number>;
  /** The storybook moon. Deep space leaves it out. */
  showMoon?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const { reduceMotion } = useTheme();
  // Planes are larger than the screen, so drag and zoom never show an edge.
  const padX = Math.round(width * 0.25);
  const padY = Math.round(height * 0.15);
  const w = width + padX * 2;
  const h = height + padY * 2;

  const stars = useMemo(() => farStars(w, h), [w, h]);
  const far = useMemo(
    () => ({
      sharp: bake(stars.baked, w, h, FAR_TINT, 0.5, SHARP_DENSITY),
      soft: bake(stars.baked, w, h, FAR_TINT, 2.2, 1),
    }),
    [stars, w, h],
  );
  const milkyDots = useMemo(() => milkyStars(w, h), [w, h]);
  const sparkles = useMemo(() => bakeSparkles(sparkleStars(w, h), w, h, SHARP_DENSITY), [w, h]);
  const milkyStarsImage = useMemo(
    () => ({
      sharp: bake(milkyDots, w, h, BAND_TINT, 0.3, SHARP_DENSITY),
      soft: bake(milkyDots, w, h, BAND_TINT, 1.8, 1),
    }),
    [milkyDots, w, h],
  );

  // The shader is drawn once, at half size, whenever the night's mood changes.
  const [milky, setMilky] = useState<SkImage | null>(null);
  useEffect(() => {
    let alive = true;
    const size = { width: Math.round(w / 2), height: Math.round(h / 2) };
    drawAsImage(
      <Fill>
        <Shader source={MILKY_SKSL} uniforms={{ size: [size.width, size.height], intensity: mood.band }} />
      </Fill>,
      size,
    )
      .then((img) => {
        if (alive) setMilky(img);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [w, h, mood.band]);

  // One slow clock: the twinkling few soften by at most 15%, over 20 s or more.
  const clock = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    clock.set(withRepeat(withTiming(1, { duration: motion.twinkleMs, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(clock);
  }, [reduceMotion, clock]);

  const farMove = usePlaneTransform(tilt, explore, depth.far, padX, padY, reduceMotion);
  const milkyMove = usePlaneTransform(tilt, explore, depth.milky, padX, padY, reduceMotion);
  // Behind a chosen star: dimmer, and (with motion on) a cross-fade to the soft copy.
  const dim = useDerivedValue(() => 1 - depth.focusDim * focus.get());
  const sharpOpacity = useDerivedValue(() => (reduceMotion ? 1 : 1 - focus.get()));
  const softOpacity = useDerivedValue(() => (reduceMotion ? 0 : focus.get()));
  const moon = usePlane(tilt, explore, depth.moon);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={[mood.top, mood.mid, mood.floor]}
            positions={[0, 0.5, 1]}
          />
        </Rect>
        <Group transform={farMove} opacity={dim}>
          <Group opacity={sharpOpacity}>
            {far.sharp ? <Image image={far.sharp} x={-padX} y={-padY} width={w} height={h} /> : null}
          </Group>
          <Group opacity={softOpacity}>
            {far.soft ? <Image image={far.soft} x={-padX} y={-padY} width={w} height={h} /> : null}
          </Group>
          {[0, 1, 2, 3].map((g) => (
            <TwinkleGroup key={g} group={g} clock={clock}>
              {stars.twinkling
                .filter((_, i) => i % 4 === g)
                .map((d, i) => (
                  <Circle key={i} cx={d.x - padX} cy={d.y - padY} r={d.r} color={FAR_TINT} opacity={d.o} />
                ))}
            </TwinkleGroup>
          ))}
        </Group>
        <Group transform={milkyMove} opacity={dim}>
          {milky ? <Image image={milky} x={-padX} y={-padY} width={w} height={h} /> : null}
          <Group opacity={sharpOpacity}>
            {milkyStarsImage.sharp ? (
              <Image image={milkyStarsImage.sharp} x={-padX} y={-padY} width={w} height={h} />
            ) : null}
          </Group>
          <Group opacity={softOpacity}>
            {milkyStarsImage.soft ? (
              <Image image={milkyStarsImage.soft} x={-padX} y={-padY} width={w} height={h} />
            ) : null}
          </Group>
          {sparkles ? <Image image={sparkles} x={-padX} y={-padY} width={w} height={h} /> : null}
        </Group>
      </Canvas>
      {showMoon ? (
        <Animated.View style={[styles.moon, { left: width * 0.8 - 18, top: height * 0.12 }, moon]}>
          <Crescent size={36} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Eases `v` towards `limit` without ever passing it: almost linear for small
 * moves, then slower and slower, so the plane keeps a little life however far
 * the sky is turned but never slides far enough to show its edge.
 */
function soft(v: number, limit: number): number {
  'worklet';
  return limit <= 0 ? 0 : limit * Math.tanh(v / limit);
}

/**
 * Same rule as `usePlane`, as a Skia transform about the screen's centre,
 * kept inside the plane's margin (`padX`, `padY`): the sky can be turned all
 * the way round, so the raw shift has no end, and zooming out never shrinks
 * the plane below the screen.
 */
function usePlaneTransform(
  tilt: Tilt,
  explore: Explore,
  plane: DepthPlane,
  padX: number,
  padY: number,
  still: boolean,
) {
  const { width, height } = useWindowDimensions();
  // Room left for the drag once the tilt has taken its share, with a little to spare.
  const roomX = padX * 0.9 - plane.tilt;
  const roomY = padY * 0.9 - plane.tilt;
  return useDerivedValue(() => {
    if (still) return [];
    const z = Math.max(1, 1 + (explore.scale.get() - 1) * plane.k * 0.5);
    return [
      { translateX: width / 2 + soft(explore.dx.get() * plane.k, roomX) - tilt.x.get() * plane.tilt },
      { translateY: height / 2 + soft(explore.dy.get() * plane.k, roomY) - tilt.y.get() * plane.tilt },
      { scale: z },
      { translateX: -width / 2 },
      { translateY: -height / 2 },
    ];
  });
}

function TwinkleGroup({
  group,
  clock,
  children,
}: {
  group: number;
  clock: SharedValue<number>;
  children: React.ReactNode;
}) {
  // 3 to 6 slow cycles a minute per group, each starting at its own point.
  const cycles = 3 + group;
  const phase = group * 0.29;
  const opacity = useDerivedValue(
    () => 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (clock.get() * cycles + phase))),
  );
  return <Group opacity={opacity}>{children}</Group>;
}

/** A dark edge around the screen so the eye settles in the middle of the sky. */
export function Vignette() {
  const { width, height } = useWindowDimensions();
  const id = useSvgId('vig');
  return (
    <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="42%" r="75%">
          <Stop offset="0.55" stopColor="#0B0B22" stopOpacity={0} />
          <Stop offset="1" stopColor="#0B0B22" stopOpacity={0.6} />
        </RadialGradient>
      </Defs>
      <SvgRect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  moon: { position: 'absolute' },
});
