import { memo, useMemo } from 'react';
import { PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { COLS, colRow, DIRS, ROWS, type Dir } from '../logic/board';
import type { Game } from '../logic/game';
import { Dim } from './dim';

export const MIN_CELL = 8; // a very short area gets small cells and an overflowing board, never a zero or negative cell
const MOVE_START = 4; // px of movement before the swipe area takes the gesture (small on purpose: better too sensitive than not enough)
const SWIPE_MIN = 8; // px a drag needs to count as a swipe
const INSET = 1; // px between a segment and the grid lines around its cell

// The longer axis decides the direction; a drag shorter than SWIPE_MIN is no swipe.
function swipeDir(dx: number, dy: number): Dir | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

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
// onSwipe must be a stable function: the PanResponder is built from it once.
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

  // Touch (and a mouse drag on the web): the swipe area (the board and the free space under it) takes the gesture after
  // MOVE_START px and the screen may not take it back.
  // PanResponder resets dx/dy to 0 when it grants the gesture, so the distance up to that moment (lead) is kept and added
  // back: otherwise a quick flick that is granted on its first big move would count as no swipe at all.
  const pan = useMemo(() => {
    const lead = { dx: 0, dy: 0 };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        const take = Math.max(Math.abs(g.dx), Math.abs(g.dy)) > MOVE_START;
        if (take) [lead.dx, lead.dy] = [g.dx, g.dy];
        return take;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        const dir = swipeDir(lead.dx + g.dx, lead.dy + g.dy);
        if (dir) onSwipe(dir);
      },
    });
  }, [onSwipe]);

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

  // The touch handlers sit on the wrapper (the swipe area: flex 1, so it reaches from the board down to the bottom of the
  // screen) and the accessibility actions on the board inside it: the testing library skips an action on an element that
  // also has touch handlers. They do nothing on the web (react-native-web has no support).
  // The overlays are siblings of the accessible board, not inside it, so a screen reader still reaches their buttons.
  return (
    <View testID="swipe-area" {...pan.panHandlers} style={styles.area}>
      <View style={[styles.board, { width: COLS * cell, height: ROWS * cell }]}>
        <View
          accessible
          accessibilityLabel={`Board ${COLS} by ${ROWS}`}
          accessibilityValue={{ text: value }}
          accessibilityActions={DIRS.map((name) => ({ name, label: `Turn ${name}` }))}
          onAccessibilityAction={(e) => {
            const name = e.nativeEvent.actionName as Dir; // also called with the platform's own names, e.g. `activate`
            if (DIRS.includes(name)) onSwipe(name);
          }}
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
                {/* The label differs from the row's New button, so each can be found on its own. */}
                <Button label="New after game" text="New" onPress={onNew} />
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
