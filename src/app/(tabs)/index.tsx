import { router, useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { BarcodeIcon, GearIcon, LampIcon } from '@/components/icons';
import { Rise } from '@/components/motion/Rise';
import { Pressable } from '@/components/Pressable';
import { TAB_BAR_SPACE } from '@/components/Screen';
import { Atmosphere, Vignette } from '@/components/sky/Atmosphere';
import { DepthClouds } from '@/components/sky/DepthClouds';
import { BookStar } from '@/components/sky/BookStar';
import { Constellation } from '@/components/sky/Constellation';
import { Ignite } from '@/components/sky/Ignite';
import { NightSky } from '@/components/sky/NightSky';
import { WeekStrip } from '@/components/sky/WeekStrip';
import { Text } from '@/components/Text';
import { findClassic } from '@/content/classics';
import { currentBook, listBooks, type Book } from '@/data/books';
import { lastBackupAt } from '@/data/backup';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { paceSessions, readingNights, skyStats } from '@/data/sessions';
import { backupDue, daysSinceBackup } from '@/domain/backup';
import { weekMessage } from '@/domain/moonlog';
import { nearestStar, nightTitle } from '@/domain/nights';
import { finishLine, readingPace, type Pace } from '@/domain/pace';
import { pathProgress } from '@/domain/paths';
import { bookCompletion, litBeads, ringSize, starBrightness } from '@/domain/progress';
import { layoutSky } from '@/domain/sky';
import { skyMood } from '@/domain/skyMood';
import { addDays } from '@/domain/time';
import { bookCaption } from '@/features/books/format';
import { useThisWeek } from '@/features/moonlog/useMoonLog';
import { useTonightsPath } from '@/features/paths/useTonightsPath';
import { useTilt } from '@/features/sky/useTilt';
import { useTheme } from '@/theme/theme';
import { motion, radius, space } from '@/theme/tokens';

/**
 * The sky: the first screen and the heart of the app, and the whole screen.
 * One star for every night read, in a sky with depth: a Milky Way far back,
 * the reader's stars, clouds at three distances, all shifting gently as the
 * phone tilts. Drag to wander, pinch to look closer, tap a star to see its
 * night. The book in hand rests on the clouds; pull it up for tonight.
 */
export default function SkyScreen() {
  const db = useDb();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { colors, reduceMotion } = useTheme();
  const { week, today, settings } = useThisWeek();
  const { data: nights } = useLiveQuery(() => readingNights(db), ['sessions']);
  const { data: book, loading } = useLiveQuery(() => currentBook(db), ['books', 'sessions']);
  const { data: shelf } = useLiveQuery(() => listBooks(db), ['books']);
  const { data: stats } = useLiveQuery(() => skyStats(db), ['sessions', 'books']);
  const { data: recent } = useLiveQuery(() => paceSessions(db, addDays(today, -27)), ['sessions'], [today]);
  const { data: lastBackup } = useLiveQuery(() => lastBackupAt(db), ['settings']);
  const path = useTonightsPath(shelf, book);
  const pace = readingPace(recent ?? [], today);
  const count = nights?.length ?? 0;
  const [mood] = useState(() => {
    const now = new Date();
    return skyMood(now.getHours() + now.getMinutes() / 60);
  });
  const isFocused = useIsFocused();
  const tilt = useTilt(isFocused);
  const [picked, setPicked] = useState<{ night: string; x: number; y: number } | null>(null);
  const [sheet, setSheet] = useState(false);
  // A small warm dot on the gear, instead of a line of text, when a backup is due.
  const backupNudge =
    !!stats && lastBackup !== undefined && backupDue(stats.nightsRead, daysSinceBackup(lastBackup));

  // The reader's stars fill the open sky between the header and the clouds.
  const skyTop = insets.top + 56;
  const horizon = height - TAB_BAR_SPACE - insets.bottom - 70;
  const skyHeight = horizon - skyTop;
  const stars = useMemo(
    () => (nights ? layoutSky(nights, width, skyHeight, settings.goalMinutes) : []),
    [nights, width, skyHeight, settings.goalMinutes],
  );

  // Exploring: drag and pinch move the star layer; it stays where it is left.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const reach = width * 0.4;
  const pan = usePanGesture({
    minDistance: 6,
    onUpdate: (e) => {
      'worklet';
      const s = scale.get();
      tx.set(Math.max(-reach * s, Math.min(reach * s, tx.get() + e.changeX)));
      ty.set(Math.max(-reach * s, Math.min(reach * s, ty.get() + e.changeY)));
    },
  });
  const pinch = usePinchGesture({
    onBegin: () => {
      'worklet';
      startScale.set(scale.get());
    },
    onUpdate: (e) => {
      'worklet';
      scale.set(Math.max(1, Math.min(2.6, startScale.get() * e.scale)));
    },
  });
  const tap = useTapGesture({
    runOnJS: true,
    maxDistance: 8,
    onActivate: (e) => {
      const s = scale.get();
      const ox = tx.get() - tilt.x.get() * 10;
      const oy = ty.get() - tilt.y.get() * 10;
      // Undo the layer's move and zoom to find the point in the sky's own space.
      const px = width / 2 + (e.x - width / 2 - ox) / s;
      const py = skyHeight / 2 + (e.y - skyHeight / 2 - oy) / s;
      const hit = nearestStar(stars, px, py, 28 / s);
      setPicked(
        hit
          ? {
              night: hit.night,
              x: width / 2 + (hit.x - width / 2) * s + ox,
              y: skyHeight / 2 + (hit.y - skyHeight / 2) * s + oy,
            }
          : null,
      );
    },
  });
  const reset = useTapGesture({
    numberOfTaps: 2,
    runOnJS: true,
    onActivate: () => {
      setPicked(null);
      if (reduceMotion) {
        tx.set(0);
        ty.set(0);
        scale.set(1);
      } else {
        tx.set(withTiming(0, { duration: motion.enter }));
        ty.set(withTiming(0, { duration: motion.enter }));
        scale.set(withTiming(1, { duration: motion.enter }));
      }
    },
  });
  const gesture = useCompetingGestures(useSimultaneousGestures(pan, pinch), reset, tap);
  const starLayer = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() - tilt.x.get() * 10 },
      { translateY: ty.get() - tilt.y.get() * 10 },
      { scale: scale.get() },
    ],
  }));
  const pickedNight = picked ? nights?.find((n) => n.night === picked.night) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.night }]}>
      <Atmosphere mood={mood} tilt={tilt} />

      <GestureDetector gesture={gesture}>
        <View
          style={[styles.skyArea, { top: skyTop, height: skyHeight }]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            count ? `Your sky, ${count} ${count === 1 ? 'star' : 'stars'}` : 'Your sky, no stars yet'
          }
          accessibilityHint={count ? 'Opens your latest night' : undefined}
          onAccessibilityTap={() => {
            const last = nights?.[nights.length - 1];
            if (last) router.push({ pathname: '/night/[night]', params: { night: last.night } });
          }}>
          <Animated.View style={[styles.fill, starLayer]}>
            {nights ? (
              <NightSky nights={nights} width={width} height={skyHeight} goalMinutes={settings.goalMinutes} />
            ) : null}
          </Animated.View>
          {picked ? (
            <View pointerEvents="none" style={[styles.ring, { left: picked.x - 14, top: picked.y - 14, borderColor: colors.starlight }]} />
          ) : null}
        </View>
      </GestureDetector>

      <DepthClouds tilt={tilt} horizon={horizon} />
      <Vignette />

      {nights && !count ? (
        <View pointerEvents="none" style={[styles.empty, { top: skyTop + skyHeight * 0.38 }]}>
          <Text variant="heading" style={styles.center}>
            The first star is waiting
          </Text>
          <Text variant="caption" style={styles.center}>
            Read for a few minutes tonight and it appears here.
          </Text>
        </View>
      ) : null}

      {picked && pickedNight ? (
        <NightCard
          night={pickedNight.night}
          minutes={Math.round(pickedNight.seconds / 60)}
          wrote={pickedNight.wrote}
          x={Math.max(space.gutter, Math.min(width - 180 - space.gutter, picked.x - 90))}
          y={skyTop + (picked.y > skyHeight * 0.6 ? picked.y - 150 : picked.y + 24)}
          onClose={() => setPicked(null)}
        />
      ) : null}

      <View style={[styles.header, { top: insets.top + space.sm }]}>
        <Text variant="label" tone="starlight" accessibilityRole="header">
          Your sky
        </Text>
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

      {!loading ? (
        <View style={[styles.glance, { top: horizon + 6 }]}>
          <Ignite>
            {book ? <BookGlance book={book} onOpen={() => setSheet(true)} /> : <NoBookGlance />}
          </Ignite>
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

/** A small card floating beside a tapped star. */
function NightCard({
  night,
  minutes,
  wrote,
  x,
  y,
  onClose,
}: {
  night: string;
  minutes: number;
  wrote: boolean;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Rise style={[styles.card, { left: x, top: y, backgroundColor: colors.raised, borderColor: colors.hairline }]}>
      <Text variant="label">{nightTitle(night)}</Text>
      <Text variant="caption" tone="starlight">
        {minutes} {minutes === 1 ? 'minute' : 'minutes'}
        {wrote ? ', and you wrote' : ''}
      </Text>
      <Pressable
        accessibilityRole="button"
        haptic={false}
        onPress={() => {
          onClose();
          router.push({ pathname: '/night/[night]', params: { night } });
        }}
        style={styles.cardLink}>
        <Text variant="button">Open night</Text>
      </Pressable>
    </Rise>
  );
}

/** Tonight, pulled up from the clouds. The sky dims behind it; tap the sky to let it go. */
function TonightSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
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
        <Pressable accessibilityRole="button" accessibilityLabel="Close" haptic={false} onPress={onClose} style={styles.fill} />
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
  skyArea: { position: 'absolute', left: 0, right: 0 },
  ring: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 1, opacity: 0.7 },
  header: {
    position: 'absolute',
    left: space.gutter,
    right: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empty: { position: 'absolute', left: space.xxl, right: space.xxl, gap: space.xs },
  center: { textAlign: 'center' },
  glance: { position: 'absolute', left: space.gutter, right: space.gutter },
  glanceRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.md },
  glanceBook: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lamp: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  handle: { position: 'absolute', top: 0, left: '50%', marginLeft: -18, width: 36, height: 3, borderRadius: 2 },
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
