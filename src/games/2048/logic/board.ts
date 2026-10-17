// A board is n×n cells in reading order (row by row); null = empty cell. The id follows a tile through its moves,
// so the UI can animate it.
export type Tile = { id: number; value: number };
export type Board = (Tile | null)[];

export const SIZES = [4, 5, 6, 7] as const;
export type Size = (typeof SIZES)[number];

export type Dir = 'up' | 'down' | 'left' | 'right';

// 2048 on 4×4, doubling with every size: 4096, 8192, 16384.
export const winTile = (size: Size) => 2048 * 2 ** (size - 4);

export const sizeOf = (board: Board) => Math.round(Math.sqrt(board.length));

export const maxTile = (board: Board) => Math.max(0, ...board.map((t) => t?.value ?? 0));

// 0 = empty cell; the tiles get the ids 1..k in reading order. toValues is the way back.
export function fromValues(values: number[]): Board {
  let id = 0;
  return values.map((value) => (value === 0 ? null : { id: ++id, value }));
}

export const toValues = (board: Board) => board.map((t) => t?.value ?? 0);

// No empty cell and no two equal tiles side by side or on top of each other.
export function isOver(board: Board): boolean {
  const n = sizeOf(board);
  return board.every((tile, i) => {
    if (tile === null) return false;
    const right = i % n < n - 1 ? board[i + 1] : null; // the next cell in the array is on the next row after the last column
    const below = board[i + n]; // undefined past the last row
    return right?.value !== tile.value && below?.value !== tile.value;
  });
}
