import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useDb } from '@/data/DataProvider';
import { createUserPath, getPath, updateUserPath } from '@/data/paths';
import { GENRE_LABEL, GENRES } from '@/features/paths/genres';
import { space } from '@/theme/tokens';

/** Create a reader-made path, or rename one with `?id=...`. */
export default function NewPathScreen() {
  const db = useDb();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPath(db, id).then((p) => {
      if (!p) return;
      setTitle(p.title);
      setDescription(p.description ?? '');
      setGenre(p.genre);
    });
  }, [db, id]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (id) {
        await updateUserPath(db, id, { title, description, genre });
        router.back();
      } else {
        const path = await createUserPath(db, { title, description, genre: genre ?? undefined });
        router.replace({ pathname: '/paths/[id]', params: { id: path.id } });
        router.push({ pathname: '/search', params: { pathId: path.id } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the path.');
      setBusy(false);
    }
  }

  return (
    <Screen
      back
      title={id ? 'Your path' : 'A new path'}
      caption="A few books that belong together. You can reorder them any time.">
      <TextField
        label="Name"
        value={title}
        onChangeText={setTitle}
        placeholder="Winter fantasy, Books about time…"
        autoFocus={!id}
      />
      <TextField
        label="What ties them together"
        value={description}
        onChangeText={setDescription}
        multiline
        hint="Optional"
      />
      <View style={styles.field}>
        <Text variant="caption">Kind of books</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {GENRES.map((g) => (
            <Chip
              key={g}
              label={GENRE_LABEL[g]}
              selected={genre === g}
              onPress={() => setGenre(genre === g ? null : g)}
            />
          ))}
        </View>
        <Text variant="caption">Tonight’s questions lean towards this kind of book.</Text>
      </View>
      {error ? <Text tone="aurora">{error}</Text> : null}
      <View style={styles.action}>
        <Button
          label={id ? 'Save' : 'Create and add books'}
          onPress={save}
          disabled={!title.trim() || busy}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingVertical: space.xs },
  action: { alignSelf: 'flex-start' },
});
