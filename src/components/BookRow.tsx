import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BookCover } from './BookCover';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { space } from '@/theme/tokens';

type Props = {
  title: string;
  author: string | null;
  coverUrl: string | null;
  /** One italic line, for example a year or progress. */
  caption?: string | null;
  onPress?: () => void;
  accessory?: ReactNode;
  accessibilityHint?: string;
};

export function BookRow({ title, author, coverUrl, caption, onPress, accessory, accessibilityHint }: Props) {
  const body = (
    <View style={styles.row}>
      <BookCover uri={coverUrl} title={title} width={48} />
      <View style={styles.text}>
        <Text variant="heading" numberOfLines={2}>
          {title}
        </Text>
        {author ? (
          <Text tone="mist" numberOfLines={1}>
            {author}
          </Text>
        ) : null}
        {caption ? <Text variant="caption">{caption}</Text> : null}
      </View>
      {accessory}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, author, caption].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      onPress={onPress}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md },
  text: { flex: 1, gap: 2 },
});
