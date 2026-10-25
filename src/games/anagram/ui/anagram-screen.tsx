import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { StatsHeaderButton } from '@/components/stats-header-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { formatTime } from '@/lib/timer';

import { canAct, isWrong } from '../logic/game';
import { LENGTH } from '../logic/words';
import { Dim } from './dim';
import { levelName, LevelPicker } from './level-picker';
import { AnswerRow, Rack, tileSize } from './letters';
import { ScoreBox } from './score-box';
import { StatsPanel } from './stats-panel';
import { useAnagram } from './use-anagram';

// The tallest layer over the letters (a 44 px title or two 24 px lines, the gap, a 48 px button); Hard at 320 px has 104.
export const LAYER_HEIGHT = Math.max(44 + Spacing.three + 48, 2 * 24 + Spacing.three + 48);

export function AnagramScreen() {
  const a = useAnagram();
  const reduceMotion = useReducedMotion(); // read here once: the boxes and the answer row mount again, and the read is async
  const { game, newBest } = a;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const container = [styles.container, { paddingBottom: Spacing.two + insets.bottom }];

  const header = <StatsHeaderButton visible={game !== null} onPress={a.openPanel} />;

  // Until storage is read only the empty area shows, so no placeholder round flashes.
  if (game === null) return <ThemedView style={container}>{header}</ThemedView>;

  // The panel has the screen to itself, the letters are hidden.
  if (a.panel) {
    return (
      <ThemedView style={container}>
        {header}
        <StatsPanel stats={a.stats} current={game.level} onClose={a.closePanel} />
      </ThemedView>
    );
  }

  // The picker takes the place of the boxes, the row and the letters.
  if (a.picking) {
    return (
      <ThemedView style={container}>
        {header}
        <LevelPicker last={a.lastLevel} stats={a.stats} onPick={a.pickLevel} onCancel={a.closePicker} />
      </ThemedView>
    );
  }

  const size = tileSize(width, LENGTH[game.level]);
  const { status } = game;
  const live = canAct(game);
  // Ready and paused hide the letters: the clock isn't running, and no thinking time for free.
  const hidden = status === 'ready' || status === 'paused';
  const line = `Time! · ${game.solved} ${game.solved === 1 ? 'word' : 'words'}${newBest ? ' · New best!' : ''}`;
  // What a screen reader says about the letters; "Solved" goes away with the flash, so a solve after it is announced again.
  const announcement = a.solvedFlash ? 'Solved' : isWrong(game) ? 'Not a word' : '';

  return (
    <ThemedView testID="game-area" style={container}>
      {header}
      <ThemedText
        testID="announce"
        accessibilityLiveRegion="polite" // Android: TalkBack reads a change; the web maps it to aria-live
        style={styles.announce}>
        {announcement}
      </ThemedText>
      <ThemedView style={styles.row}>
        <ScoreBox
          title={`${levelName(game.level)} · Score`}
          value={game.solved}
          flash={a.solvedFlash}
          reduceMotion={reduceMotion}
        />
        {/* Whole seconds rounded up, so 0:00 shows only at the very end. */}
        <ScoreBox title="Time" value={formatTime(Math.ceil(a.remaining / 1000) * 1000)} />
        <ScoreBox title="Best" value={a.best} />
      </ThemedView>
      <ThemedView style={styles.row}>
        <Button compact flex label="New" onPress={a.openPicker} />
        <Button compact flex label="Pause" disabled={status !== 'running'} onPress={a.pause} />
      </ThemedView>
      {/* The block has the height of the two rows, so the dim layers have a spot while the letters are hidden; never less
          than the tallest layer needs (see LAYER_HEIGHT). */}
      <View testID="letter-block" style={[styles.block, { height: Math.max(2 * size + Spacing.three, LAYER_HEIGHT) }]}>
        {!hidden && (
          <>
            <AnswerRow
              game={game}
              size={size}
              live={live}
              flash={a.solvedFlash}
              reduceMotion={reduceMotion}
              onUnplace={a.unplace}
            />
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
                <Button flex label="New" onPress={a.openPicker} />
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
  // Read by screen readers, not seen: out of the layout (absolute), one pixel, clipped, transparent text. Not opacity 0:
  // Android treats an invisible view as not there for TalkBack.
  announce: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', color: 'transparent' },
});
