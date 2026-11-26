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

/** The Milky Way's centre line, as fractions of the plane: it runs low-left to high-right. */
const BAND = { cx: 0.5, cy: 0.42, angle: -0.6 };

/**
 * The Milky Way and the haze near the horizon, as a small shader: layered
 * noise along a band, darker dust lanes through it, a faint plum nebula low
 * in the sky, and very light grain. Drawn once into an image at half size.
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
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

half4 main(float2 xy) {
  float2 uv = xy / size;
  float aspect = size.x / size.y;
  float2 c = (uv - float2(${BAND.cx}, ${BAND.cy})) * float2(aspect, 1.0);
  float s = sin(${BAND.angle});
  float k = cos(${BAND.angle});
  float2 r = float2(c.x * k - c.y * s, c.x * s + c.y * k);
  float d = abs(r.y + 0.025 * sin(r.x * 5.0));
  float band = exp(-d * d / 0.0035);
  float n = fbm(uv * float2(7.0 * aspect, 7.0));
  float lanes = smoothstep(0.5, 0.78, fbm(uv * float2(16.0 * aspect, 16.0) + 3.0));
  float glow = band * (0.45 + 0.55 * n) * (1.0 - 0.6 * lanes * band) * 0.3 * intensity;
  float3 bandColor = mix(float3(0.33, 0.28, 0.52), float3(0.66, 0.62, 0.86), n);
  float neb = smoothstep(0.62, 1.0, uv.y) * fbm(uv * 3.0 + 7.0) * 0.09;
  float3 nebColor = float3(0.46, 0.29, 0.52);
  float grain = (hash(xy) - 0.5) * 0.05;
  float ga = abs(grain) * 0.5;
  float a = glow + neb + ga;
  float3 rgb = bandColor * glow + nebColor * neb + float3(grain > 0.0 ? ga : 0.0);
  return half4(half3(rgb), half(a));
}`)!;

type Dot = { x: number; y: number; r: number; o: number };

function farStars(w: number, h: number): { baked: Dot[]; twinkling: Dot[] } {
  const rand = mulberry32(11);
  const baked = Array.from({ length: Math.round((w * h) / 1700) }, () => ({
    x: rand() * w,
    y: rand() * h * 0.85,
    r: 0.3 + rand() ** 3 * 0.6,
    o: 0.12 + rand() * 0.38,
  }));
  // A few slightly brighter ones twinkle; the rest are baked and still.
  const twinkling = Array.from({ length: 40 }, () => ({
    x: rand() * w,
    y: rand() * h * 0.75,
    r: 0.6 + rand() * 0.5,
    o: 0.3 + rand() * 0.3,
  }));
  return { baked, twinkling };
}

function milkyStars(w: number, h: number): Dot[] {
  const rand = mulberry32(5);
  const gauss = () => (rand() + rand() + rand() - 1.5) * 1.4;
  const along = { x: Math.cos(BAND.angle), y: Math.sin(BAND.angle) };
  const band = Array.from({ length: 260 }, () => {
    const t = (rand() - 0.5) * 1.6 * w;
    const off = gauss() * h * 0.028;
    return {
      x: w * BAND.cx + along.x * t - along.y * off,
      y: h * BAND.cy + along.y * t + along.x * off,
      r: 0.3 + rand() ** 4 * 0.7,
      o: 0.08 + rand() * 0.3,
    };
  });
  const dust = Array.from({ length: Math.round((w * h) / 3200) }, () => ({
    x: rand() * w,
    y: rand() * h * 0.8,
    r: 0.35 + rand() ** 3 * 0.7,
    o: 0.12 + rand() * 0.35,
  }));
  return [...band, ...dust.map((d) => ({ ...d, o: -d.o }))];
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
}: {
  mood: SkyMood;
  tilt: Tilt;
  explore: Explore;
  focus: SharedValue<number>;
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

  const farMove = usePlaneTransform(tilt, explore, depth.far, w, h, reduceMotion);
  const milkyMove = usePlaneTransform(tilt, explore, depth.milky, w, h, reduceMotion);
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
        </Group>
      </Canvas>
      <Animated.View style={[styles.moon, { left: width * 0.8 - 18, top: height * 0.12 }, moon]}>
        <Crescent size={36} />
      </Animated.View>
    </View>
  );
}

/** Same rule as `usePlane`, as a Skia transform about the screen's centre. */
function usePlaneTransform(
  tilt: Tilt,
  explore: Explore,
  plane: DepthPlane,
  w: number,
  h: number,
  still: boolean,
) {
  const { width, height } = useWindowDimensions();
  return useDerivedValue(() => {
    if (still) return [];
    const z = 1 + (explore.scale.get() - 1) * plane.k * 0.5;
    return [
      { translateX: width / 2 + explore.dx.get() * plane.k - tilt.x.get() * plane.tilt },
      { translateY: height / 2 + explore.dy.get() * plane.k - tilt.y.get() * plane.tilt },
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
