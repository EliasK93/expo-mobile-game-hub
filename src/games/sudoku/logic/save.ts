import type { Grid } from './board';
import type { Game } from './game';

// The saved game ("sudoku:save", version 1). The undo history is not saved.
// hinted: whether a hint was used (hints arrive in M6); a hinted win stays out of best/average time.
export type SaveData = {
  puzzle: Grid;
  solution: Grid;
  values: Grid;
  notes: readonly number[];
  elapsedMs: number;
  hinted: boolean;
};

export const SAVE_KEY = 'sudoku:save';
export const SAVE_VERSION = 1;
export const STATS_KEY = 'sudoku:stats';
export const STATS_VERSION = 1;
// Until M6 adds difficulty levels, every game goes into this one stats bucket.
export const STATS_BUCKET = 'classic';

// Any entered digit or note. Fresh games are not worth a "Continue?" prompt.
export const hasProgress = (game: Game): boolean =>
  game.values.some((v, i) => v !== game.puzzle[i]) || game.notes.some((n) => n !== 0);

export const toSave = (game: Game, elapsedMs: number, hinted = false): SaveData => ({
  puzzle: game.puzzle,
  solution: game.solution,
  values: game.values,
  notes: game.notes,
  elapsedMs,
  hinted,
});

const isCells = (a: unknown, max: number): a is number[] =>
  Array.isArray(a) && a.length === 81 && a.every((v) => Number.isInteger(v) && v >= 0 && v <= max);

// Storage holds whatever was written, so check the shape before the UI trusts it. null = unusable save.
export function fromSave(data: unknown): { game: Game; elapsedMs: number; hinted: boolean } | null {
  if (data === null || typeof data !== 'object') return null;
  const d = data as Partial<SaveData>;
  if (!isCells(d.puzzle, 9) || !isCells(d.solution, 9) || !isCells(d.values, 9) || !isCells(d.notes, 0b1111111110)) return null;
  if (typeof d.elapsedMs !== 'number' || !(d.elapsedMs >= 0) || typeof d.hinted !== 'boolean') return null;
  return { game: { puzzle: d.puzzle, solution: d.solution, values: d.values, notes: d.notes }, elapsedMs: d.elapsedMs, hinted: d.hinted };
}
