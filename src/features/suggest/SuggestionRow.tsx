import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { whisper } from '@/components/motion/Whisper';
import { Pressable } from '@/components/Pressable';
import { Text } from '@/components/Text';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { addBookToUserPath, getPath, listPaths, type ReadingPathWithBooks } from '@/data/paths';
import { dismissSuggestion } from '@/data/suggestions';
import { normalizeTitle } from '@/domain/paths';
import { reasonLine, type Suggestion } from '@/domain/suggest';
import { entryDate } from '@/features/journal/format';
import { addPathBookToShelf } from '@/features/paths/addPathBook';
import { space } from '@/theme/tokens';

/**
 * One suggested book: title, author, the reason in one line, and three quiet
 * actions. "Add to a path" opens the reader's own paths right here, or starts
 * a new path with this book.
 */
export function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const db = useDb();
  const { book, reason } = suggestion;
  const [choosing, setChoosing] = useState(false);
  const { data: own } = useLiveQuery(
    async () => {
      if (!choosing) return [];
      const list = (await listPaths(db)).filter((p) => p.source === 'user');
      return (await Promise.all(list.map((p) => getPath(db, p.id)))).filter(
        (p): p is ReadingPathWithBooks => !!p,
      );
    },
    ['paths'],
    [choosing],
  );
  const entry = { olWorkKey: null, title: book.title, author: book.author, coverUrl: null, note: null };

  async function wantToRead() {
    await addPathBookToShelf(db, { ...entry, position: 0 }, 'want');
    whisper(`${book.title} is on your shelf`);
  }

  async function addTo(path: ReadingPathWithBooks) {
    await addBookToUserPath(db, path.id, entry);
    setChoosing(false);
    whisper(`Added to ${path.title}`);
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole={suggestion.pathId ? 'button' : 'text'}
        accessibilityHint={suggestion.pathId ? 'Opens the path it belongs to' : undefined}
        disabled={!suggestion.pathId}
        haptic={false}
        onPress={() =>
          suggestion.pathId && router.push({ pathname: '/paths/[id]', params: { id: suggestion.pathId } })
        }
        style={styles.head}>
        <Text variant="heading">{book.title}</Text>
        <Text variant="caption">{book.author}</Text>
      </Pressable>
      <Text tone="mist">{reasonLine(reason, (iso) => entryDate(iso))}</Text>
      <View style={styles.actions}>
        <Action label="Want to read" onPress={wantToRead} tone="aurora" />
        <Action label={choosing ? 'Close' : 'Add to a path'} onPress={() => setChoosing((v) => !v)} />
        <Action label="Not for me" onPress={() => dismissSuggestion(db, suggestion.key)} />
      </View>
      {choosing ? (
        <View style={styles.chips}>
          {(own ?? []).map((p) => {
            const has = p.books.some((b) => normalizeTitle(b.title) === normalizeTitle(book.title));
            return (
              <Chip
                key={p.id}
                label={has ? `${p.title} (added)` : p.title}
                selected={has}
                onPress={() => (has ? undefined : addTo(p))}
              />
            );
          })}
          <Chip
            label="A new path"
            selected={false}
            onPress={() => {
              setChoosing(false);
              router.push({ pathname: '/paths/new', params: { withTitle: book.title, withAuthor: book.author } });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function Action({ label, onPress, tone = 'mist' }: { label: string; onPress: () => void; tone?: 'mist' | 'aurora' }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} haptic={false} style={styles.action}>
      <Text tone={tone} variant="caption">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.xs, paddingVertical: space.lg },
  head: { gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg },
  action: { paddingVertical: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
