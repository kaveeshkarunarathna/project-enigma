import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BookRow } from '@/components/BookRow';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { NightSky } from '@/components/sky/NightSky';
import { Text } from '@/components/Text';
import { listBooks } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { readingNights, skyStats } from '@/data/sessions';
import { DEFAULT_SETTINGS, getSettings } from '@/data/settings';
import { bookCaption } from '@/features/books/format';

export default function SkyScreen() {
  const db = useDb();
  const [width, setWidth] = useState(0);
  const { data: nights } = useLiveQuery(() => readingNights(db), ['sessions']);
  const { data: stats } = useLiveQuery(() => skyStats(db), ['sessions', 'books']);
  const { data: settings } = useLiveQuery(() => getSettings(db), ['settings']);
  const { data: finished } = useLiveQuery(() => listBooks(db, 'finished'), ['books']);
  const count = nights?.length ?? 0;

  return (
    <Screen
      title="Your sky"
      caption={
        count
          ? `${count} ${count === 1 ? 'star' : 'stars'}, one for every night you read. Nothing here goes dark.`
          : 'Every night you read adds a star. Nothing here ever goes dark.'
      }>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.sky}>
        {width && nights ? (
          <NightSky
            nights={nights}
            width={width}
            height={width}
            goalMinutes={(settings ?? DEFAULT_SETTINGS).goalMinutes}
          />
        ) : null}
        {nights && !count ? (
          <View style={styles.emptyOverlay}>
            <EmptyState
              heading="The first star is waiting"
              body="Read for a few minutes tonight and it will appear here."
              action={<Button label="Read now" onPress={() => router.push('/lamp')} />}
            />
          </View>
        ) : null}
      </View>

      {stats && count ? (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the Moon Log"
          haptic={false}
          onPress={() => router.push('/moonlog')}>
          <View style={styles.stats}>
            <Stat value={stats.nightsRead} label={stats.nightsRead === 1 ? 'night' : 'nights'} />
            <Stat value={stats.minutesRead} label="minutes" />
            <Stat value={stats.booksFinished} label={stats.booksFinished === 1 ? 'book' : 'books'} />
            <Stat value={stats.stardust} label="stardust" />
          </View>
        </Pressable>
      ) : null}

      {finished?.length ? (
        <Section title="Stars that ignited">
          {finished.map((b) => (
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="title">{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { aspectRatio: 1, justifyContent: 'center' },
  emptyOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { gap: 2 },
});
