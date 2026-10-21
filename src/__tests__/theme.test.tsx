import { useTheme } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RootLayout from '@/app/_layout';
import { TINT_OPACITY } from '@/components/glyph-tile';
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

// WCAG relative luminance and contrast ratio of two '#RRGGBB' colours (or already-mixed channel triples).
type Rgb = [number, number, number];
const toRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// The glyph is drawn in the accent on a tile of the same accent at TINT_OPACITY over the page background.
describe('glyph tile colours', () => {
  it.each(['light', 'dark'] as const)('every %s glyph token reaches 3:1 against its own tint', (scheme) => {
    const t = Colors[scheme];
    const tokens = Object.entries(t).filter(([name]) => name.startsWith('glyph'));
    expect(tokens).toHaveLength(games.length);
    for (const [name, hex] of tokens) {
      const a = TINT_OPACITY[scheme];
      const tint = toRgb(hex).map((v, i) => v * a + toRgb(t.background)[i] * (1 - a)) as Rgb;
      expect({ name, ratio: contrast(toRgb(hex), tint) >= 3 }).toEqual({ name, ratio: true });
      // The knock-out (2048 and A/Z text, the mine's highlight) is the page background on the solid accent.
      expect({ name, knockOut: contrast(toRgb(t.background), toRgb(hex)) >= 3 }).toEqual({ name, knockOut: true });
    }
  });
});
