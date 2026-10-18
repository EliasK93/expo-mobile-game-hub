import { boxOf, colOf, formatGrid, parseGrid, peers, rowOf } from './board';

const PUZZLE = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

describe('board', () => {
  it('round-trips parse and format', () => {
    expect(formatGrid(parseGrid(PUZZLE))).toBe(PUZZLE);
  });

  it('treats "." and "0" as empty and returns 81 numbers', () => {
    const grid = parseGrid('5.3' + '.'.repeat(78));
    expect(grid).toHaveLength(81);
    expect(grid.slice(0, 3)).toEqual([5, 0, 3]);
    expect(formatGrid(grid)).toBe('503' + '0'.repeat(78));
  });

  it('rejects strings that are not 81 cells', () => {
    expect(() => parseGrid('123')).toThrow();
  });

  it('maps an index to row, column and box', () => {
    expect([rowOf(0), colOf(0), boxOf(0)]).toEqual([0, 0, 0]);
    expect([rowOf(40), colOf(40), boxOf(40)]).toEqual([4, 4, 4]);
    expect([rowOf(80), colOf(80), boxOf(80)]).toEqual([8, 8, 8]);
    expect(boxOf(8)).toBe(2);
    expect(boxOf(27)).toBe(3);
  });

  it('gives every cell 20 distinct peers, never itself', () => {
    for (let i = 0; i < 81; i++) {
      const p = peers(i);
      expect(p).toHaveLength(20);
      expect(new Set(p).size).toBe(20);
      expect(p).not.toContain(i);
    }
  });
});
