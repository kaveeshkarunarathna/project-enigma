/// <reference types="jest" />
import { countAt, easeOutCubic, twinkle, TWINKLE_GROUPS } from '@/domain/motion';

describe('twinkle', () => {
  it('softens a star but never lets it go dark', () => {
    for (let g = 0; g < TWINKLE_GROUPS; g++) {
      for (let i = 0; i <= 1000; i++) {
        const v = twinkle(i / 1000, g);
        expect(v).toBeGreaterThanOrEqual(0.82 - 1e-9);
        expect(v).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it('loops without a seam', () => {
    for (let g = 0; g < TWINKLE_GROUPS; g++) {
      expect(twinkle(1, g)).toBeCloseTo(twinkle(0, g), 9);
    }
  });

  it('gives each group its own phase', () => {
    const starts = Array.from({ length: TWINKLE_GROUPS }, (_, g) => twinkle(0, g).toFixed(4));
    expect(new Set(starts).size).toBe(TWINKLE_GROUPS);
  });
});

describe('counting up', () => {
  it('eases out and stays in range', () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
  });

  it('lands exactly on the value, in whole numbers', () => {
    expect(countAt(0, 214, 0)).toBe(0);
    expect(countAt(0, 214, 1)).toBe(214);
    expect(countAt(10, 3, 1)).toBe(3);
    expect(Number.isInteger(countAt(0, 7, 0.37))).toBe(true);
  });

  it('never runs backwards on the way up', () => {
    let prev = 0;
    for (let i = 0; i <= 50; i++) {
      const v = countAt(0, 90, i / 50);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
