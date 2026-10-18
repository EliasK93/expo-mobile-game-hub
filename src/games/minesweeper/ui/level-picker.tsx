import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatTime } from '@/lib/timer';

import { LEVEL_IDS, LEVELS, type Level } from '../logic/board';
import type { Stats } from '../logic/stats';
import { levelName } from './format';

// The three levels with their size, mines and best time; the last used one is marked. Cancel goes back to where the picker was opened.
type Props = { last: Level; stats: Stats; onPick: (level: Level) => void; onCancel: () => void };

export function LevelPicker({ last, stats, onPick, onCancel }: Props) {
  return (
    <ThemedView style={styles.panel}>
      <ThemedText type="subtitle" style={styles.heading}>
        Pick a level
      </ThemedText>
      {LEVEL_IDS.map((level) => {
        const { cols, rows, mines } = LEVELS[level];
        const name = levelName(level);
        const { bestMs } = stats[level];
        return (
          <Button
            key={level}
            label={name}
            text={level === last ? `${name} (last used)` : name}
            detail={`${cols} × ${rows} · ${mines} mines${bestMs === null ? '' : ` · Best ${formatTime(bestMs)}`}`}
            selected={level === last}
            onPress={() => onPick(level)}
          />
        );
      })}
      <Button label="Cancel" onPress={onCancel} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two, alignItems: 'stretch' },
  heading: { textAlign: 'center' },
});
