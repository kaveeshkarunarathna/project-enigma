import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useMemo } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { cloudPath } from './cloudPath';

import { useSvgId } from './svgId';
import { useTheme } from '@/theme/theme';

type Props = {
  /** Height of the bank, from the tops of the puffs to the bottom of the screen. */
  height?: number;
};

/** Puff sizes along the bank, as fractions of the bank height. Fixed so it never shifts. */
const PUFFS = [0.3, 0.36, 0.28, 0.38, 0.3, 0.35, 0.27, 0.37, 0.31];

/**
 * A row of soft clouds along the foot of the screen. The tab bar sits on it,
 * and content scrolling down sinks into it. Decorative and untouchable.
 */
export function CloudBank({ height = 120 }: Props) {
  const { colors, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const id = useSvgId('cb');
  const step = width / (PUFFS.length - 1);
  const crest = height * 0.52;
  const d = useMemo(
    () =>
      cloudPath(
        PUFFS.map(
          (r, i) =>
            [i * step + (i % 2 ? step * 0.1 : 0), crest + (i % 2 ? -height * 0.04 : height * 0.05), r * height] as const,
        ),
        { base: height, shelf: { y: crest + height * 0.14, from: 0, to: width }, samples: 120 },
      ),
    [step, crest, height, width],
  );
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Defs>
          <LinearGradient id={id} x1="0" y1={0} x2="0" y2={height} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.cloud} stopOpacity={scheme === 'night' ? 0.55 : 0.8} />
            <Stop offset="0.55" stopColor={colors.cloudDeep} stopOpacity={0.96} />
            <Stop offset="1" stopColor={colors.cloudDeep} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Path d={d} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
