import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { LEVEL_IDS, type Level } from '../logic/game';

export const levelName = (level: Level) => level[0].toUpperCase() + level.slice(1);

// The three levels; the last used one is marked. Cancel goes back to where the picker was opened. (M4 adds each level's best time.)
type Props = { last: Level; onPick: (level: Level) => void; onCancel: () => void };

export function LevelPicker({ last, onPick, onCancel }: Props) {
  return (
    <ThemedView style={styles.panel}>
      <ThemedText type="subtitle" style={styles.heading}>
        Pick a level
      </ThemedText>
      {LEVEL_IDS.map((level) => {
        const name = levelName(level);
        return (
          <Button
            key={level}
            label={name}
            text={level === last ? `${name} (last used)` : name}
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
