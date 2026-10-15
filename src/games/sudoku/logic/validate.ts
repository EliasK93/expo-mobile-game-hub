import { peers, type Grid } from './board';

// Cells whose value is repeated among their peers (row, column or box).
export function conflicts(grid: Grid): Set<number> {
  const bad = new Set<number>();
  grid.forEach((v, i) => {
    if (v !== 0 && peers(i).some((p) => grid[p] === v)) bad.add(i);
  });
  return bad;
}

export const isComplete = (grid: Grid) => grid.every((v) => v !== 0);

export const isSolved = (grid: Grid) => isComplete(grid) && conflicts(grid).size === 0;
