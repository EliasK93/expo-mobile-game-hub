import { isInPlay, remainingMs, type Game } from './game';
import { EMPTY_STATS, type LevelStats, type Stats } from './stats';
import { LENGTH, LEVEL_IDS, type Level } from './words';
import { isCount, isMs, isRecord } from '@/lib/guards';

export const SAVE_KEY = 'anagram:save';
export const SAVE_VERSION = 1;
export const STATS_KEY = 'anagram:stats';
export const STATS_VERSION = 1;
export const SETTINGS_KEY = 'anagram:settings';
export const SETTINGS_VERSION = 1;

// The unfinished round ("anagram:save"): the rack as one string, the answer slots as rack indices (null = empty).
// The revealed solution is not saved.
export type SaveData = {
  level: Level;
  word: string;
  rack: string;
  answer: (number | null)[];
  solved: number;
  skips: number;
  used: string[];
  elapsedMs: number;
};

export type Settings = { level: Level };
export const DEFAULT_SETTINGS: Settings = { level: 'normal' };

// Only a started, unfinished round is ever saved, so anything else is null.
export function toSave(game: Game, elapsedMs: number): SaveData | null {
  if (!isInPlay(game)) return null;
  const { level, word, answer, solved, skips, used } = game;
  return { level, word, rack: game.rack.join(''), answer, solved, skips, used, elapsedMs };
}

const isLevel = (v: unknown): v is Level => LEVEL_IDS.includes(v as Level);
const sorted = (letters: string) => [...letters].sort().join('');

// Storage holds whatever was written, so check the shape before the UI trusts it. null = unusable save. Besides the
// shape: the word is a-z of the level's length, the rack is its letters, the answer slots point at distinct rack tiles,
// the used words include the word, and there is time left. It loads paused, with nothing revealed.
export function fromSave(data: unknown): { game: Game; elapsedMs: number } | null {
  if (!isRecord(data)) return null;
  const d = data as Partial<Record<keyof SaveData, unknown>>;
  const { level, word, rack, answer, solved, skips, used, elapsedMs } = d;
  if (!isLevel(level) || !isCount(solved) || !isCount(skips) || !isMs(elapsedMs)) return null;
  if (typeof word !== 'string' || !new RegExp(`^[a-z]{${LENGTH[level]}}$`).test(word)) return null;
  if (typeof rack !== 'string' || sorted(rack) !== sorted(word)) return null;
  if (!Array.isArray(answer) || answer.length !== word.length) return null;
  if (!answer.every((k) => k === null || (isCount(k) && k < word.length))) return null;
  const placed = answer.filter((k) => k !== null);
  if (new Set(placed).size !== placed.length) return null;
  if (!Array.isArray(used) || !used.every((w) => typeof w === 'string') || !used.includes(word)) return null;
  const game: Game = { level, word, rack: [...rack], answer, solved, skips, used, revealed: null, status: 'paused' };
  return remainingMs(game, elapsedMs) > 0 ? { game, elapsedMs } : null;
}

const isLevelStats = (m: unknown): m is LevelStats => {
  if (!isRecord(m)) return false;
  const s = m as Partial<LevelStats>;
  return isCount(s.played) && isCount(s.best) && isCount(s.totalWords);
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
