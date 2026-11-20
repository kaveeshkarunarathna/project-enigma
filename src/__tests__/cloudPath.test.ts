import { cloudPath } from '@/components/art/cloudPath';

describe('cloudPath', () => {
  it('draws one closed outline with a flat base', () => {
    const d = cloudPath(
      [
        [20, 30, 15],
        [44, 20, 20],
      ],
      { base: 44 },
    );
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/M/g)).toHaveLength(1);
    expect(d).toContain(' 44 Z');
  });

  it('never rises above the tallest puff', () => {
    const d = cloudPath([[50, 30, 20]], { base: 50 });
    const ys = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(10 - 0.01);
  });

  it('keeps a shelf level across a bank', () => {
    const d = cloudPath([[0, 40, 30]], { base: 100, shelf: { y: 50, from: 0, to: 200 } });
    const xs = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...xs)).toBeCloseTo(200, 0);
  });

  it('returns nothing when no puff rises above the base', () => {
    expect(cloudPath([[10, 50, 5]], { base: 40 })).toBe('');
  });
});
