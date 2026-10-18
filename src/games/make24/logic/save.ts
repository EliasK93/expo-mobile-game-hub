import { LEVEL_IDS, isPuzzle, replay, type Game, type Level } from './game';
import type { Order } from './order';
import { OPS, type Op, type Step } from './solve';
import { EMPTY_STATS, type LevelStats, type Stats } from './stats';
import { isCount, isMs, isRecord } from '@/lib/guards';

export const SAVE_KEY = 'make24:save';
export const SAVE_VERSION = 1;
export const STATS_KEY = 'make24:stats';
export const STATS_VERSION = 1;
export const SETTINGS_KEY = 'make24:settings';
export const SETTINGS_VERSION = 1;
export const ORDER_KEY = 'make24:order';
export const ORDER_VERSION = 1;

// The unfinished puzzle ("make24:save"): the sorted numbers and the combines so far (card places), which fromSave
// replays to rebuild the cards.
export type SaveData = { level: Level; numbers: number[]; steps: Step[]; hints: number; elapsedMs: number };

export type Settings = { level: Level };
export const DEFAULT_SETTINGS: Settings = { level: 'easy' };

// Per level, the order its puzzles are served in ("make24:order"). A level without an order yet has no key.
export type Orders = Partial<Record<Level, Order>>;

export const toSave = (game: Game, elapsedMs: number): SaveData => ({
  level: game.level,
  numbers: game.numbers,
  steps: game.steps,
  hints: game.hints,
  elapsedMs,
});

const isLevel = (v: unknown): v is Level => LEVEL_IDS.includes(v as Level);
const isOp = (v: unknown): v is Op => OPS.includes(v as Op);
// The shape of a step; whether it works on the cards is replay's job.
const isStep = (v: unknown): v is Step => isRecord(v) && isCount(v.first) && isCount(v.second) && isOp(v.op);

// Storage holds whatever was written, so check the shape before the UI trusts it. null = unusable save.
// Only an unfinished puzzle is ever saved, so one whose steps end at 24 is unusable, and so are steps that do not replay.
export function fromSave(data: unknown): { game: Game; elapsedMs: number } | null {
  if (!isRecord(data)) return null;
  const { level, numbers, steps, hints, elapsedMs } = data as Partial<Record<keyof SaveData, unknown>>;
  if (!isLevel(level) || !isPuzzle(numbers) || !numbers.every((n, i) => i === 0 || numbers[i - 1] <= n)) return null;
  if (!Array.isArray(steps) || !steps.every(isStep) || !isCount(hints) || !isMs(elapsedMs)) return null;
  const game = replay(level, numbers, steps);
  return game && game.status === 'playing' ? { game: { ...game, hints }, elapsedMs } : null;
}

const isLevelStats = (m: unknown): m is LevelStats => {
  if (!isRecord(m)) return false;
  const s = m as Partial<LevelStats>;
  return (
    isCount(s.played) &&
    isCount(s.solved) &&
    isCount(s.currentStreak) &&
    isCount(s.bestStreak) &&
    (s.bestMs === null || isMs(s.bestMs))
  );
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

// Whether an order still fits its pool is nextPuzzle's job; here only the shape.
function fromOrder(data: unknown): Order | null {
  if (!isRecord(data)) return null;
  const { puzzles, next } = data as Partial<Order>;
  if (!Array.isArray(puzzles) || !puzzles.every(isPuzzle)) return null;
  return isCount(next) && next <= puzzles.length ? { puzzles, next } : null;
}

// Keeps the levels whose order has a valid shape, drops the rest.
export function fromOrders(data: unknown): Orders {
  if (!isRecord(data)) return {};
  const orders: Orders = {};
  for (const level of LEVEL_IDS) {
    const order = fromOrder(data[level]);
    if (order) orders[level] = order;
  }
  return orders;
}
