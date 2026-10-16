import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

// The tile on home: a small 3x3 Sudoku with a few digits, in the game's own colours. Fills the square it is given.
// 0 = empty. The middle cell is "selected" and, like the 9, holds a digit "entered" in blue ink.
const TILE_DIGITS = [5, 0, 3, 0, 7, 0, 9, 0, 1];
const SELECTED = 4;
const ENTERED = [4, 6];

export function SudokuTile() {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.tile}>
      <ThemedView style={[styles.grid, { borderColor: theme.gridLineBold }]}>
        {TILE_DIGITS.map((d, i) => (
          <ThemedView
            key={i}
            style={[styles.cell, { borderColor: theme.gridLine }, i === SELECTED && { backgroundColor: theme.cellSelected }]}>
            {d !== 0 && (
              <ThemedText themeColor={ENTERED.includes(i) ? 'accent' : 'text'} style={styles.digit}>
                {d}
              </ThemedText>
            )}
          </ThemedView>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: '12%', justifyContent: 'center' },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2 },
  cell: { width: '33.333%', height: '33.333%', borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  // ponytail: fixed digit size, not measured from the tile; measure with onLayout if a tile looks cramped or empty at some width.
  digit: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
});
