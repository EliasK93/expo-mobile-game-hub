import { candidateMask, type Grid } from './board';
import type { Random } from './random';
import { countSolutions } from './solve';

function shuffle<T>(items: T[], random: Random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Fills the grid cell by cell with random legal digits, backtracking on dead ends.
function fill(g: number[], random: Random, i = 0): boolean {
  if (i === 81) return true;
  const mask = candidateMask(g, i);
  for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random)) {
    if (!(mask & (1 << v))) continue;
    g[i] = v;
    if (fill(g, random, i + 1)) return true;
    g[i] = 0;
  }
  return false;
}

// ponytail: the givens target stands in for difficulty until M6 adds a technique rating;
// generation runs synchronously on the UI thread until the M6 decision on keeping it off the UI path.
export function generate({ givens = 32, random = Math.random }: { givens?: number; random?: Random } = {}): {
  puzzle: Grid;
  solution: Grid;
} {
  const solution = new Array<number>(81).fill(0);
  fill(solution, random);

  const puzzle = [...solution];
  let remaining = 81;
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k), random)) {
    if (remaining <= givens) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) remaining--;
    else puzzle[i] = keep; // removing it would allow a second solution
  }
  return { puzzle, solution };
}
