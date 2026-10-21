import { Rect, Text } from 'react-native-svg';

import { GlyphTile, textProps } from '@/components/glyph-tile';
import { useTheme } from '@/hooks/use-theme';

// The tile on home: one tile with "2048", in the game's accent on the shared glyph tile.
export function Game2048Tile() {
  const { glyph2048: c, background } = useTheme();
  return (
    <GlyphTile color={c}>
      <Rect x={26} y={26} width={48} height={48} rx={9} fill={c} />
      {/* y is the baseline: the middle of the tile plus about a third of the font size (no dominant-baseline, it differs on Android). */}
      <Text x={50} y={55.3} {...textProps(background)}>
        2048
      </Text>
    </GlyphTile>
  );
}
