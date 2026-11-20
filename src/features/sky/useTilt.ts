import { DeviceMotion } from 'expo-sensors';
import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { useTheme } from '@/theme/theme';

/** How far (radians) the phone tilts before a layer reaches its full shift. */
const RANGE = 0.45;
/** Share of each reading taken, so movement is soft and never jittery. */
const EASE = 0.12;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * The phone's tilt as two values from -1 to 1, relative to how it was held
 * when the sky opened. Layers of the sky shift by it to feel deep. Stays at
 * 0 under Reduce Motion, on the web, or without a motion sensor.
 */
export function useTilt(enabled = true): { x: SharedValue<number>; y: SharedValue<number> } {
  const { reduceMotion } = useTheme();
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!enabled || reduceMotion) {
      x.set(0);
      y.set(0);
      return;
    }
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    let rest: { beta: number; gamma: number } | null = null;
    DeviceMotion.isAvailableAsync()
      .then((ok) => {
        if (!ok || cancelled) return;
        DeviceMotion.setUpdateInterval(50);
        sub = DeviceMotion.addListener(({ rotation }) => {
          if (!rotation) return;
          rest ??= { beta: rotation.beta, gamma: rotation.gamma };
          // The resting angle drifts slowly towards how the phone is held now.
          rest.beta += (rotation.beta - rest.beta) * 0.004;
          rest.gamma += (rotation.gamma - rest.gamma) * 0.004;
          const tx = clamp((rotation.gamma - rest.gamma) / RANGE);
          const ty = clamp((rotation.beta - rest.beta) / RANGE);
          x.set(x.get() + (tx - x.get()) * EASE);
          y.set(y.get() + (ty - y.get()) * EASE);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled, reduceMotion, x, y]);

  return { x, y };
}
