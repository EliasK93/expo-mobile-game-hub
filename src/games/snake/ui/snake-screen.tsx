import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, COMPACT_HEIGHT } from '@/components/button';
import { StatsHeaderButton } from '@/components/stats-header-button';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { SnakeBoard } from './board';
import { levelName, LevelPicker } from './level-picker';
import { ScoreBox, SCORE_BOX_HEIGHT } from './score-box';
import { StatsPanel } from './stats-panel';
import { useSnake } from './use-snake';

// Everything on the screen except the board: padding top and bottom (the bottom inset on top), the boxes, the button
// row, and two gaps between the three children.
export const reservedHeight = (bottomInset: number) =>
  bottomInset + SCORE_BOX_HEIGHT + COMPACT_HEIGHT + 4 * Spacing.two;

export function SnakeScreen() {
  const {
    game,
    best,
    newBest,
    picking,
    panel,
    lastLevel,
    stats,
    swipe,
    pause,
    resume,
    playAgain,
    openPicker,
    closePicker,
    openPanel,
    closePanel,
    pickLevel,
  } = useSnake();
  const insets = useSafeAreaInsets();
  // The screen measures its own area (everything below the Stack header), so no header size is ever guessed.
  // The board gets what is left; null until the first layout (the board is then sized by width).
  const [areaHeight, setAreaHeight] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setAreaHeight(e.nativeEvent.layout.height);
  const container = [styles.container, { paddingBottom: Spacing.two + insets.bottom }];

  const header = <StatsHeaderButton visible={game !== null} onPress={openPanel} />;

  // Until storage is read only the empty area shows, so no placeholder game flashes.
  if (game === null)
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
      </ThemedView>
    );

  // The panel has the screen to itself, the board is hidden.
  if (panel) {
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
        <StatsPanel stats={stats} current={game.level} onClose={closePanel} />
      </ThemedView>
    );
  }

  // The picker takes the place of the boxes, the row and the board.
  if (picking) {
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
        <LevelPicker last={lastLevel} stats={stats} onPick={pickLevel} onCancel={closePicker} />
      </ThemedView>
    );
  }

  return (
    <ThemedView testID="game-area" style={container} onLayout={onLayout}>
      {header}
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
