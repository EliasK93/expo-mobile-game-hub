// 81 cells, row-major, 0 = empty.
export type Grid = readonly number[];

export const DIGITS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const CELLS: readonly number[] = Array.from({ length: 81 }, (_, i) => i);

export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

// The 20 cells sharing a row, column or box with each cell, computed once.
const PEERS: readonly (readonly number[])[] = CELLS.map((i) =>
  CELLS.filter((j) => j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))),
);

export const peers = (i: number) => PEERS[i];

// Bitmask of the digits that could still go in cell i: bit v set = v is not used by a peer.
export function candidateMask(grid: Grid, i: number): number {
  let used = 0;
  for (const p of PEERS[i]) used |= 1 << grid[p];
  return ~used & 0b1111111110;
}

export function parseGrid(s: string): Grid {
  if (!/^[0-9.]{81}$/.test(s)) throw new Error('A grid is 81 characters of 0-9 or "."');
  return Array.from(s, (c) => (c === '.' ? 0 : Number(c)));
}

export const formatGrid = (g: Grid) => g.join('');
