import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Pressable } from '@/components/Pressable';
import { goBack, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { getBook } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { checkQuote, QUOTE_HARD_LIMIT_WORDS, QUOTE_SOFT_LIMIT_WORDS } from '@/domain/quotes';
import {
  guessPageNumber,
  joinScannedLines,
  selectedText,
  splitSentences,
  tapSentence,
  type Selection,
} from '@/domain/scan';
import { DEV_TOOLS } from '@/features/dev/sampleData';
import { handOffPassage } from '@/features/scan/handoff';
import { SAMPLE_SCAN } from '@/features/scan/sample';
import {
  documentScannerAvailable,
  ScanError,
  scannerAvailable,
  scanPage,
  type ScanSource,
} from '@/services/scanner';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

type Params = {
  /** "write" when opened from the quote editor, which takes the passage back. */
  from?: string;
  bookId?: string;
  /** "1" opens the page scanner straight away, for one-tap "Scan a quote". */
  auto?: string;
  /** Dev only: show a sample page, to try the picker in Expo Go or on the web. */
  demo?: string;
};

type Phase =
  | { name: 'start'; error?: string }
  | { name: 'reading' }
  | { name: 'pick'; sentences: string[]; page: number | null };

function fromLines(lines: string[], page: number | null = guessPageNumber(lines)): Phase {
  return { name: 'pick', sentences: splitSentences(joinScannedLines(lines)), page };
}

/**
 * Scan a page to quote it. The text is read on the phone and the photo is
 * deleted straight away. The reader taps the sentences they want, and only
 * those go on to the quote editor.
 */
export default function ScanScreen() {
  const params = useLocalSearchParams<Params>();
  const db = useDb();
  const { data: book } = useLiveQuery(
    () => (params.bookId ? getBook(db, params.bookId) : Promise.resolve(null)),
    ['books'],
    [params.bookId],
  );
  const [phase, setPhase] = useState<Phase>(() =>
    DEV_TOOLS && params.demo ? fromLines(SAMPLE_SCAN) : { name: 'start' },
  );
  const [sel, setSel] = useState<Selection>(null);
  const available = scannerAvailable();
  const documents = documentScannerAvailable();

  async function scan(source: ScanSource) {
    setPhase({ name: 'reading' });
    setSel(null);
    try {
      const scanned = await scanPage(source);
      setPhase(scanned ? fromLines(scanned.lines, scanned.page) : { name: 'start' });
    } catch (e) {
      setPhase({
        name: 'start',
        error: e instanceof ScanError ? e.message : 'Something went wrong. Please try again.',
      });
    }
  }

  // One-tap "Scan a quote": open the scanner as soon as the screen appears.
  const launched = useRef(false);
  useEffect(() => {
    if (params.auto !== '1' || launched.current || !available) return;
    launched.current = true;
    const t = setTimeout(() => scan(documents ? 'book' : 'camera'), 300);
    return () => clearTimeout(t);
  }, [params.auto, available, documents]);

  function use(text: string, scannedPage: number | null) {
    // A printed page number wins; else where the reader is in the book.
    const page = scannedPage ?? (book?.currentPage || null);
    if (params.from === 'write') {
      handOffPassage({ quote: text, page });
      goBack();
    } else {
      router.replace({
        pathname: '/journal/write',
        params: {
          kind: 'quote',
          quote: text,
          page: page ? String(page) : '',
          source: 'scanned',
          bookId: params.bookId ?? '',
        },
      });
    }
  }

  if (phase.name === 'pick') {
    const text = selectedText(phase.sentences, sel);
    const check = checkQuote(text);
    const status =
      check.status === 'empty'
        ? 'Tap the sentences you want to keep.'
        : check.status === 'too-long'
          ? `${check.words} words. Quotes are kept to ${QUOTE_HARD_LIMIT_WORDS} words, so tap the first or last sentence to let it go.`
          : check.status === 'long'
            ? `${check.words} words. Shorter quotes are easier to return to.`
            : `${check.words} words`;
    return (
      <Screen
        back
        title="Choose the lines"
        caption={`Tap a sentence, then another to take in the ones between.${
          book
            ? ` From ${book.title}${phase.page ? `, page ${phase.page}` : ''}.`
            : phase.page
              ? ` Page ${phase.page}.`
              : ''
        }`}>
        <View style={styles.sentences}>
          {phase.sentences.map((s, i) => (
            <Sentence
              key={i}
              text={s}
              selected={!!sel && i >= sel.start && i <= sel.end}
              onPress={() => setSel((cur) => tapSentence(cur, i))}
            />
          ))}
        </View>
        <Text variant="caption" accessibilityLiveRegion="polite">
          {status}
        </Text>
        <View style={styles.actions}>
          <Button
            label="Use these lines"
            onPress={() => use(check.text, phase.page)}
            disabled={check.status === 'empty' || check.status === 'too-long'}
          />
          <Button kind="quiet" label="Scan again" onPress={() => setPhase({ name: 'start' })} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      back
      title="Scan a page"
      caption="The text is read on your phone. The photo is deleted straight away.">
      <View style={styles.body}>
        {book ? <Text variant="heading">{book.title}</Text> : null}
        <Text tone="mist">
          {documents
            ? 'Hold the phone over the open book. The scanner finds the page and flattens it. If your quote runs onto the next page, scan both.'
            : 'Lay the page flat in good light.'}{' '}
          Then choose a few sentences to keep, up to about {QUOTE_SOFT_LIMIT_WORDS} words. The rest of the
          page is not kept.
        </Text>
        {!available ? (
          <Text tone="aurora">
            The scanner works in the installed app. In Expo Go or on the web, type the lines instead.
          </Text>
        ) : null}
        {phase.name === 'start' && phase.error ? <Text tone="aurora">{phase.error}</Text> : null}
      </View>
      {phase.name === 'reading' ? (
        <View style={styles.reading} accessibilityLiveRegion="polite">
          <ActivityIndicator />
          <Text tone="mist">Reading the page…</Text>
        </View>
      ) : available ? (
        <View style={styles.actions}>
          {documents ? (
            <Button label="Scan the page" onPress={() => scan('book')} />
          ) : (
            <Button label="Take a photo" onPress={() => scan('camera')} />
          )}
          <Button kind="quiet" label="Choose a photo" onPress={() => scan('library')} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button kind="quiet" label="Type it instead" onPress={goBack} />
          {DEV_TOOLS ? (
            <Button kind="quiet" label="Try a sample page" onPress={() => setPhase(fromLines(SAMPLE_SCAN))} />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function Sentence({ text, selected, onPress }: { text: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.sentence,
        {
          backgroundColor: selected ? colors.raised : 'transparent',
          borderLeftColor: selected ? colors.aurora : 'transparent',
        },
      ]}>
      <Text tone={selected ? undefined : 'mist'} style={selected ? styles.selectedText : undefined}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  sentences: { gap: 2 },
  sentence: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderLeftWidth: 2,
    borderRadius: radius.sm,
  },
  selectedText: { fontFamily: 'Literata_400Regular_Italic' },
  reading: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
