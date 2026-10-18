import type { Level } from './board';

export type LevelStats = { played: number; wins: number; currentStreak: number; bestStreak: number; bestMs: number | null };
export type Stats = Record<Level, LevelStats>;

const EMPTY_LEVEL: LevelStats = { played: 0, wins: 0, currentStreak: 0, bestStreak: 0, bestMs: null };
export const EMPTY_STATS: Stats = { beginner: EMPTY_LEVEL, intermediate: EMPTY_LEVEL, expert: EMPTY_LEVEL };

// What the stats record about a finished or abandoned game; ms is the time on the clock.
export type Result = { won: boolean; ms: number };

// "New best!": a win faster than the stored best time of its level, or the first win. Asked before recordGame, which overwrites it.
export const isNewBest = (before: LevelStats, { won, ms }: Result): boolean =>
  won && (before.bestMs === null || ms < before.bestMs);

// A win, a loss and abandoning a started game (won: false) all come here. Every game counts as played; only a win adds
// to the wins, the streak and the best time, and a loss resets the current streak.
export function recordGame(stats: Stats, level: Level, { won, ms }: Result): Stats {
  const s = stats[level];
  const next: LevelStats = { ...s, played: s.played + 1, currentStreak: 0 };
  if (won) {
    next.wins = s.wins + 1;
    next.currentStreak = s.currentStreak + 1;
    next.bestStreak = Math.max(s.bestStreak, next.currentStreak);
    next.bestMs = Math.min(s.bestMs ?? ms, ms);
  }
  return { ...stats, [level]: next };
}
