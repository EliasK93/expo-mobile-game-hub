import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatTime } from '@/lib/timer';

import { Grid } from './grid';
import { NumberPad } from './number-pad';
import { useSudoku } from './use-sudoku';

export function SudokuScreen() {
  const {
    game, selected, notesMode, won, status, elapsedMs, canUndo, canRedo,
    select, enter, erase, undo, redo, toggleNotes, restart, continueSaved, discardSaved,
  } = useSudoku();

  if (status === 'loading') return <ThemedView style={styles.container} />;

  if (status === 'prompt') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Continue your game?</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Continue saved game" onPress={continueSaved}>
          <ThemedView type="backgroundSelected" style={styles.button}>
            <ThemedText type="smallBold">Continue</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Start new game" onPress={discardSaved}>
          <ThemedView type="backgroundSelected" style={styles.button}>
            <ThemedText type="smallBold">New game</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    );
  }

  const time = formatTime(elapsedMs);
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.status}>
        {won && <ThemedText type="subtitle">{`Solved! in ${time}`}</ThemedText>}
        <ThemedText type="smallBold" style={styles.time}>{time}</ThemedText>
      </ThemedView>
      <Grid game={game} selected={selected} onSelect={select} />
      <NumberPad
        onDigit={enter}
        onErase={erase}
        onUndo={undo}
        onRedo={redo}
        onToggleNotes={toggleNotes}
        canUndo={canUndo}
        canRedo={canRedo}
        notesMode={notesMode}
      />
      <Pressable accessibilityRole="button" onPress={restart}>
        <ThemedView type="backgroundSelected" style={styles.button}>
          <ThemedText type="smallBold">New game</ThemedText>
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  // Reserved height so the grid doesn't jump when "Solved!" appears. The time is always there; tabular digits keep it from wobbling.
  status: { minHeight: 56, justifyContent: 'center', alignItems: 'center' },
  time: { fontVariant: ['tabular-nums'] },
  button: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.four, borderRadius: Spacing.two },
});
