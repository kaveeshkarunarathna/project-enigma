import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Hairline } from './Hairline';
import { Text } from './Text';
import { space } from '@/theme/tokens';

/** A titled group: italic caption heading, hairline, then the content. */
export function Section({
  title,
  children,
  accessory,
}: {
  title: string;
  children: ReactNode;
  accessory?: ReactNode;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text variant="caption" style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {accessory}
      </View>
      <Hairline />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  title: { flex: 1 },
});
