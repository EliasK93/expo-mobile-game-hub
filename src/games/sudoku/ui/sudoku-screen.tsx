import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { Grid } from './grid';
import { NumberPad } from './number-pad';
import { useSudoku } from './use-sudoku';

export function SudokuScreen() {
  const { game, selected, notesMode, won, canUndo, canRedo, select, enter, erase, undo, redo, toggleNotes, restart } = useSudoku();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.status}>{won && <ThemedText type="subtitle">Solved!</ThemedText>}</ThemedView>
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
        <ThemedView type="backgroundSelected" style={styles.newGame}>
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
  status: { minHeight: 44, justifyContent: 'center' }, // reserved so the grid doesn't jump when "Solved!" appears
  newGame: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.four, borderRadius: Spacing.two },
});
