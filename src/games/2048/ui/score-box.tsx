import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// 12,345: one regex instead of toLocaleString, so Android and the web print the same.
const formatScore = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const SCORE_BOX_HEIGHT = 56;

// The Score and Best boxes above the board.
export function ScoreBox({ title, value }: { title: string; value: number }) {
  const text = formatScore(value);
  return (
    <ThemedView type="backgroundElement" accessible accessibilityLabel={`${title} ${text}`} style={styles.box}>
      <ThemedText type="small" themeColor="textSecondary">{title}</ThemedText>
      <ThemedText type="smallBold" style={styles.value}>{text}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, height: SCORE_BOX_HEIGHT, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 18, lineHeight: 24, fontVariant: ['tabular-nums'] },
});
