import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme';

/** The thin separator the minimal look uses instead of card boxes. */
export function Hairline() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline }} />;
}
