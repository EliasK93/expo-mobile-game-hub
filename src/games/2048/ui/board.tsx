import { useMemo } from 'react';
import { PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';

import { glyphStyle } from '@/components/glyph-style';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { sizeOf, type Dir } from '../logic/board';
import type { Game } from '../logic/game';
import { rampColors } from './ramp';

const GAP = 4;
const MOVE_START = 10; // px of movement before the board takes the gesture
const SWIPE_MIN = 20; // px a drag needs to count as a swipe
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

// The longer axis decides the direction; a drag shorter than SWIPE_MIN is no swipe.
function swipeDir(dx: number, dy: number): Dir | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

// The font size of a number from the tile size and its digit count: half a tile, less once the digits would not fit.
const numberSize = (tile: number, value: number) => Math.floor(Math.min(tile * 0.5, (tile * 1.4) / String(value).length));

// available = the height the board may use (the screen's measured area minus everything else), null until measured:
// then the board is sized by the width alone. onSwipe must be a stable function: the PanResponder is built from it once.
type Props = { game: Game; available: number | null; onSwipe: (dir: Dir) => void };

export function Game2048Board({ game, available, onSwipe }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const n = sizeOf(game.board);
  const boardSize = Math.floor(Math.min(width, MaxContentWidth) - 2 * Spacing.two);
  const side = available === null ? boardSize : Math.min(boardSize, Math.floor(available));
  const tile = Math.floor((side - (n + 1) * GAP) / n);
  const over = game.status === 'over';

  // Touch (and a mouse drag on the web): the board takes the gesture after MOVE_START px and the screen may not take it back.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.max(Math.abs(g.dx), Math.abs(g.dy)) > MOVE_START,
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, g) => {
          const dir = swipeDir(g.dx, g.dy);
          if (dir) onSwipe(dir);
        },
      }),
    [onSwipe],
  );

  // The accessibility actions sit on this outer View and the touch handlers on the inner one: the testing library skips
  // an action on an element that also has touch handlers. They do nothing on the web (react-native-web has no support).
  // The value lists the board row by row for a screen reader; the route tests read the board from it too.
  const rows = Array.from({ length: n }, (_, r) => game.board.slice(r * n, (r + 1) * n));
  return (
    <View
      accessible
      accessibilityLabel={`Board ${n} by ${n}`}
      accessibilityValue={{ text: rows.map((row) => row.map((t) => t?.value ?? 'empty').join(', ')).join('; ') }}
      accessibilityActions={DIRS.map((name) => ({ name, label: `Move ${name}` }))}
      onAccessibilityAction={(e) => {
        const name = e.nativeEvent.actionName as Dir; // also called with the platform's own names, e.g. `activate`
        if (DIRS.includes(name)) onSwipe(name);
      }}>
      <View
        testID="board-pan"
        {...pan.panHandlers}
        style={[styles.board, { width: side, height: side, backgroundColor: theme.rampBoard }]}>
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((t, c) => {
              const colors = t ? rampColors(t.value) : null;
              return (
                <View
                  key={c}
                  style={[styles.cell, { width: tile, height: tile, backgroundColor: theme[colors?.background ?? 'rampEmpty'] }]}>
                  {t && (
                    <ThemedText themeColor={colors!.text} style={glyphStyle(numberSize(tile, t.value), 700)}>
                      {t.value}
                    </ThemedText>
                  )}
                </View>
              );
            })}
          </View>
        ))}
        {over && (
          <View style={[StyleSheet.absoluteFill, styles.overlay]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: 0.75 }]} />
            <ThemedText type="subtitle">Game over</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { padding: GAP, gap: GAP, borderRadius: Spacing.two, userSelect: 'none' },
  row: { flexDirection: 'row', gap: GAP },
  cell: { borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  overlay: { alignItems: 'center', justifyContent: 'center', borderRadius: Spacing.two },
});
