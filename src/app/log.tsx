import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { PageStepper } from '@/components/PageStepper';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { whisper } from '@/components/motion/Whisper';
import { currentBook, getBook, setBookStatus } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { logSession } from '@/data/sessions';
import { addDays, nightKey, parseNightKey } from '@/domain/time';
import { BookPicker } from '@/features/journal/BookPicker';
import { space } from '@/theme/tokens';

const MINUTES = [5, 10, 15, 20, 30, 45, 60] as const;

/**
 * Log a reading session that happened without the Lamp: how long, and which
 * page the reader got to. It fills the same moon, star and constellation as a
 * timed session.
 */
export default function LogScreen() {
  const db = useDb();
  const params = useLocalSearchParams<{ bookId?: string }>();
  const [bookId, setBookId] = useState<string | null>(params.bookId || null);
  const [when, setWhen] = useState<'tonight' | 'last'>('tonight');
  const [minutes, setMinutes] = useState<number | null>(null);
  // The page the reader typed, for the book it was typed for; otherwise the book's own page.
  const [edit, setEdit] = useState<{ id: string; page: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // With no book given, start on the book being read.
  useEffect(() => {
    if (params.bookId) return;
    currentBook(db).then((b) => b && setBookId((id) => id ?? b.id));
  }, [db, params.bookId]);

  const { data: book } = useLiveQuery(
    () => (bookId ? getBook(db, bookId) : Promise.resolve(null)),
    ['books'],
    [bookId],
  );
  const from = book?.currentPage ?? 0;

  const page = edit && edit.id === book?.id ? edit.page : from;
  const setPage = (p: number) => book && setEdit({ id: book.id, page: p });

  const pages = Math.max(0, page - from);
  const canSave = !!minutes && !busy;

  async function save() {
    if (!minutes) return;
    setBusy(true);
    try {
      const night = when === 'tonight' ? nightKey() : addDays(nightKey(), -1);
      // Tonight's session ends now; last night's is placed in the evening of that night.
      const endedAt = when === 'tonight' ? new Date() : evening(night);
      const startedAt = new Date(endedAt.getTime() - minutes * 60_000);
      await logSession(db, {
        bookId,
        startedAt,
        endedAt,
        seconds: minutes * 60,
        pageTo: book && page > from ? page : null,
      });
      if (book?.pageCount && page >= book.pageCount && book.status !== 'finished') {
        await setBookStatus(db, book.id, 'finished');
        router.replace({ pathname: '/ignite', params: { bookId: book.id } });
      } else {
        whisper(when === 'tonight' ? "Tonight's star is in your sky" : "Last night's star is in your sky");
        router.back();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      back
      title="Log reading"
      caption="For reading without the lamp. It fills the same moon and stars.">
      <View style={styles.field}>
        <Text variant="label">Book</Text>
        <BookPicker value={bookId} onChange={setBookId} />
      </View>

      <View style={styles.field}>
        <Text variant="label">When</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          <Chip label="Tonight" selected={when === 'tonight'} onPress={() => setWhen('tonight')} />
          <Chip label="Last night" selected={when === 'last'} onPress={() => setWhen('last')} />
        </View>
      </View>

      <View style={styles.field}>
        <Text variant="label">About how long</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {MINUTES.map((m) => (
            <Chip
              key={m}
              label={`${m} min`}
              accessibilityLabel={`${m} minutes`}
              selected={minutes === m}
              onPress={() => setMinutes(m)}
            />
          ))}
        </View>
      </View>

      {book ? <PageStepper value={page} onChange={setPage} from={from} total={book.pageCount} /> : null}

      <Text variant="caption">
        {minutes
          ? `${minutes} minutes${pages ? ` and ${pages} ${pages === 1 ? 'page' : 'pages'}` : ''} for ${
              when === 'tonight' ? 'tonight' : 'last night'
            }.`
          : 'Choose about how long you read.'}
      </Text>
      <View style={styles.action}>
        <Button label="Save to the sky" onPress={save} disabled={!canSave} />
      </View>
    </Screen>
  );
}

/** 9 PM on the evening of a night key. */
function evening(night: string): Date {
  const d = parseNightKey(night);
  d.setHours(21, 0, 0, 0);
  return d;
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  action: { alignSelf: 'flex-start' },
});
