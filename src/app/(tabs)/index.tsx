import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { BookRow } from '@/components/BookRow';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { BookBookmarkIcon, GearIcon } from '@/components/icons';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { BookStar } from '@/components/sky/BookStar';
import { Ignite } from '@/components/sky/Ignite';
import { WeekStrip } from '@/components/sky/WeekStrip';
import { Text } from '@/components/Text';
import { findClassic } from '@/content/classics';
import { currentBook, listBooks, type Book } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { weekMessage } from '@/domain/moonlog';
import { bookCompletion, litBeads, ringSize, starBrightness } from '@/domain/progress';
import { bookCaption } from '@/features/books/format';
import { useThisWeek } from '@/features/moonlog/useMoonLog';
import { space } from '@/theme/tokens';

/**
 * Tonight: one hero (the star of the book you are reading), one starlight
 * button, this week's moons, and anything else you are reading.
 */
export default function TonightScreen() {
  const db = useDb();
  const { width } = useWindowDimensions();
  const { data: book, loading } = useLiveQuery(() => currentBook(db), ['books', 'sessions']);
  const { data: reading } = useLiveQuery(() => listBooks(db, 'reading'), ['books']);
  const others = (reading ?? []).filter((b) => b.id !== book?.id);
  const { week, today } = useThisWeek();
  const starSize = Math.min(width - space.gutter * 2, 300);

  return (
    <Screen
      title="Tonight"
      caption="A few quiet pages are enough."
      accessory={
        <View style={styles.accessory}>
          <IconButton icon={BookBookmarkIcon} label="Your shelf" onPress={() => router.push('/shelf')} />
          <IconButton icon={GearIcon} label="Settings" tone="mist" onPress={() => router.push('/settings')} />
        </View>
      }>
      {!loading ? (
        <Ignite>{book ? <Hero book={book} size={starSize} /> : <DarkSky size={starSize} />}</Ignite>
      ) : (
        <View style={{ height: starSize + 160 }} />
      )}

      <Section title="This week">
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the Moon Log"
          haptic={false}
          onPress={() => router.push('/moonlog')}
          style={styles.week}>
          <WeekStrip week={week} today={today} />
          <Text variant="caption">{weekMessage(week)}</Text>
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
    </Screen>
  );
}

function Hero({ book, size }: { book: Book; size: number }) {
  const progress = { ...book, finished: book.status === 'finished' };
  const lit = litBeads(progress);
  const beads = ringSize(book);
  const classic = book.format === 'classic' ? findClassic(book.title, book.author) : null;
  return (
    <View style={styles.hero}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${book.title}. ${lit} of ${beads} ring lights.`}
        accessibilityHint="Opens the book"
        haptic={false}
        onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } })}>
        <BookStar
          size={size}
          brightness={starBrightness(bookCompletion(progress), !!book.startedAt)}
          beads={beads}
          lit={lit}
        />
      </Pressable>
      <View style={styles.heroText}>
        <Text variant="heading" style={styles.centerText} numberOfLines={2}>
          {book.title}
        </Text>
        {book.author ? (
          <Text tone="mist" style={styles.centerText}>
            {book.author}
          </Text>
        ) : null}
        <Text variant="caption" style={styles.centerText}>
          {bookCaption(book)}
        </Text>
      </View>
      <View style={styles.cta}>
        <Button
          label="Read now"
          accessibilityHint={classic ? 'Opens the book in the reader' : 'Opens the reading lamp'}
          onPress={() =>
            classic
              ? router.push({ pathname: '/classics/[id]', params: { id: classic.id } })
              : router.push({ pathname: '/lamp', params: { bookId: book.id } })
          }
        />
      </View>
    </View>
  );
}

function DarkSky({ size }: { size: number }) {
  return (
    <View style={styles.hero}>
      <BookStar size={size} brightness={0} beads={12} lit={0} accessibilityLabel="An unlit star" />
      <View style={styles.heroText}>
        <Text variant="heading" style={styles.centerText}>
          Your sky is still dark
        </Text>
        <Text tone="mist" style={styles.centerText}>
          Choose a first book and light your first star. It can be a short one.
        </Text>
      </View>
      <View style={styles.cta}>
        <Button label="Find a book" onPress={() => router.push('/search')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accessory: { flexDirection: 'row' },
  hero: { alignItems: 'center', gap: space.lg },
  heroText: { alignItems: 'center', gap: space.xs, paddingHorizontal: space.lg },
  centerText: { textAlign: 'center' },
  cta: { alignSelf: 'stretch' },
  week: { gap: space.md, paddingTop: space.lg },
});
