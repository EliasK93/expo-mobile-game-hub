import { formatGrid } from './board';
import { generateLevel } from './generate';
import { mulberry32 } from '@/lib/random';
import { rate } from './rate';
import { countSolutions, solve } from './solve';
import { LEVELS, type Level } from './techniques';
import { isSolved } from './validate';

const run = (level: Level, seed: number) => generateLevel(level, mulberry32(seed));

// A few seeds per level: the gate runs this on every commit. The full measurement is measure.test.ts.
const CASES = LEVELS.flatMap((level) => (level >= 4 ? [1] : [1, 2]).map((seed) => [level, seed] as const));

describe('generateLevel', () => {
  it.each(CASES)('level %i, seed %i: a unique puzzle that needs exactly that level', (level, seed) => {
    const { puzzle, solution, attempts } = run(level as Level, seed);

    expect(countSolutions(puzzle, 2)).toBe(1);
    expect(formatGrid(solve(puzzle)!)).toBe(formatGrid(solution));
    expect(isSolved(solution)).toBe(true);
    puzzle.forEach((v, i) => v !== 0 && expect(v).toBe(solution[i]));

    expect(rate(puzzle)).toBe(level); // solvable by logic, using the level's techniques and no more
    if (level > 1) expect(rate(puzzle, (level - 1) as Level)).toBeNull(); // and it really needs the level
    expect(attempts).toBeGreaterThanOrEqual(1);
  }, 120000);

  it('gives the same puzzle for the same seed', () => {
    expect(formatGrid(run(3, 7).puzzle)).toBe(formatGrid(run(3, 7).puzzle));
  });
});
