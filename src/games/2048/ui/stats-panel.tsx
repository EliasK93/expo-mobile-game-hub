import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import { SIZES, type Size } from '../logic/board';
import { resultOf, type Game } from '../logic/game';
import type { Stats } from '../logic/stats';
import { formatScore } from './format';

type Props = {
  stats: Stats;
  game: Game; // the game on the board; once it is over, the panel shows its result and the new-game buttons
  newBest: boolean; // the game that just ended set a new best score
  onClose: () => void;
  onPlayAgain: () => void;
  onChangeSize: () => void;
};

// The whole screen below the header: a result line (after a game), the 4 · 5 · 6 · 7 switch, the numbers and the buttons.
// It opens on the size of the game on the board.
export function StatsPanel({ stats, game, newBest, onClose, onPlayAgain, onChangeSize }: Props) {
  const [size, setSize] = useState<Size>(game.size);
  const s = stats[size];
  const over = game.status === 'over';
  const { score, bestTile, undoUsed } = resultOf(game);
  const result = over
    ? [`Score ${formatScore(score)}`, `best tile ${bestTile}`, ...(newBest ? ['New best!'] : []), ...(undoUsed ? ['with undo'] : [])].join(' · ')
    : null;
  const numbers: [string, string][] = [
    ['Played', String(s.played)],
    ['Wins', String(s.wins)],
    ['Best score', s.bestScore === null ? '—' : formatScore(s.bestScore)],
    ['Best tile', s.bestTile === null ? '—' : String(s.bestTile)],
  ];

  return (
    <ThemedView style={styles.panel}>
      {result && <ThemedText type="smallBold" style={styles.centered}>{result}</ThemedText>}
      <ThemedView style={styles.row}>
        {SIZES.map((n) => (
          <Button key={n} compact flex label={`${n}×${n} stats`} text={String(n)} selected={n === size} muted={n !== size} onPress={() => setSize(n)} />
        ))}
      </ThemedView>
      <ThemedView style={styles.row}>
        {numbers.map(([name, value]) => (
          <ThemedView key={name} accessible accessibilityLabel={`${name}: ${value}`} style={styles.number}>
            <ThemedText type="subtitle" style={styles.value}>{value}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>{name}</ThemedText>
          </ThemedView>
        ))}
      </ThemedView>
      {over && (
        <ThemedView style={styles.row}>
          <Button primary flex label="Play again" onPress={onPlayAgain} />
          <Button flex label="Change size" onPress={onChangeSize} />
        </ThemedView>
      )}
      <Button label="Close" onPress={onClose} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two },
  centered: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: Spacing.two },
  number: { flex: 1, alignItems: 'center' },
  value: { fontSize: 24, lineHeight: 30, textAlign: 'center' },
});
