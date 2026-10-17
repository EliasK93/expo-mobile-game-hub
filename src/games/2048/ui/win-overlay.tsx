import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import { Dim } from './dim';

// Covers the board when the win tile is reached.
export function WinOverlay({ onKeepGoing, onNewGame }: { onKeepGoing: () => void; onNewGame: () => void }) {
  return (
    <Dim>
      <ThemedText type="subtitle">You win!</ThemedText>
      <View style={styles.buttons}>
        <Button primary label="Keep going" onPress={onKeepGoing} />
        {/* The label differs from the row's New game button, so each can be found on its own. */}
        <Button label="New game after win" text="New game" onPress={onNewGame} />
      </View>
    </Dim>
  );
}

const styles = StyleSheet.create({
  buttons: { width: '70%', gap: Spacing.two, alignItems: 'stretch' },
});
