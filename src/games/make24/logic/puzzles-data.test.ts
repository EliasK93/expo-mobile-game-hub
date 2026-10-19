import puzzles from '../data/puzzles.json';
import { fracs } from './fraction';
import { LEVEL_IDS, isPuzzle } from './game';
import { needsFraction, solution, ways } from './solve';

const pool = puzzles as Record<string, number[][]>;
const POOL_SIZE = 1362;
// ponytail: checks every 10th puzzle per level for ways and fractions (the ordering); set to 1 to check them all after a rebuild
const SAMPLE_EVERY = 10;
const sample = (level: string) => pool[level].filter((_, i) => i % SAMPLE_EVERY === 0);
const waysOf = (list: number[][]) => list.map(ways);

describe('puzzle pool data', () => {
  it('has exactly the three levels', () => {
    expect(Object.keys(pool).sort()).toEqual([...LEVEL_IDS].sort());
  });

  it.each(LEVEL_IDS)('%s: every entry is a sorted puzzle', (level) => {
    for (const p of pool[level]) {
      expect(isPuzzle(p)).toBe(true);
      expect(p).toEqual([...p].sort((a, b) => a - b));
    }
  });

  it('has no duplicate within or across levels, 1,362 in total, the levels within 1 in size', () => {
    const all = LEVEL_IDS.flatMap((l) => pool[l].map((p) => p.join(' ')));
    expect(all).toHaveLength(POOL_SIZE);
    expect(new Set(all).size).toBe(POOL_SIZE);
    const sizes = LEVEL_IDS.map((l) => pool[l].length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it('every puzzle has a solution', () => {
    for (const l of LEVEL_IDS) for (const p of pool[l]) expect(solution(fracs(p))).not.toBeNull();
  });

  it('no Easy or Medium puzzle needs a fraction', () => {
    for (const l of ['easy', 'medium'] as const) for (const p of sample(l)) expect(needsFraction(p)).toBe(false);
  });

  it('Easy is no harder than Medium, Medium no harder than Hard without fractions (by ways, every 10th)', () => {
    const easy = Math.min(...waysOf(sample('easy')));
    const medium = Math.max(...waysOf(sample('medium')));
    const hard = Math.max(...waysOf(sample('hard').filter((p) => !needsFraction(p))));
    expect(easy).toBeGreaterThanOrEqual(medium);
    expect(medium).toBeGreaterThanOrEqual(hard);
  });

  it.each([
    [3, 3, 8, 8],
    [1, 5, 5, 5],
    [3, 3, 7, 7],
    [4, 4, 7, 7],
  ])('the classic hard puzzle %i %i %i %i is in Hard', (...p) => {
    expect(pool.hard.some((h) => h.join() === p.join())).toBe(true);
  });
});
