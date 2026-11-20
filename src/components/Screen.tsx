import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { IconButton } from './IconButton';
import { Rise } from './motion/Rise';
import { CaretLeftIcon } from './icons';
import { StarField } from './StarField';
import { Text } from './Text';
import { useTheme } from '@/theme/theme';
import { motion, space } from '@/theme/tokens';

/** Room left at the bottom for the floating tab bar. */
export const TAB_BAR_SPACE = 96;

type Props = {
  title: string;
  /** One italic line under the title. */
  caption?: string;
  children?: ReactNode;
  scroll?: boolean;
  /** Element shown to the right of the title, such as an add button. */
  accessory?: ReactNode;
  /** Set false for pushed screens that have no tab bar. */
  tabBar?: boolean;
  /** Shows a back button above the title. Implies no tab bar. */
  back?: boolean;
};

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Standard screen: night background, sparse stars, Gloock title, 20pt gutters. */
export function Screen({
  title,
  caption,
  children,
  scroll = true,
  accessory,
  back = false,
  tabBar = !back,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + space.xl,
    paddingBottom: (tabBar ? TAB_BAR_SPACE : space.xl) + insets.bottom,
  };

  const header = (
    <Rise style={styles.headerBlock}>
      {back ? (
        <View style={styles.back}>
          <IconButton icon={CaretLeftIcon} label="Back" onPress={goBack} />
        </View>
      ) : null}
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {caption ? (
            <Text variant="caption" style={styles.caption}>
              {caption}
            </Text>
          ) : null}
        </View>
        {accessory}
      </View>
    </Rise>
  );
  // The body settles a beat after the title, as one piece; never card by card.
  const body = (
    <Rise delay={motion.stagger} style={styles.body}>
      {children}
    </Rise>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.night }]}>
      <StarField />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, padding]}
          keyboardShouldPersistTaps="handled">
          {header}
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, padding]}>
          {header}
          {body}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.gutter, gap: space.xl },
  headerBlock: { gap: space.sm },
  body: { gap: space.xl },
  back: { marginLeft: -space.md, marginTop: -space.md },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  caption: { marginTop: space.xs },
});
