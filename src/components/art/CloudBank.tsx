import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useSvgId } from './svgId';
import { useTheme } from '@/theme/theme';

type Props = {
  /** Height of the bank, from the tops of the puffs to the bottom of the screen. */
  height?: number;
};

/** Puff sizes along the bank, as fractions of the bank height. Fixed so it never shifts. */
const PUFFS = [0.42, 0.5, 0.38, 0.52, 0.4, 0.48, 0.4];

/**
 * A row of soft clouds along the foot of the screen. The tab bar sits on it,
 * and content scrolling down sinks into it. Decorative and untouchable.
 */
export function CloudBank({ height = 120 }: Props) {
  const { colors, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const id = useSvgId('cb');
  const step = width / (PUFFS.length - 1);
  const crest = height * 0.45;
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
        <G fill={`url(#${id})`}>
          {PUFFS.map((r, i) => (
            <Circle
              key={i}
              cx={i * step + (i % 2 ? step * 0.1 : 0)}
              cy={crest + (i % 2 ? -height * 0.06 : height * 0.04)}
              r={r * height}
            />
          ))}
          <Rect x={0} y={crest} width={width} height={height - crest} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
