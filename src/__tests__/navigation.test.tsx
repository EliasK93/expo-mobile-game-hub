import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

// Renders the REAL route folder (src/app), so this fails if a route or the registry is not wired up.
describe('navigation', () => {
  it('lists Sudoku on home and opens the Sudoku screen', () => {
    const { getPathname } = renderRouter('./src/app');

    expect(getPathname()).toBe('/');
    fireEvent.press(screen.getByText('Sudoku'));

    expect(getPathname()).toBe('/sudoku');
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });
});
