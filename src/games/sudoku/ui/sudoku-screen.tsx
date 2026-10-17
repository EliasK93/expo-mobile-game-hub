import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { statsLine, type Stats } from '@/lib/stats';
import { formatTime } from '@/lib/timer';

import { bucketOf } from '../logic/save';
import { LEVEL_NAMES, LEVELS, type Level } from '../logic/techniques';
import { Grid } from './grid';
import { NumberPad } from './number-pad';
import { useSudoku } from './use-sudoku';

// The five levels (names from LEVEL_NAMES); the one used last is marked, and each shows its solved count and best time
// once it has wins. Without onCancel there is no game to go back to.
function LevelPicker({ lastLevel, stats, onPick, onCancel }: { lastLevel: Level; stats: Stats; onPick: (l: Level) => void; onCancel?: () => void }) {
  return (
    <ThemedView style={styles.panel}>
      <ThemedText type="subtitle" style={styles.heading}>Pick a level</ThemedText>
      {LEVELS.map((l) => {
        const e = stats[bucketOf(l)];
        return (
          <Button
            key={l}
            label={`Level: ${LEVEL_NAMES[l]}`}
            text={l === lastLevel ? `${LEVEL_NAMES[l]} (last used)` : LEVEL_NAMES[l]}
            detail={e && e.solved > 0 ? statsLine(e) : undefined}
            selected={l === lastLevel}
            onPress={() => onPick(l)}
          />
        );
      })}
      {onCancel && <Button label="Cancel" onPress={onCancel} />}
    </ThemedView>
  );
}

export function SudokuScreen() {
  const {
    game, level, lastLevel, stats, picking, hint, selected, notesMode, won, status, elapsedMs, canUndo, canRedo,
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
        <LevelPicker lastLevel={lastLevel} stats={stats} onPick={pickLevel} onCancel={status === 'picker' ? undefined : closePicker} />
      </ThemedView>
    );
  }

  if (status === 'prompt') {
    return (
      <ThemedView style={container}>
        <ThemedView style={styles.panel}>
          <ThemedText type="subtitle" style={styles.heading}>Continue your game?</ThemedText>
          <Button label="Continue saved game" text="Continue" primary onPress={continueSaved} />
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
          <ThemedText type="small">{LEVEL_NAMES[level]}</ThemedText>
          <ThemedText type="smallBold" style={styles.time}>{time}</ThemedText>
        </ThemedView>
      </ThemedView>
      <Grid game={game} selected={selected} onSelect={select} hintCells={hint?.cells} />
      {/* A shown hint takes the place of the pad, the Undo/Redo/Notes/Erase row and the Hint / New game row, so its buttons stay on screen even with a long explanation. The grid stays, to see the highlighted cells. */}
      {hint ? (
        <ThemedView type="backgroundElement" style={styles.hint}>
          <ThemedText>{hint.explanation}</ThemedText>
          <ThemedView style={styles.row}>
            <Button flex label="Apply hint" text="Apply" onPress={applyHint} />
            <Button flex label="Close hint" text="Close" onPress={closeHint} />
          </ThemedView>
        </ThemedView>
      ) : (
        <>
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
          <ThemedView style={styles.row}>
            <Button flex label="Hint" onPress={showHint} disabled={won} />
            <Button flex primary label="New game" onPress={openPicker} />
          </ThemedView>
        </>
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
