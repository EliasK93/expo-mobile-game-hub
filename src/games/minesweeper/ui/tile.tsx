import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';

import type { CellView } from '../logic/game';
import { CellFace } from './cell';

// The tile on home: a mini 5×5 board drawn with the game's own cell look: an opened corner with a 1 and a 2, covered cells
// and a flag. Fills the square it is given, and measures itself to size the cells.
const C = 'covered';
const GRID: CellView[][] = [
  [0, 0, 1, C, C],
  [0, 0, 1, C, 'flag'],
  [1, 1, 2, C, C],
  [C, C, C, C, C],
  [C, C, C, C, C],
];

export function MinesweeperTile() {
  const [side, setSide] = useState(0); // 0 until the first layout: nothing is drawn then
  const onLayout = (e: LayoutChangeEvent) => setSide(e.nativeEvent.layout.width);
  return (
    <ThemedView type="backgroundElement" style={styles.tile}>
      <View onLayout={onLayout} style={styles.board}>
        {side > 0 &&
          GRID.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((view, c) => (
                <CellFace key={c} view={view} size={side / GRID.length} />
              ))}
            </View>
          ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: '12%', justifyContent: 'center' },
  board: { width: '100%', aspectRatio: 1 },
  row: { flexDirection: 'row' },
});
