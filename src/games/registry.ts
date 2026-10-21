import type { ComponentType } from 'react';

import { Game2048Tile } from './2048/ui/tile';
import { AnagramTile } from './anagram/ui/tile';
import { Make24Tile } from './make24/ui/tile';
import { MinesweeperTile } from './minesweeper/ui/tile';
import { SnakeTile } from './snake/ui/tile';
import { SudokuTile } from './sudoku/ui/tile';

// route is a plain string: typed routes are off, so Href adds nothing (navigation.test.tsx checks every route).
// Tile is the game's art on home. It fills the square it is given, in the theme colours, so home stays generic.
// A game's route file wraps its screen in GameRoute with the same id, which records its playtime (navigation.test.tsx checks that too).
export type Game = { id: string; title: string; route: string; Tile: ComponentType };

export const games: Game[] = [
  { id: 'sudoku', title: 'Sudoku', route: '/sudoku', Tile: SudokuTile },
  { id: '2048', title: '2048', route: '/2048', Tile: Game2048Tile },
  { id: 'minesweeper', title: 'Minesweeper', route: '/minesweeper', Tile: MinesweeperTile },
  { id: 'make24', title: 'Make 24', route: '/make24', Tile: Make24Tile },
  { id: 'snake', title: 'Snake', route: '/snake', Tile: SnakeTile },
  { id: 'anagram', title: 'Anagrams', route: '/anagram', Tile: AnagramTile },
];
