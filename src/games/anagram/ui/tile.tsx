import { Path, Rect, Text } from 'react-native-svg';

import { GlyphTile, lineProps, textProps } from '@/components/glyph-tile';
import { useTheme } from '@/hooks/use-theme';

// The tile on home: two letter tiles, A and Z, under a curved two-way swap arrow, in the game's accent on the shared glyph tile.
export function AnagramTile() {
  const { glyphAnagram: c, background } = useTheme();
  return (
    <GlyphTile color={c}>
      {/* The heads follow the arc's tangent at its ends (±40° around the reversed tangent, 6 long), so it reads as a double arrow. */}
      <Path d="M37.5 42Q50 24 62.5 42M36.9 36L37.5 42L43.3 40.4M63.1 36L62.5 42L56.7 40.4" {...lineProps(c)} />
      <Rect x={28} y={50} width={19} height={22} rx={4} fill={c} />
      <Rect x={53} y={50} width={19} height={22} rx={4} fill={c} />
      {/* y is the baseline: the middle of the letter tile plus about a third of the font size. */}
      <Text x={37.5} y={66.4} {...textProps(background)} fontSize={16}>
        A
      </Text>
      <Text x={62.5} y={66.4} {...textProps(background)} fontSize={16}>
        Z
      </Text>
    </GlyphTile>
  );
}
