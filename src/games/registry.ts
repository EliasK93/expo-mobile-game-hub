import type { Href } from 'expo-router';

export type Game = { id: string; title: string; route: Href };

export const games: Game[] = [{ id: 'sudoku', title: 'Sudoku', route: '/sudoku' }];
