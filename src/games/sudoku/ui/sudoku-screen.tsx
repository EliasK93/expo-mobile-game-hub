import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatTime } from '@/lib/timer';

import { levelName } from '../logic/save';
import { LEVEL_NAMES, LEVELS, type Level } from '../logic/techniques';
import { Grid } from './grid';
import { NumberPad } from './number-pad';
import { useSudoku } from './use-sudoku';

type ButtonProps = { label: string; text?: string; onPress: () => void; selected?: boolean; disabled?: boolean; flex?: boolean };

// The one text button of this screen. `selected` marks the current choice; a disabled one is dimmed.
function Button({ label, text = label, onPress, selected, disabled, flex }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[flex && styles.flex, disabled && styles.dimmed]}>
      <ThemedView type="backgroundSelected" style={styles.button}>
        <ThemedText type="smallBold">{text}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

// The five levels (names from LEVEL_NAMES); the one used last is marked.
function LevelPicker({ lastLevel, onPick, onCancel }: { lastLevel: Level; onPick: (l: Level) => void; onCancel: () => void }) {
  return (
    <ThemedView style={styles.panel}>
      <ThemedText type="subtitle">Pick a level</ThemedText>
      {LEVELS.map((l) => (
        <Button key={l} label={`Level: ${LEVEL_NAMES[l]}`} text={l === lastLevel ? `${LEVEL_NAMES[l]} (last used)` : LEVEL_NAMES[l]} selected={l === lastLevel} onPress={() => onPick(l)} />
      ))}
      <Button label="Cancel" onPress={onCancel} />
    </ThemedView>
  );
}

export function SudokuScreen() {
  const {
    game, level, lastLevel, picking, hint, selected, notesMode, won, status, elapsedMs, canUndo, canRedo,
    select, enter, erase, undo, redo, toggleNotes, openPicker, closePicker, pickLevel,
    showHint, applyHint, closeHint, continueSaved,
  } = useSudoku();

  if (status === 'loading') return <ThemedView style={styles.container} />;

  if (status === 'making') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Making a puzzle…</ThemedText>
      </ThemedView>
    );
  }

  if (status === 'prompt') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Continue your game?</ThemedText>
        <Button label="Continue saved game" text="Continue" onPress={continueSaved} />
        <Button label="Start new game" text="New game" onPress={openPicker} />
        {picking && <LevelPicker lastLevel={lastLevel} onPick={pickLevel} onCancel={closePicker} />}
      </ThemedView>
    );
  }

  const time = formatTime(elapsedMs);
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.status}>
        {won && <ThemedText type="subtitle">{`Solved! in ${time}`}</ThemedText>}
        <ThemedView style={styles.timeRow}>
          <ThemedText type="small">{levelName(level)}</ThemedText>
          <ThemedText type="smallBold" style={styles.time}>{time}</ThemedText>
        </ThemedView>
      </ThemedView>
      <Grid game={game} selected={selected} onSelect={select} hintCells={hint?.cells} />
      {picking ? (
        <LevelPicker lastLevel={lastLevel} onPick={pickLevel} onCancel={closePicker} />
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
              <Button label="Hint" onPress={showHint} disabled={won} />
              <Button label="New game" onPress={openPicker} />
            </ThemedView>
          )}
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
  row: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'center' },
  flex: { flex: 1 },
  panel: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two, alignItems: 'stretch' },
  hint: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two, padding: Spacing.two, borderRadius: Spacing.two },
  button: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.four, borderRadius: Spacing.two, alignItems: 'center' },
  dimmed: { opacity: 0.4 },
});
