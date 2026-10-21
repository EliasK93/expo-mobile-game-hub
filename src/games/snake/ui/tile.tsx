import { Circle, Path } from 'react-native-svg';

import { GlyphTile, lineProps } from '@/components/glyph-tile';
import { useTheme } from '@/hooks/use-theme';

// The tile on home: a bent snake and an apple, in the game's accent on the shared glyph tile. The body is thicker than the
// shared stroke so it reads as a snake.
export function SnakeTile() {
  const { glyphSnake: c } = useTheme();
  return (
    <GlyphTile color={c}>
      <Path d="M30 68H56V40H66" {...lineProps(c, 9)} />
      <Circle cx={68} cy={40} r={6.5} fill={c} />
      <Circle cx={33} cy={36} r={5} fill={c} />
    </GlyphTile>
  );
}
