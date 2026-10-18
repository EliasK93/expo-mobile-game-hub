import { mulberry32 } from '@/lib/random';
import { LEVELS, LEVEL_IDS, cellCount, neighbours, type Level } from './board';
import { placeMines } from './generate';

// The cells a first tap can land on: the 4 corners, the middle of the 4 edges and the centre.
function spots(level: Level): number[] {
  const { cols, rows } = LEVELS[level];
  const midCol = Math.floor(cols / 2);
  const midRow = Math.floor(rows / 2);
  const last = (rows - 1) * cols;
  return [0, cols - 1, last, last + cols - 1, midCol, last + midCol, midRow * cols, midRow * cols + cols - 1, midRow * cols + midCol];
}

const indices = (mines: boolean[]) => mines.flatMap((m, i) => (m ? [i] : []));

describe('placeMines', () => {
  it.each(LEVEL_IDS)('%s: exactly the level\'s mines, none on the safe cell or its neighbours, for many seeds and every kind of first tap', (level) => {
    for (const safe of spots(level)) {
      const clear = [safe, ...neighbours(level, safe)];
      for (let seed = 1; seed <= 20; seed++) {
        const mines = placeMines(level, safe, mulberry32(seed));
        expect(mines).toHaveLength(cellCount(level));
        expect(indices(mines)).toHaveLength(LEVELS[level].mines);
        for (const i of clear) expect(mines[i]).toBe(false);
      }
    }
  });

  it('the same seed gives the same board', () => {
    expect(placeMines('expert', 44, mulberry32(5))).toEqual(placeMines('expert', 44, mulberry32(5)));
  });

  it('different seeds give different boards', () => {
    expect(placeMines('expert', 44, mulberry32(5))).not.toEqual(placeMines('expert', 44, mulberry32(6)));
  });

  it('with enough seeds every candidate cell gets a mine at some point (no cell is left out of the shuffle)', () => {
    const everMined = new Set<number>();
    for (let seed = 1; seed <= 300; seed++) for (const i of indices(placeMines('beginner', 40, mulberry32(seed)))) everMined.add(i);
    const clear = new Set([40, ...neighbours('beginner', 40)]);
    for (let i = 0; i < cellCount('beginner'); i++) expect(everMined.has(i)).toBe(!clear.has(i));
  });
});
