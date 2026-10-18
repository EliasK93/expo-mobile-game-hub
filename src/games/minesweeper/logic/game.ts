import { LEVELS, cellCount, counts, neighbours, type Level } from './board';
import { placeMines } from './generate';
import type { Random } from '@/lib/random';

export type Status = 'playing' | 'won' | 'lost';
// mines = null until the first opening places them (never on the first cell or its neighbours). hit = the mine that was
// opened, for the red background. The time is not here: the UI's clock owns it, like Sudoku's.
export type Game = {
  level: Level;
  mines: boolean[] | null;
  opened: boolean[];
  flagged: boolean[];
  status: Status;
  hit: number | null;
};

export const newGame = (level: Level): Game => ({
  level,
  mines: null,
  opened: Array(cellCount(level)).fill(false),
  flagged: Array(cellCount(level)).fill(false),
  status: 'playing',
  hit: null,
});

// Won = every cell without a mine is open (flags don't matter).
export const isWon = (mines: boolean[], opened: boolean[]) => mines.every((mine, i) => mine || opened[i]);

// Opens a covered, unflagged cell of a running game; anything else (also a number that is already open: no chording)
// returns the same game. The first opening places the mines. A mine loses; a 0 opens its neighbours, and so on
// (iterative, so the size of the board never matters); flagged cells stay covered. Opening the last safe cell wins, and
// the remaining mines then show as flags.
export function open(game: Game, i: number, random: Random): Game {
  if (game.status !== 'playing' || game.opened[i] || game.flagged[i]) return game;
  const mines = game.mines ?? placeMines(game.level, i, random);
  if (mines[i]) return { ...game, mines, status: 'lost', hit: i };
  const around = counts(game.level, mines);
  const opened = [...game.opened];
  const stack = [i];
  while (stack.length > 0) {
    const cell = stack.pop() as number;
    if (opened[cell] || game.flagged[cell]) continue;
    opened[cell] = true;
    if (around[cell] === 0) stack.push(...neighbours(game.level, cell));
  }
  if (isWon(mines, opened)) return { ...game, mines, opened, flagged: [...mines], status: 'won' };
  return { ...game, mines, opened };
}

// Flags or unflags a covered cell of a running game, wrong guesses and an unmined board included; anything else returns the same game.
export function toggleFlag(game: Game, i: number): Game {
  if (game.status !== 'playing' || game.opened[i]) return game;
  const flagged = [...game.flagged];
  flagged[i] = !flagged[i];
  return { ...game, flagged };
}

// Can go negative with too many flags.
export const minesLeft = (game: Game) => LEVELS[game.level].mines - game.flagged.filter(Boolean).length;

// Started = the mines are placed, i.e. at least one cell was opened; only a started game is recorded when abandoned.
export const isStarted = (game: Game) => game.mines !== null;
