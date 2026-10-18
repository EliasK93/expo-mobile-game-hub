import { SIZES, fromValues, isOver, maxTile, sizeOf, toValues, winTile } from './board';

describe('SIZES and winTile', () => {
  it('has the four board sizes', () => {
    expect(SIZES).toEqual([4, 5, 6, 7]);
  });

  it('the win tile doubles with every size', () => {
    expect(SIZES.map(winTile)).toEqual([2048, 4096, 8192, 16384]);
  });
});

describe('fromValues and toValues', () => {
  it('0 is an empty cell, tiles get the ids 1..k in reading order', () => {
    const board = fromValues([0, 2, 0, 4, 8, 0, 0, 0, 0]);
    expect(board).toEqual([
      null,
      { id: 1, value: 2 },
      null,
      { id: 2, value: 4 },
      { id: 3, value: 8 },
      null,
      null,
      null,
      null,
    ]);
  });

  it('toValues is the way back', () => {
    const values = [0, 2, 0, 4, 8, 0, 0, 0, 16];
    expect(toValues(fromValues(values))).toEqual(values);
  });

  it('sizeOf is the side of the square board', () => {
    expect(sizeOf(fromValues(Array(16).fill(0)))).toBe(4);
    expect(sizeOf(fromValues(Array(49).fill(0)))).toBe(7);
  });
});

describe('maxTile', () => {
  it('is the largest value on the board, 0 on an empty one', () => {
    expect(maxTile(fromValues([2, 0, 64, 8]))).toBe(64);
    expect(maxTile(fromValues([0, 0, 0, 0]))).toBe(0);
  });
});

describe('isOver', () => {
  const full = (rows: number[][]) => fromValues(rows.flat());

  it('is false while a cell is empty', () => {
    expect(
      isOver(
        full([
          [2, 4],
          [4, 0],
        ]),
      ),
    ).toBe(false);
  });

  it('is false on a full board with equal neighbours, side by side or on top of each other', () => {
    expect(
      isOver(
        full([
          [2, 2],
          [4, 8],
        ]),
      ),
    ).toBe(false);
    expect(
      isOver(
        full([
          [2, 4],
          [2, 8],
        ]),
      ),
    ).toBe(false);
  });

  it('is true on a full board without equal neighbours', () => {
    expect(
      isOver(
        full([
          [2, 4],
          [4, 2],
        ]),
      ),
    ).toBe(true);
  });

  it('does not treat the end of one row and the start of the next as neighbours', () => {
    // Cells 3 and 4 (the 4 that ends row 1 and the 4 that starts row 2) sit next to each other in the array only.
    const board = full([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(isOver(board)).toBe(true);
  });

  it('works on a 5×5 board: one equal pair in the last row is enough to keep it going', () => {
    const rows = [
      [2, 4, 2, 4, 2],
      [4, 2, 4, 2, 4],
      [2, 4, 2, 4, 2],
      [4, 2, 4, 2, 4],
      [2, 4, 2, 4, 2],
    ];
    expect(isOver(full(rows))).toBe(true);
    rows[4][3] = 2; // now 2 · 2 · 2 side by side at the end of the last row
    expect(isOver(full(rows))).toBe(false);
  });
});
