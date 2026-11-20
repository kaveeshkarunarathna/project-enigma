import { useEffect, useRef, useState } from 'react';

import { Text } from '../Text';
import { countAt } from '@/domain/motion';
import { useTheme } from '@/theme/theme';
import { motion } from '@/theme/tokens';

type Props = Omit<React.ComponentProps<typeof Text>, 'children'> & {
  value: number;
};

/**
 * A number that counts to its value, easing out as it arrives: from zero
 * when it first appears, and from the old value when it changes. Screen
 * readers only hear the final number. Instant under Reduce Motion.
 */
export function CountUp({ value, ...rest }: Props) {
  const { reduceMotion } = useTheme();
  const [shown, setShown] = useState(reduceMotion ? value : 0);
  const from = useRef(reduceMotion ? value : 0);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;
    let frame = 0;
    const began = Date.now();
    const tick = () => {
      const t = reduceMotion ? 1 : (Date.now() - began) / motion.count;
      setShown(countAt(start, value, t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value, reduceMotion]);

  return (
    <Text {...rest} accessibilityLabel={String(value)}>
      {shown}
    </Text>
  );
}
