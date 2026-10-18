import { LEVELS, LEVEL_IDS, cellCount, type Level } from './board';
import { isWon, type Game } from './game';
import { EMPTY_STATS, type LevelStats, type Stats } from './stats';
import { isCount, isMs, isRecord } from '@/lib/guards';

export const SAVE_KEY = 'minesweeper:save';
export const SAVE_VERSION = 1;
export const STATS_KEY = 'minesweeper:stats';
export const STATS_VERSION = 1;
export const SETTINGS_KEY = 'minesweeper:settings';
export const SETTINGS_VERSION = 1;

// The unfinished game ("minesweeper:save"): the cells as lists of indices. mines = [] while the board is unmined.
export type SaveData = {
  level: Level;
  mines: number[];
  opened: number[];
  flagged: number[];
  elapsedMs: number;
};

export type Settings = { level: Level };
export const DEFAULT_SETTINGS: Settings = { level: 'beginner' };

const indices = (flags: boolean[]) => flags.flatMap((flag, i) => (flag ? [i] : []));

export const toSave = (game: Game, elapsedMs: number): SaveData => ({
  level: game.level,
  mines: game.mines ? indices(game.mines) : [],
  opened: indices(game.opened),
  flagged: indices(game.flagged),
  elapsedMs,
});

const isLevel = (v: unknown): v is Level => LEVEL_IDS.includes(v as Level);

// A list of distinct cell indices of a board with n cells, as one flag per cell; null for anything else.
function toFlags(list: unknown, n: number): boolean[] | null {
  if (!Array.isArray(list) || !list.every((i) => isCount(i) && i < n)) return null;
  const flags: boolean[] = Array(n).fill(false);
  for (const i of list) flags[i] = true;
  return indices(flags).length === list.length ? flags : null; // a duplicate leaves fewer flags than entries
}

// Storage holds whatever was written, so check the shape before the UI trusts it. null = unusable save.
// Only an unfinished game is ever saved, so a board with every safe cell open is unusable, and so are the ones that
// no game can reach: opened cells on an unmined board, a mined board with nothing opened, an opened mine, a cell that
// is opened and flagged.
export function fromSave(data: unknown): { game: Game; elapsedMs: number } | null {
  if (!isRecord(data)) return null;
  const d = data as Partial<SaveData>;
  const { level, elapsedMs } = d;
  if (!isLevel(level) || !isMs(elapsedMs)) return null;
  const n = cellCount(level);
  const mines = toFlags(d.mines, n);
  const opened = toFlags(d.opened, n);
  const flagged = toFlags(d.flagged, n);
  if (!mines || !opened || !flagged) return null;
  const mined = mines.includes(true);
  if (mined && mines.filter(Boolean).length !== LEVELS[level].mines) return null;
  if (mined !== opened.includes(true)) return null; // mines exist from the first opening on, and only then
  if (opened.some((o, i) => o && (mines[i] || flagged[i]))) return null;
  if (mined && isWon(mines, opened)) return null;
  return { game: { level, mines: mined ? mines : null, opened, flagged, status: 'playing', hit: null }, elapsedMs };
}

const isLevelStats = (m: unknown): m is LevelStats => {
  if (!isRecord(m)) return false;
  const s = m as Partial<LevelStats>;
  return isCount(s.played) && isCount(s.wins) && isCount(s.currentStreak) && isCount(s.bestStreak) && (s.bestMs === null || isMs(s.bestMs));
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
