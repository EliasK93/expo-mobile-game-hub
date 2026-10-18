import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { StatsNumbers } from '@/components/stats-numbers';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { winPercent } from '@/lib/stats';
import { formatTime } from '@/lib/timer';

import { LEVEL_IDS, type Level } from '../logic/board';
import type { Game } from '../logic/game';
import type { Stats } from '../logic/stats';
import { levelName } from './format';

type Props = {
  stats: Stats;
  game: Game; // the game on the board; once it is over, the panel shows its result and the new-game buttons
  ms: number; // the time of that game
  newBest: boolean; // the game that just ended set a new best time
  onClose: () => void;
  onPlayAgain: () => void;
  onChangeLevel: () => void;
};

// The whole screen below the header: a result line (after a game), the Beginner · Intermediate · Expert switch, the
// numbers and the buttons. It opens on the level of the game on the board.
export function StatsPanel({ stats, game, ms, newBest, onClose, onPlayAgain, onChangeLevel }: Props) {
  const [level, setLevel] = useState<Level>(game.level);
  const s = stats[level];
  const over = game.status !== 'playing';
  const won = game.status === 'won';
  const result = over ? (won ? [`Won in ${formatTime(ms)}`, ...(newBest ? ['New best!'] : [])] : ['Boom!']).join(' · ') : null;
  const numbers: [string, string][] = [
    ['Played', String(s.played)],
    ['Win %', String(winPercent(s.played, s.wins))],
    ['Current streak', String(s.currentStreak)],
    ['Best streak', String(s.bestStreak)],
    ['Best time', s.bestMs === null ? '—' : formatTime(s.bestMs)],
  ];

  return (
    <ThemedView style={styles.panel}>
      {result && <ThemedText type="smallBold" style={styles.centered}>{result}</ThemedText>}
      <ThemedView style={styles.row}>
        {LEVEL_IDS.map((id) => (
          <Button key={id} compact flex label={`${levelName(id)} stats`} text={levelName(id)} selected={id === level} muted={id !== level} onPress={() => setLevel(id)} />
        ))}
      </ThemedView>
      <StatsNumbers numbers={numbers} />
      {over && (
        <ThemedView style={styles.row}>
          <Button primary flex label="Play again" onPress={onPlayAgain} />
          <Button flex label="Change level" onPress={onChangeLevel} />
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
});
