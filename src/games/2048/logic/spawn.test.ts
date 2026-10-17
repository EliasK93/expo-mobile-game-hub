import { mulberry32 } from '@/lib/random';
import { fromValues, toValues } from './board';
import { spawn } from './spawn';

describe('spawn', () => {
  it('puts the new tile, with the given id, on the only empty cell and leaves the rest alone', () => {
    const board = fromValues([2, 4, 8, 16, 2, 4, 8, 16, 2, 4, 0, 16, 2, 4, 8, 16]);
    const { board: next, spawned } = spawn(board, mulberry32(1), 99);
    expect(spawned.at).toBe(10);
    expect(spawned.id).toBe(99);
    expect([2, 4]).toContain(spawned.value);
    expect(next[10]).toEqual({ id: 99, value: spawned.value });
    expect(next.filter((_, i) => i !== 10)).toEqual(board.filter((_, i) => i !== 10));
  });

  it('does not change the board it is given', () => {
    const board = fromValues([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const copy = JSON.stringify(board);
    spawn(board, mulberry32(5), 7);
    expect(JSON.stringify(board)).toBe(copy);
  });

  it('lands only on empty cells, and reaches every one of them, over many seeds', () => {
    const values = [2, 0, 4, 0, 0, 8, 0, 2, 16, 0, 0, 4, 0, 2, 0, 0];
    const empty = values.flatMap((v, i) => (v === 0 ? [i] : []));
    const board = fromValues(values);
    const hit = new Set<number>();
    for (let seed = 0; seed < 500; seed++) {
      const { board: next, spawned } = spawn(board, mulberry32(seed), 50);
      expect(empty).toContain(spawned.at);
      expect(toValues(next).filter((v) => v > 0)).toHaveLength(values.filter((v) => v > 0).length + 1);
      hit.add(spawned.at);
    }
    expect([...hit].sort((a, b) => a - b)).toEqual(empty);
  });

  it('a 4 is spawned about 10 % of the time, a 2 otherwise', () => {
    const board = fromValues(Array(16).fill(0));
    let fours = 0;
    for (let seed = 0; seed < 10_000; seed++) {
      const { spawned } = spawn(board, mulberry32(seed), 1);
      expect([2, 4]).toContain(spawned.value);
      if (spawned.value === 4) fours++;
    }
    expect(fours / 10_000).toBeGreaterThan(0.08);
    expect(fours / 10_000).toBeLessThan(0.12);
  });

  it('picks the cell with the first random number and the value with the second', () => {
    const board = fromValues([0, 0, 0, 0]);
    expect(spawn(board, () => 0, 1).spawned).toEqual({ id: 1, at: 0, value: 2 });
    const last = [0.99, 0.95]; // last empty cell, then a 4
    expect(spawn(board, () => last.shift() as number, 1).spawned).toEqual({ id: 1, at: 3, value: 4 });
    const edge = [0.5, 0.9]; // 0.9 is not below 0.9: a 4
    expect(spawn(board, () => edge.shift() as number, 1).spawned).toEqual({ id: 1, at: 2, value: 4 });
  });

  it('the same seed gives the same tile on the same cell', () => {
    const board = fromValues(Array(25).fill(0));
    expect(spawn(board, mulberry32(42), 3)).toEqual(spawn(board, mulberry32(42), 3));
  });

  it('throws on a full board: the caller only spawns after a real move, which always frees a cell', () => {
    expect(() => spawn(fromValues([2, 4, 4, 2]), mulberry32(1), 1)).toThrow();
  });
});
