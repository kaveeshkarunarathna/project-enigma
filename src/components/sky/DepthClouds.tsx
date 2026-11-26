import { BlurMask, Canvas, Circle } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { cloudPath, type Puff } from '../art/cloudPath';
import { useSvgId } from '../art/svgId';
import { usePlane, type Explore } from '@/features/sky/depth';
import type { Tilt } from '@/features/sky/useTilt';
import { useTheme } from '@/theme/theme';
import { depth } from '@/theme/tokens';

/** A row of puffs across the width, as fractions: [x, lift, radius] of the bank's height. */
function bankPuffs(width: number, height: number, top: number, seed: number, screen: number): Puff[] {
  // About nine puffs to a screen's width, however wide the bank is.
  const count = Math.max(9, Math.round((9 * width) / screen));
  return Array.from({ length: count }, (_, i) => {
    const odd = (i + seed) % 2 === 1;
    return [
      (i / (count - 1)) * width + (odd ? width * 0.03 : 0),
      top + height * (odd ? 0.3 : 0.42),
      height * (odd ? 0.34 : 0.28) * (1 + ((i * seed) % 3) * 0.05),
    ] as const;
  });
}

type BankProps = {
  /** Top of the bank, from the top of the screen. */
  top: number;
  height: number;
  colors: [string, number, string, number];
  seed: number;
  tilt: Tilt;
  explore: Explore;
};

function Bank({ top, height, colors, seed, tilt, explore }: BankProps) {
  const { width, height: screen } = useWindowDimensions();
  const id = useSvgId('bank');
  // Wide enough that the bank never runs out while it slides with a drag.
  const pad = Math.round(width * 0.75);
  const w = width + pad * 2;
  const d = useMemo(
    () =>
      cloudPath(bankPuffs(w, height, top, seed, width), {
        base: screen + pad,
        shelf: { y: top + height * 0.55, from: 0, to: w },
        samples: 140,
      }),
    [w, height, top, seed, screen, width, pad],
  );
  const shift = usePlane(tilt, explore, depth.clouds, true, pad - depth.clouds.tilt - 8);
  return (
    <Animated.View style={[styles.layer, { left: -pad, width: w, height: screen + pad }, shift]}>
      <Svg width={w} height={screen + pad}>
        <Defs>
          <LinearGradient id={id} x1="0" y1={top} x2="0" y2={top + height} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors[0]} stopOpacity={colors[1]} />
            <Stop offset="1" stopColor={colors[2]} stopOpacity={colors[3]} />
          </LinearGradient>
        </Defs>
        <Path d={d} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Haze between two banks: further things look paler, as through air. */
function Haze({ top, height }: { top: number; height: number }) {
  const { width } = useWindowDimensions();
  const id = useSvgId('haze');
  return (
    <Svg width={width} height={height} style={[styles.haze, { top }]}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6E5A88" stopOpacity={0} />
          <Stop offset="1" stopColor="#6E5A88" stopOpacity={0.32} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

/** A dark cloud close by, cut off by the screen's edge. */
function CornerCloud({ d }: { d: string }) {
  const id = useSvgId('fg');
  return (
    <Svg width={200} height={180}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1C1632" stopOpacity={1} />
          <Stop offset="1" stopColor="#0F0C1E" stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Path d={d} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Clouds at three distances, with haze between them: a pale far bank, a
 * fuller middle bank, and dark puffs close by in the corners. Nearer clouds
 * are darker, larger and move more when the phone tilts, which is what makes
 * the sky feel deep. The tab bar's own cloud bank is the nearest of all.
 */
export function DepthClouds({ tilt, explore, horizon }: { tilt: Tilt; explore: Explore; horizon: number }) {
  const { width, height } = useWindowDimensions();
  const nearL = useCorner(tilt, explore, 26);
  const nearR = useCorner(tilt, explore, 30);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Haze top={horizon - 200} height={200} />
      <Bank
        top={horizon - 110}
        height={110}
        colors={['#6A5786', 0.75, '#4A3B66', 0.6]}
        seed={1}
        tilt={tilt}
        explore={explore}
      />
      <Haze top={horizon - 40} height={120} />
      <Bank
        top={horizon - 30}
        height={130}
        colors={['#45365F', 1, '#2E2448', 1]}
        seed={2}
        tilt={tilt}
        explore={explore}
      />
      <Animated.View style={[styles.corner, { left: -30, top: height - 150 }, nearL]}>
        <CornerCloud d="M0 180 L0 70 Q30 10 90 26 Q130 0 170 34 Q190 70 180 180 Z" />
      </Animated.View>
      <Animated.View style={[styles.corner, { left: width - 150, top: height - 150 }, nearR]}>
        <CornerCloud d="M200 180 L200 50 Q170 10 120 28 Q90 16 70 50 Q52 90 60 180 Z" />
      </Animated.View>
    </View>
  );
}

/**
 * A corner cloud is the nearest thing in the scene: it moves the most with
 * tilt and drag, but only so far, so it stays a corner and never crosses
 * the sky.
 */
function useCorner(tilt: Tilt, explore: Explore, tiltShift: number) {
  const { reduceMotion } = useTheme();
  return useAnimatedStyle(() => {
    if (reduceMotion) return { transform: [] };
    const reach = 36;
    const dx = Math.max(-reach, Math.min(reach, explore.dx.get() * 0.3));
    return {
      transform: [
        { translateX: dx - tilt.x.get() * tiltShift * 0.5 },
        { translateY: -tilt.y.get() * tiltShift * 0.5 },
      ],
    };
  });
}

/** Where the soft foreground motes sit, as fractions of the screen, and their size in points. */
const MOTES = [
  { x: 0.08, y: 0.22, r: 120, o: 0.07 },
  { x: 0.95, y: 0.4, r: 140, o: 0.06 },
  { x: 0.18, y: 0.62, r: 80, o: 0.05 },
  { x: 0.88, y: 0.08, r: 70, o: 0.06 },
  { x: 0.55, y: -0.02, r: 110, o: 0.05 },
];

/**
 * A few very large, very faint plum motes close to the eye, out of focus,
 * near the edges. They sit in front of everything in the sky and move the
 * most, which is what makes the rest read as far away.
 */
export function NearMotes({ tilt, explore }: { tilt: Tilt; explore: Explore }) {
  const { width, height } = useWindowDimensions();
  const move = usePlane(tilt, explore, depth.near);
  const pad = Math.round(width * 0.6);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.motes,
        { left: -pad, top: -pad, width: width + pad * 2, height: height + pad * 2 },
        move,
      ]}>
      <Canvas style={StyleSheet.absoluteFill}>
        {MOTES.map((m, i) => (
          <Circle
            key={i}
            cx={pad + m.x * width}
            cy={pad + m.y * height}
            r={m.r}
            color="#8E6FA8"
            opacity={m.o}>
            <BlurMask blur={40} style="normal" />
          </Circle>
        ))}
      </Canvas>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0 },
  motes: { position: 'absolute' },
  haze: { position: 'absolute', left: 0 },
  corner: { position: 'absolute' },
});
