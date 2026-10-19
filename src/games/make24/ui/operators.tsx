import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import type { Game } from '../logic/game';
import { OPS, SYMBOL, type Op } from '../logic/solve';

const NAME: Record<Op, string> = { '+': 'Plus', '-': 'Minus', '*': 'Times', '/': 'Divided by' };

// The four operators in a row; the chosen one is the accent button. Disabled once the puzzle is over.
export function Make24Operators({ game, onTap }: { game: Game; onTap: (op: Op) => void }) {
  return (
    <ThemedView style={styles.row}>
      {OPS.map((op) => (
        <Button
          key={op}
          flex
          label={NAME[op]}
          text={SYMBOL[op]}
          textType="subtitle"
          selected={game.operator === op}
          disabled={game.status !== 'playing'}
          onPress={() => onTap(op)}
        />
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', maxWidth: MaxContentWidth, flexDirection: 'row', gap: Spacing.two },
});
