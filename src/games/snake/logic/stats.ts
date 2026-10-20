import type { Level } from './board';

// best: 0 = no score yet, so "a score of 0 is never a best" needs no case of its own. longestMs = the longest game.
export type LevelStats = { played: number; best: number; totalApples: number; longestMs: number };
export type Stats = Record<Level, LevelStats>;

const EMPTY_LEVEL: LevelStats = { played: 0, best: 0, totalApples: 0, longestMs: 0 };
export const EMPTY_STATS: Stats = { slow: EMPTY_LEVEL, normal: EMPTY_LEVEL, fast: EMPTY_LEVEL };

// What the stats record about a game: its apples and the time on the clock.
export type Result = { apples: number; ms: number };

// "New best!": the score beats the stored best of its level. Asked before recordGame, which overwrites it.
export const isNewBest = (before: LevelStats, apples: number): boolean => apples > before.best;

// Game over, a win and abandoning a started game all come here, each with the score it reached; every game counts as played.
export function recordGame(stats: Stats, level: Level, { apples, ms }: Result): Stats {
  const s = stats[level];
  const next: LevelStats = {
    played: s.played + 1,
    best: Math.max(s.best, apples),
    totalApples: s.totalApples + apples,
    longestMs: Math.max(s.longestMs, ms),
  };
  return { ...stats, [level]: next };
}

// Whole apples per game, rounded; 0 before the first game.
export const average = ({ played, totalApples }: LevelStats): number =>
  played === 0 ? 0 : Math.round(totalApples / played);
