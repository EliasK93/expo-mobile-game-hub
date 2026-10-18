import { DIGITS, peers, type Grid } from './board';
import { redo, undo, type History } from '@/lib/history';
import { conflicts, isSolved } from './validate';

// puzzle = the givens, solution = the answer, values = what is on the board now (givens + entered digits).
// notes = one bitmask per cell, bit v set = pencil mark v (same idea as candidateMask in board.ts).
export type Game = { puzzle: Grid; solution: Grid; values: Grid; notes: readonly number[] };

// What the generator and the pool (pickPuzzle) hand over.
export type Puzzle = Pick<Game, 'puzzle' | 'solution'>;

export const newGame = ({ puzzle, solution }: Puzzle): Game => ({
  puzzle,
  solution,
  values: puzzle,
  notes: Array(81).fill(0),
});

export const isGiven = (game: Game, i: number) => game.puzzle[i] !== 0;

export const isWon = (game: Game) => isSolved(game.values);

// v = 0 erases the cell (digit and notes). A digit clears the cell's notes and that digit's notes in its peers.
// Returns the same game when nothing changes (given cell, already won, same digit, nothing to erase).
export function setValue(game: Game, i: number, v: number): Game {
  if (isGiven(game, i) || isWon(game)) return game;
  if (game.values[i] === v && (v > 0 || game.notes[i] === 0)) return game;
  const values = [...game.values];
  values[i] = v;
  const notes = [...game.notes];
  notes[i] = 0;
  if (v > 0) for (const p of peers(i)) notes[p] &= ~(1 << v);
  return { ...game, values, notes };
}

export const notesOf = (game: Game, i: number) => DIGITS.filter((d) => game.notes[i] & (1 << d));

// Adds the note v to an empty cell, or removes it if present. Returns the same game on givens, filled cells and a won game.
export function toggleNote(game: Game, i: number, v: number): Game {
  if (isGiven(game, i) || game.values[i] !== 0 || isWon(game)) return game;
  const notes = [...game.notes];
  notes[i] ^= 1 << v;
  return { ...game, notes };
}

// Undo/redo are locked once the game is won.
export const undoGame = (h: History<Game>) => (isWon(h.present) ? h : undo(h));
export const redoGame = (h: History<Game>) => (isWon(h.present) ? h : redo(h));

export function highlights(
  game: Game,
  selected: number | null,
): { related: Set<number>; sameValue: Set<number>; conflicts: Set<number> } {
  const bad = conflicts(game.values);
  if (selected === null) return { related: new Set(), sameValue: new Set(), conflicts: bad };
  const digit = game.values[selected];
  const sameValue = new Set<number>();
  if (digit !== 0) game.values.forEach((v, i) => v === digit && i !== selected && sameValue.add(i));
  return { related: new Set(peers(selected)), sameValue, conflicts: bad };
}
