import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { colOf, rowOf } from '../logic/board';
import { highlights, isGiven, type Game } from '../logic/game';

const OUTER = 2; // outer frame width
const THIN = 1;
const THICK = 2; // box edges

type Props = { game: Game; selected: number | null; onSelect: (i: number) => void };

export function Grid({ game, selected, onSelect }: Props) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  // Square grid: screen width minus padding, but never taller than about half the screen so the pad fits without scrolling.
  const cell = Math.floor(Math.min(width - 2 * Spacing.three, height * 0.5, MaxContentWidth) / 9);
  const { related, sameValue } = highlights(game, selected);

  return (
    <View
      style={[
        styles.grid,
        { width: cell * 9 + 2 * OUTER, borderColor: theme.gridLineBold, borderWidth: OUTER },
      ]}>
      {game.values.map((v, i) => {
        const r = rowOf(i);
        const c = colOf(i);
        const given = isGiven(game, i);
        const backgroundColor =
          i === selected
            ? theme.cellSelected
            : sameValue.has(i)
              ? theme.cellSameValue
              : related.has(i)
                ? theme.cellRelated
                : theme.background;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Row ${r + 1}, column ${c + 1}, ${v === 0 ? 'empty' : v}${given ? ', given' : ''}`}
            accessibilityState={{ selected: i === selected }}
            onPress={() => onSelect(i)}
            style={{
              width: cell,
              height: cell,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor,
              borderColor: theme.gridLine,
              borderRightWidth: c === 8 ? 0 : c % 3 === 2 ? THICK : THIN,
              borderBottomWidth: r === 8 ? 0 : r % 3 === 2 ? THICK : THIN,
              borderRightColor: c % 3 === 2 ? theme.gridLineBold : theme.gridLine,
              borderBottomColor: r % 3 === 2 ? theme.gridLineBold : theme.gridLine,
            }}>
            {v !== 0 && (
              <ThemedText
                themeColor={given ? 'text' : 'digitEntered'}
                style={{ fontSize: cell * 0.55, lineHeight: cell * 0.7, fontWeight: given ? 700 : 500 }}>
                {v}
              </ThemedText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
