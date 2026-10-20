import { COLS, DIRS, LEVEL_IDS, ROWS, cell, colRow, next, type Dir, type Level } from './board';
import { isInPlay, START_LENGTH, type Game } from './game';
import { EMPTY_STATS, type LevelStats, type Stats } from './stats';
import { isCount, isMs, isRecord } from '@/lib/guards';

export const SAVE_KEY = 'snake:save';
export const SAVE_VERSION = 1;
export const STATS_KEY = 'snake:stats';
export const STATS_VERSION = 1;
export const SETTINGS_KEY = 'snake:settings';
export const SETTINGS_VERSION = 1;

// The unfinished game ("snake:save"): cells as [col, row], 0-based, the snake head first. The turn queue is not saved.
export type SaveData = {
  level: Level;
  snake: [number, number][];
  dir: Dir;
  apple: [number, number];
  apples: number;
  elapsedMs: number;
};

export type Settings = { level: Level };
export const DEFAULT_SETTINGS: Settings = { level: 'normal' };

// Only a started, unfinished game is ever saved, so anything else is null. A game that ended against a wall keeps a
// snake that looks fine, so this is where that is ruled out.
export function toSave(game: Game, elapsedMs: number): SaveData | null {
  if (!isInPlay(game) || game.apple === null) return null;
  return {
    level: game.level,
    snake: game.snake.map(colRow),
    dir: game.dir,
    apple: colRow(game.apple),
    apples: game.apples,
    elapsedMs,
  };
}

const isLevel = (v: unknown): v is Level => LEVEL_IDS.includes(v as Level);
const isDir = (v: unknown): v is Dir => DIRS.includes(v as Dir);

// [col, row] on the board as a cell index; null for anything else.
const toCell = (v: unknown): number | null =>
  Array.isArray(v) && v.length === 2 && isCount(v[0]) && v[0] < COLS && isCount(v[1]) && v[1] < ROWS
    ? cell(v[0], v[1])
    : null;

// Storage holds whatever was written, so check the shape before the UI trusts it. null = unusable save. Besides the
// shape: a snake of at least 3 cells that is connected and does not overlap itself, an apple on an empty cell, the
// apples eaten matching the length, and a direction that does not point into the neck. A snake that fills the board
// has no empty cell for the apple, so a finished game is unusable too. It loads paused, with an empty queue.
export function fromSave(data: unknown): { game: Game; elapsedMs: number } | null {
  if (!isRecord(data)) return null;
  const d = data as Partial<Record<keyof SaveData, unknown>>;
  const { level, dir, apples, elapsedMs } = d;
  if (!isLevel(level) || !isDir(dir) || !isCount(apples) || !isMs(elapsedMs)) return null;
  if (!Array.isArray(d.snake) || d.snake.length < START_LENGTH) return null;
  const snake = d.snake.map(toCell);
  const apple = toCell(d.apple);
  if (apple === null || !snake.every((c): c is number => c !== null)) return null;
  if (new Set(snake).size !== snake.length || snake.includes(apple)) return null;
  if (!snake.slice(1).every((c, k) => DIRS.some((to) => next(snake[k], to) === c))) return null; // connected
  if (apples !== snake.length - START_LENGTH || next(snake[0], dir) === snake[1]) return null;
  return { game: { level, snake, dir, queue: [], apple, apples, status: 'paused' }, elapsedMs };
}

const isLevelStats = (m: unknown): m is LevelStats => {
  if (!isRecord(m)) return false;
  const s = m as Partial<LevelStats>;
  return isCount(s.played) && isCount(s.best) && isCount(s.totalApples) && isMs(s.longestMs);
};

// ponytail: stats with any bad field fall back to empty whole; keep the good levels if a format change ever needs it.
export function fromStats(data: unknown): Stats {
  const d = data as Partial<Stats>;
  if (!isRecord(data) || !LEVEL_IDS.every((level) => isLevelStats(d[level]))) return EMPTY_STATS;
  return Object.fromEntries(LEVEL_IDS.map((level) => [level, d[level]])) as Stats; // only the levels, no stray keys
}

export function fromSettings(data: unknown): Settings {
  const level = (data as Partial<Settings> | null)?.level;
  return isLevel(level) ? { level } : DEFAULT_SETTINGS;
}
