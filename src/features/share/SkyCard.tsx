import { useMemo, type ComponentRef, type Ref } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { cloudPath, type Puff } from '@/components/art/cloudPath';
import { useSvgId } from '@/components/art/svgId';
import { mulberry32 } from '@/domain/random';
import { layoutSky } from '@/domain/sky';
import { CARD_SIZE, CARD_WORDMARK, cardFigures, type CardShape, type CardSummary } from '@/domain/skyCard';
import { fontFamily, night as palette } from '@/theme/tokens';

export type CardView = ComponentRef<typeof View>;

type Props = {
  ref?: Ref<CardView>;
  shape: CardShape;
  /** Width on screen in points. Everything inside scales with it. */
  width: number;
  /** Every night with reading, oldest first. */
  nights: { night: string; seconds: number }[];
  /** First night of the period, or null for all time. Older stars are drawn fainter. */
  from: string | null;
  summary: CardSummary;
  /** "November 2026" or "All my nights". */
  period: string;
  showTitles: boolean;
  goalMinutes: number;
};

/** Where things sit on each shape, in the card's own 360-wide units. */
const LAYOUT = {
  story: {
    head: 46,
    title: 22,
    moon: { x: 296, y: 70, r: 17 },
    cloud: { x: 214, y: 70, w: 120 },
    sky: { top: 112, height: 296 },
    figures: 420,
    number: 32,
    titles: 494,
    bank: 74,
    mark: 610,
  },
  square: {
    head: 26,
    title: 17,
    moon: { x: 312, y: 46, r: 13 },
    cloud: { x: 240, y: 44, w: 92 },
    sky: { top: 78, height: 176 },
    figures: 252,
    number: 24,
    titles: 306,
    bank: 58,
    mark: 334,
  },
} as const;

const W = 360;

/**
 * The reader's sky as a picture to share: their stars, a few numbers, and
 * the book titles only if they turn them on. Drawn with vectors and plain
 * text (no Skia), so it can be captured as an image on any phone. Always in
 * the night palette, whatever the app's own theme.
 */
export function SkyCard({
  ref,
  shape,
  width,
  nights,
  from,
  summary,
  period,
  showTitles,
  goalMinutes,
}: Props) {
  const L = LAYOUT[shape];
  const H = CARD_SIZE[shape].height;
  const k = width / W;
  const height = H * k;

  const bg = useSvgId('cbg');
  const glow = useSvgId('cgl');
  const band = useSvgId('cbd');
  const moonMask = useSvgId('cmm');
  const moonGlow = useSvgId('cmg');
  const cloud = useSvgId('ccl');
  const bank = useSvgId('cbk');

  const stars = useMemo(
    () => layoutSky(nights, W, L.sky.height, goalMinutes),
    [nights, L.sky.height, goalMinutes],
  );
  const dust = useMemo(() => {
    const rand = mulberry32(shape === 'story' ? 31 : 17);
    return Array.from({ length: shape === 'story' ? 80 : 46 }, () => ({
      x: rand() * W,
      y: rand() * (H - L.bank),
      r: 0.35 + rand() ** 3 * 0.9,
      o: 0.2 + rand() * 0.5,
    }));
  }, [shape, H, L.bank]);
  const cloudD = useMemo(() => {
    const s = L.cloud.w / 100;
    const puffs: Puff[] = [
      [18 * s, 34 * s, 11 * s],
      [36 * s, 24 * s, 16 * s],
      [58 * s, 18 * s, 20 * s],
      [80 * s, 32 * s, 12 * s],
    ];
    return cloudPath(puffs, { base: 44 * s });
  }, [L.cloud.w]);
  const bankD = useMemo(() => {
    const top = H - L.bank;
    const sizes = [0.34, 0.42, 0.3, 0.44, 0.33, 0.4, 0.3];
    const step = W / (sizes.length - 1);
    const crest = top + L.bank * 0.42;
    return cloudPath(
      sizes.map(
        (r, i) => [i * step + (i % 2 ? step * 0.12 : 0), crest + (i % 2 ? -4 : 4), r * L.bank] as const,
      ),
      { base: H, shelf: { y: crest + L.bank * 0.16, from: 0, to: W }, samples: 120 },
    );
  }, [H, L.bank]);

  const figures = cardFigures(summary);
  const newest = stars[stars.length - 1];
  const t = (style: TextStyle): TextStyle => style;

  return (
    <View
      ref={ref}
      collapsable={false}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Your reading sky card. ${period}. ${figures.map((f) => `${f.value} ${f.unit}`).join(', ')}.`}
      style={{ width, height, backgroundColor: palette.night, overflow: 'hidden' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={bg} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.skyTop} />
            <Stop offset="0.5" stopColor={palette.night} />
            <Stop offset="1" stopColor={palette.skyFloor} />
          </LinearGradient>
          <RadialGradient id={glow} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.candlelight} stopOpacity={0.55} />
            <Stop offset="1" stopColor={palette.candlelight} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={band} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#8E7BB0" stopOpacity={0.16} />
            <Stop offset="1" stopColor="#8E7BB0" stopOpacity={0} />
          </RadialGradient>
          <Mask id={moonMask}>
            <Rect x={0} y={0} width={W} height={H} fill="white" />
            <Circle
              cx={L.moon.x + L.moon.r * 0.76}
              cy={L.moon.y - L.moon.r * 0.42}
              r={L.moon.r * 0.92}
              fill="black"
            />
          </Mask>
          <RadialGradient id={moonGlow} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.moon} stopOpacity={0.22} />
            <Stop offset="1" stopColor={palette.moon} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={cloud} x1="0" y1="0" x2="0" y2={L.cloud.w / 2} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.cloud} stopOpacity={0.9} />
            <Stop offset="1" stopColor={palette.cloud} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={bank} x1="0" y1={H - L.bank} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.cloud} stopOpacity={0.7} />
            <Stop offset="0.55" stopColor={palette.cloudDeep} stopOpacity={0.97} />
            <Stop offset="1" stopColor={palette.cloudDeep} stopOpacity={1} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={W} height={H} fill={`url(#${bg})`} />
        {/* A faint Milky Way haze across the reader's stars, for depth. */}
        <G rotation={-24} origin={`${W / 2}, ${L.sky.top + L.sky.height / 2}`}>
          <Ellipse
            cx={W / 2}
            cy={L.sky.top + L.sky.height / 2}
            rx={W * 0.75}
            ry={L.sky.height * 0.22}
            fill={`url(#${band})`}
          />
        </G>
        {dust.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={palette.faintStar} opacity={d.o} />
        ))}

        <G x={L.cloud.x} y={L.cloud.y}>
          <Path d={cloudD} fill={`url(#${cloud})`} opacity={0.75} />
        </G>
        <Circle cx={L.moon.x} cy={L.moon.y} r={L.moon.r * 2.6} fill={`url(#${moonGlow})`} />
        <Circle cx={L.moon.x} cy={L.moon.y} r={L.moon.r} fill={palette.moon} mask={`url(#${moonMask})`} />

        <G y={L.sky.top}>
          {stars.map((s) => {
            const current = from === null || s.night >= from;
            const o = current ? 1 : 0.32;
            return (
              <G key={s.night} opacity={o}>
                <Circle cx={s.x} cy={s.y} r={s.r * 5} fill={`url(#${glow})`} opacity={s.brightness * 0.55} />
                <Circle cx={s.x} cy={s.y} r={s.r * 1.15} fill={palette.starlight} opacity={s.brightness} />
              </G>
            );
          })}
          {newest ? (
            <Circle cx={newest.x} cy={newest.y} r={newest.r * 9} fill={`url(#${glow})`} opacity={0.45} />
          ) : null}
        </G>

        <Path d={bankD} fill={`url(#${bank})`} />
      </Svg>

      <View style={[styles.abs, { left: 24 * k, top: L.head * k, right: 96 * k }]}>
        <Text
          allowFontScaling={false}
          style={t({ ...label, fontSize: 10 * k, letterSpacing: 3.2 * k, color: palette.mist })}>
          My reading sky
        </Text>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={t({
            ...heading,
            fontSize: L.title * k,
            letterSpacing: L.title * 0.2 * k,
            marginTop: 6 * k,
            color: palette.starlight,
          })}>
          {period}
        </Text>
      </View>

      {!stars.length ? (
        <View
          style={[
            styles.abs,
            styles.center,
            { left: 0, right: 0, top: (L.sky.top + L.sky.height * 0.42) * k },
          ]}>
          <Text
            allowFontScaling={false}
            style={t({ ...label, fontSize: 11 * k, letterSpacing: 3 * k, color: palette.mist })}>
            The first star is waiting
          </Text>
        </View>
      ) : null}

      <View style={[styles.abs, styles.figures, { left: 24 * k, right: 24 * k, top: L.figures * k }]}>
        {figures.map((f) => (
          <View key={f.unit} style={styles.figure}>
            <Text
              allowFontScaling={false}
              style={t({
                fontFamily: fontFamily.light,
                fontSize: L.number * k,
                lineHeight: L.number * 1.2 * k,
                letterSpacing: 1 * k,
                color: palette.starlight,
              })}>
              {f.value}
            </Text>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={t({
                ...label,
                fontSize: 9 * k,
                letterSpacing: 2.2 * k,
                marginTop: 2 * k,
                color: palette.mist,
              })}>
              {f.unit}
            </Text>
          </View>
        ))}
      </View>

      {showTitles && summary.titles.length ? (
        shape === 'story' ? (
          <View style={[styles.abs, { left: 24 * k, right: 24 * k, top: L.titles * k, gap: 6 * k }]}>
            {summary.titles.map((title) => (
              <View key={title} style={styles.titleRow}>
                <View
                  style={{
                    width: 4 * k,
                    height: 4 * k,
                    borderRadius: 2 * k,
                    marginRight: 10 * k,
                    backgroundColor: palette.candlelight,
                  }}
                />
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={t({
                    ...heading,
                    flex: 1,
                    fontSize: 10.5 * k,
                    letterSpacing: 2 * k,
                    color: palette.starlight,
                  })}>
                  {title}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.abs, { left: 24 * k, right: 24 * k, top: L.titles * k }]}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={t({ ...heading, fontSize: 9.5 * k, letterSpacing: 1.8 * k, color: palette.starlight })}>
              {summary.titles.join('  ·  ')}
            </Text>
          </View>
        )
      ) : null}

      <View style={[styles.abs, styles.center, { left: 0, right: 0, top: L.mark * k }]}>
        <Text
          allowFontScaling={false}
          style={t({
            ...heading,
            fontSize: 11 * k,
            letterSpacing: 6 * k,
            // Letter spacing trails the last letter; this keeps the word centred.
            paddingLeft: 6 * k,
            color: palette.starlight,
            opacity: 0.85,
          })}>
          {CARD_WORDMARK}
        </Text>
      </View>
    </View>
  );
}

const label: TextStyle = { fontFamily: fontFamily.body, textTransform: 'uppercase' };
const heading: TextStyle = { fontFamily: fontFamily.bold, textTransform: 'uppercase' };

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  center: { alignItems: 'center' },
  figures: { flexDirection: 'row', justifyContent: 'space-between' },
  figure: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
});
