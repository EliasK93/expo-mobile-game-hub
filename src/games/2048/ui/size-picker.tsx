import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { SIZES, type Size } from '../logic/board';

// The four board sizes; the running game's size is marked. Cancel goes back to the game.
// ponytail: no best score per size yet, T3 adds it with the stats.
export function SizePicker({ current, onPick, onCancel }: { current: Size; onPick: (size: Size) => void; onCancel: () => void }) {
  return (
    <ThemedView style={styles.panel}>
      <ThemedText type="subtitle" style={styles.heading}>Pick a size</ThemedText>
      {SIZES.map((size) => (
        <Button
          key={size}
          label={`Size ${size}×${size}`}
          text={size === current ? `${size}×${size} (current)` : `${size}×${size}`}
          selected={size === current}
          onPress={() => onPick(size)}
        />
      ))}
      <Button label="Cancel" onPress={onCancel} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two, alignItems: 'stretch' },
  heading: { textAlign: 'center' },
});
