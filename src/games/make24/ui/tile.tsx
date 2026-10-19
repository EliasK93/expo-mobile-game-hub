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
  // The measured side is fractional: floor the card, and the gap is what is left, so two cards and the gap never exceed
  // the row (a fraction too wide wraps every card onto its own row).
  const size = Math.floor((side * (1 - GAP)) / 2);
  const gap = side - 2 * size;
  return (
    <ThemedView type="backgroundSelected" style={styles.tile}>
      <View onLayout={onLayout} style={[styles.grid, { gap }]}>
        {side > 0 && NUMBERS.map((text, i) => <CardFace key={i} text={text} size={size} />)}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: '12%', justifyContent: 'center' },
  grid: { width: '100%', aspectRatio: 1, flexDirection: 'row', flexWrap: 'wrap' },
});
