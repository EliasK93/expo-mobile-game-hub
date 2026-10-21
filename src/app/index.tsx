import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { games } from '@/games/registry';
import { loadSort, saveSort, SORT_LABELS, SORTS, sortGames, type Sort } from '@/lib/game-sort';
import { loadPlaytime, type Playtime } from '@/lib/playtime';

// Sort chips above a 3-column grid of tiles (art and name). Reloads on every focus, so playtime from a game just left shows up.
export default function HomeScreen() {
  const [data, setData] = useState<{ sort: Sort; playtime: Playtime } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let current = true;
      Promise.all([loadSort(), loadPlaytime()]).then(([sort, playtime]) => {
        if (current) setData({ sort, playtime });
      });
      return () => {
        current = false;
      };
    }, []),
  );

  if (data === null) return <ThemedView style={styles.container} />;
  const { sort, playtime } = data;
  const choose = (s: Sort) => {
    setData({ sort: s, playtime });
    saveSort(s);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedView style={styles.chips}>
          {SORTS.map((s) => (
            <Button
              key={s}
              flex
              label={`Sort by ${SORT_LABELS[s]}`}
              text={SORT_LABELS[s]}
              selected={s === sort}
              muted={s !== sort}
              onPress={() => choose(s)}
            />
          ))}
        </ThemedView>
        <ThemedView style={styles.grid}>
          {sortGames(games, sort, playtime).map((game) => (
            <Link key={game.id} href={game.route} asChild>
              <Pressable accessibilityRole="link" style={styles.cell}>
                <ThemedView style={styles.art}>
                  <game.Tile />
                </ThemedView>
                <ThemedText type="small" style={styles.name}>
                  {game.title}
                </ThemedText>
              </Pressable>
            </Link>
          ))}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: Spacing.three },
  content: { width: '100%', maxWidth: 480, gap: Spacing.three }, // narrower than other screens: tiles stay a sensible size on a wide web page
  chips: { flexDirection: 'row', gap: Spacing.two },
  // Three tiles per row: each cell is a third of the width, with its own padding as the gap.
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -Spacing.two },
  cell: { width: '33.333%', padding: Spacing.two, gap: Spacing.one },
  art: { aspectRatio: 1 }, // the tile draws its own rounded corners
  name: { textAlign: 'center' },
});
