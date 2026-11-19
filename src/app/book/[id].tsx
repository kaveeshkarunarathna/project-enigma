import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { BookCover } from '@/components/BookCover';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Pressable } from '@/components/Pressable';
import { goBack, Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { deleteBook, getBook, setBookStatus, updateBook, type Book } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { listSessions } from '@/data/sessions';
import { bookCaption, formatYear } from '@/features/books/format';
import { bookCompletion, litBeads, ringSize } from '@/domain/progress';
import { space } from '@/theme/tokens';

function toCount(text: string): number | null {
  const n = parseInt(text.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const { data: book, loading } = useLiveQuery(() => getBook(db, id), ['books'], [id]);
  const { data: sessions } = useLiveQuery(() => listSessions(db, { bookId: id }), ['sessions'], [id]);

  if (!book) {
    return (
      <Screen back title="Book">
        {!loading ? (
          <EmptyState heading="This book is no longer on your shelf" body="It may have been removed." />
        ) : null}
      </Screen>
    );
  }

  const minutes = Math.floor((sessions ?? []).reduce((s, x) => s + x.seconds, 0) / 60);
  const progress = { ...book, finished: book.status === 'finished' };

  return (
    <Screen
      back
      title={book.title}
      caption={[book.author, book.firstPublished ? formatYear(book.firstPublished) : null]
        .filter(Boolean)
        .join(', ')}>
      <View style={styles.hero}>
        <BookCover uri={book.coverUrl} title={book.title} width={120} />
        <View style={styles.heroText}>
          <Text variant="caption">{bookCaption(book) ?? ''}</Text>
          <Text>
            {litBeads(progress)} of {ringSize(book)} ring lights
          </Text>
          <Text tone="mist">{Math.round(bookCompletion(progress) * 100)}% read</Text>
          <Text tone="mist">
            {book.stardust} stardust, {minutes} {minutes === 1 ? 'minute' : 'minutes'}
          </Text>
        </View>
      </View>

      <PrimaryAction book={book} />

      <ProgressEditor
        key={`${book.currentPage}:${book.pageCount}:${book.chaptersDone}:${book.chapterCount}`}
        book={book}
      />

      <Section title="Shelf">
        <View style={styles.links}>
          {book.status !== 'want' && book.status !== 'finished' ? (
            <TextLink label="Mark as finished" onPress={() => setBookStatus(db, book.id, 'finished')} />
          ) : null}
          {book.status === 'reading' ? (
            <TextLink label="Rest this book for now" onPress={() => setBookStatus(db, book.id, 'paused')} />
          ) : null}
          {book.status === 'finished' ? (
            <TextLink label="Read it again" onPress={() => setBookStatus(db, book.id, 'reading')} />
          ) : null}
          {book.status !== 'want' ? (
            <TextLink label="Move to want to read" onPress={() => setBookStatus(db, book.id, 'want')} />
          ) : null}
          <TextLink
            label="Remove from shelf"
            onPress={() =>
              Alert.alert(
                'Remove this book?',
                'Its reading sessions stay in your Moon Log. Journal entries keep their words.',
                [
                  { text: 'Keep it', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteBook(db, book.id);
                      goBack();
                    },
                  },
                ],
              )
            }
          />
        </View>
      </Section>
    </Screen>
  );
}

function PrimaryAction({ book }: { book: Book }) {
  if (book.status === 'finished') return null;
  return (
    <View style={styles.primary}>
      <Button
        label="Read now"
        accessibilityHint="Opens the reading lamp for this book"
        onPress={() => router.push({ pathname: '/lamp', params: { bookId: book.id } })}
      />
    </View>
  );
}

function ProgressEditor({ book }: { book: Book }) {
  const db = useDb();
  const [page, setPage] = useState(String(book.currentPage || ''));
  const [pages, setPages] = useState(String(book.pageCount ?? ''));
  const [chapters, setChapters] = useState(String(book.chapterCount ?? ''));
  const [done, setDone] = useState(String(book.chaptersDone || ''));
  const [saved, setSaved] = useState(false);

  async function save() {
    const pageCount = toCount(pages);
    const chapterCount = toCount(chapters);
    await updateBook(db, book.id, {
      pageCount: pageCount || null,
      chapterCount: chapterCount || null,
      currentPage: Math.min(toCount(page) ?? 0, pageCount || Number.MAX_SAFE_INTEGER),
      chaptersDone: Math.min(toCount(done) ?? 0, chapterCount || Number.MAX_SAFE_INTEGER),
    });
    setSaved(true);
  }

  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setSaved(false);
  };

  return (
    <Section title="Where you are">
      <View style={styles.grid}>
        <View style={styles.cell}>
          <TextField
            label="Current page"
            value={page}
            onChangeText={edit(setPage)}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.cell}>
          <TextField
            label="Total pages"
            value={pages}
            onChangeText={edit(setPages)}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.cell}>
          <TextField
            label="Chapters done"
            value={done}
            onChangeText={edit(setDone)}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.cell}>
          <TextField
            label="Total chapters"
            value={chapters}
            onChangeText={edit(setChapters)}
            keyboardType="number-pad"
          />
        </View>
      </View>
      <View style={styles.saveRow}>
        <Button kind="quiet" label={saved ? 'Saved' : 'Save progress'} onPress={save} disabled={saved} />
      </View>
    </Section>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Text tone="mist">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: space.xl, alignItems: 'flex-end' },
  heroText: { flex: 1, gap: space.xs },
  primary: { alignSelf: 'stretch' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingTop: space.md },
  cell: { width: '47%', flexGrow: 1 },
  saveRow: { paddingTop: space.lg, alignSelf: 'flex-start' },
  links: { paddingTop: space.xs },
  link: { paddingVertical: space.md, alignSelf: 'flex-start' },
});
