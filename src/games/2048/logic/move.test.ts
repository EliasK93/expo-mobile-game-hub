import { fromValues, toValues, type Board, type Dir } from './board';
import { move } from './move';

const DIRS: Dir[] = ['left', 'right', 'up', 'down'];

// Index of the k-th cell of the first line, counted from the edge the move goes to, on an n×n board.
const cell = (n: number, dir: Dir, k: number) => ({ left: k, right: n - 1 - k, up: k * n, down: (n - 1 - k) * n })[dir];

// Puts `line` into the first row (left/right) or first column (up/down), read from the edge the move goes to,
// so the same table of lines tests all four directions.
function place(dir: Dir, line: number[]): Board {
  const n = line.length;
  const values = Array(n * n).fill(0);
  line.forEach((v, k) => (values[cell(n, dir, k)] = v));
  return fromValues(values);
}

// The whole board a move should give, from the expected line.
const expectedValues = (dir: Dir, line: number[]) => toValues(place(dir, line));

describe('move: one line, from the edge the move goes to', () => {
  // [line before, line after, points gained]
  it.each([
    [[2, 2, 2, 2], [4, 4, 0, 0], 8],
    [[2, 2, 4, 0], [4, 4, 0, 0], 4],
    [[4, 4, 8, 0], [8, 8, 0, 0], 8],
    [[2, 0, 2, 4], [4, 4, 0, 0], 4],
    [[2, 2, 2, 0], [4, 2, 0, 0], 4],
    [[4, 2, 2, 0], [4, 4, 0, 0], 4],
    [[2, 2, 4, 4], [4, 8, 0, 0], 12],
    [[2, 0, 0, 2], [4, 0, 0, 0], 4],
    [[0, 0, 0, 2], [2, 0, 0, 0], 0],
    [[0, 2, 0, 4], [2, 4, 0, 0], 0],
    [[4, 4, 4, 4], [8, 8, 0, 0], 16],
    [[2, 4, 2, 4], [2, 4, 2, 4], 0],
  ])('%j → %j (+%i)', (line, after, gained) => {
    for (const dir of DIRS) {
      const result = move(place(dir, line), dir);
      expect(toValues(result.board)).toEqual(expectedValues(dir, after));
      expect(result.gained).toBe(gained);
    }
  });

  it('a merged tile is not merged again in the same move', () => {
    for (const dir of DIRS) {
      expect(toValues(move(place(dir, [2, 2, 4, 0]), dir).board)).toEqual(expectedValues(dir, [4, 4, 0, 0]));
      expect(toValues(move(place(dir, [4, 2, 2, 0]), dir).board)).toEqual(expectedValues(dir, [4, 4, 0, 0]));
    }
  });
});

describe('move: whole boards', () => {
  const before = [
    [2, 0, 2, 0],
    [0, 4, 4, 8],
    [2, 2, 0, 0],
    [0, 0, 0, 2],
  ];
  const board = () => fromValues(before.flat());

  it('moves every line on its own', () => {
    expect(toValues(move(board(), 'left').board)).toEqual([4, 0, 0, 0, 8, 8, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0]);
    expect(toValues(move(board(), 'right').board)).toEqual([0, 0, 0, 4, 0, 0, 8, 8, 0, 0, 0, 4, 0, 0, 0, 2]);
    expect(toValues(move(board(), 'up').board)).toEqual([4, 4, 2, 8, 0, 2, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(toValues(move(board(), 'down').board)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 2, 8, 4, 2, 4, 2]);
  });

  it('does not change the board it is given', () => {
    const b = board();
    const copy = JSON.stringify(b);
    for (const dir of DIRS) move(b, dir);
    expect(JSON.stringify(b)).toBe(copy);
  });
});

describe('move: no-op moves', () => {
  it('a move that changes nothing is not moved: no slides, no merges, no points, same values', () => {
    const values = [2, 4, 0, 0, 8, 2, 0, 0, 4, 8, 0, 0, 2, 4, 0, 0]; // everything pushed to the left, no equal neighbours
    const result = move(fromValues(values), 'left');
    expect(result).toEqual({ board: fromValues(values), moved: false, gained: 0, slides: [], merges: [] });
  });

  it('an empty board does not move', () => {
    for (const dir of DIRS) expect(move(fromValues(Array(16).fill(0)), dir).moved).toBe(false);
  });

  it('a full board without equal neighbours does not move in any direction', () => {
    const board = fromValues([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]);
    for (const dir of DIRS) expect(move(board, dir).moved).toBe(false);
  });

  it('the same line is a no-op one way and a move the other way', () => {
    const board = fromValues([2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(move(board, 'left').moved).toBe(false);
    expect(move(board, 'right').moved).toBe(true);
  });
});

describe('move: slide and merge records', () => {
  // Row 0 of a 4×4 board; the tiles get the ids 1, 2, 3, ... in reading order.
  const row = (...line: number[]) => fromValues([...line, ...Array(16 - line.length).fill(0)]);

  it('a slide per tile whose cell changes; a tile that stays has none', () => {
    const result = move(row(2, 0, 4, 0), 'left');
    expect(result.slides).toEqual([{ id: 2, from: 2, to: 1 }]);
    expect(result.merges).toEqual([]);
    expect(result.moved).toBe(true);
  });

  it('a merge keeps the id of the tile nearer the edge; the other tile slides into its cell', () => {
    const result = move(row(2, 2, 4), 'left');
    expect(result.merges).toEqual([{ id: 1, removedId: 2, at: 0, value: 4 }]);
    expect(result.slides).toEqual([
      { id: 2, from: 1, to: 0 },
      { id: 3, from: 2, to: 1 },
    ]);
    expect(result.gained).toBe(4);
    expect(result.board[0]).toEqual({ id: 1, value: 4 });
    expect(result.board[1]).toEqual({ id: 3, value: 4 });
  });

  it('2 2 2 2 moved left: two merges, the survivors are the tiles nearer the left edge', () => {
    const result = move(row(2, 2, 2, 2), 'left');
    expect(result.merges).toEqual([
      { id: 1, removedId: 2, at: 0, value: 4 },
      { id: 3, removedId: 4, at: 1, value: 4 },
    ]);
    expect(result.slides).toEqual([
      { id: 2, from: 1, to: 0 },
      { id: 3, from: 2, to: 1 },
      { id: 4, from: 3, to: 1 },
    ]);
    expect(result.gained).toBe(8);
  });

  it('2 2 2 2 moved right: the survivors are the tiles nearer the right edge', () => {
    const result = move(row(2, 2, 2, 2), 'right');
    expect(result.merges).toEqual([
      { id: 4, removedId: 3, at: 3, value: 4 },
      { id: 2, removedId: 1, at: 2, value: 4 },
    ]);
    expect(result.gained).toBe(8);
  });

  it('up and down use the columns: cells are counted in the row-major array', () => {
    const column = fromValues([2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0]); // ids 1 (cell 0) and 2 (cell 8)
    const up = move(column, 'up');
    expect(up.merges).toEqual([{ id: 1, removedId: 2, at: 0, value: 4 }]);
    expect(up.slides).toEqual([{ id: 2, from: 8, to: 0 }]);
    const down = move(column, 'down');
    expect(down.merges).toEqual([{ id: 2, removedId: 1, at: 12, value: 4 }]);
    expect(down.slides).toEqual([
      { id: 2, from: 8, to: 12 },
      { id: 1, from: 0, to: 12 },
    ]);
  });

  it('every tile of the board is accounted for: the tiles after the move are the tiles before, minus the merged-away ones', () => {
    const board = fromValues([2, 2, 4, 4, 0, 8, 8, 0, 2, 0, 2, 0, 16, 16, 16, 0]);
    for (const dir of DIRS) {
      const result = move(board, dir);
      const ids = (b: Board) => b.flatMap((t) => (t ? [t.id] : [])).sort((a, b) => a - b);
      const removed = result.merges.map((m) => m.removedId);
      expect(ids(result.board)).toEqual(ids(board).filter((id) => !removed.includes(id)));
      // every slide ends where the board has that tile (or, for a merged-away tile, where the merge happened)
      for (const s of result.slides) {
        const at = result.board.findIndex((t) => t?.id === s.id);
        const merge = result.merges.find((m) => m.removedId === s.id);
        expect(s.to).toBe(merge ? merge.at : at);
      }
    }
  });
});

describe('move: other board sizes', () => {
  it('5×5: 2 2 2 2 2 moved left gives 4 4 2', () => {
    const values = Array(25).fill(0);
    values.splice(5, 5, 2, 2, 2, 2, 2); // second row
    const result = move(fromValues(values), 'left');
    expect(toValues(result.board).slice(5, 10)).toEqual([4, 4, 2, 0, 0]);
    expect(result.gained).toBe(8);
  });

  it('7×7: a column moved up merges from the top', () => {
    const values = Array(49).fill(0);
    [2, 2, 0, 4, 4, 4, 0].forEach((v, r) => (values[r * 7 + 3] = v)); // fourth column
    const result = move(fromValues(values), 'up');
    expect([0, 1, 2, 3, 4, 5, 6].map((r) => toValues(result.board)[r * 7 + 3])).toEqual([4, 8, 4, 0, 0, 0, 0]);
    expect(result.gained).toBe(12);
    expect(result.board).toHaveLength(49);
  });
});
