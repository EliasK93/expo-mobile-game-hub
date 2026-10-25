import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, COMPACT_HEIGHT } from '@/components/button';
import { OptionPicker } from '@/components/option-picker';
import { StatsHeaderButton } from '@/components/stats-header-button';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { capitalize } from '@/lib/text';
import { formatTime } from '@/lib/timer';

import { LEVEL_IDS, LEVELS } from '../logic/board';
import { minesLeft, type Status } from '../logic/game';
import { MinesweeperBoard } from './board';
import type { Mood } from './face';
import { clampLed } from './format';
import { MinesweeperStatsPanel } from './stats-panel';
import { TOP_BAR_HEIGHT, TopBar } from './top-bar';
import { useMinesweeper } from './use-minesweeper';

const MOODS: Record<Status, Mood> = { playing: 'normal', won: 'cool', lost: 'dizzy' };

export function MinesweeperScreen() {
  const {
    loaded,
    game,
    mode,
    stats,
    newBest,
    picking,
    panel,
    lastLevel,
    elapsedMs,
    holding,
    tap,
    hold,
    pressIn,
    pressOut,
    setMode,
    openPicker,
    closePicker,
    openPanel,
    closePanel,
    pickLevel,
  } = useMinesweeper();
  const insets = useSafeAreaInsets();
  // The screen measures its own area (everything below the Stack header), so no header size is ever guessed.
  // The board gets what is left; null until the first layout (the board is then sized by width).
  const [areaHeight, setAreaHeight] = useState<number | null>(null);
  const container = [styles.container, { paddingBottom: Spacing.two + insets.bottom }];
  const onLayout = (e: LayoutChangeEvent) => setAreaHeight(e.nativeEvent.layout.height);

  const header = <StatsHeaderButton visible={loaded} onPress={openPanel} />;

  if (!loaded)
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
      </ThemedView>
    );

  if (picking) {
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
        <OptionPicker
          heading="Pick a level"
          options={LEVEL_IDS.map((id) => {
            const { cols, rows, mines } = LEVELS[id];
            const { bestMs } = stats[id];
            return {
              id,
              name: capitalize(id),
              detail: `${cols} × ${rows} · ${mines} mines${bestMs === null ? '' : ` · Best ${formatTime(bestMs)}`}`,
            };
          })}
          last={lastLevel}
          onPick={pickLevel}
          onCancel={closePicker}
        />
      </ThemedView>
    );
  }

  // The panel has the screen to itself, the board is hidden.
  if (panel) {
    return (
      <ThemedView style={container} onLayout={onLayout}>
        {header}
        {/* Play again: the same level (pickLevel also keeps it as the last used one). */}
        <MinesweeperStatsPanel
          stats={stats}
          game={game}
          ms={elapsedMs}
          newBest={newBest}
          onClose={closePanel}
          onPlayAgain={() => pickLevel(game.level)}
          onChangeLevel={openPicker}
        />
      </ThemedView>
    );
  }

  // Padding top and bottom, two gaps (button row, top bar, board).
  const reserved = insets.bottom + COMPACT_HEIGHT + TOP_BAR_HEIGHT + 4 * Spacing.two;
  return (
    <ThemedView testID="game-area" style={container} onLayout={onLayout}>
      {header}
      <ThemedView style={styles.row}>
        {/* The active mode is the accent button, the other one has grey text. */}
        <Button
          compact
          flex
          label="Dig"
          selected={mode === 'dig'}
          muted={mode !== 'dig'}
          onPress={() => setMode('dig')}
        />
        <Button
          compact
          flex
          label="Flag"
          selected={mode === 'flag'}
          muted={mode !== 'flag'}
          onPress={() => setMode('flag')}
        />
      </ThemedView>
      <TopBar
        minesLeft={minesLeft(game)}
        seconds={clampLed(Math.floor(elapsedMs / 1000))}
        mood={holding ? 'surprised' : MOODS[game.status]}
        onFace={openPicker}
      />
      <MinesweeperBoard
        game={game}
        available={areaHeight === null ? null : areaHeight - reserved}
        onTap={tap}
        onHold={hold}
        onHoldStart={pressIn}
        onHoldEnd={pressOut}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: Spacing.two, gap: Spacing.two },
  row: { width: '100%', maxWidth: MaxContentWidth, flexDirection: 'row', gap: Spacing.two },
});
