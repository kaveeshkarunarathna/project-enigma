import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { addBook } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { space } from '@/theme/tokens';

function toCount(text: string): number | null {
  const n = parseInt(text.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Add a book by hand, for books the catalog does not have. */
export default function NewBookScreen() {
  const db = useDb();
  const params = useLocalSearchParams<{ title?: string }>();
  const [title, setTitle] = useState(params.title ?? '');
  const [author, setAuthor] = useState('');
  const [pages, setPages] = useState('');
  const [chapters, setChapters] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) {
      setError('Every book needs a title.');
      return;
    }
    setBusy(true);
    try {
      const book = await addBook(db, {
        title,
        author,
        pageCount: toCount(pages),
        chapterCount: toCount(chapters),
        status: 'reading',
      });
      router.replace({ pathname: '/book/[id]', params: { id: book.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the book.');
      setBusy(false);
    }
  }

  return (
    <Screen
      back
      title="Add by hand"
      caption="Only the title is needed. The rest helps light the chapter ring.">
      <View style={styles.form}>
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          autoFocus={!title}
          returnKeyType="next"
        />
        <TextField label="Author" value={author} onChangeText={setAuthor} returnKeyType="next" />
        <View style={styles.row}>
          <View style={styles.half}>
            <TextField label="Pages" value={pages} onChangeText={setPages} keyboardType="number-pad" />
          </View>
          <View style={styles.half}>
            <TextField
              label="Chapters"
              value={chapters}
              onChangeText={setChapters}
              keyboardType="number-pad"
              hint="Optional"
            />
          </View>
        </View>
        {error ? <Text tone="aurora">{error}</Text> : null}
        <View style={styles.action}>
          <Button label="Add to my shelf" onPress={save} disabled={busy} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  half: { flex: 1 },
  action: { marginTop: space.md },
});
