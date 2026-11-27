import { closeUpScale, hitProjected, igniteAt, orbitPoints, project, solidOfBox } from '@/domain/orbit';

describe('constellation close-up', () => {
  it('leaves a point in place with no turn, and shrinks far points', () => {
    expect(project({ x: 10, y: -5, z: 0 }, 0, 0)).toEqual({ x: 10, y: -5, z: 0, s: 1 });
    const far = project({ x: 10, y: 0, z: 200 }, 0, 0);
    const near = project({ x: 10, y: 0, z: -200 }, 0, 0);
    expect(far.s).toBeLessThan(1);
    expect(near.s).toBeGreaterThan(1);
    expect(Math.abs(far.x)).toBeLessThan(Math.abs(near.x));
  });

  it('swings near stars past far ones as it turns', () => {
    const turn = Math.PI / 2;
    // A quarter turn brings a point from the right towards the reader.
    const p = project({ x: 100, y: 0, z: 0 }, turn, 0);
    expect(p.z).toBeCloseTo(-100);
    expect(p.x).toBeCloseTo(0);
  });

  it('gives the shape depth about its middle, as deep as it is wide', () => {
    const stars = [
      { x: 0, y: 0, z: 0.2 },
      { x: 100, y: 50, z: 0.8 },
    ];
    const solid = solidOfBox(stars, { x: 0, y: 0, w: 100, h: 50 });
    expect(solid[0]).toMatchObject({ x: -50, y: -25 });
    expect(solid[0].z).toBeCloseTo(-45);
    expect(solid[1]).toMatchObject({ x: 50, y: 25 });
    expect(solid[1].z).toBeCloseTo(45);
  });

  it('draws only the read part of an orbit', () => {
    const whole = orbitPoints(100, 0.3, 0, 0.2, 40);
    const half = orbitPoints(100, 0.3, 0, 0.2, 40, 0, 0.5);
    expect(whole).toHaveLength(41);
    expect(half).toHaveLength(21);
    // Both start at the same place: the top of the ring.
    expect(half[0].x).toBeCloseTo(whole[0].x);
    expect(half[0].y).toBeCloseTo(whole[0].y);
  });

  it('lights stars one after another', () => {
    expect(igniteAt(0, 0)).toBe(0);
    expect(igniteAt(0.5, 0)).toBe(0.5);
    expect(igniteAt(1.5, 1)).toBe(0.5);
    expect(igniteAt(1.5, 2)).toBe(0);
    expect(igniteAt(9, 2)).toBe(1);
  });

  it('fits the shape to the view within limits', () => {
    expect(closeUpScale({ w: 200, h: 100 }, { width: 400, height: 600 })).toBeCloseTo(1.48);
    expect(closeUpScale({ w: 10, h: 10 }, { width: 400, height: 600 })).toBe(2.2);
  });

  it('finds the star nearest a tap', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ];
    expect(hitProjected(pts, 30, 2, 20)).toBe(1);
    expect(hitProjected(pts, 200, 200, 20)).toBe(-1);
  });
});
