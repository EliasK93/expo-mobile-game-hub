export const COLS = 15;
export const ROWS = 21;
export const CELLS = COLS * ROWS;

export const LEVEL_IDS = ['slow', 'normal', 'fast'] as const;
export type Level = (typeof LEVEL_IDS)[number];

export const DIRS = ['up', 'down', 'left', 'right'] as const;
export type Dir = (typeof DIRS)[number];

// A cell is its index in reading order (row by row), 0-based: i = row * COLS + col.
export const cell = (col: number, row: number): number => row * COLS + col;
export const colRow = (i: number): [number, number] => [i % COLS, Math.floor(i / COLS)];

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
export const opposite = (dir: Dir): Dir => OPPOSITE[dir];

// The cell one step from i in the direction, or null off the board. Done per row and column: i +/- 1 in the array
// would wrap across the end of a row.
export function next(i: number, dir: Dir): number | null {
  const [col, row] = colRow(i);
  const c = col + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
  const r = row + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
  return c < 0 || c >= COLS || r < 0 || r >= ROWS ? null : cell(c, r);
}
