import type { Level } from './words';

// best: 0 = no score yet, so "a score of 0 is never a best" needs no case of its own.
export type LevelStats = { played: number; best: number; totalWords: number };
export type Stats = Record<Level, LevelStats>;

const EMPTY_LEVEL: LevelStats = { played: 0, best: 0, totalWords: 0 };
export const EMPTY_STATS: Stats = { easy: EMPTY_LEVEL, normal: EMPTY_LEVEL, hard: EMPTY_LEVEL };

// "New best!": the score beats the stored best of its level. Asked before recordRound, which overwrites it.
export const isNewBest = (before: LevelStats, words: number): boolean => words > before.best;

// A finished round and abandoning a started one both come here, each with the words solved; every round counts as played.
export function recordRound(stats: Stats, level: Level, words: number): Stats {
  const s = stats[level];
  const next: LevelStats = {
    played: s.played + 1,
    best: Math.max(s.best, words),
    totalWords: s.totalWords + words,
  };
  return { ...stats, [level]: next };
}

// Whole words per round, rounded; 0 before the first round.
export const average = ({ played, totalWords }: LevelStats): number =>
  played === 0 ? 0 : Math.round(totalWords / played);
