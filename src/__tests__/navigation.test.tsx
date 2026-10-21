import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { Colors, type ThemeColor } from '@/constants/theme';
import { games } from '@/games/registry';

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => mockScheme }));

const TILE_TOKEN: Record<string, ThemeColor> = {
  sudoku: 'glyphSudoku',
  '2048': 'glyph2048',
  minesweeper: 'glyphMinesweeper',
  make24: 'glyphMake24',
  snake: 'glyphSnake',
  anagram: 'glyphAnagram',
};
const argb = (hex: string) => (0xff000000 | parseInt(hex.slice(1), 16)) >>> 0; // '#RRGGBB' as react-native-svg parses it

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

  // Every game's home cell holds one glyph on the shared GlyphTile frame, tinted with that game's own accent token, and the
  // accents tell the games apart. A new game needs a row here (and fails the first test until it has one).
  describe.each(['light', 'dark'] as const)('home tiles in %s mode', (scheme) => {
    beforeEach(() => {
      mockScheme = scheme;
    });

    it('shows one glyph tile per game in its own token colour, all different', async () => {
      renderRouter('./src/app');
      await act(async () => {});

      // The glyph is decoration (aria-hidden), so the queries must look at hidden elements. react-native-svg hands the fill
      // on as a parsed ARGB number ({ type, payload }).
      const hidden = { includeHiddenElements: true };
      const fills = games.map((game) => {
        const tiles = within(screen.getByRole('link', { name: game.title })).getAllByTestId('glyph-tile', hidden);
        expect(tiles).toHaveLength(1);
        return within(tiles[0]).getByTestId('glyph-tile-bg', hidden).props.fill.payload;
      });
      expect(fills).toEqual(games.map((game) => argb(Colors[scheme][TILE_TOKEN[game.id]])));
      expect(new Set(fills).size).toBe(games.length);
    });
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
