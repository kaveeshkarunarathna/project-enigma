import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme/theme';
import { radius } from '@/theme/tokens';

type Props = {
  uri: string | null;
  title: string;
  width?: number;
};

/**
 * A book cover at 2:3. When there is no cover (or it fails to load) a quiet
 * night tile with the title's first letter stands in, so lists never show a
 * broken image.
 */
export function BookCover({ uri, title, width = 56 }: Props) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const height = Math.round(width * 1.5);
  const showImage = uri && !failed;

  return (
    <View
      accessible={false}
      style={[styles.frame, { width, height, backgroundColor: colors.raised, borderColor: colors.hairline }]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text variant="title" tone="mist" style={{ fontSize: width * 0.45, lineHeight: width * 0.55 }}>
          {title.trim().charAt(0).toUpperCase() || '·'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.sm / 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
