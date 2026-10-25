import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { OptionPicker } from '@/components/option-picker';
import { StatsHeaderButton } from '@/components/stats-header-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { capitalize } from '@/lib/text';
import { formatTime } from '@/lib/timer';

import { LEVEL_IDS, message } from '../logic/game';
import { cardSize, Make24Cards } from './cards';
import { Make24Operators } from './operators';
import { Make24StatsPanel } from './stats-panel';
import { useMake24 } from './use-make24';

// The heights of the rows around the cards: the time line, the message line (two lines of small text), and the operator
// and action rows (a button is 48 high). The message line has a fixed height, so nothing jumps.
const TIME_HEIGHT = 24;
const MESSAGE_HEIGHT = 40;
const ROW_HEIGHT = 48;

// Everything on the board except the cards: padding top and bottom (the bottom inset on top), the four rows, and four
// gaps between the five children.
export const reservedHeight = (bottomInset: number) =>
  bottomInset + 2 * Spacing.two + TIME_HEIGHT + MESSAGE_HEIGHT + 2 * ROW_HEIGHT + 4 * Spacing.two;

export function Make24Screen() {
  const {
    loaded,
    game,
    stats,
    newBest,
    picking,
    panel,
    lastLevel,
    elapsedMs,
    tapCard,
    tapOperator,
    undo,
    hint,
    giveUp,
    next,
    openPicker,
    closePicker,
    openPanel,
    closePanel,
    pickLevel,
  } = useMake24();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // The screen measures its own area (everything below the Stack header), so no header size is ever guessed.
  // The cards get what is left; null until the first layout (the cards are then sized by width).
  const [areaHeight, setAreaHeight] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setAreaHeight(e.nativeEvent.layout.height);
  const container = [styles.container, { paddingBottom: Spacing.two + insets.bottom }];

  const header = <StatsHeaderButton visible={loaded} onPress={openPanel} />;

  // Until storage is read only the empty area shows, so no placeholder puzzle flashes.
  if (!loaded)
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
      </ThemedView>
    );

  // The panel has the screen to itself, the board is hidden.
  if (panel) {
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
        <Make24StatsPanel stats={stats} current={game.level} onClose={closePanel} />
      </ThemedView>
    );
  }

  const time = formatTime(elapsedMs);
  const timeLine = (
    <ThemedText accessibilityLabel={`Time ${time}`} style={styles.time}>
      {`${capitalize(game.level)} · ${time}`}
    </ThemedText>
  );

  if (picking) {
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
        {timeLine}
        <OptionPicker
          heading="Pick a level"
          options={LEVEL_IDS.map((id) => {
            const { bestMs } = stats[id];
            return { id, name: capitalize(id), detail: bestMs === null ? undefined : `Best ${formatTime(bestMs)}` };
          })}
          last={lastLevel}
          onPick={pickLevel}
          onCancel={closePicker}
        />
      </ThemedView>
    );
  }

  const playing = game.status === 'playing';
  // In play, or after Give up: the game's own text. Solved: the result line, which needs the time.
  const note =
    game.status === 'solved'
      ? {
          text: `Solved ${game.hints > 0 ? 'with hints ' : ''}in ${time}${newBest ? ' · New best!' : ''}`,
          error: false,
        }
      : message(game);

  const reserved = reservedHeight(insets.bottom);
  return (
    <ThemedView testID="game-area" style={container} onLayout={onLayout}>
      {header}
      {timeLine}
      <ThemedText
        testID="message"
        type="small"
        themeColor={note?.error ? 'digitConflict' : 'textSecondary'}
        numberOfLines={2}
        accessibilityLiveRegion="polite" // Android: TalkBack reads a new message; no effect on the web
        style={styles.message}>
        {note?.text}
      </ThemedText>
      <Make24Cards
        game={game}
        size={cardSize(width, areaHeight === null ? null : areaHeight - reserved)}
        onTap={tapCard}
      />
      <Make24Operators game={game} onTap={tapOperator} />
      <ThemedView style={styles.actions}>
        {playing ? (
          <>
            <Button compact flex label="Undo" disabled={game.steps.length === 0} onPress={undo} />
            <Button compact flex label="Hint" onPress={hint} />
            <Button compact flex label="Give up" onPress={giveUp} />
            <Button compact flex label="New" onPress={openPicker} />
          </>
        ) : (
          <>
            <Button flex label="New" onPress={openPicker} />
            <Button flex primary label="Next" onPress={next} />
          </>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: Spacing.two, gap: Spacing.two },
  time: { height: TIME_HEIGHT, textAlign: 'center' },
  message: { height: MESSAGE_HEIGHT, alignSelf: 'stretch', textAlign: 'center' },
  actions: {
    width: '100%',
    maxWidth: MaxContentWidth,
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
