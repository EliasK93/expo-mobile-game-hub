import type { Grid } from './board';
import type { Game } from './game';
import { isMs, isRecord } from '@/lib/guards';
import { LEVELS, type Level } from './techniques';

// The saved game ("sudoku:save", version 2). The undo history is not saved.
// hinted: whether a hint was shown; a hinted win stays out of best/average time.
export type SaveData = {
  puzzle: Grid;
  solution: Grid;
  values: Grid;
  notes: readonly number[];
  elapsedMs: number;
  hinted: boolean;
  level: Level;
};

export const SAVE_KEY = 'sudoku:save';
export const SAVE_VERSION = 2;
export const STATS_KEY = 'sudoku:stats';
export const STATS_VERSION = 1;
export const SETTINGS_KEY = 'sudoku:settings';
export const SETTINGS_VERSION = 1;
export const DEFAULT_LEVEL: Level = 3; // the very first game is Medium

// Stats are kept per level: the bucket is the level number as text.
export const bucketOf = (level: Level): string => String(level);

const isLevel = (v: unknown): v is Level => LEVELS.includes(v as Level);

// The last level used ("sudoku:settings"). Anything unusable falls back to the default.
export function fromSettings(data: unknown): Level {
  return isRecord(data) && isLevel(data.level) ? data.level : DEFAULT_LEVEL;
}

// Any entered digit or note. Fresh games are not worth a "Continue?" prompt.
export const hasProgress = (game: Game): boolean =>
  game.values.some((v, i) => v !== game.puzzle[i]) || game.notes.some((n) => n !== 0);

export const toSave = (game: Game, elapsedMs: number, hinted: boolean, level: Level): SaveData => ({
  puzzle: game.puzzle,
  solution: game.solution,
  values: game.values,
  notes: game.notes,
  elapsedMs,
  hinted,
  level,
});

export const isCells = (a: unknown, max: number): a is number[] =>
  Array.isArray(a) && a.length === 81 && a.every((v) => Number.isInteger(v) && v >= 0 && v <= max);

// Storage holds whatever was written, so check the shape before the UI trusts it. null = unusable save.
export function fromSave(data: unknown): { game: Game; elapsedMs: number; hinted: boolean; level: Level } | null {
  if (!isRecord(data)) return null;
  const d = data as Partial<SaveData>;
  if (!isCells(d.puzzle, 9) || !isCells(d.solution, 9) || !isCells(d.values, 9) || !isCells(d.notes, 0b1111111110)) return null;
  if (!isMs(d.elapsedMs) || typeof d.hinted !== 'boolean') return null;
  if (!isLevel(d.level)) return null;
  return {
    game: { puzzle: d.puzzle, solution: d.solution, values: d.values, notes: d.notes },
    elapsedMs: d.elapsedMs,
    hinted: d.hinted,
    level: d.level,
  };
}
