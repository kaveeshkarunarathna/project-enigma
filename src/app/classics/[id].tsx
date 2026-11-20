import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Hairline } from '@/components/Hairline';
import { IconButton } from '@/components/IconButton';
import { CaretLeftIcon, CheckIcon, ListBulletsIcon, TextAaIcon } from '@/components/icons';
import { Pressable } from '@/components/Pressable';
import { goBack, Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { getClassic, type Classic } from '@/content/classics';
import { setBookStatus } from '@/data/books';
import {
  getChapter,
  getClassicText,
  listChapterTitles,
  markChapterRead,
  removeClassicText,
  saveClassic,
  savePosition,
  type ClassicChapter,
  type ClassicText,
} from '@/data/classics';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { logSession } from '@/data/sessions';
import { getState, setState } from '@/data/settings';
import { parseGutenberg, readingMinutes } from '@/domain/gutenberg';
import { MIN_SESSION_SECONDS } from '@/domain/lamp';
import { countWords } from '@/domain/quotes';
import { splitSentences } from '@/domain/scan';
import { sampleGutenbergFile } from '@/features/classics/sample';
import { DEV_TOOLS } from '@/features/dev/sampleData';
import { DownloadError, downloadClassic } from '@/services/gutenberg';
import { useTheme } from '@/theme/theme';
import { fontFamily, space } from '@/theme/tokens';

const SIZES = [17, 20, 23] as const;

/** A public-domain classic: download it once, then read it here, offline. */
export default function ClassicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const classic = getClassic(id);
  const { data: text, loading } = useLiveQuery(() => getClassicText(db, id), ['classics'], [id]);

  if (!classic) {
    return (
      <Screen back title="Not found">
        <EmptyState heading="This book is not in the library" body="It may have been removed in an update." />
      </Screen>
    );
  }
  if (loading && !text) return <Screen back title={classic.title} />;
  if (!text) return <DownloadCard classic={classic} />;
  return <Reader classic={classic} text={text} />;
}

function DownloadCard({ classic }: { classic: Classic }) {
  const db = useDb();
  const [state, setStateName] = useState<'idle' | 'busy'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setStateName('busy');
    setError(null);
    try {
      const parsed = await downloadClassic(classic);
      await saveClassic(db, classic, parsed);
    } catch (e) {
      setError(e instanceof DownloadError ? e.message : 'Something went wrong. Please try again.');
      setStateName('idle');
    }
  }

  return (
    <Screen back title={classic.title} caption={byline(classic)}>
      <Text tone="mist">{classic.note}</Text>
      <Text variant="caption">
        About {classic.hours} {classic.hours === 1 ? 'hour' : 'hours'} of reading. Free and public domain.
        Downloaded once, then it works without internet.
      </Text>
      {error ? <Text tone="aurora">{error}</Text> : null}
      {state === 'busy' ? (
        <View style={styles.busy} accessibilityLiveRegion="polite">
          <ActivityIndicator />
          <Text tone="mist">Bringing the book home…</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button label="Download and read" onPress={download} />
          {DEV_TOOLS ? (
            <Button
              kind="quiet"
              label="Use a sample text"
              onPress={() => saveClassic(db, classic, parseGutenberg(sampleGutenbergFile(classic.title)))}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function byline(c: Classic) {
  return c.translator ? `${c.author}, translated by ${c.translator}` : c.author;
}

function Reader({ classic, text }: { classic: Classic; text: ClassicText }) {
  const db = useDb();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(text.positionChapter);
  const [chapter, setChapter] = useState<ClassicChapter | null>(null);
  const [contents, setContents] = useState(false);
  const [size, setSize] = useState<number>(SIZES[0]);
  const restore = useRef<number | null>(text.positionFraction);
  const session = useReadingClock(text.bookId);

  useEffect(() => {
    getState<number>(db, 'readerSize').then((s) => s && setSize(s));
  }, [db]);

  useEffect(() => {
    let live = true;
    getChapter(db, classic.id, index).then((c) => live && setChapter(c));
    return () => {
      live = false;
    };
  }, [db, classic.id, index]);

  const lastSave = useRef(0);
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const room = contentSize.height - layoutMeasurement.height;
    const fraction = room > 0 ? contentOffset.y / room : 0;
    const now = Date.now();
    if (now - lastSave.current > 1000) {
      lastSave.current = now;
      savePosition(db, classic.id, index, fraction);
    }
  }

  function onContentSize(_w: number, h: number) {
    if (restore.current == null || !chapter) return;
    const fraction = restore.current;
    restore.current = null;
    if (fraction > 0.01)
      requestAnimationFrame(() => scroll.current?.scrollTo({ y: fraction * h * 0.9, animated: false }));
  }

  function goTo(i: number) {
    setContents(false);
    setChapter(null);
    setIndex(i);
    savePosition(db, classic.id, i, 0);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  async function finishChapter() {
    const added = await markChapterRead(db, classic.id, index);
    session.addChapters(added);
    if (index + 1 < text.chapterCount) {
      goTo(index + 1);
    } else if (text.bookId) {
      await session.flush();
      await setBookStatus(db, text.bookId, 'finished');
      router.replace({ pathname: '/ignite', params: { bookId: text.bookId } });
    }
  }

  async function cycleSize() {
    const next = SIZES[(SIZES.indexOf(size as (typeof SIZES)[number]) + 1) % SIZES.length];
    setSize(next);
    await setState(db, 'readerSize', next);
  }

  function quote(paragraph: string) {
    // A quote is a few lines, so long paragraphs offer their opening sentences.
    let picked = '';
    for (const s of splitSentences(paragraph.replace(/\n/g, ' '))) {
      if (picked && countWords(`${picked} ${s}`) > 60) break;
      picked = picked ? `${picked} ${s}` : s;
    }
    router.push({
      pathname: '/journal/write',
      params: { kind: 'quote', quote: picked, bookId: text.bookId ?? '' },
    });
  }

  const last = index + 1 >= text.chapterCount;
  const minutesLeft = chapter ? readingMinutes(chapter.words) : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.night, paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <IconButton icon={CaretLeftIcon} label="Back" onPress={goBack} />
        <View style={styles.barTitle}>
          <Text variant="caption" numberOfLines={1}>
            {classic.title}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            Chapter {index + 1} of {text.chapterCount}
          </Text>
        </View>
        <IconButton icon={TextAaIcon} label={`Text size, now ${size}`} tone="mist" onPress={cycleSize} />
        <IconButton
          icon={ListBulletsIcon}
          label="Contents"
          tone="mist"
          onPress={() => setContents((c) => !c)}
        />
      </View>
      <Hairline />

      {contents ? (
        <Contents
          classic={classic}
          text={text}
          current={index}
          onPick={goTo}
          onRemove={() =>
            Alert.alert(
              'Remove the text from this phone?',
              'The book stays on your shelf with its progress.',
              [
                { text: 'Keep it', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: async () => {
                    await removeClassicText(db, classic.id);
                    goBack();
                  },
                },
              ],
            )
          }
        />
      ) : (
        <ScrollView
          ref={scroll}
          onScroll={onScroll}
          scrollEventThrottle={250}
          onContentSizeChange={onContentSize}
          contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.xl * 2 }]}>
          {chapter ? (
            <>
              <Text variant="title" accessibilityRole="header">
                {chapter.title}
              </Text>
              {minutesLeft ? <Text variant="caption">About {minutesLeft} min</Text> : null}
              <View style={styles.paragraphs}>
                {chapter.paragraphs.map((p, i) => (
                  <Pressable
                    key={i}
                    haptic={false}
                    accessibilityHint="Long press to keep a quote"
                    onLongPress={() => quote(p)}
                    delayLongPress={450}>
                    <Text
                      style={{
                        fontFamily: fontFamily.serif,
                        fontSize: size,
                        lineHeight: Math.round(size * 1.6),
                        color: colors.starlight,
                      }}>
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.end}>
                <Hairline />
                <Text variant="caption">
                  {last ? 'The last chapter.' : 'Press and hold a paragraph to keep a quote.'}
                </Text>
                <View style={styles.start}>
                  <Button label={last ? 'Finish the book' : 'Next chapter'} onPress={finishChapter} />
                </View>
              </View>
            </>
          ) : (
            <ActivityIndicator style={styles.loading} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Contents({
  classic,
  text,
  current,
  onPick,
  onRemove,
}: {
  classic: Classic;
  text: ClassicText;
  current: number;
  onPick: (i: number) => void;
  onRemove: () => void;
}) {
  const db = useDb();
  const { colors } = useTheme();
  const { data: titles } = useLiveQuery(() => listChapterTitles(db, classic.id), ['classics'], [classic.id]);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text variant="heading">{classic.title}</Text>
      <Text variant="caption">
        {byline(classic)}. {text.chaptersRead} of {text.chapterCount} chapters read.
      </Text>
      <View style={styles.contents}>
        {(titles ?? []).map((c) => (
          <Pressable
            key={c.idx}
            haptic={false}
            accessibilityRole="button"
            accessibilityState={{ selected: c.idx === current }}
            onPress={() => onPick(c.idx)}
            style={styles.contentRow}>
            <Text tone={c.idx === current ? undefined : 'mist'} style={styles.contentTitle} numberOfLines={2}>
              {c.title}
            </Text>
            {c.idx < text.chaptersRead ? <CheckIcon size={16} color={colors.aurora} /> : null}
          </Pressable>
        ))}
      </View>
      <Pressable accessibilityRole="button" haptic={false} onPress={onRemove} style={styles.remove}>
        <Text tone="mist">Remove the text from this phone</Text>
      </Pressable>
    </ScrollView>
  );
}

/**
 * Time spent reading in the app counts like a lamp session: it fills
 * tonight's moon. The clock runs only while this screen is in front and the
 * app is open, and the time is saved when the reader leaves.
 */
function useReadingClock(bookId: string | null) {
  const db = useDb();
  const startedAt = useRef<Date | null>(null);
  const runningSince = useRef<number | null>(null);
  const seconds = useRef(0);
  const chapters = useRef(0);

  const pause = useCallback(() => {
    if (runningSince.current != null) {
      seconds.current += (Date.now() - runningSince.current) / 1000;
      runningSince.current = null;
    }
  }, []);
  const resume = useCallback(() => {
    if (runningSince.current == null) runningSince.current = Date.now();
    if (!startedAt.current) startedAt.current = new Date();
  }, []);

  const flush = useCallback(async () => {
    pause();
    const s = seconds.current;
    const c = chapters.current;
    const from = startedAt.current;
    seconds.current = 0;
    chapters.current = 0;
    startedAt.current = null;
    if (!from || (s < MIN_SESSION_SECONDS && c === 0)) return;
    await logSession(db, { bookId, startedAt: from, endedAt: new Date(), seconds: s, chaptersCompleted: c });
  }, [db, bookId, pause]);

  useFocusEffect(
    useCallback(() => {
      resume();
      const sub = AppState.addEventListener('change', (st) => (st === 'active' ? resume() : pause()));
      return () => {
        sub.remove();
        flush();
      };
    }, [resume, pause, flush]),
  );

  return {
    addChapters: (n: number) => {
      chapters.current += n;
    },
    flush,
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, gap: space.xs },
  barTitle: { flex: 1, alignItems: 'center' },
  page: { paddingHorizontal: space.gutter, paddingTop: space.lg, gap: space.sm },
  paragraphs: { gap: space.md, marginTop: space.lg },
  end: { gap: space.md, marginTop: space.xl },
  start: { alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  busy: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  loading: { marginTop: space.xl },
  contents: { marginTop: space.md },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  contentTitle: { flex: 1 },
  remove: { paddingVertical: space.lg, alignSelf: 'flex-start' },
});
