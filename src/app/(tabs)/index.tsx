import { router, useIsFocused } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  usePinchGesture,
  useRotationGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  cancelAnimation,
  withDecay,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Glass } from '@/components/Glass';
import { BarcodeIcon, ExportIcon, GearIcon, LampIcon, XIcon } from '@/components/icons';
import { Rise } from '@/components/motion/Rise';
import { Pressable } from '@/components/Pressable';
import { TAB_BAR_SPACE } from '@/components/Screen';
import { Atmosphere, Vignette } from '@/components/sky/Atmosphere';
import { DepthClouds, NearMotes } from '@/components/sky/DepthClouds';
import { BookStar } from '@/components/sky/BookStar';
import { Constellation } from '@/components/sky/Constellation';
import { ConstellationCloseUp } from '@/components/sky/ConstellationCloseUp';
import { Ignite } from '@/components/sky/Ignite';
import { StarChartView, type ChartFocus } from '@/components/sky/StarChartView';
import { WeekStrip } from '@/components/sky/WeekStrip';
import { Text } from '@/components/Text';
import { findClassic } from '@/content/classics';
import { currentBook, listBooks, type Book } from '@/data/books';
import { lastBackupAt } from '@/data/backup';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { paceSessions, skyStats } from '@/data/sessions';
import { backupDue, daysSinceBackup } from '@/domain/backup';
import { weekMessage } from '@/domain/moonlog';
import { finishLine, readingPace, type Pace } from '@/domain/pace';
import { pathProgress } from '@/domain/paths';
import { bookCompletion, litBeads, ringSize, starBrightness } from '@/domain/progress';
import {
  depthShift,
  hitStarChart,
  homeConstellation,
  type ChartConstellation,
  type ChartPlanet,
  type ChartStar,
  type StarChart,
} from '@/domain/starChart';
import {
  closeUpScale,
  hitProjected,
  orbitRadius,
  PITCH_LIMIT,
  project,
  REST_PITCH,
  solidOfBox,
} from '@/domain/orbit';
import { skyMood } from '@/domain/skyMood';
import { addDays } from '@/domain/time';
import { bookCaption } from '@/features/books/format';
import { useThisWeek } from '@/features/moonlog/useMoonLog';
import { useTonightsPath } from '@/features/paths/useTonightsPath';
import { useStarChart } from '@/features/sky/useStarChart';
import { SKY_CLOUDS } from '@/features/sky/look';
import { useTilt, type Tilt } from '@/features/sky/useTilt';
import { useTheme } from '@/theme/theme';
import { depth, fontFamily, motion, radius, space } from '@/theme/tokens';

/**
 * The sky: the first screen and the heart of the app. A star chart of what
 * the reader has read: every finished book is a star, and the books of a
 * reading path join into its constellation, named once it is complete.
 * Drag to wander, pinch to look closer, tap a star or a constellation to
 * choose it, double tap to come home. Nights read live in the Moon Log.
 * The book in hand rests on the clouds; pull it up for tonight.
 */
export default function SkyScreen() {
  const db = useDb();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { colors, reduceMotion } = useTheme();
  const { week, today } = useThisWeek();
  const { data: book, loading } = useLiveQuery(() => currentBook(db), ['books', 'sessions']);
  const { data: shelf } = useLiveQuery(() => listBooks(db), ['books']);
  const { data: stats } = useLiveQuery(() => skyStats(db), ['sessions', 'books']);
  const { data: recent } = useLiveQuery(() => paceSessions(db, addDays(today, -27)), ['sessions'], [today]);
  const { data: lastBackup } = useLiveQuery(() => lastBackupAt(db), ['settings']);
  const path = useTonightsPath(shelf, book);
  const pace = readingPace(recent ?? [], today);
  const [mood] = useState(() => {
    const now = new Date();
    return skyMood(now.getHours() + now.getMinutes() / 60);
  });
  const isFocused = useIsFocused();
  const tilt = useTilt(isFocused);
  const [focus, setFocus] = useState<ChartFocus>(null);
  const [sheet, setSheet] = useState(false);
  // A small warm dot on the gear, instead of a line of text, when a backup is due.
  const backupNudge =
    !!stats && lastBackup !== undefined && backupDue(stats.nightsRead, daysSinceBackup(lastBackup));

  // The chart fills the open sky between the header and the clouds.
  const skyTop = insets.top + 84;
  const horizon = height - TAB_BAR_SPACE - insets.bottom - 70;
  const skyHeight = horizon - skyTop;
  // The clouds rise over the bottom of the sky; the chart is laid out and
  // centred in the clear part above them.
  const clearHeight = skyHeight - 110;
  const viewport = useMemo(() => ({ width, height: clearHeight }), [width, clearHeight]);
  const chart = useStarChart(shelf, viewport);
  const W = chart?.width ?? width;
  const H = chart?.height ?? skyHeight;
  const stars = chart ? chart.constellations.reduce((n, c) => n + c.finished, 0) + chart.lone.length : 0;
  const empty = !!chart && stars === 0 && chart.planets.length === 0;

  // A soft tap when a constellation is completed while the sky is open. Once,
  // and never for the ones already complete when it opened.
  const completeKey = chart?.constellations
    .filter((c) => c.complete)
    .map((c) => c.pathId)
    .join('|');
  const knownComplete = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (completeKey === undefined) return;
    const now = new Set(completeKey ? completeKey.split('|') : []);
    const before = knownComplete.current;
    knownComplete.current = now;
    if (before && [...now].some((id) => !before.has(id))) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
  }, [completeKey]);

  // The camera: drag to wander the chart, pinch to look closer.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  // Where the chart opened. The planes of the sky follow the drag from here,
  // each by its own share, so the sky reads as several distances.
  const homeX = useSharedValue(0);
  const homeY = useSharedValue(0);
  const dx = useDerivedValue(() => tx.get() - homeX.get());
  const dy = useDerivedValue(() => ty.get() - homeY.get());
  // How far the reader has turned the sky with two fingers.
  const rot = useSharedValue(0);
  const startRot = useSharedValue(0);
  const explore = useMemo(() => ({ dx, dy, scale, rot }), [dx, dy, scale, rot]);

  // A constellation brought close: its own camera, turned by the reader's finger.
  const closeId = focus?.pathId ?? null;
  const closeC = closeId ? (chart?.constellations.find((c) => c.pathId === closeId) ?? null) : null;
  const closeMode = useSharedValue(0);
  const yaw = useSharedValue(0);
  const pitch = useSharedValue(0);
  const zoom = useSharedValue(1);
  const startZoom = useSharedValue(1);
  const closeOpen = useSharedValue(0);
  const lit = useSharedValue(0);
  // One slow sway either way while it rests, so it reads as a thing hanging in space.
  const sway = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || !closeId) {
      sway.set(0);
      return;
    }
    sway.set(withRepeat(withTiming(1, { duration: 32_000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(sway);
  }, [reduceMotion, closeId, sway]);
  const yawSeen = useDerivedValue(
    () => yaw.get() + 0.16 * Math.sin(2 * Math.PI * sway.get()) * closeOpen.get(),
  );
  const camera = useMemo(
    () => ({ yaw: yawSeen, pitch, zoom, open: closeOpen, lit }),
    [yawSeen, pitch, zoom, closeOpen, lit],
  );
  const closeCentre = useMemo(() => ({ x: width / 2, y: clearHeight / 2 }), [width, clearHeight]);
  const closeK = closeC ? closeUpScale(closeC.box, { width, height: clearHeight }) : 1;
  const closeStars = closeC?.stars.length ?? 0;
  // Brought close only when the constellation changes, not when one of its stars is chosen.
  useEffect(() => {
    if (!closeId) {
      closeMode.set(0);
      closeOpen.set(reduceMotion ? 0 : withTiming(0, { duration: motion.fade }));
      return;
    }
    closeMode.set(1);
    yaw.set(0);
    if (reduceMotion) {
      closeOpen.set(1);
      zoom.set(closeK);
      pitch.set(REST_PITCH);
      lit.set(closeStars);
      return;
    }
    // It starts as it looks on the chart and comes forward, tipping back to show its depth.
    const ease = { duration: motion.enter * 1.8, easing: Easing.inOut(Easing.cubic) };
    zoom.set(scale.get());
    pitch.set(0);
    lit.set(0);
    closeOpen.set(withTiming(1, { duration: motion.enter }));
    zoom.set(withTiming(closeK, ease));
    pitch.set(withTiming(REST_PITCH, ease));
    // Then its stars light one after another, the way the path was read.
    lit.set(
      withDelay(motion.enter, withTiming(closeStars, { duration: 340 * closeStars, easing: Easing.linear })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeId, reduceMotion]);
  // 0 with nothing chosen, 1 with a star or constellation chosen.
  const focusT = useSharedValue(0);
  useEffect(() => {
    const target = focus ? 1 : 0;
    focusT.set(reduceMotion ? target : withTiming(target, { duration: motion.enter }));
  }, [focus, reduceMotion, focusT]);

  /** Where the chart layer must sit so chart point (cx, cy) is in the middle of the sky. */
  const centreOn = useCallback(
    (cx: number, cy: number, s: number) => ({
      x: clampPan(width / 2 - W / 2 - (cx - W / 2) * s, width, W, s),
      y: clampPan(clearHeight / 2 - H / 2 - (cy - H / 2) * s, clearHeight, H, s),
    }),
    [width, clearHeight, W, H],
  );
  const moveTo = useCallback(
    (cx: number, cy: number, s: number) => {
      const to = centreOn(cx, cy, s);
      if (reduceMotion) {
        tx.set(to.x);
        ty.set(to.y);
        scale.set(s);
        return;
      }
      const ease = { duration: motion.enter * 1.6, easing: Easing.inOut(Easing.cubic) };
      tx.set(withTiming(to.x, ease));
      ty.set(withTiming(to.y, ease));
      scale.set(withTiming(s, ease));
    },
    [centreOn, reduceMotion, tx, ty, scale],
  );
  const goHome = useCallback(
    (animate: boolean) => {
      if (!chart) return;
      const home = homeConstellation(chart);
      const cx = home ? home.box.x + home.box.w / 2 : W / 2;
      const cy = home ? home.box.y + home.box.h / 2 : H / 2;
      if (animate) {
        moveTo(cx, cy, 1);
        rot.set(reduceMotion ? 0 : withTiming(0, { duration: motion.enter * 1.6 }));
      } else {
        const to = centreOn(cx, cy, 1);
        tx.set(to.x);
        ty.set(to.y);
        homeX.set(to.x);
        homeY.set(to.y);
        scale.set(1);
      }
    },
    [chart, W, H, moveTo, centreOn, tx, ty, scale, homeX, homeY, rot, reduceMotion],
  );
  // Open on the constellation finished last, once the chart is known.
  const placed = useRef(false);
  useEffect(() => {
    if (chart && !placed.current) {
      goHome(false);
      placed.current = true;
    }
  }, [chart, goHome]);

  const pan = usePanGesture({
    minDistance: 6,
    onUpdate: (e) => {
      'worklet';
      if (closeMode.get() === 1) {
        // Up close, a drag turns the constellation like an object in the hand.
        yaw.set(yaw.get() + e.changeX * 0.009);
        pitch.set(Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.get() + e.changeY * 0.006)));
        return;
      }
      const s = scale.get();
      tx.set(clampPan(tx.get() + e.changeX, width, W, s));
      ty.set(clampPan(ty.get() + e.changeY, clearHeight, H, s));
    },
    onDeactivate: (e) => {
      'worklet';
      if (reduceMotion) return;
      if (closeMode.get() === 1) {
        // A flick keeps it turning a little, and it settles back to its resting tip.
        yaw.set(withDecay({ velocity: e.velocityX * 0.009, deceleration: 0.993 }));
        pitch.set(withTiming(REST_PITCH, { duration: 900, easing: Easing.inOut(Easing.cubic) }));
        return;
      }
      // A gentle glide after a flick, slowing to rest inside the chart.
      const s = scale.get();
      const bx = [clampPan(-1e6, width, W, s), clampPan(1e6, width, W, s)] as [number, number];
      const by = [clampPan(-1e6, clearHeight, H, s), clampPan(1e6, clearHeight, H, s)] as [number, number];
      tx.set(withDecay({ velocity: e.velocityX * 0.6, deceleration: 0.994, clamp: bx }));
      ty.set(withDecay({ velocity: e.velocityY * 0.6, deceleration: 0.994, clamp: by }));
    },
  });
  const pinch = usePinchGesture({
    onBegin: () => {
      'worklet';
      startScale.set(scale.get());
      startZoom.set(zoom.get());
    },
    onUpdate: (e) => {
      'worklet';
      if (closeMode.get() === 1) {
        zoom.set(Math.max(0.6, Math.min(3, startZoom.get() * e.scale)));
        return;
      }
      const s = Math.max(0.6, Math.min(2.4, startScale.get() * e.scale));
      scale.set(s);
      tx.set(clampPan(tx.get(), width, W, s));
      ty.set(clampPan(ty.get(), clearHeight, H, s));
    },
  });

  // Two fingers turn the whole sky, like the dome of a planetarium.
  const rotate = useRotationGesture({
    onBegin: () => {
      'worklet';
      startRot.set(rot.get());
    },
    onUpdate: (e) => {
      'worklet';
      if (closeMode.get() === 1) return;
      rot.set(startRot.get() + e.rotation);
    },
  });

  const choose = (next: ChartFocus) => {
    setFocus(next);
    if (next) void Haptics.selectionAsync();
  };
  const tap = useTapGesture({
    runOnJS: true,
    maxDistance: 8,
    onActivate: (e) => {
      if (!chart) return;
      if (closeC) {
        // Up close: a star, by where it is seen now; open sky lets the constellation go back.
        const k = zoom.get();
        const seen = solidOfBox(closeC.stars, closeC.box).map((p) => {
          const q = project(p, yawSeen.get(), pitch.get());
          return { x: closeCentre.x + q.x * k, y: closeCentre.y + q.y * k };
        });
        const i = hitProjected(seen, e.x, e.y, 30);
        if (i >= 0) {
          const star = closeC.stars[i];
          choose({ pathId: closeC.pathId, bookId: star.bookId ?? `entry:${star.title}` });
          return;
        }
        const d = Math.hypot(e.x - closeCentre.x, e.y - closeCentre.y);
        if (d < orbitRadius(closeC.box) * k * 0.9) setFocus({ pathId: closeC.pathId, bookId: null });
        else choose(null);
        return;
      }
      const s = scale.get();
      const ox = tx.get() - tilt.x.get() * depth.stars.tilt;
      const oy = ty.get() - tilt.y.get() * depth.stars.tilt;
      // Undo the layer's move, turn and zoom to find the point on the chart.
      const r = -rot.get();
      const vx = e.x - ox - W / 2;
      const vy = e.y - oy - H / 2;
      const px = W / 2 + (vx * Math.cos(r) - vy * Math.sin(r)) / s;
      const py = H / 2 + (vx * Math.sin(r) + vy * Math.cos(r)) / s;
      // Constellations sit at their own depths, shifted by tilt and drag.
      const shift = (z: number) =>
        reduceMotion ? { x: 0, y: 0 } : depthShift(z, dx.get(), dy.get(), tilt.x.get(), tilt.y.get());
      const hit = hitStarChart(chart, px, py, 26 / s, shift);
      if (!hit) {
        choose(null);
        return;
      }
      if (hit.kind === 'planet') {
        choose({ pathId: null, bookId: hit.planet.bookId, planet: true });
        moveTo(hit.planet.x, hit.planet.y, Math.max(s, 1.15));
        return;
      }
      if (hit.kind === 'path') {
        const c = chart.constellations.find((k) => k.pathId === hit.pathId);
        choose({ pathId: hit.pathId, bookId: null });
        if (c) moveTo(c.box.x + c.box.w / 2, c.box.y + c.box.h / 2, Math.max(s, 1.15));
        return;
      }
      choose({ pathId: hit.pathId, bookId: hit.star.bookId ?? `entry:${hit.star.title}` });
      moveTo(hit.star.x, hit.star.y, Math.max(s, 1.15));
    },
  });
  const reset = useTapGesture({
    numberOfTaps: 2,
    runOnJS: true,
    onActivate: () => {
      setFocus(null);
      goHome(true);
    },
  });
  const gesture = useCompetingGestures(useSimultaneousGestures(pan, pinch, rotate), reset, tap);
  const chartLayer = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() - tilt.x.get() * depth.stars.tilt },
      { translateY: ty.get() - tilt.y.get() * depth.stars.tilt },
      { scale: scale.get() },
      { rotate: `${rot.get()}rad` },
    ],
  }));

  const chosenPlanet = focus?.planet ? chart?.planets.find((p) => p.bookId === focus.bookId) : null;
  const chosenStar =
    focus?.bookId && !focus.planet && !focus.pathId
      ? chart?.lone.find((s) => s.bookId === focus.bookId)
      : null;
  const constellationsDone = chart?.constellations.filter((c) => c.complete).length ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.night }]}>
      {tilt.source}
      <Atmosphere mood={mood} tilt={tilt} explore={explore} focus={focusT} showMoon={SKY_CLOUDS} />

      <GestureDetector gesture={gesture}>
        <View
          style={[styles.skyArea, { top: skyTop, height: skyHeight }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={chartSummary(chart)}>
          <Animated.View style={[styles.chart, { width: W, height: H }, chartLayer]}>
            {chart && !empty ? (
              <StarChartView
                chart={chart}
                focus={focus}
                chosen={focusT}
                tilt={tilt}
                explore={explore}
                close={closeOpen}
              />
            ) : null}
          </Animated.View>
          {closeC ? (
            <ConstellationCloseUp
              key={closeC.pathId}
              c={closeC}
              width={width}
              height={skyHeight}
              centre={closeCentre}
              camera={camera}
              picked={focus?.bookId ?? null}
            />
          ) : null}
        </View>
      </GestureDetector>

      {SKY_CLOUDS ? <DepthClouds tilt={tilt} explore={explore} horizon={horizon} /> : null}
      {SKY_CLOUDS ? <NearMotes tilt={tilt} explore={explore} /> : null}
      <Vignette />

      {empty ? (
        <View pointerEvents="none" style={[styles.empty, { top: skyTop + skyHeight * 0.34 }]}>
          <Text style={styles.emptyTitle}>Your first star is waiting</Text>
          <Text variant="caption" style={styles.center}>
            Finish a book and it lights up here. Follow a path and its books join into a constellation.
          </Text>
        </View>
      ) : null}

      <View style={[styles.header, { top: insets.top + space.sm }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.skyTitle} accessibilityRole="header">
            Your sky
          </Text>
          {chart && !empty ? (
            <Text variant="caption">
              {plural(chart.booksFinished, 'book')} read
              {constellationsDone ? `, ${plural(constellationsDone, 'constellation')} complete` : ''}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerIcons}>
          {!empty ? (
            <IconButton
              icon={ExportIcon}
              label="Share your sky as a picture"
              tone="mist"
              size={22}
              onPress={() => router.push('/sky-card')}
            />
          ) : null}
          <View>
            <IconButton
              icon={GearIcon}
              label={backupNudge ? 'Settings. Time to back up your sky' : 'Settings'}
              tone="mist"
              onPress={() => router.push('/settings')}
            />
            {backupNudge ? (
              <View pointerEvents="none" style={[styles.dot, { backgroundColor: colors.candlelight }]} />
            ) : null}
          </View>
        </View>
      </View>

      {!loading ? (
        <View style={[styles.glance, { bottom: Math.max(insets.bottom, space.md) + 72 }]}>
          {closeC ? (
            <ConstellationGlance
              key={closeC.pathId}
              c={closeC}
              picked={focus?.bookId ?? null}
              onPick={(bookId) => setFocus({ pathId: closeC.pathId, bookId })}
              onClose={() => choose(null)}
              tilt={tilt}
            />
          ) : chosenPlanet ? (
            <PlanetGlance
              key={chosenPlanet.bookId}
              planet={chosenPlanet}
              onClose={() => choose(null)}
              tilt={tilt}
            />
          ) : chosenStar ? (
            <StarGlance key={focus?.bookId} star={chosenStar} onClose={() => choose(null)} tilt={tilt} />
          ) : (
            <Ignite>
              <Glass tilt={tilt} style={styles.glassPad}>
                {book ? <BookGlance book={book} onOpen={() => setSheet(true)} /> : <NoBookGlance />}
              </Glass>
            </Ignite>
          )}
        </View>
      ) : null}

      <TonightSheet open={sheet} onClose={() => setSheet(false)}>
        {book ? <InHand book={book} pace={pace} /> : <NoBook />}
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the Moon Log"
          haptic={false}
          onPress={() => {
            setSheet(false);
            router.push('/moonlog');
          }}
          style={styles.week}>
          <Text variant="label">This week</Text>
          <WeekStrip week={week} today={today} />
          <Text variant="caption">{weekMessage(week)}</Text>
        </Pressable>
        {path ? <PathGlance path={path} shelf={shelf ?? []} /> : null}
      </TonightSheet>
    </View>
  );
}

/**
 * Keeps the chart in view: its edges may come a little way inside the sky,
 * never further, so there is no empty sky to drag into. A chart smaller than
 * the view sits in the middle.
 */
function clampPan(t: number, view: number, size: number, s: number): number {
  'worklet';
  const half = (size * s) / 2;
  const margin = 28;
  const hi = margin - size / 2 + half;
  const lo = view - margin - size / 2 - half;
  if (lo > hi) return (view - size) / 2;
  return Math.min(hi, Math.max(lo, t));
}

function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

function chartSummary(chart: StarChart | null): string {
  if (!chart) return 'Your sky';
  const done = chart.constellations.filter((c) => c.complete);
  const parts = [`Your sky: ${plural(chart.booksFinished, 'book')} read`];
  if (done.length) parts.push(`complete constellations: ${done.map((c) => c.title).join(', ')}`);
  const going = chart.constellations.filter((c) => !c.complete);
  if (going.length) parts.push(...going.map((c) => `${c.title}, ${c.finished} of ${c.total} stars`));
  return parts.join('. ');
}

function finishedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `finished ${d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
}

/**
 * A constellation brought close: a pane of glass under it with its name, how
 * much of it is lit, and its books as a row of small stars. Choosing a book
 * here or tapping its star picks it in the close-up.
 */
function ConstellationGlance({
  c,
  picked,
  onPick,
  onClose,
  tilt,
}: {
  c: ChartConstellation;
  picked: string | null;
  onPick: (bookId: string | null) => void;
  onClose: () => void;
  tilt: Tilt;
}) {
  const { colors } = useTheme();
  const star = picked ? c.stars.find((s) => (s.bookId ?? `entry:${s.title}`) === picked) : null;
  const caption = c.complete
    ? [`All ${c.total} stars lit`, finishedLabel(c.completedAt)].filter(Boolean).join(', ')
    : `${c.finished} of ${c.total} stars lit. ${nextStar(c)}`;
  return (
    <Rise>
      <Glass tilt={tilt} style={styles.glassPad}>
        <View style={styles.glanceHead}>
          <View style={styles.inHandText}>
            <Text style={styles.chosenTitle} numberOfLines={2}>
              {c.title}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {star ? starCaption(star) : caption}
            </Text>
          </View>
          <IconButton icon={XIcon} label="Back to the sky" tone="mist" size={20} onPress={onClose} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          accessibilityLabel={`Books in ${c.title}`}>
          {c.stars.map((s, i) => {
            const id = s.bookId ?? `entry:${s.title}`;
            const on = id === picked;
            return (
              <Pressable
                key={`${id}${i}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${s.title}, ${starStatus(s)}`}
                onPress={() => onPick(on ? null : id)}
                style={[styles.chip, { borderColor: on ? colors.aurora : 'rgba(234, 219, 193, 0.14)' }]}>
                <StarBead s={s} />
                <Text
                  variant="caption"
                  tone={on ? 'starlight' : 'mist'}
                  numberOfLines={1}
                  style={styles.chipText}>
                  {s.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.glanceActions}>
          {star?.bookId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${star.title}`}
              onPress={() => {
                onClose();
                router.push({ pathname: '/book/[id]', params: { id: star.bookId! } });
              }}
              style={[styles.open, { borderColor: colors.starlight }]}>
              <Text variant="button">Open book</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${c.title}`}
            onPress={() => {
              onClose();
              router.push({ pathname: '/paths/[id]', params: { id: c.pathId } });
            }}
            style={[styles.open, { borderColor: star ? 'rgba(234, 219, 193, 0.3)' : colors.starlight }]}>
            <Text variant="button">Open path</Text>
          </Pressable>
        </View>
      </Glass>
    </Rise>
  );
}

/** A book's star in the row: lit, part lit, or an outline still waiting. */
function StarBead({ s }: { s: ChartStar }) {
  const { colors } = useTheme();
  const lit = s.state === 'finished';
  const reading = s.state === 'reading';
  return (
    <View style={styles.bead}>
      {lit ? <View style={[styles.beadGlow, { backgroundColor: colors.candlelight }]} /> : null}
      <View
        style={[
          styles.beadCore,
          lit
            ? { backgroundColor: colors.starlight }
            : reading
              ? { backgroundColor: colors.candlelight, opacity: 0.35 + 0.6 * s.fill }
              : { borderWidth: 1, borderColor: colors.mist },
        ]}
      />
    </View>
  );
}

function nextStar(c: ChartConstellation): string {
  const next = c.stars.find((s) => s.state !== 'finished');
  return next ? `Next: ${next.title}.` : '';
}

function starStatus(star: ChartStar): string {
  return (
    (star.state === 'finished'
      ? finishedLabel(star.finishedAt)
      : star.state === 'reading'
        ? `${Math.round(star.fill * 100)}% read`
        : star.state === 'shelf'
          ? 'on your shelf'
          : 'not on your shelf yet') ?? 'read'
  );
}

function starCaption(star: ChartStar): string {
  return [star.title, star.author, starStatus(star)].filter(Boolean).join(', ');
}

/** A chosen lone star. */
function StarGlance({ star, onClose, tilt }: { star: ChartStar; onClose: () => void; tilt: Tilt }) {
  const { colors } = useTheme();
  const caption = [star.author, starStatus(star)].filter(Boolean).join(', ');
  return (
    <Rise>
      <Glass tilt={tilt} style={[styles.glassPad, styles.glanceRow]}>
        <View style={styles.inHandText}>
          <Text variant="heading" numberOfLines={2}>
            {star.title}
          </Text>
          <Text variant="caption" numberOfLines={2}>
            {caption}
          </Text>
        </View>
        {star.bookId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${star.title}`}
            onPress={() => {
              onClose();
              router.push({ pathname: '/book/[id]', params: { id: star.bookId! } });
            }}
            style={[styles.open, { borderColor: colors.starlight }]}>
            <Text variant="button">Open book</Text>
          </Pressable>
        ) : null}
      </Glass>
    </Rise>
  );
}

/** A chosen planet: a book being read, and how far through it the reader is. */
function PlanetGlance({ planet, onClose, tilt }: { planet: ChartPlanet; onClose: () => void; tilt: Tilt }) {
  const { colors } = useTheme();
  const caption = [planet.author, `${Math.round(planet.fill * 100)}% read`].filter(Boolean).join(', ');
  return (
    <Rise>
      <Glass tilt={tilt} style={[styles.glassPad, styles.glanceRow]}>
        <View style={styles.inHandText}>
          <Text variant="label">In orbit</Text>
          <Text variant="heading" numberOfLines={2}>
            {planet.title}
          </Text>
          <Text variant="caption" numberOfLines={2}>
            {caption}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Light the lamp for ${planet.title}`}
          onPress={() => {
            onClose();
            router.push({ pathname: '/lamp', params: { bookId: planet.bookId } });
          }}
          style={[styles.lamp, { backgroundColor: colors.starlight }]}>
          <LampIcon size={24} weight="regular" color={colors.onStarlight} />
        </Pressable>
      </Glass>
    </Rise>
  );
}

/** The book in hand, resting on the clouds: its star, title, chapter, and the lamp. */
function BookGlance({ book, onOpen }: { book: Book; onOpen: () => void }) {
  const { colors } = useTheme();
  const progress = { ...book, finished: book.status === 'finished' };
  const classic = book.format === 'classic' ? findClassic(book.title, book.author) : null;
  const swipe = usePanGesture({
    runOnJS: true,
    activeOffsetY: [-12, 12],
    onDeactivate: (e) => {
      if (!e.canceled && e.translationY < -24) onOpen();
    },
  });
  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.glanceRow}>
        <View style={[styles.handle, { backgroundColor: colors.hairline }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${book.title}. ${bookCaption(book) ?? ''}`}
          accessibilityHint="Shows tonight: the lamp, logging pages and this week"
          haptic={false}
          onPress={onOpen}
          style={styles.glanceBook}>
          <BookStar
            size={56}
            brightness={starBrightness(bookCompletion(progress), !!book.startedAt)}
            beads={ringSize(book)}
            lit={litBeads(progress)}
          />
          <View style={styles.inHandText}>
            <Text variant="heading" numberOfLines={1}>
              {book.title}
            </Text>
            {bookCaption(book) ? <Text variant="caption">{bookCaption(book)}</Text> : null}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={classic ? 'Read it here' : 'Light the lamp'}
          onPress={() =>
            classic
              ? router.push({ pathname: '/classics/[id]', params: { id: classic.id } })
              : router.push({ pathname: '/lamp', params: { bookId: book.id } })
          }
          style={[styles.lamp, { backgroundColor: colors.starlight }]}>
          <LampIcon size={24} weight="regular" color={colors.onStarlight} />
        </Pressable>
      </View>
    </GestureDetector>
  );
}

function NoBookGlance() {
  const { colors } = useTheme();
  return (
    <View style={styles.glanceRow}>
      <View style={styles.glanceBook}>
        <BookStar size={56} brightness={0} beads={12} lit={0} accessibilityLabel="An unlit star" />
        <View style={styles.inHandText}>
          <Text variant="heading">Which book is in your hands?</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan its barcode"
        onPress={() => router.push('/barcode')}
        style={[styles.lamp, { backgroundColor: colors.starlight }]}>
        <BarcodeIcon size={24} weight="regular" color={colors.onStarlight} />
      </Pressable>
    </View>
  );
}

/** Tonight, pulled up from the clouds. The sky dims behind it; tap the sky to let it go. */
function TonightSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) t.set(open ? 1 : 0);
    else t.set(withTiming(open ? 1 : 0, { duration: motion.enter, easing: Easing.out(Easing.cubic) }));
  }, [open, reduceMotion, t]);
  const dim = useAnimatedStyle(() => ({ opacity: t.get() * 0.55 }));
  // Fully below the screen when closed, so nothing of it shows over the clouds.
  const rise = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - t.get()) * height }] }));
  const close = usePanGesture({
    runOnJS: true,
    activeOffsetY: [-12, 12],
    onDeactivate: (e) => {
      if (!e.canceled && e.translationY > 40) onClose();
    },
  });
  return (
    <View
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#07071A' }, dim]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          haptic={false}
          onPress={onClose}
          style={styles.fill}
        />
      </Animated.View>
      <GestureDetector gesture={close}>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.raised,
              borderColor: colors.hairline,
              paddingBottom: TAB_BAR_SPACE + insets.bottom,
            },
            rise,
          ]}>
          <View style={[styles.handle, styles.sheetHandle, { backgroundColor: colors.hairline }]} />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** The book being read: its star, where the reader is, and the two ways to count tonight. */
function InHand({ book, pace }: { book: Book; pace: Pace }) {
  const progress = { ...book, finished: book.status === 'finished' };
  const lit = litBeads(progress);
  const beads = ringSize(book);
  const left = book.pageCount ? Math.max(0, book.pageCount - book.currentPage) : null;
  const toGo = book.currentPage ? finishLine(left, pace.pagesPerWeek) : null;
  // A free classic is read in the app, so its first button opens the reader.
  const classic = book.format === 'classic' ? findClassic(book.title, book.author) : null;

  return (
    <View style={styles.block}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${book.title}. ${bookCaption(book)}.`}
        accessibilityHint="Opens the book"
        haptic={false}
        onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } })}
        style={styles.inHand}>
        <BookStar
          size={84}
          brightness={starBrightness(bookCompletion(progress), !!book.startedAt)}
          beads={beads}
          lit={lit}
        />
        <View style={styles.inHandText}>
          <Text variant="label">In your hands</Text>
          <Text variant="heading" numberOfLines={2}>
            {book.title}
          </Text>
          <Text variant="caption">
            {[bookCaption(book), toGo ? lowerFirst(toGo.replace(' at your pace', '')) : null]
              .filter(Boolean)
              .join(', ')}
          </Text>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button
            label={classic ? 'Read it here' : 'Light the lamp'}
            accessibilityHint={classic ? 'Opens the book in the reader' : "Times tonight's reading"}
            onPress={() =>
              classic
                ? router.push({ pathname: '/classics/[id]', params: { id: classic.id } })
                : router.push({ pathname: '/lamp', params: { bookId: book.id } })
            }
          />
        </View>
        <View style={styles.action}>
          <Button
            kind="quiet"
            label="Log pages"
            accessibilityHint="For reading you have already done"
            onPress={() => router.push({ pathname: '/log', params: { bookId: book.id } })}
          />
        </View>
      </View>
    </View>
  );
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function NoBook() {
  return (
    <View style={styles.block}>
      <View style={styles.inHand}>
        <BookStar size={84} brightness={0} beads={12} lit={0} accessibilityLabel="An unlit star" />
        <View style={styles.inHandText}>
          <Text variant="heading">Which book is in your hands?</Text>
          <Text variant="caption">Scan its barcode and its star joins your sky.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button label="Scan barcode" onPress={() => router.push('/barcode')} />
        </View>
        <View style={styles.action}>
          <Button kind="quiet" label="Search by title" onPress={() => router.push('/search')} />
        </View>
      </View>
    </View>
  );
}

function PathGlance({
  path,
  shelf,
}: {
  path: NonNullable<ReturnType<typeof useTonightsPath>>;
  shelf: Book[];
}) {
  const [width, setWidth] = useState(0);
  const progress = pathProgress(path.books, shelf);
  const pct = Math.floor(progress.fraction * 100);
  const caption = progress.complete
    ? `All ${progress.total} stars lit`
    : `${progress.finished} of ${progress.total} stars lit, ${pct}% of the way`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${path.title}. ${caption}.`}
      accessibilityHint="Opens the path"
      haptic={false}
      onPress={() => router.push({ pathname: '/paths/[id]', params: { id: path.id } })}
      style={styles.path}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.pathSky}>
        {width ? (
          <Constellation
            pathId={path.id}
            states={progress.states}
            fills={progress.fills}
            width={width}
            height={80}
          />
        ) : null}
      </View>
      <Text variant="heading">{path.title}</Text>
      <Text variant="caption">{caption}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
  skyArea: { position: 'absolute', left: 0, right: 0, overflow: 'visible' },
  chart: { position: 'absolute', left: 0, top: 0 },
  titleBlock: { gap: 2 },
  skyTitle: { fontFamily: fontFamily.serifItalic, fontSize: 28, lineHeight: 34, letterSpacing: 0.2 },
  emptyTitle: {
    fontFamily: fontFamily.serifItalic,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  chosenTitle: { fontFamily: fontFamily.serifItalic, fontSize: 20, lineHeight: 26 },
  open: {
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    left: space.gutter,
    right: space.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  empty: { position: 'absolute', left: space.xxl, right: space.xxl, gap: space.xs },
  center: { textAlign: 'center' },
  glance: { position: 'absolute', left: space.gutter, right: space.gutter },
  glanceRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.md },
  glassPad: { paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.xs },
  glanceHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingTop: space.md },
  glanceActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, paddingTop: space.xs },
  chips: { gap: space.sm, paddingVertical: space.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(20, 18, 52, 0.35)',
  },
  chipText: { maxWidth: 150 },
  bead: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  beadGlow: { position: 'absolute', width: 12, height: 12, borderRadius: 6, opacity: 0.3 },
  beadCore: { width: 6, height: 6, borderRadius: 3 },
  glanceBook: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lamp: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  handle: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 3,
    borderRadius: 2,
  },
  card: {
    position: 'absolute',
    width: 180,
    padding: space.lg,
    gap: space.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  cardLink: { paddingTop: space.sm, minHeight: 36, justifyContent: 'center' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.gutter,
    paddingTop: space.xxl,
    gap: space.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  sheetHandle: { top: space.md },
  block: { gap: space.lg },
  inHand: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  inHandText: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: space.md },
  action: { flex: 1 },
  path: { gap: space.xs },
  pathSky: { height: 80 },
  week: { gap: space.md },
  dot: { position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: 3 },
});
