import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { StatsNumbers } from '@/components/stats-numbers';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { average, type Stats } from '../logic/stats';
import { LEVEL_IDS, type Level } from '../logic/words';
import { levelName } from './level-picker';

type Props = { stats: Stats; current: Level; onClose: () => void };

// The whole screen below the header: the Easy · Normal · Hard switch (it opens on the level on screen), the numbers
// and Close. The result of a round stays on the game screen, not here.
export function StatsPanel({ stats, current, onClose }: Props) {
  const [level, setLevel] = useState<Level>(current);
  const s = stats[level];
  const numbers: [string, string][] = [
    ['Played', String(s.played)],
    ['Best', s.best === 0 ? '—' : String(s.best)],
    ['Average', s.played === 0 ? '—' : String(average(s))],
    ['Words', s.played === 0 ? '—' : String(s.totalWords)],
  ];

  return (
    <ThemedView style={styles.panel}>
      <ThemedView style={styles.row}>
        {LEVEL_IDS.map((id) => (
          <Button
            key={id}
            compact
            flex
            label={`${levelName(id)} stats`}
            text={levelName(id)}
            selected={id === level}
            muted={id !== level}
            onPress={() => setLevel(id)}
          />
        ))}
      </ThemedView>
      <StatsNumbers numbers={numbers} />
      <Button label="Close" onPress={onClose} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
});
