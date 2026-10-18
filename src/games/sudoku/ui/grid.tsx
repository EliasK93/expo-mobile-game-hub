import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { glyphStyle } from '@/components/glyph-style';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { colOf, DIGITS, rowOf } from '../logic/board';
import { highlights, isGiven, notesOf, type Game } from '../logic/game';

const OUTER = 2; // outer frame width
const THIN = 1;
const THICK = 2; // box edges

// hintCells: the cells a shown hint points at.
type Props = { game: Game; selected: number | null; onSelect: (i: number) => void; hintCells?: readonly number[] };

export function Grid({ game, selected, onSelect, hintCells = [] }: Props) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  // Square grid: screen width minus padding, but never taller than about half the screen so the pad fits without scrolling.
  const cell = Math.floor(Math.min(width - 2 * Spacing.three, height * 0.5, MaxContentWidth) / 9);
  const { related, sameValue, conflicts } = highlights(game, selected);
  const slot = Math.floor((cell - THICK) / 3); // one note position in the 3x3 mini grid

  return (
    <View style={[styles.grid, { width: cell * 9 + 2 * OUTER, borderColor: theme.gridLineBold, borderWidth: OUTER }]}>
      {game.values.map((v, i) => {
        const r = rowOf(i);
        const c = colOf(i);
        const given = isGiven(game, i);
        const bad = conflicts.has(i);
        const hinted = hintCells.includes(i);
        const noteDigits = notesOf(game, i);
        const backgroundColor =
          i === selected
            ? theme.cellSelected
            : bad
              ? theme.cellConflict
              : hinted
                ? theme.cellHint
                : sameValue.has(i)
                  ? theme.cellSameValue
                  : related.has(i)
                    ? theme.cellRelated
                    : theme.background;
        const content = v !== 0 ? v : noteDigits.length ? `notes ${noteDigits.join(' ')}` : 'empty';
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Row ${r + 1}, column ${c + 1}, ${content}${given ? ', given' : ''}${bad ? ', conflict' : ''}${hinted ? ', hint' : ''}`}
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
                themeColor={bad ? 'digitConflict' : given ? 'text' : 'accent'}
                style={glyphStyle(cell * 0.55, given ? 700 : 500)}>
                {v}
              </ThemedText>
            )}
            {v === 0 && noteDigits.length > 0 && (
              <View style={{ width: slot * 3, height: slot * 3, flexDirection: 'row', flexWrap: 'wrap' }}>
                {DIGITS.map((d) => (
                  <View key={d} style={{ width: slot, height: slot, alignItems: 'center', justifyContent: 'center' }}>
                    {noteDigits.includes(d) && (
                      <ThemedText themeColor="textSecondary" style={glyphStyle(cell * 0.28, 500)}>
                        {d}
                      </ThemedText>
                    )}
                  </View>
                ))}
              </View>
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
