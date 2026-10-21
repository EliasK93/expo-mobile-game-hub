import { Circle, Path } from 'react-native-svg';

import { GlyphTile, lineProps } from '@/components/glyph-tile';
import { useTheme } from '@/hooks/use-theme';

// The tile on home: a mine, in the game's accent on the shared glyph tile.
export function MinesweeperTile() {
  const { glyphMinesweeper: c, background } = useTheme();
  return (
    <GlyphTile color={c}>
      <Path d="M50 29V71M29 50H71M35.2 35.2L64.8 64.8M64.8 35.2L35.2 64.8" {...lineProps(c)} />
      <Circle cx={50} cy={50} r={14} fill={c} />
      <Circle cx={44.5} cy={44.5} r={3.5} fill={background} opacity={0.75} />
    </GlyphTile>
  );
}
