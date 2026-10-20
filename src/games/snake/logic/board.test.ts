import { CELLS, COLS, ROWS, cell, colRow, next, opposite } from './board';

describe('cell / colRow', () => {
  it('numbers the cells in reading order: i = row * COLS + col', () => {
    expect(cell(0, 0)).toBe(0);
    expect(cell(14, 0)).toBe(14);
    expect(cell(0, 1)).toBe(15);
    expect(cell(7, 12)).toBe(187);
    expect(cell(14, 20)).toBe(CELLS - 1);
  });

  it('colRow undoes cell for every cell of the board', () => {
    for (let i = 0; i < CELLS; i++) {
      const [col, row] = colRow(i);
      expect(cell(col, row)).toBe(i);
    }
    expect(colRow(15)).toEqual([0, 1]);
    expect(colRow(CELLS - 1)).toEqual([14, 20]);
  });
});

describe('opposite', () => {
  it('pairs up with down and left with right, both ways', () => {
    expect(opposite('up')).toBe('down');
    expect(opposite('down')).toBe('up');
    expect(opposite('left')).toBe('right');
    expect(opposite('right')).toBe('left');
  });
});

describe('next', () => {
  it('steps one cell in the direction', () => {
    expect(next(cell(7, 10), 'up')).toBe(cell(7, 9));
    expect(next(cell(7, 10), 'down')).toBe(cell(7, 11));
    expect(next(cell(7, 10), 'left')).toBe(cell(6, 10));
    expect(next(cell(7, 10), 'right')).toBe(cell(8, 10));
  });

  it('is null off the top and the bottom edge', () => {
    expect(next(cell(7, 0), 'up')).toBeNull();
    expect(next(cell(0, 0), 'up')).toBeNull();
    expect(next(cell(7, ROWS - 1), 'down')).toBeNull();
    expect(next(cell(COLS - 1, ROWS - 1), 'down')).toBeNull();
  });

  it('is null off the left and the right edge, and never wraps to the next or previous row', () => {
    expect(next(cell(0, 5), 'left')).toBeNull(); // i - 1 would be the end of row 4
    expect(next(cell(0, 0), 'left')).toBeNull();
    expect(next(cell(COLS - 1, 5), 'right')).toBeNull(); // i + 1 would be the start of row 6
    expect(next(cell(COLS - 1, ROWS - 1), 'right')).toBeNull();
  });

  it('still moves along the edge and away from it', () => {
    expect(next(cell(0, 5), 'down')).toBe(cell(0, 6));
    expect(next(cell(0, 5), 'right')).toBe(cell(1, 5));
    expect(next(cell(COLS - 1, 5), 'up')).toBe(cell(COLS - 1, 4));
    expect(next(cell(COLS - 1, 5), 'left')).toBe(cell(COLS - 2, 5));
    expect(next(cell(7, 0), 'down')).toBe(cell(7, 1));
  });
});
