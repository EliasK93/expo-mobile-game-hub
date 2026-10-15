// route is a plain string: typed routes are off, so Href adds nothing (navigation.test.tsx checks every route).
export type Game = { id: string; title: string; route: string };

export const games: Game[] = [{ id: 'sudoku', title: 'Sudoku', route: '/sudoku' }];
