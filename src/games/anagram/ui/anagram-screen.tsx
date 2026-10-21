import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatTime } from '@/lib/timer';

import { canAct } from '../logic/game';
import { LENGTH } from '../logic/words';
import { Dim } from './dim';
import { levelName, LevelPicker } from './level-picker';
import { AnswerRow, Rack, tileSize } from './letters';
import { ScoreBox } from './score-box';
import { useAnagram } from './use-anagram';

export function AnagramScreen() {
  const a = useAnagram();
  const { game, newBest } = a;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const container = [styles.container, { paddingBottom: Spacing.two + insets.bottom }];

  // The picker takes the place of the boxes, the row and the letters.
  if (a.picking) {
    return (
      <ThemedView style={container}>
        <LevelPicker last={game.level} stats={a.stats} onPick={a.pickLevel} onCancel={a.closePicker} />
      </ThemedView>
    );
  }

  const size = tileSize(width, LENGTH[game.level]);
  const { status } = game;
  const live = canAct(game);
  // Ready and paused hide the letters: the clock isn't running, and no thinking time for free.
  const hidden = status === 'ready' || status === 'paused';
  const line = `Time! · ${game.solved} ${game.solved === 1 ? 'word' : 'words'}${newBest ? ' · New best!' : ''}`;

  return (
    <ThemedView testID="game-area" style={container}>
      <ThemedView style={styles.row}>
        <ScoreBox title={`${levelName(game.level)} · Score`} value={game.solved} />
        {/* Whole seconds rounded up, so 0:00 shows only at the very end. */}
        <ScoreBox title="Time" value={formatTime(Math.ceil(a.remaining / 1000) * 1000)} />
        <ScoreBox title="Best" value={a.best} />
      </ThemedView>
      <ThemedView style={styles.row}>
        <Button compact flex label="New" onPress={a.openPicker} />
        <Button compact flex label="Pause" disabled={status !== 'running'} onPress={a.pause} />
      </ThemedView>
      {/* The block has the height of the two rows, so the dim layers have a spot while the letters are hidden. */}
      <View style={[styles.block, { height: 2 * size + Spacing.three }]}>
        {!hidden && (
          <>
            <AnswerRow game={game} size={size} live={live} onUnplace={a.unplace} />
            <Rack game={game} size={size} live={live} onPlace={a.place} />
          </>
        )}
        {status === 'ready' && (
          <Dim>
            <View style={styles.buttons}>
              <Button primary flex label="Start" onPress={a.start} />
            </View>
          </Dim>
        )}
        {status === 'paused' && (
          <Dim>
            <ThemedText type="subtitle">Paused</ThemedText>
            <View style={styles.buttons}>
              <Button primary flex label="Continue" onPress={a.resume} />
            </View>
          </Dim>
        )}
        {status === 'over' && (
          <Dim>
            <View testID="result" style={styles.result}>
              <ThemedText
                accessibilityLiveRegion="polite" // Android: TalkBack reads the result; no effect on the web
                style={styles.line}>
                {line}
              </ThemedText>
              <View style={styles.buttons}>
                <Button primary flex label="Play again" onPress={a.playAgain} />
                {/* The label differs from the row's New button, so each can be found on its own. */}
                <Button flex label="New after game" text="New" onPress={a.openPicker} />
              </View>
            </View>
          </Dim>
        )}
      </View>
      <ThemedView style={styles.row}>
        <Button flex label="Shuffle" disabled={!live} onPress={a.shuffle} />
        <Button flex label="Clear" disabled={!live} onPress={a.clear} />
        <Button flex label="Skip" disabled={!live} onPress={a.skip} />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: Spacing.two, gap: Spacing.three },
  row: { width: '100%', maxWidth: MaxContentWidth, flexDirection: 'row', gap: Spacing.two },
  block: { width: '100%', maxWidth: MaxContentWidth, alignItems: 'center', gap: Spacing.three, userSelect: 'none' },
  buttons: { width: '80%', flexDirection: 'row', gap: Spacing.two },
  result: { width: '100%', alignItems: 'center', gap: Spacing.three },
  line: { textAlign: 'center', paddingHorizontal: Spacing.two },
});
