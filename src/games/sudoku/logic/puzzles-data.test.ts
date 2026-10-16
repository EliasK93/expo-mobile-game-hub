import puzzles from '../data/puzzles.json';
import { parseGrid } from './board';
import { rate } from './rate';
import { countSolutions } from './solve';
import { LEVELS, type Level } from './techniques';

const pool = puzzles as Record<string, string[]>;
const POOL_SIZE = 1000;
// ponytail: rates every 10th puzzle (100 per level, about 1.6 s) because all 5000 take about 16 s; set to 1 to check them all after a rebuild
const SAMPLE_EVERY = 10;

describe('puzzle pool data', () => {
  it('has exactly the five levels', () => {
    expect(Object.keys(pool).sort()).toEqual(LEVELS.map(String));
  });

  it.each(LEVELS)('level %i: 1000 unique strings of 81 digits', (level) => {
    const list = pool[level];
    expect(list).toHaveLength(POOL_SIZE);
    expect(new Set(list).size).toBe(POOL_SIZE);
    for (const s of list) expect(s).toMatch(/^[0-9]{81}$/);
  });

  it('no puzzle appears at two levels', () => {
    expect(new Set(LEVELS.flatMap((l) => pool[l])).size).toBe(LEVELS.length * POOL_SIZE);
  });

  it.each(LEVELS)('level %i: every 10th puzzle has one solution and rates exactly the level', (level) => {
    for (let i = 0; i < POOL_SIZE; i += SAMPLE_EVERY) {
      const grid = parseGrid(pool[level][i]);
      expect(countSolutions(grid, 2)).toBe(1);
      expect(rate(grid)).toBe(level);
      if (level > 1) expect(rate(grid, (level - 1) as Level)).toBeNull(); // and it really needs the level
    }
  }, 60000);
});
