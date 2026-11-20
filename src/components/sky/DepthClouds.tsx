import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useParallax, type Tilt } from './Atmosphere';
import { cloudPath, type Puff } from '../art/cloudPath';
import { useSvgId } from '../art/svgId';

/** A row of puffs across the width, as fractions: [x, lift, radius] of the bank's height. */
function bankPuffs(width: number, height: number, top: number, seed: number): Puff[] {
  const count = 9;
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
  depth: number;
};

function Bank({ top, height, colors, seed, tilt, depth }: BankProps) {
  const { width, height: screen } = useWindowDimensions();
  const id = useSvgId('bank');
  const pad = 30;
  const w = width + pad * 2;
  const d = useMemo(
    () =>
      cloudPath(bankPuffs(w, height, top, seed), {
        base: screen + pad,
        shelf: { y: top + height * 0.55, from: 0, to: w },
        samples: 140,
      }),
    [w, height, top, seed, screen],
  );
  const shift = useParallax(tilt, depth);
  return (
    <Animated.View style={[styles.layer, { width: w, height: screen + pad }, shift]}>
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
export function DepthClouds({ tilt, horizon }: { tilt: Tilt; horizon: number }) {
  const { width, height } = useWindowDimensions();
  const nearL = useParallax(tilt, 26);
  const nearR = useParallax(tilt, 30);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Haze top={horizon - 200} height={200} />
      <Bank
        top={horizon - 110}
        height={110}
        colors={['#6A5786', 0.75, '#4A3B66', 0.6]}
        seed={1}
        tilt={tilt}
        depth={12}
      />
      <Haze top={horizon - 40} height={120} />
      <Bank
        top={horizon - 30}
        height={130}
        colors={['#45365F', 1, '#2E2448', 1]}
        seed={2}
        tilt={tilt}
        depth={18}
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

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: -30, top: 0 },
  haze: { position: 'absolute', left: 0 },
  corner: { position: 'absolute' },
});
