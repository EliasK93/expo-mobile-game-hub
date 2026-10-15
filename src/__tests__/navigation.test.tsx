import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { games } from '@/games/registry';

// Opening Sudoku starts a game; a fixed puzzle keeps this test independent of real generation.
jest.mock('@/games/sudoku/logic/generate', () => ({
  generateLevel: function* () {
    yield;
    const solution = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'.split('').map(Number);
    return { puzzle: solution.map((v, i) => (i === 0 ? 0 : v)), solution, attempts: 1 };
  },
}));

// Renders the REAL route folder (src/app), so this fails if a route or the registry is not wired up.
// Typed routes are off, so this test is what catches a registry entry without a route file.
describe('navigation', () => {
  it.each(games)('lists $title on home and opens its route $route', async (game) => {
    const { getPathname } = renderRouter('./src/app');

    expect(getPathname()).toBe('/');
    fireEvent.press(screen.getByText(game.title));

    expect(getPathname()).toBe(game.route);
    expect(screen.queryByTestId('expo-router-unmatched')).toBeNull();
    await act(async () => {}); // let the game's storage loads finish inside act
  });
});
