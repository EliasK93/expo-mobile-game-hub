import { Stack } from 'expo-router';
import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, COMPACT_HEIGHT } from '@/components/button';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { Game2048Board } from './board';
import { ScoreBox, SCORE_BOX_HEIGHT } from './score-box';
import { SizePicker } from './size-picker';
import { StatsPanel } from './stats-panel';
import { useGame2048 } from './use-game2048';
import { WinOverlay } from './win-overlay';

const STATS_BUTTON_WIDTH = 72; // the header gives a button no width of its own, and the Button's label stretches to its parent

export function Game2048Screen() {
  const {
    loaded, game, motion, stats, best, lastSize, newBest, picking, panel, canUndo, winOpen,
    swipe, undo, keepGoing, openPicker, closePicker, pickSize, openPanel, closePanel,
  } = useGame2048();
  const insets = useSafeAreaInsets();
  // The screen measures its own area (everything below the Stack header), so no header size is ever guessed.
  // The board gets what is left; null until the first layout (the board is then sized by width).
  const [areaHeight, setAreaHeight] = useState<number | null>(null);
  const container = [styles.container, { paddingBottom: Spacing.two + insets.bottom }];
  const onLayout = (e: LayoutChangeEvent) => setAreaHeight(e.nativeEvent.layout.height);

  // Header button: Expo Router's <Stack.Screen options> inside the screen, hidden while storage is read.
  const header = (
    <Stack.Screen
      options={{
        headerRight: loaded
          ? () => (
              <ThemedView style={{ width: STATS_BUTTON_WIDTH, marginRight: Spacing.three }}>
                <Button compact label="Stats" onPress={openPanel} />
              </ThemedView>
            )
          : undefined,
      }}
    />
  );

  if (!loaded) return <ThemedView style={container} onLayout={onLayout}>{header}</ThemedView>;

  if (picking) {
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
        <SizePicker last={lastSize} stats={stats} onPick={pickSize} onCancel={closePicker} />
      </ThemedView>
    );
  }

  // The panel has the screen to itself, the board is hidden.
  if (panel) {
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
        {/* Play again: the same size (pickSize also keeps it as the last used one). */}
        <StatsPanel stats={stats} game={game} newBest={newBest} onClose={closePanel} onPlayAgain={() => pickSize(game.size)} onChangeSize={openPicker} />
      </ThemedView>
    );
  }

  // Padding top and bottom, two gaps (boxes, button row, board).
  const reserved = insets.bottom + SCORE_BOX_HEIGHT + COMPACT_HEIGHT + 4 * Spacing.two;
  return (
    <ThemedView testID="game-area" style={container} onLayout={onLayout}>
      {header}
      <ThemedView style={styles.row}>
        <ScoreBox title="Score" value={game.score} />
        <ScoreBox title="Best" value={best} />
      </ThemedView>
      <ThemedView style={styles.row}>
        {!winOpen && <Button compact flex label="Undo" onPress={undo} disabled={!canUndo} />}
        <Button compact flex primary label="New game" onPress={openPicker} />
      </ThemedView>
      <Game2048Board
        game={game}
        motion={motion}
        available={areaHeight === null ? null : areaHeight - reserved}
        onSwipe={swipe}
        overlay={winOpen ? <WinOverlay onKeepGoing={keepGoing} onNewGame={openPicker} /> : undefined}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: Spacing.two, gap: Spacing.two },
  row: { width: '100%', maxWidth: MaxContentWidth, flexDirection: 'row', gap: Spacing.two },
});
