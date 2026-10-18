import { Stack } from 'expo-router';

import { Button } from '@/components/button';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const WIDTH = 72; // the header gives a button no width of its own, and the Button's label stretches to its parent

// The slim "Stats" button in the header of a game screen: Expo Router's <Stack.Screen options> inside the screen
// (docs.expo.dev/router/advanced/stack). `visible` stays false while the game's storage is read.
export function StatsHeaderButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return (
    <Stack.Screen
      options={{
        headerRight: visible
          ? () => (
              <ThemedView style={{ width: WIDTH, marginRight: Spacing.three }}>
                <Button compact label="Stats" onPress={onPress} />
              </ThemedView>
            )
          : undefined,
      }}
    />
  );
}
