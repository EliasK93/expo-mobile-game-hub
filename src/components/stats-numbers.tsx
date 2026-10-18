import { StyleSheet, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const NARROW_COLUMN = 72; // below this a "12:34" at 24 px no longer fits its column

// A row of stats numbers: the value over a grey label, one accessible column each ("Played: 12").
// On a small screen the columns get narrow (5 on a 320 px phone are about 54 px each), so the values shrink.
export function StatsNumbers({ numbers }: { numbers: [name: string, value: string][] }) {
  const narrow = useWindowDimensions().width / numbers.length < NARROW_COLUMN;
  return (
    <ThemedView style={[styles.row, narrow && styles.tightRow]}>
      {numbers.map(([name, value]) => (
        <ThemedView key={name} accessible accessibilityLabel={`${name}: ${value}`} style={styles.number}>
          <ThemedText type="subtitle" style={[styles.value, narrow && styles.narrowValue]}>
            {value}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {name}
          </ThemedText>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  tightRow: { gap: Spacing.one },
  number: { flex: 1, alignItems: 'center' },
  centered: { textAlign: 'center' },
  value: { fontSize: 24, lineHeight: 30, textAlign: 'center' },
  narrowValue: { fontSize: 18, lineHeight: 30 }, // same line height: the panel's height doesn't change
});
