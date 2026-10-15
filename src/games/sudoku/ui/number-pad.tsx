import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type Props = {
  onDigit: (v: number) => void;
  onErase: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleNotes: () => void;
  canUndo: boolean;
  canRedo: boolean;
  notesMode: boolean;
};

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function NumberPad({ onDigit, onErase, onUndo, onRedo, onToggleNotes, canUndo, canRedo, notesMode }: Props) {
  return (
    <ThemedView style={styles.pad}>
      <ThemedView style={styles.row}>
        {DIGITS.map((d) => (
          <Pressable key={d} accessibilityRole="button" accessibilityLabel={`Enter ${d}`} onPress={() => onDigit(d)} style={styles.flex}>
            <ThemedView type="backgroundElement" style={styles.button}>
              <ThemedText type="subtitle">{d}</ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </ThemedView>
      <ThemedView style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Undo" disabled={!canUndo} onPress={onUndo} style={[styles.flex, !canUndo && styles.dimmed]}>
          <ThemedView type="backgroundElement" style={styles.button}>
            <ThemedText>Undo</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Redo" disabled={!canRedo} onPress={onRedo} style={[styles.flex, !canRedo && styles.dimmed]}>
          <ThemedView type="backgroundElement" style={styles.button}>
            <ThemedText>Redo</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Notes" accessibilityState={{ selected: notesMode }} onPress={onToggleNotes} style={styles.flex}>
          <ThemedView type={notesMode ? 'backgroundSelected' : 'backgroundElement'} style={styles.button}>
            <ThemedText type={notesMode ? 'smallBold' : 'default'}>{notesMode ? 'Notes: on' : 'Notes'}</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Erase" onPress={onErase} style={styles.flex}>
          <ThemedView type="backgroundElement" style={styles.button}>
            <ThemedText>Erase</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pad: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.one },
  flex: { flex: 1 },
  button: { minHeight: 48, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.4 },
});
