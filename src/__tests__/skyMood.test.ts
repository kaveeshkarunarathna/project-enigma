import { skyMood } from '@/domain/skyMood';

describe('skyMood', () => {
  it('is deepest around midnight', () => {
    expect(skyMood(0)).toEqual(skyMood(23));
    expect(skyMood(0).band).toBe(1);
  });

  it('is purple at dusk and blends into the night', () => {
    const dusk = skyMood(18);
    const late = skyMood(20.5);
    expect(dusk.top).not.toBe(skyMood(0).top);
    expect(late.top).not.toBe(dusk.top);
    expect(late.top).not.toBe(skyMood(0).top);
  });

  it('lightens towards dawn', () => {
    expect(skyMood(5.9).floor).not.toBe(skyMood(2).floor);
  });

  it('keeps the night palette in the daytime and wraps hours', () => {
    expect(skyMood(12)).toEqual(skyMood(0));
    expect(skyMood(24 + 18)).toEqual(skyMood(18));
  });

  it('returns valid hex colours', () => {
    for (let h = 0; h < 24; h += 0.5) {
      const m = skyMood(h);
      for (const c of [m.top, m.mid, m.floor]) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
