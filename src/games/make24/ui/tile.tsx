import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';

import { CardFace } from './cards';

// The tile on home: four paper cards, 3 3 8 8, in a 2 × 2 grid, drawn with the game's own card look. Fills the square it
// is given, and measures itself to size the cards.
const NUMBERS = ['3', '3', '8', '8'];
const GAP = 0.06; // of the grid's side

export function Make24Tile() {
  const [side, setSide] = useState(0); // 0 until the first layout: nothing is drawn then
  const onLayout = (e: LayoutChangeEvent) => setSide(e.nativeEvent.layout.width);
  // The measured side is fractional: floor the card, and the gap is what is left. Two explicit rows, not a wrapping
  // row: a browser that rounds the width differently would wrap every card onto its own row.
  const size = Math.floor((side * (1 - GAP)) / 2);
  const gap = side - 2 * size;
  return (
    <ThemedView type="backgroundSelected" style={styles.tile}>
      <View testID="make24-tile-grid" onLayout={onLayout} style={[styles.grid, { gap }]}>
        {side > 0 &&
          [0, 1].map((row) => (
            <View key={row} testID={`make24-tile-row-${row}`} style={[styles.row, { gap }]}>
              {NUMBERS.slice(row * 2, row * 2 + 2).map((text, i) => (
                <CardFace key={i} text={text} size={size} testID={`make24-tile-card-${row * 2 + i}`} />
              ))}
            </View>
          ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: '12%', justifyContent: 'center' },
  grid: { width: '100%', aspectRatio: 1 },
  row: { flexDirection: 'row' },
});
