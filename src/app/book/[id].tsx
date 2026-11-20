import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { BookCover } from '@/components/BookCover';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Pressable } from '@/components/Pressable';
import { goBack, Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { PageTrail } from '@/components/sky/PageTrail';
import { Hairline } from '@/components/Hairline';
import { Stat } from '@/components/Stat';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { deleteBook, getBook, setBookStatus, updateBook, type Book } from '@/data/books';
import { getClassicTextForBook } from '@/data/classics';
import { useDb } from '@/data/DataProvider';
import { findClassic } from '@/content/classics';
import { useLiveQuery } from '@/data/live';
import { listEntries } from '@/data/journal';
import { listSessions, type Session } from '@/data/sessions';
import { bookCaption, formatYear } from '@/features/books/format';
import { nightTitle, pageSeries } from '@/domain/nights';
import { bookCompletion } from '@/domain/progress';
import { EntryItem } from '@/features/journal/EntryItem';
import { SessionRow } from '@/features/sessions/SessionRow';
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
  const [editing, setEditing] = useState(false);
  const [more, setMore] = useState(false);

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
  const nights = new Set((sessions ?? []).map((x) => x.night)).size;
  const progress = { ...book, finished: book.status === 'finished' };

  return (
    <Screen
      back
      title={book.title}
      caption={[book.author, book.firstPublished ? formatYear(book.firstPublished) : null]
        .filter(Boolean)
        .join(', ')}>
      <View style={styles.hero}>
        <BookCover uri={book.coverUrl} title={book.title} width={96} />
        <View style={styles.heroText}>
          {bookCaption(book) ? <Text variant="label">{bookCaption(book)}</Text> : null}
          <View style={styles.stats}>
            <Stat value={Math.round(bookCompletion(progress) * 100)} label="% read" />
            <Stat value={nights} label={nights === 1 ? 'night' : 'nights'} />
            <Stat value={minutes} label="min" />
          </View>
        </View>
      </View>

      <PrimaryAction book={book} />

      {sessions?.length ? <History book={book} sessions={sessions} /> : null}

      <BookJournal book={book} />

      <Section title="This book">
        <View style={styles.links}>
          {book.format !== 'classic' ? (
            // Classics read in the app track their chapters on their own.
            <TextLink
              label={editing ? 'Close progress' : 'Edit pages and chapters'}
              onPress={() => setEditing((e) => !e)}
            />
          ) : null}
          {editing && book.format !== 'classic' ? (
            <ProgressEditor
              key={`${book.currentPage}:${book.pageCount}:${book.chaptersDone}:${book.chapterCount}`}
              book={book}
            />
          ) : null}
          <TextLink label={more ? 'Fewer options' : 'More options'} onPress={() => setMore((m) => !m)} />
        </View>
        {more ? (
        <View style={styles.links}>
          {book.status !== 'want' && book.status !== 'finished' ? (
            <TextLink
              label="Mark as finished"
              onPress={async () => {
                await setBookStatus(db, book.id, 'finished');
                router.push({ pathname: '/ignite', params: { bookId: book.id } });
              }}
            />
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
        ) : null}
      </Section>
    </Screen>
  );
}

const JOURNAL_ROWS = 3;

/** What the reader kept from this book: quotes first-class, plus one-tap ways to add more. */
function BookJournal({ book }: { book: Book }) {
  const db = useDb();
  const [all, setAll] = useState(false);
  const { data: entries } = useLiveQuery(() => listEntries(db, { bookId: book.id }), ['journal'], [book.id]);
  const list = entries ?? [];
  const shown = all ? list : list.slice(0, JOURNAL_ROWS);
  return (
    <Section
      title="Your journal">
      <View style={styles.journalLinks}>
        <TextLink
          label="Scan a quote"
          tone="aurora"
          onPress={() => router.push({ pathname: '/scan', params: { auto: '1', bookId: book.id } })}
        />
        <TextLink
          label="Write a note"
          onPress={() =>
            router.push({ pathname: '/journal/write', params: { kind: 'note', bookId: book.id } })
          }
        />
      </View>
      {shown.map((e, i) => (
        <View key={e.id}>
          {i > 0 ? <Hairline /> : null}
          <EntryItem entry={e} />
        </View>
      ))}
      {!all && list.length > JOURNAL_ROWS ? (
        <TextLink label={`Show all ${list.length}`} onPress={() => setAll(true)} />
      ) : null}
    </Section>
  );
}

const HISTORY_ROWS = 3;

/** Every session with this book: its pages over time, then the sittings, newest first. */
function History({ book, sessions }: { book: Book; sessions: Session[] }) {
  const [width, setWidth] = useState(0);
  const [all, setAll] = useState(false);
  const series = pageSeries([...sessions].reverse());
  const shown = all ? sessions : sessions.slice(0, HISTORY_ROWS);
  const first = series[0];
  const last = series[series.length - 1];
  return (
    <Section title="Recent nights">
      {series.length >= 2 ? (
        <View style={styles.trail} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width ? (
            <PageTrail
              points={series}
              total={book.pageCount}
              width={width}
              height={88}
              accessibilityLabel={`Pages over time: page ${first.page} on ${nightTitle(first.night)}, page ${last.page} on ${nightTitle(last.night)}.`}
            />
          ) : null}
          <View style={styles.trailEnds}>
            <Text variant="caption">{nightTitle(first.night)}</Text>
            <Text variant="caption">{nightTitle(last.night)}</Text>
          </View>
        </View>
      ) : null}
      {shown.map((s, i) => (
        <View key={s.id}>
          {i > 0 ? <Hairline /> : null}
          <SessionRow session={s} title={nightTitle(s.night)} />
        </View>
      ))}
      {!all && sessions.length > HISTORY_ROWS ? (
        <TextLink label={`Show all ${sessions.length}`} onPress={() => setAll(true)} />
      ) : null}
    </Section>
  );
}

function PrimaryAction({ book }: { book: Book }) {
  const db = useDb();
  const { data: text } = useLiveQuery(() => getClassicTextForBook(db, book.id), ['classics'], [book.id]);
  const classic = book.format === 'classic' ? findClassic(book.title, book.author) : null;
  const classicId = text?.classicId ?? classic?.id;
  if (classicId) {
    // A public-domain classic is read here, in the app, where time counts on its own.
    return (
      <View style={styles.primary}>
        <Button
          label={
            book.status === 'finished'
              ? 'Open the book'
              : text?.chaptersRead
                ? 'Keep reading'
                : 'Start reading'
          }
          accessibilityHint="Opens the book in the reader"
          onPress={() => router.push({ pathname: '/classics/[id]', params: { id: classicId } })}
        />
      </View>
    );
  }
  if (book.status === 'finished') return null;
  return (
    <View style={styles.actions}>
      <View style={styles.action}>
        <Button
          label="Light the lamp"
          accessibilityHint="Opens the reading lamp for this book"
          onPress={() => router.push({ pathname: '/lamp', params: { bookId: book.id } })}
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

function TextLink({
  label,
  onPress,
  tone = 'mist',
}: {
  label: string;
  onPress: () => void;
  tone?: 'mist' | 'aurora';
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Text tone={tone}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trail: { gap: space.xs, paddingTop: space.md },
  journalLinks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg },
  trailEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  hero: { flexDirection: 'row', gap: space.xl, alignItems: 'center' },
  heroText: { flex: 1, gap: space.md },
  stats: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  actions: { flexDirection: 'row', gap: space.md },
  action: { flex: 1 },
  primary: { alignSelf: 'stretch' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingTop: space.md },
  cell: { width: '47%', flexGrow: 1 },
  saveRow: { paddingTop: space.lg, alignSelf: 'flex-start' },
  links: { paddingTop: space.xs },
  link: { paddingVertical: space.md, alignSelf: 'flex-start' },
});
