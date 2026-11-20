import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Pressable } from '@/components/Pressable';
import { goBack, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { getPrompt, PROMPT_AUTHOR } from '@/content/prompts';
import { useDb } from '@/data/DataProvider';
import { deleteEntry, getEntry, updateEntry, type JournalEntry } from '@/data/journal';
import { useLiveQuery } from '@/data/live';
import { checkQuote } from '@/domain/quotes';
import { entryDate, KIND_LABEL } from '@/features/journal/format';
import { space } from '@/theme/tokens';

export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const { data: entry, loading } = useLiveQuery(() => getEntry(db, id), ['journal'], [id]);

  if (!entry) {
    return (
      <Screen back title="Journal">
        {!loading ? <EmptyState heading="This entry is gone" body="It may have been deleted." /> : null}
      </Screen>
    );
  }
  return <Editor key={entry.updatedAt} entry={entry} />;
}

function Editor({ entry }: { entry: JournalEntry }) {
  const db = useDb();
  const prompt = getPrompt(entry.promptId);
  const [body, setBody] = useState(entry.body);
  const [quote, setQuote] = useState(entry.quoteText ?? '');
  const [page, setPage] = useState(entry.quotePage ? String(entry.quotePage) : '');
  const [error, setError] = useState<string | null>(null);
  const dirty =
    body !== entry.body ||
    (entry.kind === 'quote' &&
      (quote !== (entry.quoteText ?? '') || page !== (entry.quotePage ? String(entry.quotePage) : '')));
  const quoteOk = entry.kind !== 'quote' || ['ok', 'long'].includes(checkQuote(quote).status);

  async function save() {
    try {
      const n = parseInt(page.replace(/\D/g, ''), 10);
      await updateEntry(db, entry.id, {
        body,
        ...(entry.kind === 'quote' ? { quoteText: quote, quotePage: n > 0 ? n : null } : {}),
      });
      goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  }

  return (
    <Screen
      back
      title={KIND_LABEL[entry.kind]}
      caption={[entryDate(entry.createdAt), entry.bookTitle].filter(Boolean).join(', ')}>
      {prompt ? (
        <View style={styles.prompt}>
          <Text variant="prose" style={styles.promptText}>
            {prompt.text}
          </Text>
          <Text variant="caption">{PROMPT_AUTHOR}</Text>
        </View>
      ) : null}
      {entry.kind === 'quote' ? (
        <>
          <TextField label="Quote" value={quote} onChangeText={setQuote} multiline />
          <TextField label="Page" value={page} onChangeText={setPage} keyboardType="number-pad" />
          {entry.quoteSource === 'scanned' ? <Text variant="label">Scanned from the page.</Text> : null}
        </>
      ) : null}
      <TextField
        label={entry.kind === 'quote' ? 'Why it stayed with you' : 'Your words'}
        value={body}
        onChangeText={setBody}
        multiline
      />
      {error ? <Text tone="aurora">{error}</Text> : null}
      <View style={styles.actions}>
        <Button label="Save" onPress={save} disabled={!dirty || !quoteOk} />
        <Pressable
          accessibilityRole="button"
          style={styles.delete}
          onPress={() =>
            Alert.alert('Delete this entry?', 'This cannot be undone.', [
              { text: 'Keep it', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await deleteEntry(db, entry.id);
                  goBack();
                },
              },
            ])
          }>
          <Text tone="mist">Delete</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: space.xs },
  promptText: { fontSize: 20, lineHeight: 28, fontFamily: 'Literata_400Regular_Italic' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  delete: { paddingVertical: space.md },
});
