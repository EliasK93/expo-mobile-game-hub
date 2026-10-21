import { Circle, Path } from 'react-native-svg';

import { GlyphTile, lineProps } from '@/components/glyph-tile';
import { useTheme } from '@/hooks/use-theme';

// The tile on home: the four operators (+ × − ÷), in the game's accent on the shared glyph tile.
export function Make24Tile() {
  const { glyphMake24: c } = useTheme();
  return (
    <GlyphTile color={c}>
      <Path d="M28 36H44M36 28V44M56 36H72M30.3 58.3L41.7 69.7M41.7 58.3L30.3 69.7M56 64H72" {...lineProps(c)} />
      <Circle cx={64} cy={57} r={2.8} fill={c} />
      <Circle cx={64} cy={71} r={2.8} fill={c} />
    </GlyphTile>
  );
}
