import puzzles from '../data/puzzles.json';
import { parseGrid, type Grid } from './board';
import type { Puzzle } from './game';
import { shuffle, type Random } from '@/lib/random';
import { solve } from './solve';
import type { Level } from './techniques';

// One of the 8 ways to turn or mirror the board (a quarter turns, with or without a mirror), then the digits 1-9 relabeled
// at random. The result is the same puzzle in disguise: still one solution, same rating, same number of givens.
export function transform(grid: Grid, random: Random): Grid {
  const k = Math.floor(random() * 8);
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  return Array.from({ length: 81 }, (_, i) => {
    let r = Math.floor(i / 9);
    let c = i % 9;
    if (k & 4) c = 8 - c; // mirror
    for (let n = 0; n < (k & 3); n++) [r, c] = [c, 8 - r]; // quarter turn
    const v = grid[r * 9 + c];
    return v === 0 ? 0 : digits[v - 1];
  });
}

// A random puzzle of the level from the shipped pool (data/puzzles.json, built by build-puzzles.test.ts), in disguise.
// The pool holds no solutions: solve() finds it in milliseconds.
export function pickPuzzle(level: Level, random: Random = Math.random): Puzzle {
  const list = (puzzles as Record<string, string[]>)[level];
  const puzzle = transform(parseGrid(list[Math.floor(random() * list.length)]), random);
  return { puzzle, solution: solve(puzzle)! }; // the pool test checks every sampled puzzle has a solution
}
