import { useTheme } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';
import { Colors } from '@/constants/theme';
import { games } from '@/games/registry';

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => mockScheme }));

// A throwaway screen inside the real root layout: shows the colours React Navigation draws the header and screens with.
function Probe() {
  const { colors, dark } = useTheme();
  return <Text>{JSON.stringify({ dark, ...colors })}</Text>;
}

describe('navigation theme', () => {
  it.each(['light', 'dark'] as const)('takes the %s colours from the theme tokens', async (scheme) => {
    mockScheme = scheme;
    // The layout declares a screen per game, so the games need a (blank) route too.
    renderRouter({
      _layout: RootLayout,
      index: Probe,
      ...Object.fromEntries(games.map((g) => [g.route.slice(1), () => null])),
    });
    await act(async () => {});

    const t = Colors[scheme];
    expect(JSON.parse(screen.getByText(/"dark"/).props.children)).toEqual({
      dark: scheme === 'dark',
      primary: t.accent,
      background: t.background,
      card: t.background,
      text: t.text,
      border: t.gridLine,
      notification: t.digitConflict,
    });
  });
});
