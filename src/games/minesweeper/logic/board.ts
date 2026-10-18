export const LEVEL_IDS = ['beginner', 'intermediate', 'expert'] as const;
export type Level = (typeof LEVEL_IDS)[number];

// Sized for a phone in portrait, with the mine density of the classic levels (12 %, 16 %, 21 %).
export const LEVELS: Record<Level, { cols: number; rows: number; mines: number }> = {
  beginner: { cols: 9, rows: 9, mines: 10 },
  intermediate: { cols: 10, rows: 14, mines: 22 },
  expert: { cols: 10, rows: 18, mines: 37 },
};

// A board is cols × rows cells in reading order (row by row): i = row * cols + col.
export const cellCount = (level: Level) => LEVELS[level].cols * LEVELS[level].rows;

// Up to 8 cells around i. Done per row and column: i ± 1 in the array would wrap across the end of a row.
export function neighbours(level: Level, i: number): number[] {
  const { cols, rows } = LEVELS[level];
  const row = Math.floor(i / cols);
  const col = i % cols;
  const around: number[] = [];
  for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
      if (r !== row || c !== col) around.push(r * cols + c);
    }
  }
  return around;
}

// The number of mines next to each cell (a mine's own count leaves itself out).
export const counts = (level: Level, mines: boolean[]): number[] =>
  mines.map((_, i) => neighbours(level, i).filter((n) => mines[n]).length);
