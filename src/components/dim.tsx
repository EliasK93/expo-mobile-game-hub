import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// A layer over a board or letter block (the parent hands it a spot inside itself): the content dimmed, the children
// centred on it.
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
