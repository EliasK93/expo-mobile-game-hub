import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { games } from '@/games/registry';

// Renders the REAL route folder (src/app), so this fails if a route or the registry is not wired up.
// Typed routes are off, so this test is what catches a registry entry without a route file.
describe('navigation', () => {
  it.each(games)('lists $title on home and opens its route $route', async (game) => {
    const { getPathname } = renderRouter('./src/app');
    await act(async () => {}); // home shows its tiles once the sort and playtime are loaded

    expect(getPathname()).toBe('/');
    fireEvent.press(screen.getByText(game.title));

    expect(getPathname()).toBe(game.route);
    expect(screen.queryByTestId('expo-router-unmatched')).toBeNull();
    await act(async () => {}); // let the game's storage loads finish inside act
  });

  // A reload or a deep link rebuilds the stack from the URL alone; the layout's anchor keeps home underneath, so Back works.
  it.each(games)('goes back to home from $title after opening its route directly', async (game) => {
    const { getPathname } = renderRouter('./src/app', { initialUrl: game.route });
    await act(async () => {});

    expect(getPathname()).toBe(game.route);
    await act(async () => router.back());
    await act(async () => {});

    expect(getPathname()).toBe('/');
  });

  // A game that forgets to wrap its route in GameRoute would never get playtime; this catches it for every future game.
  it.each(games)('records playtime for $title', async (game) => {
    jest.useFakeTimers();
    try {
      renderRouter('./src/app');
      await act(async () => {});
      fireEvent.press(screen.getByText(game.title));
      await act(async () => {});
      await act(() => jest.advanceTimersByTime(3000));
      await act(async () => router.back());
      await act(async () => {});

      const stored = JSON.parse((await AsyncStorage.getItem('hub:playtime')) ?? 'null');
      expect(stored.data[game.id].totalMs).toBeGreaterThanOrEqual(3000);
    } finally {
      jest.useRealTimers();
    }
  });
});
