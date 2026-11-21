import { useRef, useState } from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { listBooks } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { cardSessions, readingNights } from '@/data/sessions';
import { DEFAULT_SETTINGS, getSettings } from '@/data/settings';
import {
  CARD_PIXELS,
  CARD_SIZE,
  cardSummary,
  periodLabel,
  periodStart,
  type CardPeriod,
  type CardShape,
} from '@/domain/skyCard';
import { nightKey } from '@/domain/time';
import { SkyCard, type CardView } from '@/features/share/SkyCard';
import { CAN_SHARE_CARD, shareCard } from '@/features/share/shareCard';
import { space } from '@/theme/tokens';

/**
 * A picture of the reader's sky to share: a story (9:16) or a square, this
 * month or all time, book titles only if they turn them on. Made on the
 * phone; it leaves only through the share sheet, wherever the reader sends it.
 */
export default function SkyCardScreen() {
  const db = useDb();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const today = nightKey();
  const [shape, setShape] = useState<CardShape>('story');
  const [period, setPeriod] = useState<CardPeriod>('month');
  const [showTitles, setShowTitles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const captureRef = useRef<CardView>(null);

  const { data: nights } = useLiveQuery(() => readingNights(db), ['sessions']);
  const { data: sessions } = useLiveQuery(() => cardSessions(db, null), ['sessions']);
  const { data: books } = useLiveQuery(() => listBooks(db), ['books']);
  const { data: settings } = useLiveQuery(() => getSettings(db), ['settings']);
  const goalMinutes = (settings ?? DEFAULT_SETTINGS).goalMinutes;

  const summary = cardSummary(sessions ?? [], books ?? [], period, today);
  const from = periodStart(period, today);
  const label = periodLabel(period, today);
  const sky = (nights ?? []).map((n) => ({ night: n.night, seconds: n.seconds }));

  // The preview fits the screen; the copy that becomes the image is drawn at
  // full size (1080 pixels wide) behind the screen, so it is sharp.
  const size = CARD_SIZE[shape];
  const maxW = screenW - space.gutter * 2;
  const maxH = Math.max(280, screenH - insets.top - insets.bottom - 400);
  const previewW = Math.min(maxW, (maxH * size.width) / size.height, shape === 'square' ? 320 : 360);
  const fullW = CARD_PIXELS[shape].width / PixelRatio.get();

  const card = (width: number, ref?: typeof captureRef) => (
    <SkyCard
      ref={ref}
      shape={shape}
      width={width}
      nights={sky}
      from={from}
      summary={summary}
      period={label}
      showTitles={showTitles}
      goalMinutes={goalMinutes}
    />
  );

  return (
    <View style={styles.root}>
      {CAN_SHARE_CARD ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.capture}>
          {card(fullW, captureRef)}
        </View>
      ) : null}
      <Screen back title="Share your sky" moon="none" illustrated={false}>
        <View style={styles.preview}>
          <View style={styles.frame}>{card(previewW)}</View>
        </View>

        <View style={styles.options}>
          <View style={styles.chips} accessibilityRole="radiogroup">
            <Chip
              label="Story"
              selected={shape === 'story'}
              onPress={() => setShape('story')}
              accessibilityLabel="Story, tall 9 by 16"
            />
            <Chip label="Square" selected={shape === 'square'} onPress={() => setShape('square')} />
          </View>
          <View style={styles.chips} accessibilityRole="radiogroup">
            <Chip label="This month" selected={period === 'month'} onPress={() => setPeriod('month')} />
            <Chip label="All time" selected={period === 'all'} onPress={() => setPeriod('all')} />
          </View>
          <View style={styles.chips}>
            <Chip
              label="Book titles"
              selected={showTitles}
              onPress={() => setShowTitles((v) => !v)}
              accessibilityLabel={
                showTitles ? 'Book titles shown. Tap to hide them' : 'Book titles hidden. Tap to show them'
              }
            />
          </View>
        </View>

        <View style={styles.share}>
          <Button
            label={busy ? 'Making your image…' : 'Share'}
            disabled={busy || !CAN_SHARE_CARD || !sky.length}
            accessibilityHint="Opens the share sheet with this picture"
            onPress={async () => {
              setBusy(true);
              setNote(null);
              try {
                const ok = await shareCard(captureRef, shape);
                if (!ok) setNote('Sharing is not available on this device.');
              } catch {
                setNote('The picture could not be made. Please try again.');
              } finally {
                setBusy(false);
              }
            }}
          />
          <Text variant="caption" style={styles.center}>
            {note ??
              (!CAN_SHARE_CARD
                ? 'Open the app on your phone to share.'
                : !sky.length
                  ? 'Read for a few minutes and your first star appears.'
                  : 'Made on your phone. No journal words or quotes.')}
          </Text>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  capture: { position: 'absolute', top: 0, left: 0 },
  preview: { alignItems: 'center' },
  frame: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  options: { gap: space.sm, alignItems: 'center' },
  chips: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
  share: { gap: space.sm },
  center: { textAlign: 'center' },
});
