import { peers, type Grid } from './board';
import { generate } from './generate';
import type { Random } from './random';
import { isSolved } from './validate';

// puzzle = the givens, solution = the answer, values = what is on the board now (givens + entered digits).
export type Game = { puzzle: Grid; solution: Grid; values: Grid };

export function newGame(random?: Random): Game {
  const { puzzle, solution } = generate({ random });
  return { puzzle, solution, values: puzzle };
}

export const isGiven = (game: Game, i: number) => game.puzzle[i] !== 0;

export const isWon = (game: Game) => isSolved(game.values);

// v = 0 clears the cell. Returns the same game when nothing may change (given cell, or already won).
export function setValue(game: Game, i: number, v: number): Game {
  if (isGiven(game, i) || isWon(game)) return game;
  const values = [...game.values];
  values[i] = v;
  return { ...game, values };
}

export function highlights(game: Game, selected: number | null): { related: Set<number>; sameValue: Set<number> } {
  if (selected === null) return { related: new Set(), sameValue: new Set() };
  const digit = game.values[selected];
  const sameValue = new Set<number>();
  if (digit !== 0) game.values.forEach((v, i) => v === digit && i !== selected && sameValue.add(i));
  return { related: new Set(peers(selected)), sameValue };
}
