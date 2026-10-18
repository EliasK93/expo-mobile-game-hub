import { shuffle, type Random } from '@/lib/random';

// puzzles = the pool in the order it is served, next = how many have been served so far.
export type Order = { puzzles: number[][]; next: number };

const key = (puzzle: readonly number[]) => puzzle.join(',');

export const newOrder = (pool: readonly number[][], random: Random): Order => ({
  puzzles: shuffle([...pool], random),
  next: 0,
});

// The next puzzle and the order to save. The order is not changed in place. A new shuffle starts when there is no
// order, when it no longer matches the pool, and after its last puzzle, so nothing repeats before then.
export function nextPuzzle(
  order: Order | null,
  pool: readonly number[][],
  random: Random,
): { numbers: number[]; order: Order } {
  // ponytail: a stale order is dropped whole, so tuning the pool loses the progress through the old order; keep the played puzzles if that ever hurts
  const known = new Set(pool.map(key));
  const valid = order !== null && order.puzzles.length === pool.length && order.puzzles.every((p) => known.has(key(p)));
  const current = valid && order.next < order.puzzles.length ? order : newOrder(pool, random);
  return { numbers: current.puzzles[current.next], order: { puzzles: current.puzzles, next: current.next + 1 } };
}
