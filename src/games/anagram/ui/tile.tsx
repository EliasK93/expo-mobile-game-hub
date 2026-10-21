import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';

import { LetterFace } from './letters';

// The tile on home: a scrambled word over its solution, "TAE" over "EAT" in accent blue, drawn with the game's own letter
// look. Fills the square it is given, and measures itself to size the letters.
const SCRAMBLED = 'TAE';
const SOLVED = 'EAT';
const GAP_FRACTION = 0.06; // of the tile's side

export function AnagramTile() {
  const [side, setSide] = useState(0); // 0 until the first layout: nothing is drawn then
  const onLayout = (e: LayoutChangeEvent) => setSide(e.nativeEvent.layout.width);
  // The measured side is fractional: floor the letter, and the gap is what is left. Two explicit rows, so a browser that
  // rounds the width differently cannot wrap a letter onto its own row.
  const size = Math.floor((side * (1 - 2 * GAP_FRACTION)) / 3);
  const gap = Math.floor((side - 3 * size) / 2);
  return (
    <ThemedView type="backgroundSelected" style={styles.tile}>
      <View testID="anagram-tile-grid" onLayout={onLayout} style={[styles.grid, { gap }]}>
        {side > 0 &&
          [SCRAMBLED, SOLVED].map((word, row) => (
            <View key={word} testID={`anagram-tile-row-${row}`} style={[styles.row, { gap }]}>
              {[...word].map((letter, i) => (
                <LetterFace
                  key={i}
                  letter={letter}
                  size={size}
                  testID={`anagram-tile-letter-${row * 3 + i}`}
                  state={row === 1 ? 'solved' : 'normal'}
                />
              ))}
            </View>
          ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: '12%', justifyContent: 'center' },
  grid: { width: '100%' },
  row: { flexDirection: 'row' },
});
