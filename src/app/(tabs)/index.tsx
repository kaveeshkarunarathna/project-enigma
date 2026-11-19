import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BookRow } from '@/components/BookRow';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { BookBookmarkIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { currentBook, listBooks } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { bookCaption } from '@/features/books/format';
import { space } from '@/theme/tokens';

export default function TonightScreen() {
  const db = useDb();
  const { data: book, loading } = useLiveQuery(() => currentBook(db), ['books', 'sessions']);
  const { data: reading } = useLiveQuery(() => listBooks(db, 'reading'), ['books']);
  const others = (reading ?? []).filter((b) => b.id !== book?.id);

  return (
    <Screen
      title="Tonight"
      caption="A few quiet pages are enough."
      accessory={
        <IconButton icon={BookBookmarkIcon} label="Your shelf" onPress={() => router.push('/shelf')} />
      }>
      {!loading && !book ? (
        <EmptyState
          heading="Your sky is still dark"
          body="Choose a first book and light your first star. It can be a short one."
          action={<Button label="Find a book" onPress={() => router.push('/search')} />}
        />
      ) : null}

      {book ? (
        <View style={styles.current}>
          <BookRow
            title={book.title}
            author={book.author}
            coverUrl={book.coverUrl}
            caption={bookCaption(book)}
            onPress={() => router.push({ pathname: '/book/[id]', params: { id: book.id } })}
          />
          <Button
            label="Read now"
            onPress={() => router.push({ pathname: '/lamp', params: { bookId: book.id } })}
          />
        </View>
      ) : null}

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

const styles = StyleSheet.create({
  current: { gap: space.lg },
});
