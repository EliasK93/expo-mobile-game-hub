import { newOrder, nextPuzzle, type Order } from './order';
import { mulberry32 } from '@/lib/random';

// Ten different puzzles, each sorted ascending like the pool's (the order does not care whether they are solvable).
const POOL = Array.from({ length: 10 }, (_, i) => [1, 1, 2 + (i % 3), 4 + i]);

// Takes n puzzles in a row, carrying the order along like the app does with its saved order.
function take(n: number, start: Order | null, random = mulberry32(1)) {
  const puzzles: number[][] = [];
  let order = start;
  for (let i = 0; i < n; i++) {
    const r = nextPuzzle(order, POOL, random);
    puzzles.push(r.numbers);
    order = r.order;
  }
  return { puzzles, order: order as Order };
}

const keys = (puzzles: number[][]) => puzzles.map((p) => p.join(',')).sort();

describe('newOrder', () => {
  it('is a shuffled copy of the pool, starting at 0', () => {
    const input = POOL.map((p) => [...p]);
    const o = newOrder(input, mulberry32(1));
    expect(input).toEqual(POOL);
    expect(keys(o.puzzles)).toEqual(keys(POOL));
    expect(o.puzzles).not.toEqual(POOL);
    expect(o.next).toBe(0);
  });
});

describe('nextPuzzle', () => {
  it('serves the whole pool once, without repeats', () => {
    const { puzzles } = take(POOL.length, null);
    expect(new Set(puzzles.map((p) => p.join(','))).size).toBe(POOL.length);
    expect(keys(puzzles)).toEqual(keys(POOL));
  });

  it('continues with a new shuffle after the last puzzle', () => {
    const random = mulberry32(1);
    const first = take(POOL.length, null, random);
    const second = take(POOL.length, first.order, random);
    expect(keys(second.puzzles)).toEqual(keys(POOL));
    expect(second.puzzles).not.toEqual(first.puzzles);
    expect(second.order.puzzles).not.toBe(first.order.puzzles);
  });

  it('carries on where a saved order left off, without changing it', () => {
    const saved: Order = { puzzles: [POOL[2], POOL[0], POOL[1], ...POOL.slice(3)], next: 2 };
    const r = nextPuzzle(saved, POOL, mulberry32(1));
    expect(r.numbers).toEqual(POOL[1]);
    expect(r.order).toEqual({ puzzles: saved.puzzles, next: 3 });
    expect(saved.next).toBe(2);
  });

  it('starts an order when there is none', () => {
    const r = nextPuzzle(null, POOL, mulberry32(1));
    expect(r.order.next).toBe(1);
    expect(keys(r.order.puzzles)).toEqual(keys(POOL));
    expect(r.numbers).toEqual(r.order.puzzles[0]);
  });

  it('replaces an order that no longer matches the pool', () => {
    const stale: Order[] = [
      { puzzles: [...POOL.slice(0, -1), [13, 13, 13, 13]], next: 4 }, // a puzzle was swapped
      { puzzles: POOL.slice(0, 8), next: 4 }, // the pool grew
      { puzzles: [...POOL, [13, 13, 13, 13]], next: 4 }, // the pool shrank
    ];
    for (const order of stale) {
      const r = nextPuzzle(order, POOL, mulberry32(1));
      expect(r.order.next).toBe(1);
      expect(keys(r.order.puzzles)).toEqual(keys(POOL));
    }
  });
});
