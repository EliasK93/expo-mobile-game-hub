import { sizeOf, type Board, type Dir } from './board';

// Cell numbers are indexes into the board array. Every tile whose cell changes has a slide, the tile that merges
// away included (it slides into the cell where the merge happens).
export type Slide = { id: number; from: number; to: number };
// The merged tile keeps the id of the tile nearer the edge; removedId is the other one.
export type Merge = { id: number; removedId: number; at: number; value: number };
export type MoveResult = { board: Board; moved: boolean; gained: number; slides: Slide[]; merges: Merge[] };

// The cells of line i, the cell at the edge the move goes to first.
function lineCells(n: number, dir: Dir, i: number): number[] {
  return Array.from({ length: n }, (_, k) => {
    const j = dir === 'left' || dir === 'up' ? k : n - 1 - k;
    return dir === 'left' || dir === 'right' ? i * n + j : j * n + i;
  });
}

export function move(board: Board, dir: Dir): MoveResult {
  const n = sizeOf(board);
  const next: Board = Array(n * n).fill(null);
  const slides: Slide[] = [];
  const merges: Merge[] = [];
  let gained = 0;

  for (let i = 0; i < n; i++) {
    const cells = lineCells(n, dir, i);
    let placed = -1; // how many cells of the line are filled, minus one
    let fresh = false; // the last placed tile came from a merge in this move, so it cannot merge again
    for (const from of cells) {
      const tile = board[from];
      if (tile === null) continue;
      const last = placed >= 0 ? next[cells[placed]] : null;
      if (last !== null && !fresh && last.value === tile.value) {
        const at = cells[placed];
        const value = last.value * 2;
        next[at] = { id: last.id, value };
        merges.push({ id: last.id, removedId: tile.id, at, value });
        slides.push({ id: tile.id, from, to: at });
        gained += value;
        fresh = true;
      } else {
        placed++;
        const to = cells[placed];
        next[to] = tile;
        if (to !== from) slides.push({ id: tile.id, from, to });
        fresh = false;
      }
    }
  }
  return { board: next, moved: slides.length > 0, gained, slides, merges };
}
