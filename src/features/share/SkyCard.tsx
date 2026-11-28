import { useMemo, type ComponentRef, type Ref } from 'react';
import { Image, StyleSheet, Text, View, type TextStyle } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Circle,
} from 'react-native-svg';

import { useSvgId } from '@/components/art/svgId';
import { starColor } from '@/components/sky/StarChartView';
import { cardSky, NAME_WIDTH as NAME_W } from '@/domain/cardSky';
import { CARD_SIZE, CARD_WORDMARK, cardFigures, type CardShape, type CardSummary } from '@/domain/skyCard';
import type { StarChart } from '@/domain/starChart';
import { cardBackdrop } from '@/features/share/cardBackdrop';
import { fontFamily, night as palette } from '@/theme/tokens';

export type CardView = ComponentRef<typeof View>;

type Props = {
  ref?: Ref<CardView>;
  shape: CardShape;
  /** Width on screen in points. Everything inside scales with it. */
  width: number;
  /** The reader's star chart, as the Sky lays it out. Null while it loads. */
  chart: StarChart | null;
  /** First night of the period, or null for all time. Books finished before it are drawn fainter. */
  from: string | null;
  summary: CardSummary;
  /** "November 2026" or "All my nights". */
  period: string;
  showTitles: boolean;
};

/** Where things sit on each shape, in the card's own 360-wide units. */
const LAYOUT = {
  story: {
    head: 46,
    title: 22,
    // Without titles the sky takes the room they would have used.
    sky: { top: 100, height: 304, tall: 376 },
    minZoom: 0.45,
    number: 29,
    titlesGap: 74,
    mark: 610,
  },
  square: {
    head: 26,
    title: 17,
    sky: { top: 70, height: 178, tall: 178 },
    // The square's sky is short: it crops a big sky sooner, so the stars keep their room.
    minZoom: 0.6,
    number: 24,
    titlesGap: 54,
    mark: 334,
  },
} as const;

const W = 360;

/**
 * The reader's sky as a picture to share, the way the Sky screen shows it:
 * deep space in the night's indigo and plum, their finished books as stars
 * joined into the constellations of their reading paths, with room between
 * them. A few numbers, and the book titles only if they turn them on. The
 * stars are vectors and the space behind them a still image, so the card can
 * be captured as a picture on any phone. Always in the night palette,
 * whatever the app's own theme.
 */
export function SkyCard({ ref, shape, width, chart, from, summary, period, showTitles }: Props) {
  const L = LAYOUT[shape];
  const H = CARD_SIZE[shape].height;
  const k = width / W;
  const height = H * k;
  const withTitles = showTitles && summary.titles.length > 0;
  const skyBox = {
    x: 0,
    y: L.sky.top,
    w: W,
    h: withTitles ? L.sky.height : L.sky.tall,
  };
  const figuresTop = skyBox.y + skyBox.h + 12;
  const titlesTop = figuresTop + L.titlesGap;

  const glow = useSvgId('cgl');
  const clip = useSvgId('ccp');
  const floor = useSvgId('cfl');
  const ceiling = useSvgId('cce');
  const vignette = useSvgId('cvg');

  const backdrop = useMemo(() => cardBackdrop(shape), [shape]);
  const sky = useMemo(
    () => (chart ? cardSky(chart, skyBox, from, L.minZoom) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chart, from, skyBox.y, skyBox.h, L.minZoom],
  );
  const stars = sky?.stars ?? [];

  const figures = cardFigures(summary);
  const t = (style: TextStyle): TextStyle => style;

  return (
    <View
      ref={ref}
      collapsable={false}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Your reading sky card. ${period}. ${figures.map((f) => `${f.value} ${f.unit}`).join(', ')}.`}
      style={{ width, height, backgroundColor: palette.night, overflow: 'hidden' }}>
      {backdrop ? (
        <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFill} resizeMode="stretch" />
      ) : null}
      <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={glow} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
            <Stop offset="0.25" stopColor="#FFFFFF" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={vignette} cx="50%" cy="42%" r="75%">
            <Stop offset="0.55" stopColor="#0B0B22" stopOpacity={0} />
            <Stop offset="1" stopColor="#0B0B22" stopOpacity={0.55} />
          </RadialGradient>
          <LinearGradient id={floor} x1="0" y1={figuresTop - 30} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.night} stopOpacity={0} />
            <Stop offset="0.45" stopColor={palette.night} stopOpacity={0.55} />
            <Stop offset="1" stopColor={palette.night} stopOpacity={0.8} />
          </LinearGradient>
          <LinearGradient id={ceiling} x1="0" y1="0" x2="0" y2={skyBox.y} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={palette.night} stopOpacity={0.55} />
            <Stop offset="1" stopColor={palette.night} stopOpacity={0} />
          </LinearGradient>
          <ClipPath id={clip}>
            <Rect x={skyBox.x} y={skyBox.y - 18} width={skyBox.w} height={skyBox.h + 30} />
          </ClipPath>
        </Defs>

        {backdrop ? null : <Rect x={0} y={0} width={W} height={H} fill={palette.night} />}
        <Rect x={0} y={0} width={W} height={H} fill={`url(#${vignette})`} />
        {/* The heading, numbers and titles sit on quieter, darker sky. */}
        <Rect x={0} y={0} width={W} height={skyBox.y} fill={`url(#${ceiling})`} />
        <Rect x={0} y={figuresTop - 30} width={W} height={H - figuresTop + 30} fill={`url(#${floor})`} />

        <G clipPath={`url(#${clip})`}>
          {sky?.threads.map((th) => {
            const o = (th.joined ? 0.7 : 0.3) * th.fog;
            return (
              <G key={th.key}>
                {th.joined ? (
                  <Line
                    x1={th.ax}
                    y1={th.ay}
                    x2={th.bx}
                    y2={th.by}
                    stroke={palette.starlight}
                    strokeOpacity={0.06 * th.fog}
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                ) : null}
                <Line
                  x1={th.ax}
                  y1={th.ay}
                  x2={th.bx}
                  y2={th.by}
                  stroke={palette.starlight}
                  strokeOpacity={o}
                  strokeWidth={th.joined ? 1.1 : 0.8}
                  strokeLinecap="round"
                  strokeDasharray={th.joined ? undefined : '2 4'}
                />
              </G>
            );
          })}
          {stars.map((s) => {
            const color = s.light > 0 ? starColor(s.warmth, 0) : palette.mist;
            const f = s.fog * (s.old ? 0.4 : 1);
            const core = s.light > 0 ? (0.45 + 0.55 * s.light) * f : 0.45 * f;
            const halo = s.r * (s.newest ? 7.5 : 5.5);
            const ray = s.r * 4.2;
            return (
              <G key={s.key}>
                {s.light > 0 ? (
                  <Circle
                    cx={s.x}
                    cy={s.y}
                    r={halo}
                    fill={`url(#${glow})`}
                    // The glow takes the star's own colour through a coloured disc under it.
                    opacity={0.5 * s.light * f}
                  />
                ) : null}
                {s.light > 0 ? (
                  <Circle cx={s.x} cy={s.y} r={halo * 0.55} fill={color} opacity={0.1 * s.light * f} />
                ) : null}
                {s.finished ? (
                  <G opacity={0.35 * f}>
                    <Line x1={s.x - ray} y1={s.y} x2={s.x + ray} y2={s.y} stroke={color} strokeWidth={0.6} />
                    <Line x1={s.x} y1={s.y - ray} x2={s.x} y2={s.y + ray} stroke={color} strokeWidth={0.6} />
                  </G>
                ) : null}
                {s.light > 0 ? (
                  <>
                    <Circle cx={s.x} cy={s.y} r={s.r} fill={color} opacity={core} />
                    <Circle cx={s.x} cy={s.y} r={s.r * 0.42} fill="#FFF9EE" opacity={core} />
                  </>
                ) : (
                  <Circle
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill="none"
                    stroke={palette.starlight}
                    strokeOpacity={0.5 * core}
                    strokeWidth={0.9}
                  />
                )}
              </G>
            );
          })}
        </G>
      </Svg>

      {sky?.names.map((n) => (
        <View
          key={n.key}
          style={[
            styles.abs,
            styles.center,
            {
              left: (n.x - NAME_W / 2) * k,
              top: (n.y - 8) * k,
              width: NAME_W * k,
              opacity: n.fog * (n.complete ? 0.95 : 0.7),
            },
          ]}>
          <Text
            allowFontScaling={false}
            numberOfLines={2}
            style={t({
              fontFamily: fontFamily.serifItalic,
              fontSize: (n.complete ? 12.5 : 11) * k,
              lineHeight: (n.complete ? 16 : 14) * k,
              letterSpacing: 0.3 * k,
              textAlign: 'center',
              color: n.complete ? palette.starlight : palette.mist,
            })}>
            {n.title}
          </Text>
        </View>
      ))}

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

      {chart && !stars.length ? (
        <View
          style={[styles.abs, styles.center, { left: 0, right: 0, top: (skyBox.y + skyBox.h * 0.42) * k }]}>
          <Text
            allowFontScaling={false}
            style={t({ ...label, fontSize: 11 * k, letterSpacing: 3 * k, color: palette.mist })}>
            The first star is waiting
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.abs,
          styles.figures,
          { left: 24 * k, right: 24 * k, top: figuresTop * k, gap: 10 * k },
        ]}>
        {figures.map((f) => (
          <View key={f.unit} style={{ flex: f.unit.length > 9 ? 1.35 : 1 }}>
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
                letterSpacing: 1.8 * k,
                marginTop: 2 * k,
                color: palette.mist,
              })}>
              {f.unit}
            </Text>
          </View>
        ))}
      </View>

      {withTitles ? (
        shape === 'story' ? (
          <View style={[styles.abs, { left: 24 * k, right: 24 * k, top: titlesTop * k, gap: 6 * k }]}>
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
          <View style={[styles.abs, { left: 24 * k, right: 24 * k, top: titlesTop * k }]}>
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
  titleRow: { flexDirection: 'row', alignItems: 'center' },
});
