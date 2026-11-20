import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { IconButton } from './IconButton';
import { Rise } from './motion/Rise';
import { CaretLeftIcon } from './icons';
import { Crescent } from './art/Crescent';
import { SkyBackdrop } from './art/SkyBackdrop';
import { Text } from './Text';
import { motion, space } from '@/theme/tokens';

/** Room left at the bottom for the floating tab bar. */
export const TAB_BAR_SPACE = 112;

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
  /** Set false to keep the moon and clouds out of a busy screen; stars stay. */
  illustrated?: boolean;
  /**
   * Where the crescent moon goes: beside the title (when there is no
   * accessory there), up in the sky behind the content, or nowhere.
   */
  moon?: 'header' | 'sky' | 'none';
};

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Standard screen: the illustrated night sky, a wide-tracked Lato title, 20pt gutters. */
export function Screen({
  title,
  caption,
  children,
  scroll = true,
  accessory,
  back = false,
  tabBar = !back,
  illustrated = true,
  moon = 'header',
}: Props) {
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
        {accessory ??
          (illustrated && moon === 'header' ? (
            <View style={styles.moon}>
              <Crescent size={26} />
            </View>
          ) : null)}
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
    <View style={styles.flex}>
      <SkyBackdrop scene={title} illustrated={illustrated} moon={moon === 'sky'} />
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
  moon: { alignSelf: 'flex-start', marginTop: space.xs, marginRight: space.xs },
  caption: { marginTop: space.xs, maxWidth: 320 },
});
