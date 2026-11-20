import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { BookCover } from '@/components/BookCover';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Hairline } from '@/components/Hairline';
import { IconButton } from '@/components/IconButton';
import { ArrowDownIcon, ArrowUpIcon, XIcon } from '@/components/icons';
import { Pressable } from '@/components/Pressable';
import { goBack, Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Constellation } from '@/components/sky/Constellation';
import { Text } from '@/components/Text';
import { listBooks, type Book } from '@/data/books';
import { findClassic } from '@/content/classics';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import {
  deleteUserPath,
  getPath,
  joinPath,
  moveBookInUserPath,
  removeBookFromUserPath,
  type PathBook,
  type ReadingPathWithBooks,
} from '@/data/paths';
import { matchShelfBook, pathProgress, type PathStarState } from '@/domain/paths';
import { addPathBookToShelf } from '@/features/paths/addPathBook';
import { GENRE_LABEL } from '@/features/paths/genres';
import { space } from '@/theme/tokens';

const STATE_LABEL: Record<PathStarState, string> = {
  finished: 'Finished',
  reading: 'Reading now',
  shelf: 'On your shelf',
  none: '',
};

export default function PathScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const { data: path, loading } = useLiveQuery(() => getPath(db, id), ['paths'], [id]);
  const { data: shelf } = useLiveQuery(() => listBooks(db), ['books']);
  const [width, setWidth] = useState(0);

  if (!path) {
    return (
      <Screen back title="Path">
        {!loading ? <EmptyState heading="This path is gone" body="It may have been deleted." /> : null}
      </Screen>
    );
  }

  const progress = pathProgress(path.books, shelf ?? []);
  const mine = path.source === 'user';
  const following = mine || !!path.joinedAt;
  const nextIndex = progress.states.findIndex((s) => s !== 'finished');

  return (
    <Screen back title={path.title} caption={path.subtitle ?? (mine ? 'Your own path' : undefined)}>
      {path.books.length ? (
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.sky}>
          {width ? (
            <Constellation
              pathId={path.id}
              states={progress.states}
              fills={progress.fills}
              width={width}
              height={180}
              focus={following && nextIndex >= 0 ? nextIndex : null}
              accessibilityLabel={`Constellation of ${progress.total} stars, ${progress.finished} lit, ${Math.floor(progress.fraction * 100)}% of the way`}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.summary}>
        {progress.complete ? (
          <Text variant="heading" tone="aurora">
            The constellation is complete.
          </Text>
        ) : null}
        <Text variant="caption">
          {[
            path.genre ? GENRE_LABEL[path.genre] : null,
            `${progress.total} ${progress.total === 1 ? 'book' : 'books'}`,
            progress.finished ? `${progress.finished} finished` : null,
            !progress.complete && progress.fraction > 0
              ? `${Math.max(1, Math.floor(progress.fraction * 100))}% of the constellation lit`
              : null,
          ]
            .filter(Boolean)
            .join(', ')}
        </Text>
        {path.description ? <Text tone="mist">{path.description}</Text> : null}
      </View>

      {!following ? <Button label="Follow this path" onPress={() => joinPath(db, path.id, true)} /> : null}

      <Section title={mine ? 'Your books, in order' : 'The books, in order'}>
        {!path.books.length ? (
          <Text tone="mist" style={styles.pad}>
            No books yet. Add the first one below.
          </Text>
        ) : null}
        {path.books.map((b, i) => (
          <View key={`${b.position}:${b.title}`}>
            {i > 0 ? <Hairline /> : null}
            <PathBookRow
              path={path}
              entry={b}
              index={i}
              shelfBook={matchShelfBook(b, shelf ?? [])}
              state={progress.states[i]}
            />
          </View>
        ))}
      </Section>

      <View style={styles.links}>
        {mine ? (
          <>
            <TextLink
              label="Add a book"
              tone="aurora"
              onPress={() => router.push({ pathname: '/search', params: { pathId: path.id } })}
            />
            <TextLink
              label="Rename or describe"
              onPress={() => router.push({ pathname: '/paths/new', params: { id: path.id } })}
            />
            <TextLink
              label="Delete this path"
              onPress={() =>
                Alert.alert('Delete this path?', 'Your books stay on your shelf.', [
                  { text: 'Keep it', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteUserPath(db, path.id);
                      goBack();
                    },
                  },
                ])
              }
            />
          </>
        ) : following ? (
          <TextLink label="Stop following" onPress={() => joinPath(db, path.id, false)} />
        ) : null}
      </View>
    </Screen>
  );
}

function PathBookRow({
  path,
  entry,
  index,
  shelfBook,
  state,
}: {
  path: ReadingPathWithBooks;
  entry: PathBook;
  index: number;
  shelfBook: Book | null;
  state: PathStarState;
}) {
  const db = useDb();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = path.source === 'user';
  const classic = findClassic(entry.title, entry.author);

  async function add(status: 'reading' | 'want') {
    setBusy(true);
    try {
      if (!path.joinedAt && path.source === 'curated') await joinPath(db, path.id, true);
      const book = await addPathBookToShelf(db, entry, status);
      setOpen(false);
      if (status === 'reading') router.push({ pathname: '/book/[id]', params: { id: book.id } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.bookRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${index + 1}. ${entry.title}${entry.author ? `, ${entry.author}` : ''}. ${STATE_LABEL[state]}`}
        accessibilityHint={shelfBook ? 'Opens the book' : 'Shows ways to add it to your shelf'}
        haptic={false}
        onPress={() =>
          shelfBook
            ? router.push({ pathname: '/book/[id]', params: { id: shelfBook.id } })
            : setOpen((o) => !o)
        }
        style={styles.bookMain}>
        <BookCover uri={shelfBook?.coverUrl ?? entry.coverUrl} title={entry.title} width={44} />
        <View style={styles.bookText}>
          <Text variant="heading" numberOfLines={2}>
            {entry.title}
          </Text>
          {entry.author ? <Text tone="mist">{entry.author}</Text> : null}
          {entry.note ? <Text variant="caption">{entry.note}</Text> : null}
          {state !== 'none' ? (
            <Text variant="caption" tone={state === 'finished' ? 'aurora' : 'starlight'}>
              {STATE_LABEL[state]}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {mine ? (
        <View style={styles.tools}>
          <IconButton
            icon={ArrowUpIcon}
            label={`Move ${entry.title} up`}
            tone="mist"
            size={18}
            onPress={() => moveBookInUserPath(db, path.id, index, index - 1)}
          />
          <IconButton
            icon={ArrowDownIcon}
            label={`Move ${entry.title} down`}
            tone="mist"
            size={18}
            onPress={() => moveBookInUserPath(db, path.id, index, index + 1)}
          />
          <IconButton
            icon={XIcon}
            label={`Remove ${entry.title} from this path`}
            tone="mist"
            size={18}
            onPress={() => removeBookFromUserPath(db, path.id, entry.position)}
          />
        </View>
      ) : null}
      {open && !shelfBook ? (
        <View style={styles.choices}>
          {classic ? (
            <Button
              label="Read it here, free"
              accessibilityHint="A public-domain book you can read in the app"
              onPress={() => router.push({ pathname: '/classics/[id]', params: { id: classic.id } })}
            />
          ) : (
            <Button label="Start reading" onPress={() => add('reading')} disabled={busy} />
          )}
          {classic ? (
            <Button kind="quiet" label="I have a copy" onPress={() => add('reading')} disabled={busy} />
          ) : null}
          <Button kind="quiet" label="Want to read" onPress={() => add('want')} disabled={busy} />
        </View>
      ) : null}
    </View>
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
  sky: { height: 180 },
  summary: { gap: space.sm },
  pad: { paddingVertical: space.md },
  bookRow: { paddingVertical: space.md, gap: space.md },
  bookMain: { flexDirection: 'row', gap: space.lg },
  bookText: { flex: 1, gap: 2 },
  tools: { flexDirection: 'row', justifyContent: 'flex-end' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  links: { gap: 0 },
  link: { paddingVertical: space.md, alignSelf: 'flex-start' },
});
