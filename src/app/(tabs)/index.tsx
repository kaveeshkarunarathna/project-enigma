import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BookRow } from '@/components/BookRow';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { GearIcon } from '@/components/icons';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { BookStar } from '@/components/sky/BookStar';
import { Constellation } from '@/components/sky/Constellation';
import { Ignite } from '@/components/sky/Ignite';
import { NightSky } from '@/components/sky/NightSky';
import { WeekStrip } from '@/components/sky/WeekStrip';
import { Text } from '@/components/Text';
import { findClassic } from '@/content/classics';
import { currentBook, listBooks, type Book } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { paceSessions, readingNights, skyStats } from '@/data/sessions';
import { weekMessage } from '@/domain/moonlog';
import { finishLine, readingPace, type Pace } from '@/domain/pace';
import { pathProgress } from '@/domain/paths';
import { bookCompletion, litBeads, ringSize, starBrightness } from '@/domain/progress';
import { addDays } from '@/domain/time';
import { bookCaption } from '@/features/books/format';
import { useThisWeek } from '@/features/moonlog/useMoonLog';
import { useTonightsPath } from '@/features/paths/useTonightsPath';
import { space } from '@/theme/tokens';

/**
 * The sky: the first screen and the heart of the app. One star for every
 * night read, the book in hand with its two ways to count a session (the
 * lamp's timer, or logging time and pages after), the constellation that
 * book belongs to, and this week's moons and pages.
 */
export default function SkyScreen() {
  const db = useDb();
  const [width, setWidth] = useState(0);
  const { week, today, settings } = useThisWeek();
  const { data: nights } = useLiveQuery(() => readingNights(db), ['sessions']);
  const { data: book, loading } = useLiveQuery(() => currentBook(db), ['books', 'sessions']);
  const { data: shelf } = useLiveQuery(() => listBooks(db), ['books']);
  const { data: stats } = useLiveQuery(() => skyStats(db), ['sessions', 'books']);
  const { data: recent } = useLiveQuery(() => paceSessions(db, addDays(today, -27)), ['sessions'], [today]);
  const path = useTonightsPath(shelf, book);
  const pace = readingPace(recent ?? [], today);
  const others = (shelf ?? []).filter((b) => b.status === 'reading' && b.id !== book?.id);
  const count = nights?.length ?? 0;

  return (
    <Screen
      title="Your sky"
      caption={
        count
          ? `${count} ${count === 1 ? 'star' : 'stars'}, one for every night you read. Nothing here goes dark.`
          : 'Every night you read adds a star. Nothing here ever goes dark.'
      }
      accessory={
        <IconButton icon={GearIcon} label="Settings" tone="mist" onPress={() => router.push('/settings')} />
      }>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.sky}>
        {width && nights ? (
          <NightSky nights={nights} width={width} height={width * 0.8} goalMinutes={settings.goalMinutes} />
        ) : null}
        {nights && !count ? (
          <View style={styles.overlay} pointerEvents="none">
            <Text variant="heading" style={styles.center}>
              The first star is waiting
            </Text>
            <Text tone="mist" style={styles.center}>
              Read for a few minutes tonight and it appears here.
            </Text>
          </View>
        ) : null}
      </View>

      {!loading ? (
        <Ignite>{book ? <InHand book={book} pace={pace} /> : <NoBook />}</Ignite>
      ) : (
        <View style={styles.placeholder} />
      )}

      {path ? (
        <Section title="Your constellation">
          <PathGlance path={path} shelf={shelf ?? []} />
        </Section>
      ) : null}

      <Section title="This week">
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the Moon Log"
          haptic={false}
          onPress={() => router.push('/moonlog')}
          style={styles.week}>
          <WeekStrip week={week} today={today} />
          <Text variant="caption">{weekMessage(week)}</Text>
          {pace.minutesThisWeek || pace.pagesThisWeek ? (
            <View style={styles.stats}>
              <Stat value={pace.minutesThisWeek} label="minutes" />
              <Stat value={pace.pagesThisWeek} label={pace.pagesThisWeek === 1 ? 'page' : 'pages'} />
              {pace.pagesPerWeek ? <Stat value={pace.pagesPerWeek} label="pages a week, lately" /> : null}
            </View>
          ) : null}
        </Pressable>
      </Section>

      {others.length ? (
        <Section title="Also reading">
          {others.map((b) => (
            <BookRow
              key={b.id}
              title={b.title}
              author={b.author}
              coverUrl={b.coverUrl}
              caption={bookCaption(b)}
              onPress={() => router.push({ pathname: '/book/[id]', params: { id: b.id } })}
            />
          ))}
        </Section>
      ) : null}

      {stats && count ? (
        <Section title="All your nights">
          <View style={[styles.stats, styles.allTime]}>
            <Stat value={stats.nightsRead} label={stats.nightsRead === 1 ? 'night' : 'nights'} />
            <Stat value={stats.minutesRead} label="minutes" />
            <Stat value={stats.booksFinished} label={stats.booksFinished === 1 ? 'book' : 'books'} />
            <Stat value={stats.stardust} label="stardust" />
          </View>
        </Section>
      ) : null}
    </Screen>
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
          size={104}
          brightness={starBrightness(bookCompletion(progress), !!book.startedAt)}
          beads={beads}
          lit={lit}
        />
        <View style={styles.inHandText}>
          <Text variant="caption">In your hands</Text>
          <Text variant="heading" numberOfLines={2}>
            {book.title}
          </Text>
          <Text tone="mist">{bookCaption(book)}</Text>
          {toGo ? <Text variant="caption">{toGo}</Text> : null}
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

function NoBook() {
  return (
    <View style={styles.block}>
      <View style={styles.inHand}>
        <BookStar size={104} brightness={0} beads={12} lit={0} accessibilityLabel="An unlit star" />
        <View style={styles.inHandText}>
          <Text variant="heading">Which book is in your hands?</Text>
          <Text tone="mist">Scan its barcode and its star joins your sky.</Text>
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
            height={96}
          />
        ) : null}
      </View>
      <Text variant="heading">{path.title}</Text>
      <Text variant="caption">{caption}</Text>
    </Pressable>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="title">{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { aspectRatio: 1.25, justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
  },
  center: { textAlign: 'center' },
  placeholder: { height: 180 },
  block: { gap: space.lg },
  inHand: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  inHandText: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: space.md },
  action: { flex: 1 },
  path: { gap: space.xs, paddingTop: space.md },
  pathSky: { height: 96 },
  week: { gap: space.md, paddingTop: space.lg },
  stats: { flexDirection: 'row', gap: space.xl },
  allTime: { justifyContent: 'space-between', paddingTop: space.md },
  stat: { gap: 2, flexShrink: 1 },
});
