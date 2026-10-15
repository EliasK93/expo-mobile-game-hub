import { fill, shuffle } from './generate';
import { mulberry32 } from './random';
import { isSolved } from './validate';

// generateLevel is tested in generate-level.test.ts; this file covers the two helpers it builds on.
describe('fill', () => {
  it.each([1, 2, 3])('seed %i: fills an empty grid with a valid solved grid', (seed) => {
    const g = new Array<number>(81).fill(0);
    expect(fill(g, mulberry32(seed))).toBe(true);
    expect(isSolved(g)).toBe(true);
  });

  it('gives the same grid for the same seed and different grids for different seeds', () => {
    const grid = (seed: number) => {
      const g = new Array<number>(81).fill(0);
      fill(g, mulberry32(seed));
      return g.join('');
    };
    expect(grid(9)).toBe(grid(9));
    expect(grid(1)).not.toBe(grid(2));
  });
});

describe('shuffle', () => {
  it('keeps the same items, in place, and is repeatable for one seed', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(shuffle(items, mulberry32(4))).toBe(items);
    expect([...items].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], mulberry32(4))).toEqual(items);
  });
});
