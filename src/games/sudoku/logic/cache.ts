import type { Puzzle } from './game';
import { isCells } from './save';
import { LEVELS, type Level } from './techniques';

// The ready puzzles ("sudoku:cache", version 1): up to PER_LEVEL per level, so "New game" is instant.
export type PuzzleCache = Record<Level, Puzzle[]>;

export const CACHE_KEY = 'sudoku:cache';
export const CACHE_VERSION = 1;
export const PER_LEVEL = 3;

export const emptyCache = (): PuzzleCache => ({ 1: [], 2: [], 3: [], 4: [], 5: [] });

// Storage holds whatever was written, so keep only well-formed entries; anything else counts as not cached.
export function fromCache(data: unknown): PuzzleCache {
  const cache = emptyCache();
  if (data === null || typeof data !== 'object') return cache;
  for (const level of LEVELS) {
    const list = (data as Record<number, unknown>)[level];
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      if (cache[level].length < PER_LEVEL && p && isCells(p.puzzle, 9) && isCells(p.solution, 9)) {
        cache[level].push({ puzzle: p.puzzle, solution: p.solution });
      }
    }
  }
  return cache;
}
