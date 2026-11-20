import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { goBack, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { getPrompt, PROMPT_AUTHOR } from '@/content/prompts';
import { useDb } from '@/data/DataProvider';
import { addEntry, type EntryKind } from '@/data/journal';
import { checkQuote, QUOTE_HARD_LIMIT_WORDS, QUOTE_SOFT_LIMIT_WORDS } from '@/domain/quotes';
import { BookPicker } from '@/features/journal/BookPicker';
import { takePassage } from '@/features/scan/handoff';
import { Pressable } from '@/components/Pressable';
import { space } from '@/theme/tokens';

type Params = {
  kind?: EntryKind;
  promptId?: string;
  bookId?: string;
  /** Prefilled quote text, from the page scanner. */
  quote?: string;
  page?: string;
  source?: 'typed' | 'scanned';
};

/** Write a reflection, a note, or a short quote. */
export default function WriteScreen() {
  const db = useDb();
  const params = useLocalSearchParams<Params>();
  const prompt = getPrompt(params.promptId);
  const [kind, setKind] = useState<EntryKind>(params.kind ?? (prompt ? 'reflection' : 'note'));
  const [bookId, setBookId] = useState<string | null>(params.bookId || null);
  const [body, setBody] = useState('');
  const [quote, setQuote] = useState(params.quote ?? '');
  const [page, setPage] = useState(params.page ?? '');
  const [source, setSource] = useState<'typed' | 'scanned'>(params.source ?? 'typed');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A passage chosen in the scanner comes back here when this screen regains focus.
  useFocusEffect(
    useCallback(() => {
      const scanned = takePassage();
      if (!scanned) return;
      setQuote(scanned.quote);
      setSource('scanned');
      if (scanned.page) setPage((p) => p || String(scanned.page));
    }, []),
  );

  const check = checkQuote(quote);
  const quoteNote =
    check.status === 'too-long'
      ? `${check.words} words. Quotes are kept to ${QUOTE_HARD_LIMIT_WORDS} words, so choose the lines that matter most.`
      : check.status === 'long'
        ? `${check.words} words. Shorter quotes are easier to return to.`
        : null;
  const quoteHint = `A few lines, up to about ${QUOTE_SOFT_LIMIT_WORDS} words, with the page.`;

  const canSave =
    kind === 'quote' ? check.status === 'ok' || check.status === 'long' : body.trim().length > 0;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const n = parseInt(page.replace(/\D/g, ''), 10);
      await addEntry(db, {
        kind,
        body,
        bookId,
        promptId: kind === 'reflection' ? (prompt?.id ?? null) : null,
        quoteText: kind === 'quote' ? quote : null,
        quotePage: kind === 'quote' && n > 0 ? n : null,
        quoteSource: kind === 'quote' ? source : null,
      });
      if (router.canGoBack()) goBack();
      else router.replace('/journal');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  }

  return (
    <Screen
      back
      title={kind === 'reflection' ? 'Reflect' : kind === 'quote' ? 'Keep a quote' : 'A note'}
      caption="Only you can read this. It stays on your phone.">
      {!prompt ? (
        <View style={styles.chips} accessibilityRole="radiogroup">
          <Chip label="Note" selected={kind === 'note'} onPress={() => setKind('note')} />
          <Chip label="Quote" selected={kind === 'quote'} onPress={() => setKind('quote')} />
        </View>
      ) : (
        <View style={styles.prompt}>
          <Text variant="heading" style={styles.promptText}>
            {prompt.text}
          </Text>
          <Text variant="caption">{PROMPT_AUTHOR}</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text variant="caption">Book</Text>
        <BookPicker value={bookId} onChange={setBookId} />
      </View>

      {kind === 'quote' ? (
        <>
          <TextField
            label="The lines you want to keep"
            value={quote}
            onChangeText={setQuote}
            multiline
            hint={quoteHint}
            note={quoteNote}
            autoFocus={!quote}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Reads a page with the camera, on your phone"
            haptic={false}
            onPress={() =>
              router.push({ pathname: '/scan', params: { from: 'write', bookId: bookId ?? '' } })
            }
            style={styles.scan}>
            <Text tone="aurora">{quote ? 'Scan the page again' : 'Scan the page instead'}</Text>
          </Pressable>
          <TextField
            label="Page"
            value={page}
            onChangeText={setPage}
            keyboardType="number-pad"
            hint="Optional"
          />
          <TextField
            label="Why it stayed with you"
            value={body}
            onChangeText={setBody}
            multiline
            hint="Optional"
          />
        </>
      ) : (
        <TextField
          label={kind === 'reflection' ? 'Your answer' : 'Your note'}
          value={body}
          onChangeText={setBody}
          multiline
          autoFocus
          placeholder={kind === 'reflection' ? 'There is no wrong answer.' : undefined}
        />
      )}

      {error ? <Text tone="aurora">{error}</Text> : null}
      <View style={styles.action}>
        <Button label="Save" onPress={save} disabled={!canSave || busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: space.sm },
  prompt: { gap: space.xs },
  promptText: { fontSize: 20, lineHeight: 28, fontFamily: 'Literata_400Regular_Italic' },
  field: { gap: space.xs },
  action: { alignSelf: 'flex-start' },
  scan: { alignSelf: 'flex-start', paddingVertical: space.xs },
});
