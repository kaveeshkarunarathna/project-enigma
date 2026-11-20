import Svg, { Circle, Defs, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useSvgId } from './svgId';
import { useTheme } from '@/theme/theme';

type Props = {
  /** Diameter of the moon itself. The soft glow around it is drawn outside this. */
  size?: number;
  /**
   * How much of the moon is cut away, 0 (full) to 1 (thin sliver).
   * The storybook crescent is about 0.6.
   */
  cut?: number;
  /** A faint halo of moonlight. */
  glow?: boolean;
};

/**
 * The flat illustrated crescent moon in warm sand. Decorative, so hidden
 * from screen readers. The Moon Log keeps its own shaded moons.
 */
export function Crescent({ size = 44, cut = 0.6, glow = true }: Props) {
  const { colors } = useTheme();
  const maskId = useSvgId('cm');
  const glowId = useSvgId('cg');
  const r = size / 2;
  const box = size * 2.4;
  const c = box / 2;
  // The shadow disc slides up and to the right as the cut grows.
  const shift = r * (0.25 + cut * 0.85);
  return (
    <Svg width={box} height={box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ margin: -(box - size) / 2 }}>
      <Defs>
        <Mask id={maskId}>
          <Rect x={0} y={0} width={box} height={box} fill="white" />
          <Circle cx={c + shift} cy={c - shift * 0.55} r={r * 0.92} fill="black" />
        </Mask>
        <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.moon} stopOpacity={0.2} />
          <Stop offset="1" stopColor={colors.moon} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {glow ? <Circle cx={c} cy={c} r={c} fill={`url(#${glowId})`} /> : null}
      <Circle cx={c} cy={c} r={r} fill={colors.moon} mask={`url(#${maskId})`} />
    </Svg>
  );
}
