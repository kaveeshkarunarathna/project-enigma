import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageStepper } from '@/components/PageStepper';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { whisper } from '@/components/motion/Whisper';
import { getBook } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { deleteSession, getSession, updateSession, type SessionWithBook } from '@/data/sessions';
import type { Book } from '@/data/books';
import { clockTime, nightTitle } from '@/domain/nights';
import { space } from '@/theme/tokens';

/**
 * Fix a session: how long it really was, and the page the reader stopped
 * on. Or delete it. The moon, star and constellation follow.
 */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const { data: session, loading } = useLiveQuery(() => getSession(db, id), ['sessions', 'books'], [id]);
  const { data: book } = useLiveQuery(
    () => (session?.bookId ? getBook(db, session.bookId) : Promise.resolve(null)),
    ['books'],
    [session?.bookId],
  );

  if (!session) {
    return (
      <Screen back title="Session">
        {!loading ? <EmptyState heading="This session is gone" body="It may have been deleted." /> : null}
      </Screen>
    );
  }
  // Keyed, so the form starts again from the saved values after a change.
  return <SessionForm key={`${session.seconds}:${session.pageTo}`} session={session} book={book ?? null} />;
}

function SessionForm({ session, book }: { session: SessionWithBook; book: Book | null }) {
  const db = useDb();
  const [minutes, setMinutes] = useState(String(Math.round(session.seconds / 60)));
  const [page, setPage] = useState(session.pageTo ?? 0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const from = session.pageFrom ?? 0;
  const mins = parseInt(minutes.replace(/\D/g, ''), 10);
  const validMinutes = Number.isFinite(mins) && mins >= 0 && mins <= 24 * 60;
  const changed = mins !== Math.round(session.seconds / 60) || page !== (session.pageTo ?? 0);

  async function save() {
    if (!validMinutes) return;
    setBusy(true);
    try {
      await updateSession(db, session.id, { seconds: mins * 60, pageTo: page > 0 ? page : null });
      whisper('Your night is updated');
      router.back();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteSession(db, session.id);
      whisper('That session is gone from your night', { haptic: false });
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      back
      title={session.bookTitle ?? 'Reading'}
      caption={`${nightTitle(session.night)}, from ${clockTime(session.startedAt)}`}>
      <TextField
        label="Minutes read"
        value={minutes}
        onChangeText={setMinutes}
        keyboardType="number-pad"
        note={validMinutes ? null : 'A number of minutes, up to a whole day.'}
      />

      {book ? <PageStepper value={page} onChange={setPage} from={from} total={book.pageCount} /> : null}

      <View style={styles.actions}>
        <Button label="Save the change" onPress={save} disabled={!changed || !validMinutes || busy} />
      </View>

      <View style={styles.danger}>
        {confirming ? (
          <>
            <Text tone="mist">
              Delete this session? Its minutes and pages leave your moon and stars. Nothing else changes.
            </Text>
            <View style={styles.actions}>
              <Button kind="quiet" label="Delete it" onPress={remove} disabled={busy} />
              <Button kind="quiet" label="Keep it" onPress={() => setConfirming(false)} />
            </View>
          </>
        ) : (
          <View style={styles.actions}>
            <Button kind="quiet" label="Delete this session" onPress={() => setConfirming(true)} />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  danger: { gap: space.md, paddingTop: space.xl },
});
