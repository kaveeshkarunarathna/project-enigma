import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BookRow } from '@/components/BookRow';
import { Button } from '@/components/Button';
import { CheckIcon } from '@/components/icons';
import { Hairline } from '@/components/Hairline';
import { Pressable } from '@/components/Pressable';
import { goBack, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { addBook, listBooks, setBookStatus, type BookStatus } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { addBookToUserPath } from '@/data/paths';
import { formatYear } from '@/features/books/format';
import { CatalogError, coverUrl, searchCatalog, type CatalogBook } from '@/services/openLibrary';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; results: CatalogBook[] }
  | { kind: 'error'; message: string };

/**
 * Find a book in the Open Library catalog and put it on the shelf.
 * With `?pathId=...` the chosen book is added to that reader-made path instead.
 */
export default function SearchScreen() {
  const db = useDb();
  const { colors } = useTheme();
  const { pathId } = useLocalSearchParams<{ pathId?: string }>();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ kind: 'idle' });
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: shelf } = useLiveQuery(() => listBooks(db), ['books']);
  const onShelf = new Set((shelf ?? []).map((b) => b.olWorkKey).filter(Boolean));

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ kind: 'loading' });
      searchCatalog(q, { signal: controller.signal })
        .then((results) => setState({ kind: 'done', results }))
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            kind: 'error',
            message: e instanceof CatalogError ? e.message : 'Something went wrong.',
          });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function choose(book: CatalogBook, status: BookStatus) {
    if (busy) return;
    setBusy(true);
    try {
      const fields = {
        olWorkKey: book.workKey,
        title: book.title,
        author: book.author,
        coverUrl: coverUrl(book.coverId, 'L'),
        firstPublished: book.firstPublished,
        pageCount: book.pageCount,
      };
      if (pathId) {
        await addBookToUserPath(db, pathId, { ...fields, note: null });
        goBack();
        return;
      }
      const saved = await addBook(db, { ...fields, status });
      if (saved.status !== status && status === 'reading') await setBookStatus(db, saved.id, 'reading');
      router.replace({ pathname: '/book/[id]', params: { id: saved.id } });
    } finally {
      setBusy(false);
    }
  }

  const results = state.kind === 'done' ? state.results : [];
  const showResults = query.trim().length >= 2;

  return (
    <Screen
      back
      title={pathId ? 'Add to your path' : 'Find a book'}
      caption="Titles, authors and covers come from the Open Library catalog.">
      <TextField
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setSelected(null);
          if (t.trim().length < 2) setState({ kind: 'idle' });
        }}
        placeholder="Title or author"
        accessibilityLabel="Search for a book by title or author"
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      {showResults && state.kind === 'loading' ? (
        <ActivityIndicator color={colors.mist} accessibilityLabel="Searching" />
      ) : null}
      {showResults && state.kind === 'error' ? <Text tone="mist">{state.message}</Text> : null}
      {showResults && state.kind === 'done' && !results.length ? (
        <Text tone="mist">Nothing found. Try fewer words, or add the book by hand.</Text>
      ) : null}

      {showResults && results.length ? (
        <View>
          {results.map((b, i) => {
            const isOpen = selected === b.workKey;
            const has = onShelf.has(b.workKey);
            return (
              <View key={b.workKey}>
                {i > 0 ? <Hairline /> : null}
                <BookRow
                  title={b.title}
                  author={b.author}
                  coverUrl={coverUrl(b.coverId, 'M')}
                  caption={[
                    b.firstPublished ? formatYear(b.firstPublished) : null,
                    b.pageCount ? `${b.pageCount} pages` : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  onPress={() => setSelected(isOpen ? null : b.workKey)}
                  accessibilityHint={pathId ? 'Shows the add button' : 'Shows ways to add it to your shelf'}
                  accessory={
                    has && !pathId ? <CheckIcon size={20} weight="light" color={colors.aurora} /> : null
                  }
                />
                {isOpen ? (
                  <View style={styles.choices}>
                    {pathId ? (
                      <Button label="Add to path" onPress={() => choose(b, 'want')} disabled={busy} />
                    ) : (
                      <>
                        <Button label="Reading now" onPress={() => choose(b, 'reading')} disabled={busy} />
                        <Button
                          kind="quiet"
                          label={has ? 'Open on shelf' : 'Want to read'}
                          onPress={() => choose(b, 'want')}
                          disabled={busy}
                        />
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {!pathId ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/book/new', params: { title: query.trim() } })}
          style={styles.manual}>
          <Text tone="aurora">Can’t find it? Add it by hand</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingBottom: space.lg },
  manual: { paddingVertical: space.md, alignSelf: 'flex-start' },
});
