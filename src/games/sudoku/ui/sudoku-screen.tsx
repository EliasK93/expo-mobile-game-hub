import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatTime } from '@/lib/timer';

import { levelName } from '../logic/save';
import { LEVEL_NAMES, LEVELS, type Level } from '../logic/techniques';
import { Grid } from './grid';
import { NumberPad } from './number-pad';
import { useSudoku } from './use-sudoku';

// The five levels (names from LEVEL_NAMES); the one used last is marked. Without onCancel there is no game to go back to.
function LevelPicker({ lastLevel, onPick, onCancel }: { lastLevel: Level; onPick: (l: Level) => void; onCancel?: () => void }) {
  return (
    <ThemedView style={styles.panel}>
      <ThemedText type="subtitle" style={styles.heading}>Pick a level</ThemedText>
      {LEVELS.map((l) => (
        <Button key={l} label={`Level: ${LEVEL_NAMES[l]}`} text={l === lastLevel ? `${LEVEL_NAMES[l]} (last used)` : LEVEL_NAMES[l]} selected={l === lastLevel} onPress={() => onPick(l)} />
      ))}
      {onCancel && <Button label="Cancel" onPress={onCancel} />}
    </ThemedView>
  );
}

export function SudokuScreen() {
  const {
    game, level, lastLevel, picking, hint, selected, notesMode, won, status, elapsedMs, canUndo, canRedo,
    select, enter, erase, undo, redo, toggleNotes, openPicker, closePicker, pickLevel,
    showHint, applyHint, closeHint, continueSaved,
  } = useSudoku();
  // The app draws edge to edge: keep the bottom free of Android's navigation bar. The Stack header covers the top.
  const container = [styles.container, { paddingBottom: Spacing.three + useSafeAreaInsets().bottom }];

  if (status === 'loading') return <ThemedView style={container} />;

  // The picker has the screen to itself: no time or level, and the clock is paused (see `running` in use-sudoku.ts).
  // Opened without a save (status 'picker') there is no game to go back to, so no Cancel.
  if (status === 'picker' || picking) {
    return (
      <ThemedView style={container}>
        <LevelPicker lastLevel={lastLevel} onPick={pickLevel} onCancel={status === 'picker' ? undefined : closePicker} />
      </ThemedView>
    );
  }

  if (status === 'prompt') {
    return (
      <ThemedView style={container}>
        <ThemedView style={styles.panel}>
          <ThemedText type="subtitle" style={styles.heading}>Continue your game?</ThemedText>
          <Button label="Continue saved game" text="Continue" onPress={continueSaved} />
          <Button label="Start new game" text="New game" onPress={openPicker} />
        </ThemedView>
      </ThemedView>
    );
  }

  const time = formatTime(elapsedMs);
  return (
    <ThemedView style={container}>
      <ThemedView style={styles.status}>
        {won && <ThemedText type="subtitle">{`Solved! in ${time}`}</ThemedText>}
        <ThemedView style={styles.timeRow}>
          <ThemedText type="small">{levelName(level)}</ThemedText>
          <ThemedText type="smallBold" style={styles.time}>{time}</ThemedText>
        </ThemedView>
      </ThemedView>
      <Grid game={game} selected={selected} onSelect={select} hintCells={hint?.cells} />
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
      {hint ? (
        <ThemedView type="backgroundElement" style={styles.hint}>
          <ThemedText>{hint.explanation}</ThemedText>
          <ThemedView style={styles.row}>
            <Button flex label="Apply hint" text="Apply" onPress={applyHint} />
            <Button flex label="Close hint" text="Close" onPress={closeHint} />
          </ThemedView>
        </ThemedView>
      ) : (
        <ThemedView style={styles.row}>
          <Button flex label="Hint" onPress={showHint} disabled={won} />
          <Button flex label="New game" onPress={openPicker} />
        </ThemedView>
      )}
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
  timeRow: { flexDirection: 'row', gap: Spacing.two },
  time: { fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: Spacing.two, width: '100%', maxWidth: MaxContentWidth },
  panel: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two, alignItems: 'stretch' },
  heading: { textAlign: 'center' },
  hint: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two, padding: Spacing.two, borderRadius: Spacing.two },
});
