import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Crescent } from '../art/Crescent';
import { useSvgId } from '../art/svgId';
import { mulberry32 } from '@/domain/random';
import type { SkyMood } from '@/domain/skyMood';

export type Tilt = { x: SharedValue<number>; y: SharedValue<number> };

/** A layer that shifts with the phone's tilt: the nearer it is, the further it moves. */
export function useParallax(tilt: Tilt, depth: number) {
  return useAnimatedStyle(() => ({
    transform: [{ translateX: -tilt.x.get() * depth }, { translateY: -tilt.y.get() * depth }],
  }));
}

/**
 * The far part of the immersive sky, back to front: the night's gradient, a
 * soft Milky Way band thick with tiny stars, faint blue dust, and the moon.
 * Each layer shifts a little more than the one behind it when the phone
 * tilts. Decorative; the reader's own stars are drawn above it.
 */
export function Atmosphere({ mood, tilt }: { mood: SkyMood; tilt: Tilt }) {
  const { width, height } = useWindowDimensions();
  const sky = useSvgId('sky');
  const band = useSvgId('band');
  const pad = 24;
  const w = width + pad * 2;
  const h = height + pad * 2;

  const dust = useMemo(() => {
    const rand = mulberry32(11);
    return Array.from({ length: Math.round((w * h) / 2200) }, () => ({
      x: rand() * w,
      y: rand() * h * 0.8,
      r: 0.35 + rand() ** 3 * 0.7,
      o: 0.15 + rand() * 0.4,
    }));
  }, [w, h]);

  // A few brighter background stars, nearer than the dust but not the reader's own.
  const near = useMemo(() => {
    const rand = mulberry32(29);
    return Array.from({ length: 22 }, () => ({
      x: rand() * w,
      y: rand() * h * 0.7,
      r: 0.8 + rand() * 0.6,
      o: 0.3 + rand() * 0.35,
    }));
  }, [w, h]);

  const bandStars = useMemo(() => {
    const rand = mulberry32(5);
    const gauss = () => (rand() + rand() + rand() - 1.5) * 1.4;
    return Array.from({ length: 240 }, () => {
      const t = rand();
      const off = gauss() * h * 0.045;
      return {
        x: -0.1 * w + t * 1.2 * w + off * 0.5,
        y: h * 0.58 - t * h * 0.42 + off,
        r: 0.3 + rand() ** 4 * 0.7,
        o: 0.08 + rand() * 0.32,
      };
    });
  }, [w, h]);

  const far = useParallax(tilt, 3);
  const mid = useParallax(tilt, 6);
  const moon = useParallax(tilt, 8);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={sky} x1="0" y1={0} x2="0" y2={height} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={mood.top} />
            <Stop offset="0.5" stopColor={mood.mid} />
            <Stop offset="1" stopColor={mood.floor} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${sky})`} />
      </Svg>
      <Animated.View style={[styles.layer, { width: w, height: h }, far]}>
        <Svg width={w} height={h}>
          <Defs>
            <RadialGradient id={band} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#7A6AA0" stopOpacity={0.3 * mood.band} />
              <Stop offset="0.6" stopColor="#5A4A80" stopOpacity={0.12 * mood.band} />
              <Stop offset="1" stopColor="#5A4A80" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={w / 2}
            cy={h * 0.37}
            rx={w * 0.8}
            ry={h * 0.1}
            fill={`url(#${band})`}
            transform={`rotate(-35 ${w / 2} ${h * 0.37})`}
          />
          <G fill="#D9DDF5" opacity={mood.band}>
            {bandStars.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
            ))}
          </G>
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.layer, { width: w, height: h }, mid]}>
        <Svg width={w} height={h}>
          <G fill="#B9C3E8">
            {dust.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
            ))}
          </G>
          <G fill="#F3E6CC">
            {near.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
            ))}
          </G>
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.moon, { left: width * 0.8 - 18, top: height * 0.12 }, moon]}>
        <Crescent size={36} />
      </Animated.View>
    </View>
  );
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
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: -24, top: -24 },
  moon: { position: 'absolute' },
});
