import { mulberry32 } from '@/lib/random';
import { CELLS, cell } from './board';
import { placeApple } from './apple';

const SNAKE = [cell(7, 12), cell(7, 13), cell(7, 14)];

// Every cell except the given ones: a snake that fills the board but for those cells.
const allBut = (...free: number[]) => Array.from({ length: CELLS }, (_, i) => i).filter((i) => !free.includes(i));

describe('placeApple', () => {
  it('always lands on an empty cell of the board, for many seeds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const apple = placeApple(SNAKE, mulberry32(seed));
      expect(apple).not.toBeNull();
      expect(Number.isInteger(apple)).toBe(true);
      expect(apple).toBeGreaterThanOrEqual(0);
      expect(apple).toBeLessThan(CELLS);
      expect(SNAKE).not.toContain(apple);
    }
  });

  it('takes the only empty cell there is', () => {
    for (const free of [0, 100, CELLS - 1]) expect(placeApple(allBut(free), mulberry32(3))).toBe(free);
  });

  it('is null when the snake fills the board', () => {
    expect(placeApple(allBut(), mulberry32(3))).toBeNull();
  });

  it('is uniform over the empty cells: the lowest random picks the first, the highest the last', () => {
    expect(placeApple(SNAKE, () => 0)).toBe(0);
    expect(placeApple(SNAKE, () => 0.9999999)).toBe(CELLS - 1);
    expect(placeApple(allBut(4, 9, 20), () => 0.5)).toBe(9);
  });

  it('the same seed gives the same apple, different seeds give different ones', () => {
    expect(placeApple(SNAKE, mulberry32(5))).toBe(placeApple(SNAKE, mulberry32(5)));
    const seen = new Set(Array.from({ length: 20 }, (_, seed) => placeApple(SNAKE, mulberry32(seed))));
    expect(seen.size).toBeGreaterThan(5);
  });

  it('with enough seeds every empty cell gets the apple at some point, and no other', () => {
    const free = [3, 50, 120, 200, 314];
    const seen = new Set<number | null>();
    for (let seed = 1; seed <= 300; seed++) seen.add(placeApple(allBut(...free), mulberry32(seed)));
    expect([...seen].sort((a, b) => (a as number) - (b as number))).toEqual(free);
  });

  it('does not change the snake it is given', () => {
    const snake = [...SNAKE];
    placeApple(snake, mulberry32(1));
    expect(snake).toEqual(SNAKE);
  });
});
