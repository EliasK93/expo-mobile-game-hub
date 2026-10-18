import { SIZES, fromValues, isOver, toValues, type Size } from './board';
import type { Game } from './game';
import { EMPTY_STATS, type SizeStats, type Stats } from './stats';
import { isCount, isRecord } from '@/lib/guards';

export const SAVE_KEY = '2048:save';
export const SAVE_VERSION = 1;
export const STATS_KEY = '2048:stats';
export const STATS_VERSION = 1;
export const SETTINGS_KEY = '2048:settings';
export const SETTINGS_VERSION = 1;

// The unfinished game ("2048:save"). 0 = empty cell. The ids and the undo step are not saved: fromSave rebuilds the ids.
export type SaveData = {
  size: Size;
  values: number[];
  score: number;
  won: boolean;
  keptGoing: boolean;
  undoUsed: boolean;
  moves: number;
};

export type Settings = { size: Size };
export const DEFAULT_SETTINGS: Settings = { size: 4 };

export const toSave = (game: Game): SaveData => ({
  size: game.size,
  values: toValues(game.board),
  score: game.score,
  won: game.won,
  keptGoing: game.keptGoing,
  undoUsed: game.undoUsed,
  moves: game.moves,
});

const isSize = (v: unknown): v is Size => SIZES.includes(v as Size);
// 0 (empty cell) or a power of two from 2 up; rounding the log keeps it exact for every size of number.
const isValue = (v: unknown): v is number =>
  v === 0 || (Number.isInteger(v) && (v as number) >= 2 && 2 ** Math.round(Math.log2(v as number)) === v);

// Storage holds whatever was written, so check the shape before the UI trusts it. null = unusable save.
// Only an unfinished game is ever saved, so a board with no move left is unusable too, and so is an empty one (it could never move).
export function fromSave(data: unknown): Game | null {
  if (!isRecord(data)) return null;
  const d = data as Partial<SaveData>;
  const { size, values, score, moves, won, keptGoing, undoUsed } = d;
  if (!isSize(size) || !Array.isArray(values) || values.length !== size * size || !values.every(isValue)) return null;
  if (!isCount(score) || !isCount(moves)) return null;
  if (typeof won !== 'boolean' || typeof keptGoing !== 'boolean' || typeof undoUsed !== 'boolean') return null;
  if (keptGoing && !won) return null;
  const board = fromValues(values);
  const tiles = board.filter(Boolean).length;
  if (tiles === 0 || isOver(board)) return null;
  return { size, board, score, won, keptGoing, undoUsed, prev: null, nextId: tiles + 1, moves, status: 'playing' };
}

const isSizeStats = (m: unknown): m is SizeStats => {
  if (!isRecord(m)) return false;
  const s = m as Partial<SizeStats>;
  return (
    isCount(s.played) &&
    isCount(s.wins) &&
    (s.bestScore === null || isCount(s.bestScore)) &&
    (s.bestTile === null || isCount(s.bestTile))
  );
};

// ponytail: stats with any bad field fall back to empty whole; keep the good sizes if a format change ever needs it.
export function fromStats(data: unknown): Stats {
  const d = data as Partial<Stats>;
  if (!isRecord(data) || !SIZES.every((size) => isSizeStats(d[size]))) return EMPTY_STATS;
  return Object.fromEntries(SIZES.map((size) => [size, d[size]])) as Stats; // only the sizes, no stray keys
}

export function fromSettings(data: unknown): Settings {
  const size = (data as Partial<Settings> | null)?.size;
  return isSize(size) ? { size } : DEFAULT_SETTINGS;
}
