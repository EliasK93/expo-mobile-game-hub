import { formatGrid, parseGrid } from './board';
import { mulberry32 } from '@/lib/random';
import { sparsePuzzle } from '@/test-utils/sparse-puzzle';
import { rate, solveByLogic } from './rate';
import { countSolutions, solve } from './solve';

const PUZZLE = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
// Arto Inkala's 2012 puzzle: unique, but no logic short of trial and error (or chains far beyond Expert) solves it.
const NEEDS_GUESSING = '800000000003600000070090200050007000000045700000100030001000068008500010090000400';

const KNOWN: [number, string, string][] = [
  [
    1,
    '009400500020500097300280000000360005000070900003002001060000000000000208001900003',
    '619437582428516397375289416197364825286175934543892761862743159934651278751928643',
  ],
  [
    2,
    '700000000000208036040003000010040080306000500000002000407100600080000100001387020',
    '723614895159278436648953217215746389376891542894532761437129658982465173561387924',
  ],
  [
    3,
    '200004006000900280600000070050010020900400000700620530070003108000001000300200000',
    '237184956145967283698352471853719624926435817714628539472593168569871342381246795',
  ],
  [
    4,
    '300008204900002036000030901009070500000824009080091060012005000700610000030040000',
    '371968254948152736256437981129376548563824179487591362612785493794613825835249617',
  ],
  [
    5,
    '080079100000004602000100050300050700060300500005000009009003000006000090510000806',
    '682579143951834672743162958398251764467398521125746389279683415836415297514927836',
  ],
];

const blank = (...cells: number[]) => {
  const g = [...parseGrid(SOLUTION)];
  for (const i of cells) g[i] = 0;
  return g;
};

describe('rate', () => {
  it('rates a solved grid with a few last cells blanked as level 1, and solves it', () => {
    const puzzle = blank(0, 40, 80);
    expect(rate(puzzle)).toBe(1);
    expect(formatGrid(solveByLogic(puzzle)!.grid)).toBe(SOLUTION);
  });

  it('solves the classic singles-only puzzle and rates it at most Easy', () => {
    const result = solveByLogic(parseGrid(PUZZLE));
    expect(result).not.toBeNull();
    expect(result!.level).toBeLessThanOrEqual(2);
    expect(formatGrid(result!.grid)).toBe(SOLUTION);
  });

  // Fixed puzzles, one per level, found by sparse generation (seeds 7*seed+givens) and checked here, not taken on trust:
  // one solution, the recorded solution, the level, and (for level > 1) that the next level down gets stuck.
  it.each(KNOWN)(
    'known level %i puzzle: unique, rated at exactly that level, stuck one level lower',
    (level, puzzle, solution) => {
      const grid = parseGrid(puzzle);
      expect(countSolutions(grid, 2)).toBe(1);
      expect(formatGrid(solve(grid)!)).toBe(solution);
      expect(rate(grid)).toBe(level);
      expect(formatGrid(solveByLogic(grid)!.grid)).toBe(solution);
      if (level > 1) expect(rate(grid, (level - 1) as 1)).toBeNull();
    },
  );

  it('returns null for a puzzle that needs guessing, though it has exactly one solution', () => {
    const puzzle = parseGrid(NEEDS_GUESSING);
    expect(countSolutions(puzzle, 2)).toBe(1);
    expect(rate(puzzle)).toBeNull();
    expect(solveByLogic(puzzle)).toBeNull();
  });

  it('returns null for an empty grid, a grid with a conflict and a grid with no solution', () => {
    expect(rate(new Array<number>(81).fill(0))).toBeNull();
    expect(rate(parseGrid('55' + '.'.repeat(79)))).toBeNull();
    expect(rate(parseGrid('12345678.' + '........9' + '.'.repeat(63)))).toBeNull();
  });

  it('does not change the puzzle it is given', () => {
    const puzzle = parseGrid(PUZZLE);
    const before = [...puzzle];
    rate(puzzle);
    expect([...puzzle]).toEqual(before);
  });

  it('with a level cap, returns null when the puzzle needs more than the cap', () => {
    const puzzle = parseGrid(NEEDS_GUESSING);
    expect(rate(puzzle, 5)).toBeNull();
    expect(rate(puzzle, 1)).toBeNull();
    const easy = blank(0, 40, 80);
    expect(rate(easy, 1)).toBe(1);
  });

  // The ladder only applies sound techniques, so whenever it finishes, the puzzle has exactly one solution
  // and the logical solve is that solution.
  describe.each([1, 2, 3, 4, 5, 6, 7, 8])('sparse puzzles, seed %i', (seed) => {
    it.each([24, 28, 32])('with %i givens, the logical solve matches solve()', (givens) => {
      const { puzzle } = sparsePuzzle(givens, mulberry32(seed * 100 + givens));
      const result = solveByLogic(puzzle);
      if (result === null) return; // too hard for the ladder: nothing to compare
      expect(countSolutions(puzzle, 2)).toBe(1);
      expect(formatGrid(result.grid)).toBe(formatGrid(solve(puzzle)!));
      expect(rate(puzzle)).toBe(result.level);
    });
  });
});
