import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

// The tile on home: a mini 6 × 6 board with a short bent snake (tail first, the head last) and an apple, in the game's
// own colours. Fills the square it is given, and measures itself to size the cells.
const N = 6;
const SNAKE: [number, number][] = [
  [1, 4],
  [2, 4],
  [3, 4],
  [3, 3],
  [3, 2],
  [4, 2],
];
const APPLE: [number, number] = [1, 1];

export function SnakeTile() {
  const theme = useTheme();
  const [side, setSide] = useState(0); // 0 until the first layout: nothing is drawn then
  const onLayout = (e: LayoutChangeEvent) => setSide(e.nativeEvent.layout.width);
  // The measured side is fractional: floor the cell, so the board and its cells are whole pixels.
  const cell = Math.floor(side / N);
  const square = ([col, row]: [number, number], color: string, round = false) => (
    <View
      key={`${col},${row}`}
      style={[
        styles.segment,
        {
          left: col * cell,
          top: row * cell,
          width: cell,
          height: cell,
          borderRadius: round ? cell / 2 : 1,
          backgroundColor: color,
        },
      ]}
    />
  );
  return (
    <ThemedView type="backgroundSelected" style={styles.tile}>
      <View onLayout={onLayout} style={styles.area}>
        {cell > 0 && (
          <View style={[{ width: N * cell, height: N * cell, backgroundColor: theme.snakeBoard }, styles.board]}>
            {square(APPLE, theme.snakeApple, true)}
            {SNAKE.map((s, i) => square(s, i === SNAKE.length - 1 ? theme.snakeHead : theme.snakeBody))}
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: '12%', justifyContent: 'center' },
  area: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  board: { borderRadius: 3, overflow: 'hidden' },
  segment: { position: 'absolute' },
});
