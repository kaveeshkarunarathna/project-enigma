import { Text as RNText, type TextProps } from 'react-native';

import { useTheme } from '@/theme/theme';
import { type TypeVariant, type } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TypeVariant;
  /** Colour role from the palette. Defaults to starlight for text, mist for captions and labels. */
  tone?: 'starlight' | 'mist' | 'aurora' | 'onStarlight';
};

export function Text({ variant = 'body', tone, style, ...rest }: Props) {
  const { colors } = useTheme();
  const resolvedTone = tone ?? (variant === 'caption' || variant === 'label' ? 'mist' : 'starlight');
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={1.6}
      style={[type[variant], { color: colors[resolvedTone] }, style]}
    />
  );
}
