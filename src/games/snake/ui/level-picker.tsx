import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { LEVEL_IDS, type Level } from '../logic/board';
import type { Stats } from '../logic/stats';

export const levelName = (level: Level) => level[0].toUpperCase() + level.slice(1);

// The three levels, each with its best score once it has one; the last used one is marked. Cancel goes back to where the picker was opened.
type Props = { last: Level; stats: Stats; onPick: (level: Level) => void; onCancel: () => void };

export function LevelPicker({ last, stats, onPick, onCancel }: Props) {
  return (
    <ThemedView style={styles.panel}>
      <ThemedText type="subtitle" style={styles.heading}>
        Pick a level
      </ThemedText>
      {LEVEL_IDS.map((level) => {
        const name = levelName(level);
        const { best } = stats[level];
        return (
          <Button
            key={level}
            label={name}
            text={level === last ? `${name} (last used)` : name}
            detail={best > 0 ? `Best ${best}` : undefined}
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
