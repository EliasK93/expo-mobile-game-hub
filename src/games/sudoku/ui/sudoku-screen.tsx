import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { OptionPicker } from '@/components/option-picker';
import { StatsHeaderButton } from '@/components/stats-header-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatTime } from '@/lib/timer';

import { bucketOf } from '../logic/save';
import type { StatsEntry } from '../logic/stats';
import { LEVEL_NAMES, LEVELS } from '../logic/techniques';
import { Grid } from './grid';
import { NumberPad } from './number-pad';
import { SudokuStatsPanel } from './stats-panel';
import { useSudoku } from './use-sudoku';

// "5 solved · Best 3:10". An entry with only hinted wins shows just the count.
const statsLine = (e: StatsEntry): string =>
  e.bestMs === null ? `${e.solved} solved` : `${e.solved} solved · Best ${formatTime(e.bestMs)}`;

export function SudokuScreen() {
  const {
    game,
    level,
    lastLevel,
    stats,
    picking,
    panel,
    hint,
    selected,
    notesMode,
    won,
    status,
    elapsedMs,
    canUndo,
    canRedo,
    select,
    enter,
    erase,
    undo,
    redo,
    toggleNotes,
    openPicker,
    closePicker,
    openPanel,
    closePanel,
    pickLevel,
    showHint,
    applyHint,
    closeHint,
    continueSaved,
  } = useSudoku();
  // The app draws edge to edge: keep the bottom free of Android's navigation bar. The Stack header covers the top.
  const container = [styles.container, { paddingBottom: Spacing.three + useSafeAreaInsets().bottom }];

  const header = <StatsHeaderButton visible={status !== 'loading'} onPress={openPanel} />;

  if (status === 'loading') return <ThemedView style={container}>{header}</ThemedView>;

  // The panel has the screen to itself, the clock is paused. Its switch opens on the level on the board, or on the last
  // used one when there is no game yet.
  if (panel) {
    return (
      <ThemedView style={container}>
        {header}
        <SudokuStatsPanel stats={stats} current={status === 'playing' ? level : lastLevel} onClose={closePanel} />
      </ThemedView>
    );
  }

  // The picker has the screen to itself: no time or level, and the clock is paused (see `running` in use-sudoku.ts).
  // Opened without a save (status 'picker') there is no game to go back to, so no Cancel.
  if (status === 'picker' || picking) {
    return (
      <ThemedView style={container}>
        {header}
        <OptionPicker
          heading="Pick a level"
          options={LEVELS.map((id) => {
            const e = stats[bucketOf(id)];
            return {
              id,
              name: LEVEL_NAMES[id],
              label: `Level: ${LEVEL_NAMES[id]}`,
              detail: e && e.solved > 0 ? statsLine(e) : undefined,
            };
          })}
          last={lastLevel}
          onPick={pickLevel}
          onCancel={status === 'picker' ? undefined : closePicker}
        />
      </ThemedView>
    );
  }

  if (status === 'prompt') {
    return (
      <ThemedView style={container}>
        {header}
        <ThemedView style={styles.panel}>
          <ThemedText type="subtitle" style={styles.heading}>
            Continue your game?
          </ThemedText>
          <Button label="Continue saved game" text="Continue" primary onPress={continueSaved} />
          <Button label="Start new game" text="New game" onPress={openPicker} />
        </ThemedView>
      </ThemedView>
    );
  }

  const time = formatTime(elapsedMs);
  return (
    <ThemedView style={container}>
      {header}
      <ThemedView style={styles.status}>
        {won && <ThemedText type="subtitle">{`Solved! in ${time}`}</ThemedText>}
        <ThemedView style={styles.timeRow}>
          <ThemedText type="small">{LEVEL_NAMES[level]}</ThemedText>
          <ThemedText type="smallBold" style={styles.time}>
            {time}
          </ThemedText>
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
