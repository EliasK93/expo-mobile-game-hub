import { parseGrid } from './board';
import { highlights, isGiven, isWon, newGame, setValue, type Game } from './game';
import { mulberry32 } from './random';
import { isSolved } from './validate';

const SOLUTION = parseGrid('534678912672195348198342567859761423426853791713924856961537284287419635345286179');
// Cells 0 (5) and 80 (9) are empty.
const PUZZLE = parseGrid('.3467891267219534819834256785976142342685379171392485696153728428741963534528617.');
const game = (): Game => ({ puzzle: PUZZLE, solution: SOLUTION, values: PUZZLE });

describe('newGame', () => {
  it('starts with the puzzle as the values, and the same seed gives the same game', () => {
    const g = newGame(mulberry32(1));
    expect(g.values).toEqual(g.puzzle);
    expect(isSolved(g.solution)).toBe(true);
    expect(newGame(mulberry32(1))).toEqual(g);
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
    expect(highlights(game(), null)).toEqual({ related: new Set(), sameValue: new Set() });
  });
});

describe('isWon', () => {
  it('is false while a cell is empty or wrong, true when solved', () => {
    expect(isWon(game())).toBe(false);
    expect(isWon(setValue(setValue(game(), 0, 5), 80, 8))).toBe(false);
    expect(isWon(setValue(setValue(game(), 0, 5), 80, 9))).toBe(true);
  });
});
