import { boxOf, candidateMask, colOf, peers, rowOf, type Grid } from './board';

// Difficulty levels. A level allows every technique of the levels below it plus its own.
export type Level = 1 | 2 | 3 | 4 | 5;
export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5];
export const LEVEL_NAMES: Record<Level, string> = { 1: 'Very easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Expert' };

// One bitmask per cell, like candidateMask: bit d set = digit d can still go there. Filled cells are 0.
export type Candidates = readonly number[];
export type Move = { cell: number; digit: number };

export type TechniqueName =
  | 'full-house'
  | 'hidden-single-box'
  | 'naked-single'
  | 'hidden-single-line'
  | 'pointing'
  | 'claiming'
  | 'naked-pair'
  | 'hidden-pair'
  | 'x-wing'
  | 'naked-triple'
  | 'hidden-triple'
  | 'swordfish'
  | 'xy-wing'
  | 'naked-quad'
  | 'hidden-quad';

// What one application of a technique does. `cells` are the cells that form the pattern, for highlighting.
export type Step = {
  technique: TechniqueName;
  label: string; // e.g. "Hidden single"; the explanation starts with it
  level: Level;
  placements: Move[]; // digits to put in (at most one for every technique here)
  eliminations: Move[]; // candidates to cross out
  cells: number[];
  explanation: string;
};

export type Technique = {
  id: TechniqueName;
  label: string;
  level: Level;
  // Returns the first step that makes progress (a placement or at least one new elimination), or null.
  find: (values: Grid, cands: Candidates) => Step | null;
};

// The working state of a technique solver: the digits on the board and what can still go where.
export type State = { values: number[]; cands: number[] };

const ALL = 0b1111111110;
const has = (mask: number, d: number) => (mask & (1 << d)) !== 0;
const size = (mask: number) => {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
};
const digitsOf = (mask: number) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => has(mask, d));
const maskOf = (digits: readonly number[]) => digits.reduce((m, d) => m | (1 << d), 0);
const NUMBER_WORD = ['', 'one', 'two', 'three', 'four'];
const list = (digits: number[]) =>
  digits.length < 3 ? digits.join(' and ') : `${digits.slice(0, -1).join(', ')} and ${digits.at(-1)}`;

type UnitKind = 'row' | 'column' | 'box';
type Unit = { kind: UnitKind; cells: readonly number[] };
const unitsOf = (kind: UnitKind, of: (i: number) => number): Unit[] =>
  Array.from({ length: 9 }, (_, u) => ({
    kind,
    cells: Array.from({ length: 81 }, (_, i) => i).filter((i) => of(i) === u),
  }));
const ROWS = unitsOf('row', rowOf);
const COLS = unitsOf('column', colOf);
const BOXES = unitsOf('box', boxOf);
const UNITS = [...ROWS, ...COLS, ...BOXES];

// ponytail: the subset and fish techniques rebuild their combinations on every scan (many small arrays); fine while
// a Hard puzzle takes ~1 s on the PC (measure.test.ts). If the phone is too slow, precompute the candidate cells per unit.
function combinations<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const chosen: T[] = [];
  const pick = (start: number) => {
    if (chosen.length === k) {
      out.push([...chosen]);
      return;
    }
    for (let i = start; i <= items.length - (k - chosen.length); i++) {
      chosen.push(items[i]);
      pick(i + 1);
      chosen.pop();
    }
  };
  pick(0);
  return out;
}

// The eliminations that cross `digits` out of `cells`, for the ones that still have them as candidates.
const eliminate = (cells: readonly number[], digits: number[], cands: Candidates): Move[] =>
  cells.flatMap((cell) => digitsOf(cands[cell] & maskOf(digits)).map((digit) => ({ cell, digit })));

// What a technique reports; `make` adds the name, level and label.
type Found = { placements?: Move[]; eliminations?: Move[]; cells: number[]; text: string };

function make(
  id: TechniqueName,
  label: string,
  level: Level,
  find: (values: Grid, cands: Candidates) => Found | null,
): Technique {
  return {
    id,
    label,
    level,
    find: (values, cands) => {
      const found = find(values, cands);
      if (!found) return null;
      return {
        technique: id,
        label,
        level,
        placements: found.placements ?? [],
        eliminations: found.eliminations ?? [],
        cells: found.cells,
        explanation: `${label}: ${found.text}`,
      };
    },
  };
}

// The candidates of every empty cell, from the digits on the board alone (no pencil notes, no eliminations).
export const candidateGrid = (values: Grid): number[] =>
  values.map((v, i) => (v === 0 ? candidateMask(values, i) : 0));

export function newState(grid: Grid): State {
  return { values: [...grid], cands: candidateGrid(grid) };
}

// Applies a step in place: placements fill the cell and clear the digit from its peers; eliminations cross candidates out.
export function applyStep(state: State, step: Step): void {
  for (const { cell, digit } of step.placements) {
    state.values[cell] = digit;
    state.cands[cell] = 0;
    for (const p of peers(cell)) state.cands[p] &= ~(1 << digit);
  }
  for (const { cell, digit } of step.eliminations) state.cands[cell] &= ~(1 << digit);
}

// Level 1: the last empty cell of a row, column or box.
function fullHouse(values: Grid, cands: Candidates): Found | null {
  for (const u of UNITS) {
    const empty = u.cells.filter((c) => values[c] === 0);
    if (empty.length !== 1) continue;
    const missing = digitsOf(ALL & ~maskOf(u.cells.map((c) => values[c])));
    if (missing.length !== 1 || !has(cands[empty[0]], missing[0])) continue;
    return {
      placements: [{ cell: empty[0], digit: missing[0] }],
      cells: [empty[0]],
      text: `this is the last empty cell in its ${u.kind}, so it must be ${missing[0]}.`,
    };
  }
  return null;
}

// Levels 1 and 2: a digit that fits only one cell of a box (level 1) or of a row or column (level 2).
const hiddenSingle =
  (units: readonly Unit[]) =>
  (_values: Grid, cands: Candidates): Found | null => {
    for (const u of units) {
      for (let d = 1; d <= 9; d++) {
        const at = u.cells.filter((c) => has(cands[c], d));
        if (at.length === 1) {
          return { placements: [{ cell: at[0], digit: d }], cells: at, text: `${d} can only go here in this ${u.kind}.` };
        }
      }
    }
    return null;
  };

// Level 2: a cell with one candidate left.
function nakedSingle(_values: Grid, cands: Candidates): Found | null {
  for (let c = 0; c < 81; c++) {
    if (size(cands[c]) !== 1) continue;
    const digit = digitsOf(cands[c])[0];
    return {
      placements: [{ cell: c, digit }],
      cells: [c],
      text: `${digit} is the only digit that still fits in this cell.`,
    };
  }
  return null;
}

// Level 3: a digit in a box that lies in one row or column cannot go anywhere else in that row or column.
function pointing(_values: Grid, cands: Candidates): Found | null {
  for (const box of BOXES) {
    for (let d = 1; d <= 9; d++) {
      const at = box.cells.filter((c) => has(cands[c], d));
      if (at.length < 2) continue;
      for (const [lines, of] of [[ROWS, rowOf], [COLS, colOf]] as const) {
        if (!at.every((c) => of(c) === of(at[0]))) continue;
        const line = lines[of(at[0])];
        const elsewhere = line.cells.filter((c) => boxOf(c) !== boxOf(at[0]) && has(cands[c], d));
        if (elsewhere.length > 0) {
          return {
            eliminations: elsewhere.map((cell) => ({ cell, digit: d })),
            cells: at,
            text: `in this box, ${d} can only go in this ${line.kind}, so no other cell of that ${line.kind} can be ${d}.`,
          };
        }
      }
    }
  }
  return null;
}

// Level 3: a digit in a row or column that lies in one box cannot go anywhere else in that box.
function claiming(_values: Grid, cands: Candidates): Found | null {
  for (const line of [...ROWS, ...COLS]) {
    for (let d = 1; d <= 9; d++) {
      const at = line.cells.filter((c) => has(cands[c], d));
      if (at.length < 2 || !at.every((c) => boxOf(c) === boxOf(at[0]))) continue;
      const elsewhere = BOXES[boxOf(at[0])].cells.filter((c) => !at.includes(c) && has(cands[c], d));
      if (elsewhere.length > 0) {
        return {
          eliminations: elsewhere.map((cell) => ({ cell, digit: d })),
          cells: at,
          text: `in this ${line.kind}, ${d} can only go inside this box, so no other cell of the box can be ${d}.`,
        };
      }
    }
  }
  return null;
}

// Levels 3-5: n cells of a unit that between them hold only n digits own those digits.
const nakedSubset =
  (n: number) =>
  (_values: Grid, cands: Candidates): Found | null => {
    for (const u of UNITS) {
      const open = u.cells.filter((c) => size(cands[c]) >= 2 && size(cands[c]) <= n);
      for (const group of combinations(open, n)) {
        const union = group.reduce((m, c) => m | cands[c], 0);
        if (size(union) !== n) continue;
        const eliminations = eliminate(
          u.cells.filter((c) => !group.includes(c)),
          digitsOf(union),
          cands,
        );
        if (eliminations.length > 0) {
          return {
            eliminations,
            cells: group,
            text:
              `${list(digitsOf(union))} can only go in these ${NUMBER_WORD[n]} cells of this ${u.kind}, ` +
              `so no other cell of the ${u.kind} can hold them.`,
          };
        }
      }
    }
    return null;
  };

// Levels 3-5: n digits that fit only n cells of a unit must go in those cells, so those cells can hold nothing else.
const hiddenSubset =
  (n: number) =>
  (_values: Grid, cands: Candidates): Found | null => {
    for (const u of UNITS) {
      const eligible = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => {
        const k = u.cells.filter((c) => has(cands[c], d)).length;
        return k >= 2 && k <= n;
      });
      for (const digits of combinations(eligible, n)) {
        const group = u.cells.filter((c) => cands[c] & maskOf(digits));
        if (group.length !== n) continue;
        const eliminations = eliminate(group, digitsOf(ALL & ~maskOf(digits)), cands);
        if (eliminations.length > 0) {
          return {
            eliminations,
            cells: group,
            text:
              `${list(digits)} can only go in these ${NUMBER_WORD[n]} cells of this ${u.kind}, ` +
              `so those cells can hold nothing else.`,
          };
        }
      }
    }
    return null;
  };

// Levels 4-5: X-Wing (n = 2) and Swordfish (n = 3). A digit confined to n columns in each of n rows (or the other way
// round) takes those n columns, so no other row can use the digit there.
const fish =
  (n: number) =>
  (_values: Grid, cands: Candidates): Found | null => {
    for (let d = 1; d <= 9; d++) {
      for (const [bases, coverOf, covers] of [[ROWS, colOf, COLS], [COLS, rowOf, ROWS]] as const) {
        const lines = bases
          .map((u) => ({ u, at: u.cells.filter((c) => has(cands[c], d)) }))
          .filter((l) => l.at.length >= 2 && l.at.length <= n);
        for (const group of combinations(lines, n)) {
          const cover = new Set(group.flatMap((l) => l.at.map(coverOf)));
          if (cover.size !== n) continue;
          const inBase = new Set(group.flatMap((l) => l.u.cells));
          const elsewhere = [...cover].flatMap((k) =>
            covers[k].cells.filter((c) => !inBase.has(c) && has(cands[c], d)),
          );
          if (elsewhere.length > 0) {
            const [what, other] = bases === ROWS ? ['rows', 'columns'] : ['columns', 'rows'];
            return {
              eliminations: elsewhere.map((cell) => ({ cell, digit: d })),
              cells: group.flatMap((l) => l.at),
              text:
                `in these ${NUMBER_WORD[n]} ${what}, ${d} can only go in the same ${NUMBER_WORD[n]} ${other}, ` +
                `so no other cell of those ${other} can be ${d}.`,
            };
          }
        }
      }
    }
    return null;
  };

// Level 5: a pivot with two candidates (x, y) and two wings that see it, holding (x, z) and (y, z). One wing is z
// whatever the pivot is, so a cell that sees both wings cannot be z.
function xyWing(_values: Grid, cands: Candidates): Found | null {
  for (let p = 0; p < 81; p++) {
    if (size(cands[p]) !== 2) continue;
    const [x, y] = digitsOf(cands[p]);
    const wings = peers(p).filter((c) => size(cands[c]) === 2);
    for (const a of wings) {
      if (!has(cands[a], x) || has(cands[a], y)) continue;
      const z = digitsOf(cands[a] & ~(1 << x))[0];
      for (const b of wings) {
        if (cands[b] !== maskOf([y, z])) continue;
        const seesB = new Set(peers(b));
        const targets = peers(a).filter((c) => c !== p && seesB.has(c) && has(cands[c], z));
        if (targets.length > 0) {
          return {
            eliminations: targets.map((cell) => ({ cell, digit: z })),
            cells: [p, a, b],
            text:
              `one of the two wing cells has to be ${z}, whether the pivot turns out to be ${x} or ${y}, ` +
              `so no cell that sees both wings can be ${z}.`,
          };
        }
      }
    }
  }
  return null;
}

// Simplest first. The level of a puzzle is the highest level of any step it needs.
export const LADDER: readonly Technique[] = [
  make('full-house', 'Full house', 1, fullHouse),
  make('hidden-single-box', 'Hidden single', 1, hiddenSingle(BOXES)),
  make('naked-single', 'Naked single', 2, nakedSingle),
  make('hidden-single-line', 'Hidden single', 2, hiddenSingle([...ROWS, ...COLS])),
  make('pointing', 'Pointing', 3, pointing),
  make('claiming', 'Claiming', 3, claiming),
  make('naked-pair', 'Naked pair', 3, nakedSubset(2)),
  make('hidden-pair', 'Hidden pair', 3, hiddenSubset(2)),
  make('x-wing', 'X-Wing', 4, fish(2)),
  make('naked-triple', 'Naked triple', 4, nakedSubset(3)),
  make('hidden-triple', 'Hidden triple', 4, hiddenSubset(3)),
  make('swordfish', 'Swordfish', 5, fish(3)),
  make('xy-wing', 'XY-Wing', 5, xyWing),
  make('naked-quad', 'Naked quad', 5, nakedSubset(4)),
  make('hidden-quad', 'Hidden quad', 5, hiddenSubset(4)),
];

// The first step on the ladder that applies, using no technique above maxLevel.
export function findStep(values: Grid, cands: Candidates, maxLevel: Level = 5): Step | null {
  for (const t of LADDER) {
    if (t.level > maxLevel) break;
    const step = t.find(values, cands);
    if (step) return step;
  }
  return null;
}
