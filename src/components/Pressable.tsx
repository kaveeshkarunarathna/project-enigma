import * as Haptics from 'expo-haptics';
import { Pressable as RNPressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/theme/theme';
import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Light haptic on press. Always paired with the visible spring press. */
  haptic?: boolean;
};

/** A pressable with a soft spring press. Reduce Motion turns the spring off. */
export function Pressable({ style, haptic = true, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const { reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animated]}
      onPressIn={(e) => {
        if (!reduceMotion) scale.set(withSpring(motion.pressScale, motion.press));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduceMotion) scale.set(withSpring(1, motion.press));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
    />
  );
}
