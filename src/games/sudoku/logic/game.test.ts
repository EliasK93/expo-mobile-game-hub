import { parseGrid } from './board';
import {
  highlights,
  isGiven,
  isWon,
  newGame,
  notesOf,
  redoGame,
  setValue,
  toggleNote,
  undoGame,
  type Game,
} from './game';
import { push, start } from './history';
import { isSolved } from './validate';

const SOLUTION = parseGrid('534678912672195348198342567859761423426853791713924856961537284287419635345286179');
// Cells 0 (5) and 80 (9) are empty.
const PUZZLE = parseGrid('.3467891267219534819834256785976142342685379171392485696153728428741963534528617.');
const NO_NOTES = Array(81).fill(0);
const game = (): Game => ({ puzzle: PUZZLE, solution: SOLUTION, values: PUZZLE, notes: NO_NOTES });

// Cells 0 (5), 1 (3), 9 (6) and 80 (9) are empty; 1 and 9 are peers of 0, 80 is not.
const WIDE_PUZZLE = SOLUTION.map((v, i) => ([0, 1, 9, 80].includes(i) ? 0 : v));
const wide = (): Game => ({ puzzle: WIDE_PUZZLE, solution: SOLUTION, values: WIDE_PUZZLE, notes: NO_NOTES });
const hasNote = (g: Game, i: number, v: number) => (g.notes[i] & (1 << v)) !== 0;

describe('newGame', () => {
  it('starts with the puzzle as the values and no notes', () => {
    const g = newGame({ puzzle: PUZZLE, solution: SOLUTION });
    expect(g).toEqual(game());
    expect(g.values).toEqual(g.puzzle);
    expect(g.notes).toEqual(NO_NOTES);
    expect(isSolved(g.solution)).toBe(true);
  });
});

describe('isGiven', () => {
  it('is true for puzzle digits and false for empty cells', () => {
    expect(isGiven(game(), 1)).toBe(true);
    expect(isGiven(game(), 0)).toBe(false);
  });
});

describe('setValue', () => {
  it('sets and clears an empty cell without mutating the input', () => {
    const g = game();
    const g2 = setValue(g, 0, 5);
    expect(g2.values[0]).toBe(5);
    expect(g.values[0]).toBe(0);
    expect(setValue(g2, 0, 0).values[0]).toBe(0);
  });

  it('ignores given cells', () => {
    const g = game();
    expect(setValue(g, 1, 9)).toBe(g);
  });

  it('ignores everything once the game is won', () => {
    const won = setValue(setValue(game(), 0, 5), 80, 9);
    expect(isWon(won)).toBe(true);
    expect(setValue(won, 0, 1)).toBe(won);
  });

  it('returns the same game when the digit is already there, or when erasing an empty cell', () => {
    const g = setValue(game(), 0, 5);
    expect(setValue(g, 0, 5)).toBe(g);
    const empty = game();
    expect(setValue(empty, 0, 0)).toBe(empty);
  });

  it('clears the cell notes when a digit is placed, and removes that digit from the notes of all peers only', () => {
    let g = wide();
    g = toggleNote(g, 0, 5);
    g = toggleNote(g, 0, 2);
    g = toggleNote(g, 1, 5); // same row
    g = toggleNote(g, 1, 7);
    g = toggleNote(g, 9, 5); // same column
    g = toggleNote(g, 80, 5); // not a peer of cell 0

    g = setValue(g, 0, 5);

    expect(g.notes[0]).toBe(0);
    expect(hasNote(g, 1, 5)).toBe(false);
    expect(hasNote(g, 1, 7)).toBe(true); // other digit stays
    expect(hasNote(g, 9, 5)).toBe(false);
    expect(hasNote(g, 80, 5)).toBe(true);
  });

  it('erasing clears both the value and the notes of the cell', () => {
    const withNotes = toggleNote(game(), 0, 4);
    expect(setValue(withNotes, 0, 0).notes[0]).toBe(0);
    const filled = setValue(game(), 0, 5);
    expect(setValue(filled, 0, 0).values[0]).toBe(0);
  });
});

describe('toggleNote', () => {
  it('adds a note, removes it again, and does not mutate the input', () => {
    const g = game();
    const g2 = toggleNote(g, 0, 5);
    expect(hasNote(g2, 0, 5)).toBe(true);
    expect(g.notes[0]).toBe(0);
    expect(toggleNote(g2, 0, 5).notes[0]).toBe(0);
  });

  it('keeps several notes in one cell', () => {
    const g = toggleNote(toggleNote(game(), 0, 1), 0, 9);
    expect(hasNote(g, 0, 1)).toBe(true);
    expect(hasNote(g, 0, 9)).toBe(true);
    expect(hasNote(g, 0, 5)).toBe(false);
  });

  it('ignores given cells, filled cells, and a won game', () => {
    const g = game();
    expect(toggleNote(g, 1, 5)).toBe(g);
    const filled = setValue(g, 0, 5);
    expect(toggleNote(filled, 0, 5)).toBe(filled);
    const won = setValue(filled, 80, 9);
    expect(toggleNote(won, 0, 1)).toBe(won);
  });
});

describe('notesOf', () => {
  it('lists the note digits of a cell in ascending order', () => {
    const g = toggleNote(toggleNote(toggleNote(game(), 0, 9), 0, 2), 0, 5);
    expect(notesOf(g, 0)).toEqual([2, 5, 9]);
    expect(notesOf(g, 80)).toEqual([]);
  });
});

describe('highlights', () => {
  it('marks the peers of the selected cell as related', () => {
    const { related } = highlights(game(), 0);
    expect(related.size).toBe(20);
    expect(related.has(0)).toBe(false);
    expect(related.has(8)).toBe(true); // same row
    expect(related.has(72)).toBe(true); // same column
    expect(related.has(20)).toBe(true); // same box
  });

  it('marks the other cells holding the selected digit', () => {
    const { sameValue } = highlights(game(), 1); // a 3
    expect(sameValue.has(1)).toBe(false);
    expect([...sameValue].every((i) => SOLUTION[i] === 3)).toBe(true);
    expect(sameValue.size).toBe(8);
  });

  it('has no same-value cells for an empty selection or no selection', () => {
    expect(highlights(game(), 0).sameValue.size).toBe(0);
    expect(highlights(game(), null)).toEqual({ related: new Set(), sameValue: new Set(), conflicts: new Set() });
  });

  it('has no conflicts for the untouched puzzle or a correct digit', () => {
    expect(highlights(game(), null).conflicts.size).toBe(0);
    expect(highlights(setValue(game(), 0, 5), null).conflicts.size).toBe(0);
  });

  it('marks both a clashing digit and the given it clashes with, with or without a selection', () => {
    const clash = setValue(game(), 0, 3); // 3 is also given at cell 1 (same row and box) and cell 72 (same column)
    expect(highlights(clash, null).conflicts).toEqual(new Set([0, 1, 72]));
    expect(highlights(clash, 40).conflicts).toEqual(new Set([0, 1, 72]));
  });
});

describe('isWon', () => {
  it('is false while a cell is empty or wrong, true when solved', () => {
    expect(isWon(game())).toBe(false);
    expect(isWon(setValue(setValue(game(), 0, 5), 80, 8))).toBe(false);
    expect(isWon(setValue(setValue(game(), 0, 5), 80, 9))).toBe(true);
  });
});

describe('undoGame / redoGame', () => {
  it('undoes and redoes a digit', () => {
    const h = push(start(game()), setValue(game(), 0, 5));
    const u = undoGame(h);
    expect(u.present.values[0]).toBe(0);
    expect(redoGame(u).present.values[0]).toBe(5);
  });

  it('brings back notes removed by auto-clean', () => {
    const noted = toggleNote(wide(), 1, 5);
    const h = push(start(noted), setValue(noted, 0, 5));
    expect(hasNote(h.present, 1, 5)).toBe(false);
    expect(hasNote(undoGame(h).present, 1, 5)).toBe(true);
  });

  it('does nothing once the game is won', () => {
    const won = setValue(setValue(game(), 0, 5), 80, 9);
    const h = push(push(start(game()), setValue(game(), 0, 5)), won);
    expect(undoGame(h)).toBe(h);
    const withFuture = { ...h, future: [game()] };
    expect(redoGame(withFuture)).toBe(withFuture);
  });
});
