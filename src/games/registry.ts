import type { ComponentType } from 'react';

import { SudokuSummary } from './sudoku/ui/summary';

// route is a plain string: typed routes are off, so Href adds nothing (navigation.test.tsx checks every route).
// Summary is an optional line shown under the title on home (e.g. stats), so home stays generic.
export type Game = { id: string; title: string; route: string; Summary?: ComponentType };

export const games: Game[] = [{ id: 'sudoku', title: 'Sudoku', route: '/sudoku', Summary: SudokuSummary }];
