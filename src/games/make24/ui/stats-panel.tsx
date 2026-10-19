import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { StatsNumbers } from '@/components/stats-numbers';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { winPercent } from '@/lib/stats';
import { formatTime } from '@/lib/timer';

import { LEVEL_IDS, type Level } from '../logic/game';
import type { Stats } from '../logic/stats';
import { levelName } from './level-picker';

type Props = { stats: Stats; current: Level; onClose: () => void };

// The whole screen below the header: the Easy · Medium · Hard switch (it opens on the level on screen), the numbers
// and Close. The result of a puzzle stays on the board, not here.
export function StatsPanel({ stats, current, onClose }: Props) {
  const [level, setLevel] = useState<Level>(current);
  const s = stats[level];
  const numbers: [string, string][] = [
    ['Played', String(s.played)],
    ['Solved %', String(winPercent(s.played, s.solved))],
    ['Current streak', String(s.currentStreak)],
    ['Best streak', String(s.bestStreak)],
    ['Best time', s.bestMs === null ? '—' : formatTime(s.bestMs)],
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
