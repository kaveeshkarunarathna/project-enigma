import { BlurMask, Canvas, Circle, Group, Line, rect, rrect, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { nearestStar } from '@/domain/nights';
import { hash, layoutSky, type SkyStar } from '@/domain/sky';
import { twinkle, TWINKLE_GROUPS } from '@/domain/motion';
import { useTheme } from '@/theme/theme';
import { motion } from '@/theme/tokens';

type Props = {
  nights: { night: string; seconds: number; wrote?: boolean }[];
  width: number;
  height: number;
  goalMinutes: number;
  /** The newest star breathes very slowly. Off under Reduce Motion. */
  breatheNewest?: boolean;
  /** Stars twinkle, fill in on first sight, a new star is born, now and then a meteor. */
  alive?: boolean;
  /**
   * Makes the stars tappable: a tap opens the night of the nearest star. For
   * screen readers the whole sky is one button that opens the newest night.
   */
  onPressNight?: (night: string) => void;
};

/** Once per app launch the sky fills in from the centre: oldest nights first. */
let revealedThisLaunch = false;
/** The newest night seen so far, so a star that appears while the app is open is born, not just drawn. */
let lastNewest: string | null = null;

/** The reader's own sky: one star for every night they read. */
export function NightSky({
  nights,
  width,
  height,
  goalMinutes,
  breatheNewest = true,
  alive = true,
  onPressNight,
}: Props) {
  const { colors, reduceMotion } = useTheme();
  const stars = useMemo(
    () => layoutSky(nights, width, height, goalMinutes),
    [nights, width, height, goalMinutes],
  );
  const newest = stars[stars.length - 1];

  const pulse = useSharedValue(0.6);
  useEffect(() => {
    if (!breatheNewest || reduceMotion) {
      cancelAnimation(pulse);
      pulse.set(0.6);
      return;
    }
    pulse.set(withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(pulse);
  }, [breatheNewest, reduceMotion, pulse]);
  const newestGlow = useDerivedValue(() => pulse.get() * 0.5);
  const moving = alive && !reduceMotion;

  // Twinkle: one slow clock; stars share a few phase groups so it stays cheap.
  const clock = useSharedValue(0);
  useEffect(() => {
    if (!moving) {
      cancelAnimation(clock);
      clock.set(0);
      return;
    }
    clock.set(withRepeat(withTiming(1, { duration: motion.twinkleMs, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(clock);
  }, [moving, clock]);

  // First sight: the sky fills in from the centre, which is also oldest to newest.
  const [reveal] = useState(() => !moving || revealedThisLaunch);
  const spread = useSharedValue(reveal ? 1 : 0);
  useEffect(() => {
    if (reveal || !stars.length) return;
    revealedThisLaunch = true;
    spread.set(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }));
  }, [reveal, stars.length, spread]);
  const reach = Math.hypot(width, height) / 2 + 12;
  const clip = useDerivedValue(() => {
    const r = Math.max(1, spread.get() * reach);
    return rrect(rect(width / 2 - r, height / 2 - r, r * 2, r * 2), r, r);
  });

  // Birth: a star that appears while the app is open lights up with a ring.
  const birth = useSharedValue(1);
  const [born, setBorn] = useState<string | null>(null);
  useEffect(() => {
    const night = newest?.night ?? null;
    if (!night) return;
    const fresh = lastNewest !== null && night !== lastNewest;
    lastNewest = night;
    if (!fresh || !moving) return;
    // Start on the next frame, once the new star is in the canvas.
    const frame = requestAnimationFrame(() => {
      setBorn(night);
      birth.set(0);
      birth.set(withDelay(250, withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) })));
    });
    return () => cancelAnimationFrame(frame);
  }, [newest?.night, moving, birth]);

  const groups = useMemo(() => {
    const g: SkyStar[][] = Array.from({ length: TWINKLE_GROUPS }, () => []);
    stars.forEach((s) => g[Math.floor(hash(`${s.night}:tw`) * TWINKLE_GROUPS)].push(s));
    return g;
  }, [stars]);

  const canvas = (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Group clip={clip}>
        {groups.map((group, g) => (
          <TwinkleGroup key={g} index={g} clock={clock}>
            {group.map((s) => (
              <StarNode
                key={s.night}
                star={s}
                aurora={colors.aurora}
                light={colors.starlight}
                glow={colors.candlelight}
                birth={s.night === born ? birth : null}
              />
            ))}
          </TwinkleGroup>
        ))}
        {newest ? (
          <Circle
            cx={newest.x}
            cy={newest.y}
            r={newest.r * 5}
            color={colors.candlelight}
            opacity={newestGlow}>
            <BlurMask blur={newest.r * 4} style="normal" />
          </Circle>
        ) : null}
      </Group>
      {moving ? <Meteor width={width} height={height} color={colors.starlight} /> : null}
    </Canvas>
  );
  if (!onPressNight || !stars.length) return canvas;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Your sky, ${stars.length} ${stars.length === 1 ? 'star' : 'stars'}`}
      accessibilityHint="Opens your latest night. Tap a star to open its night."
      onPress={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        const hit = nearestStar(stars, locationX, locationY);
        // Empty sky (or a screen reader's tap) opens the newest night.
        const night = hit?.night ?? newest?.night;
        if (night) onPressNight(night);
      }}>
      {canvas}
    </Pressable>
  );
}

function TwinkleGroup({
  index,
  clock,
  children,
}: {
  index: number;
  clock: SharedValue<number>;
  children: React.ReactNode;
}) {
  const opacity = useDerivedValue(() => twinkle(clock.get(), index));
  return <Group opacity={opacity}>{children}</Group>;
}

function StarNode({
  star: s,
  aurora,
  light,
  glow,
  birth,
}: {
  star: SkyStar;
  aurora: string;
  light: string;
  glow: string;
  /** Set for the star being born: 0 to 1. */
  birth: SharedValue<number> | null;
}) {
  const fallback = useSharedValue(1);
  const b = birth ?? fallback;
  const r = useDerivedValue(() => s.r * Math.min(1, b.get() * 1.6));
  const ringR = useDerivedValue(() => s.r + 2 + b.get() * s.r * 10);
  const ringO = useDerivedValue(() => (b.get() >= 1 ? 0 : 0.7 * (1 - b.get())));
  return (
    <Group>
      <Circle cx={s.x} cy={s.y} r={s.r * 3} color={glow} opacity={s.brightness * 0.18}>
        <BlurMask blur={s.r * 2} style="normal" />
      </Circle>
      {birth ? (
        <Circle cx={s.x} cy={s.y} r={ringR} style="stroke" strokeWidth={1} color={light} opacity={ringO} />
      ) : null}
      {s.wrote ? (
        // A night the reader also wrote about wears a faint teal ring.
        <Circle
          cx={s.x}
          cy={s.y}
          r={s.r + 3.2}
          style="stroke"
          strokeWidth={0.9}
          color={aurora}
          opacity={0.65}
        />
      ) : null}
      <Circle cx={s.x} cy={s.y} r={r} color={light} opacity={s.brightness} />
    </Group>
  );
}

/**
 * Now and then, a faint meteor crosses the sky: every 40 to 90 seconds, under
 * a second long, low and thin. Never under Reduce Motion.
 */
function Meteor({ width, height, color }: { width: number; height: number; color: string }) {
  const t = useSharedValue(0);
  const [path, setPath] = useState({ x: 0, y: 0, dx: 0, dy: 0 });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const plan = (first: boolean) => {
      timer = setTimeout(
        () => {
          const x = width * (0.1 + Math.random() * 0.5);
          const y = height * (0.05 + Math.random() * 0.35);
          const len = Math.min(width, height) * (0.35 + Math.random() * 0.2);
          setPath({ x, y, dx: len * 0.86, dy: len * 0.5 });
          t.set(0);
          t.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
          plan(false);
        },
        (first ? 12_000 : 40_000) + Math.random() * 50_000,
      );
    };
    plan(true);
    return () => clearTimeout(timer);
  }, [width, height, t]);
  const head = useDerivedValue(() => vec(path.x + path.dx * t.get(), path.y + path.dy * t.get()));
  const tail = useDerivedValue(() => {
    const k = Math.max(0, t.get() - 0.28);
    return vec(path.x + path.dx * k, path.y + path.dy * k);
  });
  const opacity = useDerivedValue(() =>
    t.get() <= 0 || t.get() >= 1 ? 0 : Math.sin(Math.PI * t.get()) * 0.55,
  );
  return <Line p1={tail} p2={head} color={color} strokeWidth={1} opacity={opacity} />;
}
