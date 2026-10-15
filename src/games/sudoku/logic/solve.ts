import { candidateMask, type Grid } from './board';
import { conflicts } from './validate';

// Backtracking search, always branching on the empty cell with the fewest candidates (MRV).
// Stops as soon as `limit` solutions are found. The input is copied, never mutated.
function search(grid: Grid, limit: number): { count: number; first: Grid | null } {
  if (conflicts(grid).size > 0) return { count: 0, first: null };

  const g = [...grid];
  let count = 0;
  let first: Grid | null = null;

  const visit = () => {
    let best = -1;
    let bestMask = 0;
    let bestSize = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i] !== 0) continue;
      const mask = candidateMask(g, i);
      let size = 0;
      for (let m = mask; m; m &= m - 1) size++;
      if (size < bestSize) {
        best = i;
        bestMask = mask;
        bestSize = size;
        if (size === 0) return; // dead end
      }
    }

    if (best === -1) {
      count++;
      first ??= [...g];
      return;
    }

    for (let v = 1; v <= 9 && count < limit; v++) {
      if (!(bestMask & (1 << v))) continue;
      g[best] = v;
      visit();
      g[best] = 0;
    }
  };

  visit();
  return { count, first };
}

export const countSolutions = (grid: Grid, limit = 2) => search(grid, limit).count;

export const solve = (grid: Grid): Grid | null => search(grid, 1).first;
