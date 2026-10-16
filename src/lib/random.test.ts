import { mulberry32, shuffle } from './random';

describe('random', () => {
  it('gives the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('differs between seeds and stays in [0, 1)', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('shuffle keeps the same items, in place, and is repeatable for one seed', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(shuffle(items, mulberry32(4))).toBe(items);
    expect([...items].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], mulberry32(4))).toEqual(items);
  });
});
