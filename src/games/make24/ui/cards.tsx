import { Pressable, StyleSheet, View } from 'react-native';

import { glyphStyle } from '@/components/glyph-style';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { format } from '../logic/fraction';
import type { Game } from '../logic/game';

const GAP = Spacing.two;
const MIN_CARD = 48; // a very short area gets small cards and an overflowing screen, never a zero or negative card
const MAX_CARD = 200;

// The side of a card: two cards and the gap fit the width, two cards and the gap fit the height that is left
// (available = the screen's measured area minus everything else, null until measured: then the width alone decides).
export function cardSize(width: number, available: number | null) {
  const limitW = (Math.min(width, MaxContentWidth) - 2 * Spacing.two - GAP) / 2;
  const limitH = available === null ? Infinity : (available - GAP) / 2;
  return Math.max(MIN_CARD, Math.min(MAX_CARD, Math.floor(Math.min(limitW, limitH))));
}

// The font size of a card's text: half a card, less once its characters would not fit (−11/3 is five, the longest
// values −157/156 and 28561 are eight and five). A bold glyph is about 0.6 em wide, so that errs safe.
const MARGIN = 8;
const GLYPH_EM = 0.6;
export const textSize = (size: number, text: string) =>
  Math.max(1, Math.floor(Math.min(size * 0.5, (size - MARGIN) / (GLYPH_EM * text.length))));

export type CardState = 'normal' | 'selected' | 'hint';

// What a card looks like, in one place (the board and the home tile both draw with it): a paper card with a thicker
// bottom edge. The selected card is pencil yellow, a hinted one the blue hint tint (yellow already means selected).
function CardFace({
  text,
  size,
  state = 'normal',
  testID,
}: {
  text: string;
  size: number;
  state?: CardState;
  testID?: string;
}) {
  const theme = useTheme();
  const background =
    state === 'hint' ? theme.cellHint : state === 'selected' ? theme.cellSelected : theme.backgroundElement;
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          width: size,
          height: size,
          backgroundColor: background,
          borderColor: theme.gridLine,
          borderBottomColor: theme.backgroundSelected,
          borderBottomWidth: Math.max(3, Math.round(size * 0.04)),
          borderRadius: Math.round(size * 0.08),
        },
      ]}>
      <ThemedText style={[styles.text, glyphStyle(textSize(size, text), 700)]}>{text}</ThemedText>
    </View>
  );
}

// The four places in a 2 × 2 grid. A card is a button; an empty place (its card was combined away) is a plain view of the
// same size. The hint marks the two cards of its step.
type Props = { game: Game; size: number; onTap: (i: number) => void };

export function Make24Cards({ game, size, onTap }: Props) {
  const { note } = game;
  const hinted = note?.kind === 'hint' && note.step ? [note.step.first, note.step.second] : [];
  return (
    <View style={[styles.grid, { width: 2 * size + GAP }]}>
      {game.cards.map((card, i) => {
        if (!card) return <View key={i} testID={`empty-${i}`} style={{ width: size, height: size }} />;
        const isSelected = game.selected === i;
        const isHint = hinted.includes(i);
        const text = format(card);
        return (
          <Pressable
            key={i}
            testID={`card-${i}`}
            accessibilityRole="button"
            accessibilityLabel={`Card ${text}${isSelected ? ', selected' : ''}${isHint ? ', hint' : ''}`}
            accessibilityState={{ selected: isSelected }}
            disabled={game.status !== 'playing'}
            onPress={() => onTap(i)}>
            <CardFace
              text={text}
              size={size}
              state={isHint ? 'hint' : isSelected ? 'selected' : 'normal'}
              testID={`face-${i}`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Two cards per row: the grid is exactly as wide as two cards and the gap (set inline), so it wraps after two.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  card: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // Full width and centred, like the shared Button: Android cuts off shrink-wrapped bold text.
  text: { alignSelf: 'stretch', textAlign: 'center' },
});
