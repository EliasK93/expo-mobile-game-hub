import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useColorScheme } from '@/hooks/use-color-scheme';

// The home tiles' shared frame (a game's `Tile` is its glyph on this): a 100×100 box, a rounded tile in the game's accent at
// a light tint, and the glyph on top in the full accent. The style rules live here and nowhere else: glyphs stay inside the
// safe area 28–72, strokes are STROKE wide with round caps and joins. The contrast of the accents is checked in theme.test.tsx.
export const TINT_OPACITY = { light: 0.16, dark: 0.2 } as const;
const STROKE = 5;

// Props for a glyph's text ("2048", "A", "Z"): bold, centred on x, in the system sans. SVG text without a font family falls
// back to the browser's serif on web; on Android react-native-svg already uses the default sans, so nothing is set there.
// `fill` is the knock-out colour (the page background).
export const textProps = (fill: string) =>
  ({
    fill,
    fontSize: 15,
    fontWeight: '700',
    textAnchor: 'middle',
    fontFamily: Platform.select({ web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }),
  }) as const;

// Props for a stroked, unfilled glyph shape; `color` is the game's accent.
export const lineProps = (color: string, width = STROKE) =>
  ({
    fill: 'none',
    stroke: color,
    strokeWidth: width,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }) as const;

export function GlyphTile({ color, children }: { color: string; children: ReactNode }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <Svg testID="glyph-tile" viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <Rect testID="glyph-tile-bg" width={100} height={100} rx={22} fill={color} fillOpacity={TINT_OPACITY[scheme]} />
      {children}
    </Svg>
  );
}
