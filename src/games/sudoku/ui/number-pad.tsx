import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { Button } from './button';

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
  const pad = { flex: true, background: 'backgroundElement', textType: 'default' } as const;
  return (
    <ThemedView style={styles.pad}>
      <ThemedView style={styles.row}>
        {DIGITS.map((d) => (
          <Button key={d} {...pad} textType="subtitle" label={`Enter ${d}`} text={String(d)} onPress={() => onDigit(d)} />
        ))}
      </ThemedView>
      <ThemedView style={styles.row}>
        <Button {...pad} label="Undo" disabled={!canUndo} onPress={onUndo} />
        <Button {...pad} label="Redo" disabled={!canRedo} onPress={onRedo} />
        <Button
          {...pad}
          label="Notes"
          text={notesMode ? 'Notes: on' : 'Notes'}
          selected={notesMode}
          background={notesMode ? 'backgroundSelected' : 'backgroundElement'}
          textType={notesMode ? 'smallBold' : 'default'}
          onPress={onToggleNotes}
        />
        <Button {...pad} label="Erase" onPress={onErase} />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pad: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.one },
});
