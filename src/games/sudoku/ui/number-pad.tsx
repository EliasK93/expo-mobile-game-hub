import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type Props = { onDigit: (v: number) => void; onErase: () => void };

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function NumberPad({ onDigit, onErase }: Props) {
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
      <Pressable accessibilityRole="button" accessibilityLabel="Erase" onPress={onErase}>
        <ThemedView type="backgroundElement" style={styles.button}>
          <ThemedText>Erase</ThemedText>
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pad: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.one },
  flex: { flex: 1 },
  button: { minHeight: 48, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
});
