import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { games } from '@/games/registry';

// Renders the REAL route folder (src/app), so this fails if a route or the registry is not wired up.
// Typed routes are off, so this test is what catches a registry entry without a route file.
describe('navigation', () => {
  it.each(games)('lists $title on home and opens its route $route', (game) => {
    const { getPathname } = renderRouter('./src/app');

    expect(getPathname()).toBe('/');
    fireEvent.press(screen.getByText(game.title));

    expect(getPathname()).toBe(game.route);
    expect(screen.queryByTestId('expo-router-unmatched')).toBeNull();
  });

  it('shows the Sudoku placeholder', () => {
    renderRouter('./src/app', { initialUrl: '/sudoku' });

    expect(screen.getByText('Coming soon')).toBeTruthy();
  });
});
