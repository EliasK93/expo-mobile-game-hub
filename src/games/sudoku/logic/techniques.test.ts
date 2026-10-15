import { parseGrid } from './board';
import { generate } from './generate';
import { mulberry32 } from './random';
import {
  LADDER,
  LEVEL_NAMES,
  applyStep,
  candidateGrid,
  findStep,
  type Move,
  type TechniqueName,
} from './techniques';

const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const without = (...drop: number[]) => ALL.filter((d) => !drop.includes(d));
const mask = (digits: number[]) => digits.reduce((m, d) => m | (1 << d), 0);
const moves = (cells: number[], digits: number[]): Move[] =>
  cells.flatMap((cell) => digits.map((digit) => ({ cell, digit })));
const sorted = (list: Move[]) => [...list].sort((a, b) => a.cell - b.cell || a.digit - b.digit);

// An empty board where every cell still allows every digit, except the cells listed in `narrow`.
// Nothing fires on it, so each case below adds exactly one pattern.
function board(narrow: Record<number, number[]> = {}): { values: number[]; cands: number[] } {
  return {
    values: new Array<number>(81).fill(0),
    cands: Array.from({ length: 81 }, (_, i) => mask(narrow[i] ?? ALL)),
  };
}
const narrowAll = (cells: number[], digits: number[]) =>
  Object.fromEntries(cells.map((c) => [c, digits]));

type Case = {
  id: TechniqueName;
  title: string;
  level: number;
  make: () => { values: number[]; cands: number[] };
  placements: Move[];
  eliminations: Move[];
  cells: number[];
};

const solutionWithBlanks = (...blank: number[]) => {
  const values = [...parseGrid(SOLUTION)];
  for (const i of blank) values[i] = 0;
  return { values, cands: candidateGrid(values) };
};

const CASES: Case[] = [
  {
    id: 'full-house',
    title: 'the only empty cell left in its row, column and box',
    level: 1,
    make: () => solutionWithBlanks(40),
    placements: [{ cell: 40, digit: Number(SOLUTION[40]) }],
    eliminations: [],
    cells: [40],
  },
  {
    id: 'full-house',
    title: 'the last empty cell of a column, though its row has two empties',
    level: 1,
    make: () => solutionWithBlanks(0, 4),
    placements: [{ cell: 0, digit: Number(SOLUTION[0]) }],
    eliminations: [],
    cells: [0],
  },
  {
    id: 'hidden-single-box',
    title: '7 fits only one cell of box 0',
    level: 1,
    make: () => board(narrowAll([1, 2, 9, 10, 11, 18, 19, 20], without(7))),
    placements: [{ cell: 0, digit: 7 }],
    eliminations: [],
    cells: [0],
  },
  {
    id: 'naked-single',
    title: 'a cell with one candidate left',
    level: 2,
    make: () => board({ 40: [5] }),
    placements: [{ cell: 40, digit: 5 }],
    eliminations: [],
    cells: [40],
  },
  {
    id: 'hidden-single-line',
    title: '7 fits only one cell of row 0',
    level: 2,
    make: () => board(narrowAll([1, 2, 3, 4, 5, 6, 7, 8], without(7))),
    placements: [{ cell: 0, digit: 7 }],
    eliminations: [],
    cells: [0],
  },
  {
    id: 'hidden-single-line',
    title: '3 fits only one cell of column 4',
    level: 2,
    make: () => board(narrowAll([4, 13, 22, 31, 49, 58, 67, 76], without(3))),
    placements: [{ cell: 40, digit: 3 }],
    eliminations: [],
    cells: [40],
  },
  {
    id: 'pointing',
    title: '5 in box 0 is confined to row 0',
    level: 3,
    make: () => board(narrowAll([9, 10, 11, 18, 19, 20], without(5))),
    placements: [],
    eliminations: moves([3, 4, 5, 6, 7, 8], [5]),
    cells: [0, 1, 2],
  },
  {
    id: 'claiming',
    title: '5 in row 0 is confined to box 0',
    level: 3,
    make: () => board(narrowAll([3, 4, 5, 6, 7, 8], without(5))),
    placements: [],
    eliminations: moves([9, 10, 11, 18, 19, 20], [5]),
    cells: [0, 1, 2],
  },
  {
    id: 'naked-pair',
    title: 'two cells of row 0 hold only 3 and 7',
    level: 3,
    make: () => board({ 0: [3, 7], 4: [3, 7] }),
    placements: [],
    eliminations: moves([1, 2, 3, 5, 6, 7, 8], [3, 7]),
    cells: [0, 4],
  },
  {
    id: 'hidden-pair',
    title: '3 and 7 fit only two cells of row 0',
    level: 3,
    make: () => board(narrowAll([1, 2, 3, 5, 6, 7, 8], without(3, 7))),
    placements: [],
    eliminations: moves([0, 4], [1, 2, 4, 5, 6, 8, 9]),
    cells: [0, 4],
  },
  {
    id: 'x-wing',
    title: '5 in rows 0 and 4 sits in columns 1 and 6',
    level: 4,
    make: () =>
      board({
        ...narrowAll([0, 2, 3, 4, 5, 7, 8], without(5)),
        ...narrowAll([36, 38, 39, 40, 41, 43, 44], without(5)),
      }),
    placements: [],
    eliminations: moves([10, 19, 28, 46, 55, 64, 73, 15, 24, 33, 51, 60, 69, 78], [5]),
    cells: [1, 6, 37, 42],
  },
  {
    id: 'naked-triple',
    title: 'three cells of row 0 hold only 1, 2 and 3',
    level: 4,
    make: () => board({ 0: [1, 2], 4: [2, 3], 8: [1, 3] }),
    placements: [],
    eliminations: moves([1, 2, 3, 5, 6, 7], [1, 2, 3]),
    cells: [0, 4, 8],
  },
  {
    id: 'hidden-triple',
    title: '1, 2 and 3 fit only three cells of row 0',
    level: 4,
    make: () => board(narrowAll([1, 2, 3, 5, 6, 7], without(1, 2, 3))),
    placements: [],
    eliminations: moves([0, 4, 8], [4, 5, 6, 7, 8, 9]),
    cells: [0, 4, 8],
  },
  {
    id: 'swordfish',
    title: '5 in rows 0, 3 and 6 sits in columns 0, 3 and 6',
    level: 5,
    make: () =>
      board({
        ...narrowAll([1, 2, 4, 5, 6, 7, 8], without(5)),
        ...narrowAll([27, 28, 29, 31, 32, 34, 35], without(5)),
        ...narrowAll([55, 56, 57, 58, 59, 61, 62], without(5)),
      }),
    placements: [],
    eliminations: moves([9, 18, 36, 45, 63, 72, 12, 21, 39, 48, 66, 75, 15, 24, 42, 51, 69, 78], [5]),
    cells: [0, 3, 30, 33, 54, 60],
  },
  {
    id: 'xy-wing',
    title: 'pivot 1/2 with wings 1/3 and 2/3',
    level: 5,
    make: () => board({ 0: [1, 2], 4: [1, 3], 10: [2, 3] }),
    placements: [],
    eliminations: moves([1, 2, 12, 13, 14], [3]),
    cells: [0, 4, 10],
  },
  {
    id: 'naked-quad',
    title: 'four cells of row 0 hold only 1, 2, 3 and 4',
    level: 5,
    make: () => board({ 0: [1, 2], 3: [2, 3], 6: [3, 4], 7: [4, 1] }),
    placements: [],
    eliminations: moves([1, 2, 4, 5, 8], [1, 2, 3, 4]),
    cells: [0, 3, 6, 7],
  },
  {
    id: 'hidden-quad',
    title: '1, 2, 3 and 4 fit only four cells of row 0',
    level: 5,
    make: () =>
      board({
        ...narrowAll([2, 4, 5, 7, 8], [5, 6, 7, 8, 9]),
        0: [1, 4, 5, 6, 7, 8, 9],
        3: [1, 2, 5, 6, 7, 8, 9],
        1: [2, 3, 5, 6, 7, 8, 9],
        6: [3, 4, 5, 6, 7, 8, 9],
      }),
    placements: [],
    eliminations: moves([0, 1, 3, 6], [5, 6, 7, 8, 9]),
    cells: [0, 1, 3, 6],
  },
];

describe('LADDER', () => {
  it('lists the techniques simplest first, at the levels the plan gives them', () => {
    expect(LADDER.map((t) => [t.id, t.level])).toEqual([
      ['full-house', 1],
      ['hidden-single-box', 1],
      ['naked-single', 2],
      ['hidden-single-line', 2],
      ['pointing', 3],
      ['claiming', 3],
      ['naked-pair', 3],
      ['hidden-pair', 3],
      ['x-wing', 4],
      ['naked-triple', 4],
      ['hidden-triple', 4],
      ['swordfish', 5],
      ['xy-wing', 5],
      ['naked-quad', 5],
      ['hidden-quad', 5],
    ]);
  });

  it('names the five levels', () => {
    expect(LEVEL_NAMES).toEqual({ 1: 'Very easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Expert' });
  });

  it('has a test case for every technique', () => {
    for (const t of LADDER) expect(CASES.map((c) => c.id)).toContain(t.id);
  });

  it.each(LADDER.map((t) => [t.id, t] as const))('%s finds nothing on an open board', (_id, t) => {
    const { values, cands } = board();
    expect(t.find(values, cands)).toBeNull();
  });
});

describe('techniques', () => {
  it.each(CASES.map((c) => [`${c.id}: ${c.title}`, c] as const))('%s', (_name, c) => {
    const { values, cands } = c.make();
    const index = LADDER.findIndex((t) => t.id === c.id);
    expect(index).toBeGreaterThanOrEqual(0);

    // every simpler technique on the ladder finds nothing on this board
    for (const simpler of LADDER.slice(0, index)) {
      expect([simpler.id, simpler.find(values, cands)]).toEqual([simpler.id, null]);
    }

    const step = LADDER[index].find(values, cands);
    expect(step).not.toBeNull();
    expect(step!.technique).toBe(c.id);
    expect(step!.level).toBe(c.level);
    expect(step!.placements).toEqual(c.placements);
    expect(sorted(step!.eliminations)).toEqual(sorted(c.eliminations));
    expect([...step!.cells].sort((a, b) => a - b)).toEqual(c.cells);
    expect(step!.explanation.length).toBeGreaterThan(10);

    // findStep reaches the same step, and a level cap below it hides it
    expect(findStep(values, cands)).toEqual(step);
    expect(findStep(values, cands, (c.level - 1) as 1)).toBeNull();

    // once applied, the same step does not fire again (it may unlock a different one, e.g. the next full house)
    applyStep({ values, cands }, step!);
    expect(LADDER[index].find(values, cands)).not.toEqual(step);
  });

  it('puts the digit and the technique name into the explanation', () => {
    const { values, cands } = board(narrowAll([1, 2, 9, 10, 11, 18, 19, 20], without(7)));
    expect(findStep(values, cands)!.explanation).toBe('Hidden single: 7 can only go here in this box.');
  });

  it('finds no full house when every unit has two or more empty cells', () => {
    const values = parseGrid(PUZZLE);
    expect(LADDER[0].find(values, candidateGrid(values))).toBeNull();
  });

  it('does not fire a pattern that would eliminate nothing', () => {
    // 5 in box 0 is confined to row 0, but the rest of row 0 has no 5 left to remove
    const { values, cands } = board({
      ...narrowAll([9, 10, 11, 18, 19, 20], without(5)),
      ...narrowAll([3, 4, 5, 6, 7, 8], without(5)),
    });
    expect(LADDER.find((t) => t.id === 'pointing')!.find(values, cands)).toBeNull();
    expect(LADDER.find((t) => t.id === 'claiming')!.find(values, cands)).toBeNull();
  });

  it('takes the simplest technique when several apply', () => {
    // a naked single and a naked pair on the same board: the single comes first
    const { values, cands } = board({ 40: [5], 0: [3, 7], 4: [3, 7] });
    expect(findStep(values, cands)!.technique).toBe('naked-single');
  });
});

describe('candidateGrid and applyStep', () => {
  it('gives each empty cell its candidates and each filled cell 0', () => {
    const values = parseGrid(PUZZLE);
    const cands = candidateGrid(values);
    expect(cands).toHaveLength(81);
    expect(cands[0]).toBe(0); // 5 is given
    expect(cands[2]).toBe(mask([1, 2, 4])); // r0c2: 5, 3, 7, 6, 9, 8 are used
  });

  it('a placement fills the cell and removes the digit from its peers', () => {
    const state = { values: new Array<number>(81).fill(0), cands: board().cands };
    applyStep(state, {
      technique: 'naked-single',
      label: 'Naked single',
      level: 2,
      placements: [{ cell: 0, digit: 4 }],
      eliminations: [],
      cells: [0],
      explanation: '',
    });
    expect(state.values[0]).toBe(4);
    expect(state.cands[0]).toBe(0);
    expect(state.cands[1]).toBe(mask(without(4))); // same row
    expect(state.cands[9]).toBe(mask(without(4))); // same column
    expect(state.cands[10]).toBe(mask(without(4))); // same box
    expect(state.cands[40]).toBe(mask(ALL)); // not a peer
  });
});

// The strongest check on the techniques: on sparse puzzles from the old generator, every placement
// and every elimination must agree with the brute-force solution.
describe('soundness against the brute-force solution', () => {
  it.each([1, 2, 3, 4, 5, 6])('seed %i: no step contradicts the solution', (seed) => {
    const { puzzle, solution } = generate({ givens: 24, random: mulberry32(seed) });
    const state = { values: [...puzzle] as number[], cands: candidateGrid(puzzle) };
    let steps = 0;
    for (let step = findStep(state.values, state.cands); step; step = findStep(state.values, state.cands)) {
      for (const p of step.placements) expect(solution[p.cell]).toBe(p.digit);
      for (const e of step.eliminations) expect(solution[e.cell]).not.toBe(e.digit);
      applyStep(state, step);
      steps++;
    }
    expect(steps).toBeGreaterThan(0);
    // whatever was placed is a prefix of the solution
    state.values.forEach((v, i) => v !== 0 && expect(v).toBe(solution[i]));
  });
});
