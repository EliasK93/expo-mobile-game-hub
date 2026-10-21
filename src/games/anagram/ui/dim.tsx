import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// A layer over the whole letter block (the block hands it a spot inside itself): the block dimmed, the children centred
// on it. Ready, paused and the result all use it.
export function Dim({ children }: { children: ReactNode }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]}>
      <ThemedView style={[StyleSheet.absoluteFill, styles.dim]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, borderRadius: Spacing.two },
  dim: { opacity: 0.75, borderRadius: Spacing.two },
});
