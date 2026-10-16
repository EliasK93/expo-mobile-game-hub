import { candidateMask, CELLS, DIGITS, type Grid } from './board';
import { shuffle, type Random } from '@/lib/random';
import { rate } from './rate';
import { countSolutions } from './solve';
import type { Level } from './techniques';

// Fills the grid cell by cell with random legal digits, backtracking on dead ends.
export function fill(g: number[], random: Random, i = 0): boolean {
  if (i === 81) return true;
  const mask = candidateMask(g, i);
  for (const v of shuffle([...DIGITS], random)) {
    if (!(mask & (1 << v))) continue;
    g[i] = v;
    if (fill(g, random, i + 1)) return true;
    g[i] = 0;
  }
  return false;
}

// A puzzle that needs exactly `level`: unique, solvable with the level's techniques, and not with fewer.
// Fills a grid, then digs out cells in random order, keeping a removal while the puzzle stays unique and
// rate() <= level. If the result rates below `level`, it starts over with a new grid (`attempts` counts the grids).
// Only the offline pool build calls it. `random` is required: the pool is rebuilt from seeds, so an unseeded run would not be reproducible.
// ponytail: no cap on `attempts`; Hard needs up to ~190 grids on the PC (measure.test.ts), so a bad seed range can run for long.
export function generateLevel(level: Level, random: Random): { puzzle: Grid; solution: Grid; attempts: number } {
  for (let attempts = 1; ; attempts++) {
    const solution = new Array<number>(81).fill(0);
    fill(solution, random);

    const puzzle = [...solution];
    let rated: Level = 1;
    for (const i of shuffle([...CELLS], random)) {
      const keep = puzzle[i];
      puzzle[i] = 0;
      const r = countSolutions(puzzle, 2) === 1 ? rate(puzzle, level) : null;
      if (r === null) puzzle[i] = keep; // a second solution, or it would need a technique above the level
      else rated = r;
    }
    if (rated === level) return { puzzle, solution, attempts };
  }
}
