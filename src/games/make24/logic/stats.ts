import type { Level } from './game';

export type LevelStats = {
  played: number;
  solved: number;
  currentStreak: number;
  bestStreak: number;
  bestMs: number | null;
};
export type Stats = Record<Level, LevelStats>;

const EMPTY_LEVEL: LevelStats = { played: 0, solved: 0, currentStreak: 0, bestStreak: 0, bestMs: null };
export const EMPTY_STATS: Stats = { easy: EMPTY_LEVEL, medium: EMPTY_LEVEL, hard: EMPTY_LEVEL };

// What the stats record about a finished or abandoned puzzle; ms is the time on the clock. hinted = a hint was used.
export type Result = { solved: boolean; hinted: boolean; ms: number };

// "New best!": a clean solve faster than the stored best time of its level, or the first one. A hinted solve never
// sets a best time. Asked before recordGame, which overwrites it.
export const isNewBest = (before: LevelStats, { solved, hinted, ms }: Result): boolean =>
  solved && !hinted && (before.bestMs === null || ms < before.bestMs);

// A solve, giving up and abandoning a started puzzle (solved: false) all come here. Every puzzle counts as played and
// a failure resets the current streak. A clean solve adds to the solved count, the streak and the best time; a hinted
// solve only to the solved count (the hub's hint rule: it neither extends nor resets the streak, and sets no best time).
export function recordGame(stats: Stats, level: Level, { solved, hinted, ms }: Result): Stats {
  const s = stats[level];
  const next: LevelStats = { ...s, played: s.played + 1 };
  if (!solved) next.currentStreak = 0;
  else {
    next.solved = s.solved + 1;
    if (!hinted) {
      next.currentStreak = s.currentStreak + 1;
      next.bestStreak = Math.max(s.bestStreak, next.currentStreak);
      next.bestMs = Math.min(s.bestMs ?? ms, ms);
    }
  }
  return { ...stats, [level]: next };
}
