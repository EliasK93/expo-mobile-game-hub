import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { StatsNumbers } from '@/components/stats-numbers';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// `text` is the switch button's text, `label` its accessibility label ("<text> stats" when left out).
type Option<T> = { id: T; text: string; label?: string };
type Props<T> = {
  options: Option<T>[];
  initial: T;
  numbersFor: (id: T) => [name: string, value: string][];
  result?: string | null; // the line above the switch, once a game is over
  actions?: { change: string; onPlayAgain: () => void; onChange: () => void }; // the new-game row, once a game is over
  onClose: () => void;
};

// The whole screen below the header: an optional result line, the switch between levels or sizes (it opens on `initial`,
// the one on screen), the numbers, an optional Play again / Change … row and Close.
export function StatsPanel<T extends string | number>({
  options,
  initial,
  numbersFor,
  result,
  actions,
  onClose,
}: Props<T>) {
  const [selected, setSelected] = useState<T>(initial);

  return (
    <ThemedView style={styles.panel}>
      {result && (
        <ThemedText type="smallBold" style={styles.centered}>
          {result}
        </ThemedText>
      )}
      <ThemedView style={styles.row}>
        {options.map(({ id, text, label }) => (
          <Button
            key={id}
            compact
            flex
            label={label ?? `${text} stats`}
            text={text}
            selected={id === selected}
            muted={id !== selected}
            onPress={() => setSelected(id)}
          />
        ))}
      </ThemedView>
      <StatsNumbers numbers={numbersFor(selected)} />
      {actions && (
        <ThemedView style={styles.row}>
          <Button primary flex label="Play again" onPress={actions.onPlayAgain} />
          <Button flex label={actions.change} onPress={actions.onChange} />
        </ThemedView>
      )}
      <Button label="Close" onPress={onClose} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two },
  centered: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: Spacing.two },
});
