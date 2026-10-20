import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, COMPACT_HEIGHT } from '@/components/button';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { SnakeBoard } from './board';
import { levelName, LevelPicker } from './level-picker';
import { ScoreBox, SCORE_BOX_HEIGHT } from './score-box';
import { useSnake } from './use-snake';

// Everything on the screen except the board: padding top and bottom (the bottom inset on top), the boxes, the button
// row, and two gaps between the three children.
const reservedHeight = (bottomInset: number) => bottomInset + SCORE_BOX_HEIGHT + COMPACT_HEIGHT + 4 * Spacing.two;

export function SnakeScreen() {
  const {
    game,
    best,
    newBest,
    picking,
    lastLevel,
    stats,
    swipe,
    pause,
    resume,
    playAgain,
    openPicker,
    closePicker,
    pickLevel,
  } = useSnake();
  const insets = useSafeAreaInsets();
  // The screen measures its own area (everything below the Stack header), so no header size is ever guessed.
  // The board gets what is left; null until the first layout (the board is then sized by width).
  const [areaHeight, setAreaHeight] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setAreaHeight(e.nativeEvent.layout.height);
  const container = [styles.container, { paddingBottom: Spacing.two + insets.bottom }];

  // The picker takes the place of the boxes, the row and the board.
  if (picking) {
    return (
      <ThemedView style={container} onLayout={onLayout}>
        <LevelPicker last={lastLevel} stats={stats} onPick={pickLevel} onCancel={closePicker} />
      </ThemedView>
    );
  }

  return (
    <ThemedView testID="game-area" style={container} onLayout={onLayout}>
      <ThemedView style={styles.row}>
        <ScoreBox title={`${levelName(game.level)} · Score`} value={game.apples} />
        <ScoreBox title="Best" value={best} />
      </ThemedView>
      <ThemedView style={styles.row}>
        <Button compact flex label="New" onPress={openPicker} />
        <Button compact flex label="Pause" disabled={game.status !== 'running'} onPress={pause} />
      </ThemedView>
      <SnakeBoard
        game={game}
        available={areaHeight === null ? null : areaHeight - reservedHeight(insets.bottom)}
        newBest={newBest}
        onSwipe={swipe}
        onResume={resume}
        onPlayAgain={playAgain}
        onNew={openPicker}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: Spacing.two, gap: Spacing.two },
  row: { width: '100%', maxWidth: MaxContentWidth, flexDirection: 'row', gap: Spacing.two },
});
