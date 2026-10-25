import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export const SCORE_BOX_HEIGHT = 56;

// The Score and Best boxes above the board.
export function ScoreBox({ title, value }: { title: string; value: number | string }) {
  return (
    <ThemedView type="backgroundElement" accessible accessibilityLabel={`${title} ${value}`} style={scoreBoxStyles.box}>
      <ThemedText type="small" themeColor="textSecondary">
        {title}
      </ThemedText>
      <ThemedText type="smallBold" style={scoreBoxStyles.value}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

// Shared with Anagrams' animated box, which draws its own.
export const scoreBoxStyles = StyleSheet.create({
  box: { flex: 1, height: SCORE_BOX_HEIGHT, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 18, lineHeight: 24, fontVariant: ['tabular-nums'] },
});
