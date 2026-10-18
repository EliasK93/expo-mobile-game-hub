import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { SIZES, type Size } from '../logic/board';
import type { Stats } from '../logic/stats';
import { formatScore } from './format';

// The four board sizes; the last used one is marked (from the setting, not the running game), and each shows its best
// score once it has one. Cancel goes back to where the picker was opened.
type Props = { last: Size; stats: Stats; onPick: (size: Size) => void; onCancel: () => void };

export function SizePicker({ last, stats, onPick, onCancel }: Props) {
  return (
    <ThemedView style={styles.panel}>
      <ThemedText type="subtitle" style={styles.heading}>
        Pick a size
      </ThemedText>
      {SIZES.map((size) => {
        const best = stats[size].bestScore;
        return (
          <Button
            key={size}
            label={`Size ${size}×${size}`}
            text={size === last ? `${size}×${size} (last used)` : `${size}×${size}`}
            detail={best === null ? undefined : `Best ${formatScore(best)}`}
            selected={size === last}
            onPress={() => onPick(size)}
          />
        );
      })}
      <Button label="Cancel" onPress={onCancel} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two, alignItems: 'stretch' },
  heading: { textAlign: 'center' },
});
