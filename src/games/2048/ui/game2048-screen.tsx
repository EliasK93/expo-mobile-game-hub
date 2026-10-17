import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, COMPACT_HEIGHT } from '@/components/button';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { Game2048Board } from './board';
import { ScoreBox, SCORE_BOX_HEIGHT } from './score-box';
import { SizePicker } from './size-picker';
import { useGame2048 } from './use-game2048';

export function Game2048Screen() {
  const { game, best, picking, swipe, openPicker, closePicker, pickSize } = useGame2048();
  const insets = useSafeAreaInsets();
  // The screen measures its own area (everything below the Stack header), so no header size is ever guessed.
  // The board gets what is left; null until the first layout (the board is then sized by width).
  const [areaHeight, setAreaHeight] = useState<number | null>(null);
  const container = [styles.container, { paddingBottom: Spacing.two + insets.bottom }];
  const onLayout = (e: LayoutChangeEvent) => setAreaHeight(e.nativeEvent.layout.height);

  if (picking) {
    return (
      <ThemedView style={container} onLayout={onLayout}>
        <SizePicker current={game.size} onPick={pickSize} onCancel={closePicker} />
      </ThemedView>
    );
  }

  // Padding top and bottom, two gaps (boxes, button row, board).
  const reserved = insets.bottom + SCORE_BOX_HEIGHT + COMPACT_HEIGHT + 4 * Spacing.two;
  return (
    <ThemedView style={container} onLayout={onLayout}>
      <ThemedView style={styles.row}>
        <ScoreBox title="Score" value={game.score} />
        <ScoreBox title="Best" value={best} />
      </ThemedView>
      <ThemedView style={styles.row}>
        <Button compact flex primary label="New game" onPress={openPicker} />
      </ThemedView>
      <Game2048Board game={game} available={areaHeight === null ? null : areaHeight - reserved} onSwipe={swipe} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: Spacing.two, gap: Spacing.two },
  row: { width: '100%', maxWidth: MaxContentWidth, flexDirection: 'row', gap: Spacing.two },
});
