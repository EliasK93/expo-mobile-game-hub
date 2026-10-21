import { Path, Rect } from 'react-native-svg';

import { GlyphTile, lineProps } from '@/components/glyph-tile';
import { useTheme } from '@/hooks/use-theme';

// The tile on home: a 3×3 grid with a filled centre cell, in the game's accent on the shared glyph tile.
export function SudokuTile() {
  const { glyphSudoku: c } = useTheme();
  return (
    <GlyphTile color={c}>
      <Rect x={28} y={28} width={44} height={44} rx={7} {...lineProps(c)} />
      <Path d="M42.7 30V70M57.3 30V70M30 42.7H70M30 57.3H70" {...lineProps(c, 3)} />
      <Rect x={45.2} y={45.2} width={9.6} height={9.6} rx={1.5} fill={c} />
    </GlyphTile>
  );
}
