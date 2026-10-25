import { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { Dim } from '@/components/dim';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSwipe } from '@/hooks/use-swipe';
import { useTheme } from '@/hooks/use-theme';

import { COLS, colRow, ROWS, type Dir } from '../logic/board';
import type { Game } from '../logic/game';

export const MIN_CELL = 8; // a very short area gets small cells and an overflowing board, never a zero or negative cell
const INSET = 1; // px between a segment and the grid lines around its cell

// The cell size from the width and the height the board may use (null until the screen is measured: then the width
// alone). Whole pixels, so the board's sides are whole pixels (a fractional size blurs the lines and wraps rows).
export function cellSize(width: number, available: number | null): number {
  const byWidth = Math.floor((Math.min(width, MaxContentWidth) - 2 * Spacing.two) / COLS);
  const byHeight = available === null ? byWidth : Math.floor(available / ROWS);
  return Math.max(MIN_CELL, Math.min(byWidth, byHeight));
}

// The grid is drawn once: 14 vertical and 20 horizontal hairlines, not 315 cells. Redrawn only when the size or colour changes.
const Grid = memo(function Grid({ cell, color }: { cell: number; color: string }) {
  const line = { position: 'absolute', backgroundColor: color } as const;
  return (
    <>
      {Array.from({ length: COLS - 1 }, (_, k) => (
        <View key={`c${k}`} style={[line, { left: (k + 1) * cell, top: 0, width: 1, height: ROWS * cell }]} />
      ))}
      {Array.from({ length: ROWS - 1 }, (_, k) => (
        <View key={`r${k}`} style={[line, { top: (k + 1) * cell, left: 0, height: 1, width: COLS * cell }]} />
      ))}
    </>
  );
});

// available = the height the board may use (the screen's measured area minus everything else), null until measured.
// onSwipe must be a stable function (see useSwipe).
type Props = {
  game: Game;
  available: number | null;
  newBest: boolean;
  onSwipe: (dir: Dir) => void;
  onResume: () => void;
  onPlayAgain: () => void;
  onNew: () => void;
};

export function SnakeBoard({ game, available, newBest, onSwipe, onResume, onPlayAgain, onNew }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const cell = cellSize(width, available);
  const { status, apples } = game;

  const swipe = useSwipe(onSwipe, 'Turn');

  const square = (i: number) => {
    const [col, row] = colRow(i);
    return { left: col * cell + INSET, top: row * cell + INSET, width: cell - 2 * INSET, height: cell - 2 * INSET };
  };
  // 1-based, for a screen reader; the route tests read the board from it too.
  const where = (i: number) => {
    const [col, row] = colRow(i);
    return `column ${col + 1}, row ${row + 1}`;
  };
  const value = `Head ${where(game.snake[0])}, length ${game.snake.length}, ${game.apple === null ? 'no apple' : `apple ${where(game.apple)}`}`;

  const finished = status === 'over' || status === 'won';
  const line = `${status === 'won' ? 'You win!' : 'Game over'} · ${apples} ${apples === 1 ? 'apple' : 'apples'}${newBest ? ' · New best!' : ''}`;

  // The overlays are siblings of the accessible board, not inside it, so a screen reader still reaches their buttons.
  return (
    <View testID="swipe-area" {...swipe.area} style={styles.area}>
      <View style={[styles.board, { width: COLS * cell, height: ROWS * cell }]}>
        <View
          accessible
          accessibilityLabel={`Board ${COLS} by ${ROWS}`}
          accessibilityValue={{ text: value }}
          {...swipe.actions}
          style={[StyleSheet.absoluteFill, styles.rounded, { backgroundColor: theme.snakeBoard }]}>
          <Grid cell={cell} color={theme.snakeGrid} />
          {game.apple !== null && (
            <View
              style={[
                styles.segment,
                square(game.apple),
                { borderRadius: cell / 2, backgroundColor: theme.snakeApple },
              ]}
            />
          )}
          {/* Keyed by cell: a step adds a head and removes a tail, the segments in between keep their views. */}
          {game.snake.map((i, k) => (
            <View
              key={i}
              style={[styles.segment, square(i), { backgroundColor: k === 0 ? theme.snakeHead : theme.snakeBody }]}
            />
          ))}
        </View>
        {status === 'ready' && (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.hint]}>
            <ThemedText type="small" themeColor="textSecondary" style={{ backgroundColor: theme.snakeBoard }}>
              Swipe to start
            </ThemedText>
          </View>
        )}
        {status === 'paused' && (
          <Dim>
            <ThemedText type="subtitle">Paused</ThemedText>
            <View style={styles.buttons}>
              <Button primary label="Continue" onPress={onResume} />
            </View>
          </Dim>
        )}
        {finished && (
          <Dim>
            <View testID="result" style={styles.result}>
              <ThemedText
                accessibilityLiveRegion="polite" // Android: TalkBack reads the result; no effect on the web
                style={styles.line}>
                {line}
              </ThemedText>
              <View style={styles.buttons}>
                <Button primary label="Play again" onPress={onPlayAgain} />
                <Button label="New" onPress={onNew} />
              </View>
            </View>
          </Dim>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, width: '100%', alignItems: 'center', userSelect: 'none' },
  board: { userSelect: 'none' },
  rounded: { borderRadius: 3, overflow: 'hidden' }, // small: the snake's squares need a near-square board
  segment: { position: 'absolute' },
  hint: { alignItems: 'center', justifyContent: 'center' },
  buttons: { width: '70%', gap: Spacing.two, alignItems: 'stretch' },
  result: { width: '100%', alignItems: 'center', gap: Spacing.three },
  line: { textAlign: 'center', paddingHorizontal: Spacing.two },
});
