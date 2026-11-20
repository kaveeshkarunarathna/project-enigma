import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BookRow } from '@/components/BookRow';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { BarcodeIcon, BooksIcon, PlusIcon } from '@/components/icons';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { listBooks, type Book } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { bookCaption, STATUS_LABEL } from '@/features/books/format';

const ORDER: Book['status'][] = ['reading', 'want', 'paused', 'finished'];

export default function ShelfScreen() {
  const db = useDb();
  const { data: books, loading } = useLiveQuery(() => listBooks(db), ['books']);

  const groups = ORDER.map((status) => ({
    status,
    books: (books ?? []).filter((b) => b.status === status),
  })).filter((g) => g.books.length);

  return (
    <Screen
      title="Your shelf"
      accessory={
        <View style={styles.accessory}>
          <IconButton icon={BarcodeIcon} label="Scan a barcode" onPress={() => router.push('/barcode')} />
          <IconButton icon={BooksIcon} label="Free classics" onPress={() => router.push('/classics')} />
          <IconButton icon={PlusIcon} label="Find a book" onPress={() => router.push('/search')} />
        </View>
      }>
      {!loading && !groups.length ? (
        <EmptyState
          heading="An empty shelf, for now"
          body="Scan the barcode on the back of a book you are reading, search the catalog, or start a free classic."
          action={
            <View style={styles.actions}>
              <Button label="Scan a barcode" onPress={() => router.push('/barcode')} />
              <Button kind="quiet" label="Search" onPress={() => router.push('/search')} />
            </View>
          }
        />
      ) : null}
      {groups.map((g) => (
        <Section key={g.status} title={`${STATUS_LABEL[g.status]} (${g.books.length})`}>
          <View>
            {g.books.map((b) => (
              <BookRow
                key={b.id}
                title={b.title}
                author={b.author}
                coverUrl={b.coverUrl}
                caption={bookCaption(b)}
                accessibilityHint="Opens the book"
                onPress={() => router.push({ pathname: '/book/[id]', params: { id: b.id } })}
              />
            ))}
          </View>
        </Section>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  accessory: { flexDirection: 'row' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
});
