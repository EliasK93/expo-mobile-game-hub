import type { ComponentType } from 'react';

import { SudokuTile } from './sudoku/ui/tile';

// route is a plain string: typed routes are off, so Href adds nothing (navigation.test.tsx checks every route).
// Tile is the game's art on home. It fills the square it is given, in the theme colours, so home stays generic.
// A game's route file wraps its screen in GameRoute with the same id, which records its playtime (navigation.test.tsx checks that too).
export type Game = { id: string; title: string; route: string; Tile: ComponentType };

export const games: Game[] = [{ id: 'sudoku', title: 'Sudoku', route: '/sudoku', Tile: SudokuTile }];
