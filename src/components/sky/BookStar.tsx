import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Oval,
  Path,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/theme';

type Props = {
  /** Canvas width and height in points. */
  size: number;
  /** 0..1, from `starBrightness`. */
  brightness: number;
  /** Beads on the chapter ring. */
  beads: number;
  /** Beads already lit. */
  lit: number;
  /** Slowly turn the ring (about 90 s per turn). Off under Reduce Motion. */
  spin?: boolean;
  /** When set, a small lamp light circles the star at this angle (radians). */
  lampAngle?: SharedValue<number>;
  accessibilityLabel?: string;
};

const TILT = 0.32; // how flat the orbit looks: 1 is a circle seen from above
const PLANE = -0.18; // the orbit plane leans a little, in radians
const TURN_MS = 90_000;

/**
 * The book star: a softly lit sphere with chapter beads on a tilted orbit.
 * Beads in front of the star are larger and brighter; beads behind it are
 * smaller, dimmer and hidden by the star where they pass behind it.
 */
export function BookStar({
  size,
  brightness,
  beads,
  lit,
  spin = true,
  lampAngle,
  accessibilityLabel,
}: Props) {
  const { colors, reduceMotion } = useTheme();
  const c = size / 2;
  const r = size * 0.13;
  const R = size * 0.4;
  const rot = useSharedValue(0);

  useEffect(() => {
    if (!spin || reduceMotion) {
      cancelAnimation(rot);
      return;
    }
    rot.set(withRepeat(withTiming(Math.PI * 2, { duration: TURN_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(rot);
  }, [spin, reduceMotion, rot]);

  // Beads lit so far, as a smooth count: when a session lights more of the
  // ring, the new beads warm up one after another instead of all at once.
  const shown = useSharedValue(lit);
  const lastLit = useRef(lit);
  useEffect(() => {
    const from = lastLit.current;
    lastLit.current = lit;
    if (lit === from) return;
    if (reduceMotion || lit < from) {
      shown.set(lit);
      return;
    }
    const per = Math.min(420, 1400 / (lit - from));
    shown.set(withTiming(lit, { duration: per * (lit - from), easing: Easing.inOut(Easing.quad) }));
  }, [lit, reduceMotion, shown]);

  // The near half of the orbit, drawn over the star.
  const frontArc = useMemo(
    () => Skia.Path.MakeFromSVGString(`M ${c + R} ${c} A ${R} ${R * TILT} 0 0 1 ${c - R} ${c}`),
    [c, R],
  );

  const glow = 0.45 + 0.55 * brightness;
  const beadR = Math.max(2, size * 0.018);
  const count = Math.max(beads, 1);
  const plane = [{ rotate: PLANE }];
  const origin = vec(c, c);

  const beadNodes = (layer: 'back' | 'front') =>
    Array.from({ length: count }, (_, i) => (
      <Bead
        key={`${layer}${i}`}
        layer={layer}
        base={Math.PI / 2 + (Math.PI * 2 * i) / count}
        rot={rot}
        c={c}
        R={R}
        r={beadR}
        index={i}
        shown={shown}
        litColor={colors.candlelight}
        dimColor={colors.mist}
      />
    ));

  return (
    <Canvas
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {/* outer glow */}
      <Circle cx={c} cy={c} r={r * 3.4} opacity={glow}>
        <RadialGradient
          c={vec(c, c)}
          r={r * 3.4}
          colors={[
            `${colors.candlelight}CC`,
            `${colors.candlelight}55`,
            `${colors.candlelight}14`,
            `${colors.candlelight}00`,
          ]}
          positions={[0, 0.32, 0.62, 1]}
        />
      </Circle>

      <Group transform={plane} origin={origin}>
        <Oval
          rect={{ x: c - R, y: c - R * TILT, width: R * 2, height: R * 2 * TILT }}
          style="stroke"
          strokeWidth={1}
          color={colors.starlight}
          opacity={0.12}
        />
        {beadNodes('back')}
      </Group>

      {/* the sphere: light from the upper left, soft terminator, darker limb */}
      <Group opacity={0.55 + 0.45 * brightness}>
        <Circle cx={c} cy={c} r={r}>
          <RadialGradient
            c={vec(c - r * 0.38, c - r * 0.42)}
            r={r * 1.55}
            colors={['#FFFDF6', '#FFF6E2', colors.candlelight, '#B49A74']}
            positions={[0, 0.35, 0.72, 1]}
          />
        </Circle>
        {/* rim light on the shadow side */}
        <Circle
          cx={c}
          cy={c}
          r={r - 0.5}
          style="stroke"
          strokeWidth={1}
          color={colors.starlight}
          opacity={0.18}>
          <BlurMask blur={1.5} style="solid" />
        </Circle>
      </Group>

      <Group transform={plane} origin={origin}>
        {frontArc ? (
          <Path path={frontArc} style="stroke" strokeWidth={1} color={colors.starlight} opacity={0.2} />
        ) : null}
        {beadNodes('front')}
      </Group>

      {lampAngle ? <LampLight angle={lampAngle} c={c} R={r * 1.9} color={colors.candlelight} /> : null}
    </Canvas>
  );
}

function Bead({
  layer,
  base,
  rot,
  c,
  R,
  r,
  index,
  shown,
  litColor,
  dimColor,
}: {
  layer: 'back' | 'front';
  base: number;
  rot: SharedValue<number>;
  c: number;
  R: number;
  r: number;
  index: number;
  /** Beads lit so far, possibly mid-way through lighting this one. */
  shown: SharedValue<number>;
  litColor: string;
  dimColor: string;
}) {
  const cx = useDerivedValue(() => c + R * Math.cos(base + rot.get()));
  const cy = useDerivedValue(() => c + R * TILT * Math.sin(base + rot.get()));
  const depth = useDerivedValue(() => (Math.sin(base + rot.get()) + 1) / 2); // 0 back .. 1 front
  const radius = useDerivedValue(() => r * (0.65 + 0.5 * depth.get()));
  const warmth = useDerivedValue(() => Math.min(Math.max(shown.get() - index, 0), 1));
  const visible = useDerivedValue(() => {
    const d = depth.get();
    return (layer === 'front' ? d >= 0.5 : d < 0.5) ? 1 : 0;
  });
  const dim = useDerivedValue(() => visible.get() * (1 - warmth.get()) * (0.16 + 0.16 * depth.get()));
  const bright = useDerivedValue(() => visible.get() * warmth.get() * (0.55 + 0.45 * depth.get()));
  // A brief swell as the bead catches light, settling back to its size.
  const swell = useDerivedValue(() => radius.get() * (1 + 0.6 * Math.sin(Math.PI * warmth.get())));
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={radius} color={dimColor} opacity={dim} />
      <Circle cx={cx} cy={cy} r={swell} color={litColor} opacity={bright}>
        <BlurMask blur={1.2} style="solid" />
      </Circle>
    </Group>
  );
}

function LampLight({
  angle,
  c,
  R,
  color,
}: {
  angle: SharedValue<number>;
  c: number;
  R: number;
  color: string;
}) {
  const cx = useDerivedValue(() => c + R * Math.cos(angle.get()));
  const cy = useDerivedValue(() => c + R * 0.55 * Math.sin(angle.get()));
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={7} color={color} opacity={0.35}>
        <BlurMask blur={6} style="normal" />
      </Circle>
      <Circle cx={cx} cy={cy} r={2.5} color="#FFFBF1" />
    </Group>
  );
}
