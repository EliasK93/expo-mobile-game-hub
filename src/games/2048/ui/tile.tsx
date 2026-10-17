import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

import { rampColors } from './ramp';

// The tile on home: a mini 4×4 board in the ramp colours, without numbers, climbing to 2048. 0 = empty cell.
// Fills the square it is given.
const GRID = [
  [0, 2, 0, 4],
  [8, 0, 16, 0],
  [0, 64, 0, 128],
  [32, 0, 0, 2048],
];

export function Game2048Tile() {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.tile}>
      <View style={[styles.grid, { backgroundColor: theme.rampBoard }]}>
        {GRID.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((value, c) => (
              <View key={c} style={[styles.cell, { backgroundColor: theme[value ? rampColors(value).background : 'rampEmpty'] }]} />
            ))}
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: '12%', justifyContent: 'center' },
  grid: { padding: 3, gap: 3, borderRadius: 4 },
  row: { flexDirection: 'row', gap: 3 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 2 },
});
