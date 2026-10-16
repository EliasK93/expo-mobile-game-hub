import { formatGrid, parseGrid } from './board';
import puzzles from '../data/puzzles.json';
import { pickPuzzle, transform } from './pool';
import { mulberry32 } from './random';
import { rate } from './rate';
import { countSolutions, solve } from './solve';
import { LEVELS, type Level } from './techniques';

// Two real pool puzzles per level, so the checks run on what the app ships.
const pool = puzzles as Record<string, string[]>;
const FIXED = LEVELS.flatMap((level) => [0, 1].map((i) => [level, pool[level][i]] as const));
const givens = (g: readonly number[]) => g.filter((v) => v !== 0).length;

describe('transform', () => {
  it.each(FIXED)('level %i: stays unique, keeps its rating and its number of givens', (level, text) => {
    const grid = parseGrid(text);
    for (const seed of [1, 2, 3]) {
      const t = transform(grid, mulberry32(seed));
      expect(countSolutions(t, 2)).toBe(1);
      expect(rate(t)).toBe(level);
      expect(givens(t)).toBe(givens(grid));
    }
  });

  it('gives the same result for the same seed, and different results for different seeds', () => {
    const grid = parseGrid(pool[3][0]);
    expect(formatGrid(transform(grid, mulberry32(7)))).toBe(formatGrid(transform(grid, mulberry32(7))));
    expect(formatGrid(transform(grid, mulberry32(7)))).not.toBe(formatGrid(transform(grid, mulberry32(8))));
  });

  it('does not change the grid it is given', () => {
    const grid = parseGrid(pool[1][0]);
    transform(grid, mulberry32(1));
    expect(formatGrid(grid)).toBe(pool[1][0]);
  });
});

describe('pickPuzzle', () => {
  it.each(LEVELS)('level %i: a valid puzzle with its solution, rated at the level', (level) => {
    const { puzzle, solution } = pickPuzzle(level as Level, mulberry32(level));

    expect(countSolutions(puzzle, 2)).toBe(1);
    expect(formatGrid(solve(puzzle)!)).toBe(formatGrid(solution));
    puzzle.forEach((v, i) => v !== 0 && expect(v).toBe(solution[i]));
    expect(rate(puzzle)).toBe(level);
  });

  it('is repeatable with the same seed', () => {
    expect(pickPuzzle(2, mulberry32(5))).toEqual(pickPuzzle(2, mulberry32(5)));
  });
});
