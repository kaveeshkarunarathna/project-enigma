import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Hairline } from '@/components/Hairline';
import { IconButton } from '@/components/IconButton';
import { MagnifyingGlassIcon, PlusIcon, ScanIcon, XIcon } from '@/components/icons';
import { Pressable } from '@/components/Pressable';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { PROMPT_AUTHOR } from '@/content/prompts';
import { currentBook } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { listEntries, type EntryKind } from '@/data/journal';
import { useLiveQuery } from '@/data/live';
import { promptFor } from '@/domain/prompts';
import { useReaderGenre } from '@/features/paths/useReaderGenre';
import { nightKey } from '@/domain/time';
import { BookPicker } from '@/features/journal/BookPicker';
import { EntryItem } from '@/features/journal/EntryItem';
import { space } from '@/theme/tokens';

const FILTERS: { label: string; kind: EntryKind | null }[] = [
  { label: 'All', kind: null },
  { label: 'Reflections', kind: 'reflection' },
  { label: 'Notes', kind: 'note' },
  { label: 'Quotes', kind: 'quote' },
];

export default function JournalScreen() {
  const db = useDb();
  const [kind, setKind] = useState<EntryKind | null>(null);
  const [search, setSearch] = useState('');
  const [filterBook, setFilterBook] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [searching, setSearching] = useState(false);
  const genre = useReaderGenre();
  const prompt = promptFor(nightKey(), genre, offset);
  const { data: book } = useLiveQuery(() => currentBook(db), ['books', 'sessions']);
  const { data: entries, loading } = useLiveQuery(
    () => listEntries(db, { kind: kind ?? undefined, search, bookId: filterBook ?? undefined }),
    ['journal', 'books'],
    [kind, search, filterBook],
  );
  const { data: any } = useLiveQuery(() => listEntries(db, { limit: 1 }), ['journal']);
  const hasAny = !!any?.length;

  return (
    <Screen
      title="Journal"
      accessory={
        <View style={styles.accessory}>
          {hasAny ? (
            <IconButton
              icon={searching ? XIcon : MagnifyingGlassIcon}
              label={searching ? 'Close search' : 'Search and filter'}
              onPress={() => {
                if (searching) {
                  setSearch('');
                  setKind(null);
                  setFilterBook(null);
                }
                setSearching((v) => !v);
              }}
            />
          ) : null}
          <IconButton
            icon={ScanIcon}
            label="Scan a quote"
            onPress={() => router.push({ pathname: '/scan', params: { auto: '1', bookId: book?.id ?? '' } })}
          />
          <IconButton
            icon={PlusIcon}
            label="New note or quote"
            onPress={() =>
              router.push({ pathname: '/journal/write', params: { kind: 'note', bookId: book?.id } })
            }
          />
        </View>
      }>
      <View style={styles.prompt}>
        <Text variant="label">Tonight’s question</Text>
        <Text variant="prose" style={styles.promptText}>
          {prompt.text}
        </Text>
        <Text variant="caption">{PROMPT_AUTHOR}</Text>
        <View style={styles.promptActions}>
          <Button
            label="Write"
            onPress={() =>
              router.push({
                pathname: '/journal/write',
                params: { kind: 'reflection', promptId: prompt.id, bookId: book?.id },
              })
            }
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setOffset((o) => o + 1)}
            style={styles.another}
            haptic={false}>
            <Text tone="mist">Another question</Text>
          </Pressable>
        </View>
      </View>


      {hasAny && searching ? (
        <View style={styles.tools}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map((f) => (
              <Chip
                key={f.label}
                label={f.label}
                selected={kind === f.kind}
                onPress={() => setKind(f.kind)}
              />
            ))}
          </ScrollView>
          <BookPicker value={filterBook} onChange={setFilterBook} noneLabel="All books" />
          <TextField
            value={search}
            onChangeText={setSearch}
            placeholder="Search your journal"
            accessibilityLabel="Search your journal"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      ) : null}

      {!loading && !hasAny ? (
        <EmptyState
          heading="Nothing written yet"
          body="Answer tonight’s question, or keep a line from the page."
        />
      ) : null}

      {hasAny && entries && !entries.length ? (
        <Text tone="mist">
          {search
            ? 'Nothing matches that search.'
            : filterBook
              ? 'Nothing written about this book yet.'
              : 'Nothing here yet.'}
        </Text>
      ) : null}

      <View>
        {(entries ?? []).map((e, i) => (
          <View key={e.id}>
            {i > 0 ? <Hairline /> : null}
            <EntryItem entry={e} />
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: space.sm },
  promptText: { fontSize: 20, lineHeight: 28, fontFamily: 'Literata_400Regular_Italic' },
  promptActions: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.md },
  another: { paddingVertical: space.md },
  tools: { gap: space.md },
  accessory: { flexDirection: 'row' },
  chips: { gap: space.sm },
});
