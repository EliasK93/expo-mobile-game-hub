import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { games } from '@/games/registry';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.list}>
        {games.map((game) => (
          <ThemedView key={game.id}>
            <Link href={game.route}>
              <ThemedText type="subtitle">{game.title}</ThemedText>
            </Link>
            {game.Summary && <game.Summary />}
          </ThemedView>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.four,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
});
