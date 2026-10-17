import type { Board } from './board';
import type { Random } from '@/lib/random';

export type Spawned = { id: number; at: number; value: number };

// One new tile, a 2 (90 %) or a 4 (10 %), on a random empty cell. The first random number picks the cell, the second the value.
// A real move always frees or leaves a cell, so a full board here is a bug in the caller.
export function spawn(board: Board, random: Random, id: number): { board: Board; spawned: Spawned } {
  const empty = board.flatMap((tile, i) => (tile === null ? [i] : []));
  if (empty.length === 0) throw new Error('spawn: the board is full');
  const at = empty[Math.floor(random() * empty.length)];
  const value = random() < 0.9 ? 2 : 4;
  return { board: board.map((tile, i) => (i === at ? { id, value } : tile)), spawned: { id, at, value } };
}
