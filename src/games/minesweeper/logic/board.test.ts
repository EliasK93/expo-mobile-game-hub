import { LEVELS, LEVEL_IDS, cellCount, counts, neighbours, type Level } from './board';

// neighbours in ascending order, so a test does not depend on the order they come in.
const around = (level: Level, i: number) => neighbours(level, i).sort((a, b) => a - b);

const LAST = cellCount('beginner') - 1; // the bottom-right corner of Beginner (8 columns)

describe('LEVELS', () => {
  it('has the three levels, cols × rows and mines as agreed', () => {
    expect(LEVEL_IDS).toEqual(['beginner', 'intermediate', 'expert']);
    expect(LEVELS).toEqual({
      beginner: { cols: 8, rows: 12, mines: 12 },
      intermediate: { cols: 10, rows: 15, mines: 24 },
      expert: { cols: 12, rows: 18, mines: 45 },
    });
  });

  it('cellCount is cols × rows', () => {
    expect(LEVEL_IDS.map(cellCount)).toEqual([96, 150, 216]);
  });

  it.each(LEVEL_IDS)(
    '%s: after the first tap there are more candidate cells than mines (the tapped cell and its 8 neighbours stay clear)',
    (level) => {
      expect(cellCount(level) - 9).toBeGreaterThanOrEqual(LEVELS[level].mines);
    },
  );
});

describe('neighbours', () => {
  it('a corner has 3', () => {
    expect(around('beginner', 0)).toEqual([1, 8, 9]);
    expect(around('beginner', LAST)).toEqual([LAST - 9, LAST - 8, LAST - 1]);
  });

  it('an edge cell has 5', () => {
    expect(around('beginner', 4)).toEqual([3, 5, 11, 12, 13]); // top edge
    expect(around('beginner', 16)).toEqual([8, 9, 17, 24, 25]); // left edge
  });

  it('an inner cell has 8', () => {
    expect(around('beginner', 43)).toEqual([34, 35, 36, 42, 44, 50, 51, 52]);
  });

  it('the last cell of a row does not get the first cell of the next row, nor the other way round', () => {
    // intermediate has 10 columns: cell 9 ends row 0, cell 10 starts row 1.
    expect(around('intermediate', 9)).toEqual([8, 18, 19]);
    expect(around('intermediate', 10)).toEqual([0, 1, 11, 20, 21]);
  });

  it.each(LEVEL_IDS)(
    '%s: every cell has 3, 5 or 8 distinct neighbours next to it, never itself, and the relation is symmetric',
    (level) => {
      const { cols, rows } = LEVELS[level];
      for (let i = 0; i < cellCount(level); i++) {
        const list = neighbours(level, i);
        const edges = Number(i % cols === 0 || i % cols === cols - 1) + Number(i < cols || i >= cols * (rows - 1));
        expect(list).toHaveLength([8, 5, 3][edges]);
        expect(new Set(list).size).toBe(list.length);
        for (const n of list) {
          expect(n).not.toBe(i);
          expect(Math.abs(Math.floor(n / cols) - Math.floor(i / cols))).toBeLessThanOrEqual(1);
          expect(Math.abs((n % cols) - (i % cols))).toBeLessThanOrEqual(1);
          expect(neighbours(level, n)).toContain(i);
        }
      }
    },
  );
});

describe('counts', () => {
  const minesAt = (level: Level, ...mineIndices: number[]) =>
    Array.from({ length: cellCount(level) }, (_, i) => mineIndices.includes(i));

  it('is the number of mines next to each cell, on a hand board', () => {
    // Beginner with mines in the top-left corner, just below-right of it (cell 9), and the bottom-right corner.
    const c = counts('beginner', minesAt('beginner', 0, 9, LAST));
    expect(c[1]).toBe(2); // next to 0 and 9
    expect(c[8]).toBe(2);
    expect(c[2]).toBe(1); // next to 9
    expect(c[10]).toBe(1);
    expect(c[0]).toBe(1); // a mine's own count leaves itself out
    expect(c[9]).toBe(1);
    expect(c[LAST - 9]).toBe(1); // next to the last cell
    expect(c[3]).toBe(0);
    expect(c[40]).toBe(0);
    expect(c).toHaveLength(cellCount('beginner'));
  });

  it('every mine is counted once by each of its neighbours: 3 for a corner, 8 for an inner cell', () => {
    const c = counts('beginner', minesAt('beginner', 0, 9, LAST));
    expect(c.reduce((a, b) => a + b, 0)).toBe(3 + 8 + 3);
  });

  it('does not count across the end of a row', () => {
    // Mine on the first cell of row 1 (cell 10 of 10 columns): the last cell of row 0 (9) is not next to it.
    const c = counts('intermediate', minesAt('intermediate', 10));
    expect(c[9]).toBe(0);
    expect(c[0]).toBe(1);
    expect(c[1]).toBe(1);
    expect(c[11]).toBe(1);
    expect(c[19]).toBe(0);
  });

  it('no mines, no counts', () => {
    expect(counts('beginner', minesAt('beginner')).every((n) => n === 0)).toBe(true);
  });
});
