import { formatGrid, parseGrid } from './board';
import { countSolutions, solve } from './solve';

const PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('solve', () => {
  it('solves a known puzzle to its known solution', () => {
    const solved = solve(parseGrid(PUZZLE));
    expect(solved && formatGrid(solved)).toBe(SOLUTION);
  });

  it('counts exactly 1 solution for a known unique puzzle', () => {
    expect(countSolutions(parseGrid(PUZZLE))).toBe(1);
  });

  it('counts 2 (the limit) once clues are removed', () => {
    // blank every clue in the first three rows: many solutions, count stops at the limit
    const g = parseGrid('0'.repeat(27) + PUZZLE.slice(27));
    expect(countSolutions(g, 2)).toBe(2);
    expect(countSolutions(g, 5)).toBe(5);
  });

  it('counts 1 for an already solved grid', () => {
    expect(countSolutions(parseGrid(SOLUTION))).toBe(1);
  });

  it('counts 0 for a contradictory puzzle', () => {
    // two 5s in row 0
    expect(countSolutions(parseGrid('55' + '.'.repeat(79)))).toBe(0);
    expect(solve(parseGrid('55' + '.'.repeat(79)))).toBeNull();
  });

  it('counts 0 for an unsolvable puzzle with no direct conflict', () => {
    // row 0 holds 1..8, so cell 8 needs a 9; a 9 in its column (cell 17) makes that impossible
    const g = parseGrid('12345678.' + '........9' + '.'.repeat(63));
    expect(countSolutions(g)).toBe(0);
  });

  it('counts 0 for a complete grid with a conflict', () => {
    const g = [...parseGrid(SOLUTION)];
    g[1] = 5;
    expect(countSolutions(g)).toBe(0);
  });

  it('does not mutate its input', () => {
    const g = parseGrid(PUZZLE);
    const before = [...g];
    solve(g);
    countSolutions(g);
    expect([...g]).toEqual(before);
  });
});
