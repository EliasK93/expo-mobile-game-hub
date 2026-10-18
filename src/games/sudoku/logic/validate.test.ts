import { parseGrid } from './board';
import { conflicts, isComplete, isSolved } from './validate';

const SOLVED = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

// Returns SOLVED with cell `i` overwritten by `v`.
const withCell = (i: number, v: number) => {
  const g = [...parseGrid(SOLVED)];
  g[i] = v;
  return g;
};

describe('validate', () => {
  it('accepts a known solved grid', () => {
    const g = parseGrid(SOLVED);
    expect(conflicts(g).size).toBe(0);
    expect(isComplete(g)).toBe(true);
    expect(isSolved(g)).toBe(true);
  });

  it('flags a duplicate in a row (both cells)', () => {
    // cell 1 (row 0) becomes 5, same as cell 0
    const c = conflicts(withCell(1, 5));
    expect(c.has(0)).toBe(true);
    expect(c.has(1)).toBe(true);
  });

  it('flags a duplicate in a column', () => {
    // cell 9 (col 0, row 1) becomes 5, same as cell 0
    const c = conflicts(withCell(9, 5));
    expect(c.has(0)).toBe(true);
    expect(c.has(9)).toBe(true);
  });

  it('flags a duplicate in a box only', () => {
    // cell 10 (row 1, col 1, box 0) becomes 5, same as cell 0; different row and column
    const c = conflicts(withCell(10, 5));
    expect(c.has(0)).toBe(true);
    expect(c.has(10)).toBe(true);
  });

  it('is not solved when a conflict exists, even if complete', () => {
    const g = withCell(1, 5);
    expect(isComplete(g)).toBe(true);
    expect(isSolved(g)).toBe(false);
  });

  it('has no conflicts on an empty grid and is not complete', () => {
    const g = parseGrid('.'.repeat(81));
    expect(conflicts(g).size).toBe(0);
    expect(isComplete(g)).toBe(false);
    expect(isSolved(g)).toBe(false);
  });
});
