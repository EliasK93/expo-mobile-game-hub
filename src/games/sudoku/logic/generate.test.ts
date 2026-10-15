import { formatGrid } from './board';
import { generate } from './generate';
import { mulberry32 } from './random';
import { countSolutions, solve } from './solve';
import { isSolved } from './validate';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const givensOf = (g: readonly number[]) => g.filter((v) => v !== 0).length;

describe('generate', () => {
  const times: number[] = [];
  const counts: number[] = [];

  it.each(SEEDS)('seed %i: unique, consistent puzzle with ~32 givens', (seed) => {
    const t0 = Date.now();
    const { puzzle, solution } = generate({ random: mulberry32(seed) });
    times.push(Date.now() - t0);

    expect(countSolutions(puzzle, 2)).toBe(1);
    expect(formatGrid(solve(puzzle)!)).toBe(formatGrid(solution));
    expect(isSolved(solution)).toBe(true);
    puzzle.forEach((v, i) => {
      if (v !== 0) expect(v).toBe(solution[i]);
    });

    const n = givensOf(puzzle);
    counts.push(n);
    expect(n).toBeGreaterThanOrEqual(32);
    expect(n).toBeLessThanOrEqual(40);
  });

  it('gives the same puzzle for the same seed', () => {
    const a = generate({ random: mulberry32(99) });
    const b = generate({ random: mulberry32(99) });
    expect(formatGrid(a.puzzle)).toBe(formatGrid(b.puzzle));
    expect(formatGrid(a.solution)).toBe(formatGrid(b.solution));
  });

  it('gives different puzzles for different seeds', () => {
    const a = generate({ random: mulberry32(1) });
    const b = generate({ random: mulberry32(2) });
    expect(formatGrid(a.puzzle)).not.toBe(formatGrid(b.puzzle));
  });

  it('respects a custom givens target', () => {
    const { puzzle } = generate({ givens: 40, random: mulberry32(5) });
    expect(givensOf(puzzle)).toBe(40);
  });

  afterAll(() => {
    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    // Data point for the M6 decision (UI-thread blocking); not an assertion.
    console.log(
      `GENERATION avg=${avg.toFixed(0)}ms max=${Math.max(...times)}ms givens min=${Math.min(
        ...counts,
      )} max=${Math.max(...counts)} (n=${times.length})`,
    );
  });
});
