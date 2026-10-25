import { shuffle, type Random } from '@/lib/random';
import { CELLS, type Grid } from '@/games/sudoku/logic/board';
import { fill } from '@/games/sudoku/logic/generate';
import { countSolutions } from '@/games/sudoku/logic/solve';

// A unique puzzle dug down to about `givens` givens with no technique rating, so many of these are beyond what the
// ladder can solve. The soundness tests in rate/techniques use them for sparse boards that generateLevel would never
// produce.
export function sparsePuzzle(givens: number, random: Random): { puzzle: Grid; solution: Grid } {
  const solution = new Array<number>(81).fill(0);
  fill(solution, random);
  const puzzle = [...solution];
  let remaining = 81;
  for (const i of shuffle([...CELLS], random)) {
    if (remaining <= givens) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) remaining--;
    else puzzle[i] = keep;
  }
  return { puzzle, solution };
}
