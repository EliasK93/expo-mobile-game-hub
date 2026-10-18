import { type ReactNode, useMemo } from 'react';
import { PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { sizeOf, type Dir } from '../logic/board';
import type { Game } from '../logic/game';
import type { Merge, Slide } from '../logic/move';
import type { Spawned } from '../logic/spawn';
import { AnimatedTile } from './animated-tile';
import { Dim } from './dim';

const GAP = 4;
const MIN_TILE = 8; // a very short area gets small tiles and an overflowing board, never a zero or negative tile
const MOVE_START = 4; // px of movement before the swipe area takes the gesture (small on purpose: better too sensitive than not enough)
const SWIPE_MIN = 8; // px a drag needs to count as a swipe
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

// The longer axis decides the direction; a drag shorter than SWIPE_MIN is no swipe.
function swipeDir(dx: number, dy: number): Dir | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

// What the last move did, for the animations (the hook keeps it next to the game). seq tells one move from the next.
export type Motion = { seq: number; slides: Slide[]; merges: Merge[]; spawned: Spawned | null };

// available = the height the board may use (the screen's measured area minus everything else), null until measured:
// then the board is sized by the width alone. onSwipe must be a stable function: the PanResponder is built from it once.
// motion = the last move, null when the board did not change by a move (start, undo, resume) or with reduced motion: then
// the board just changes, no slides and no ghosts. overlay = the win overlay, drawn over the cells.
type Props = {
  game: Game;
  available: number | null;
  motion: Motion | null;
  onSwipe: (dir: Dir) => void;
  overlay?: ReactNode;
};

export function Game2048Board({ game, available, motion, onSwipe, overlay }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const n = sizeOf(game.board);
  const boardSize = Math.floor(Math.min(width, MaxContentWidth) - 2 * Spacing.two);
  const limit = available === null ? boardSize : Math.min(boardSize, Math.floor(available));
  const tile = Math.max(MIN_TILE, Math.floor((limit - (n + 1) * GAP) / n));
  const side = n * tile + (n + 1) * GAP;
  const over = game.status === 'over';

  // Where a cell's tile sits (px from the board's corner), and how far from there a tile starts when it slides in.
  const px = (cell: number) => ({ x: GAP + (cell % n) * (tile + GAP), y: GAP + Math.floor(cell / n) * (tile + GAP) });
  const from = (id: number, to: number) => {
    const slide = motion?.slides.find((s) => s.id === id);
    return slide ? { dx: px(slide.from).x - px(to).x, dy: px(slide.from).y - px(to).y } : { dx: 0, dy: 0 };
  };

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

  // The touch handlers sit on the wrapper (the swipe area: flex 1, so it reaches from the board down to the bottom of the
  // screen) and the accessibility actions on the board inside it: the testing library skips an action on an element that
  // also has touch handlers. They do nothing on the web (react-native-web has no support).
  // The value lists the board row by row for a screen reader; the route tests read the board from it too.
  const rows = Array.from({ length: n }, (_, r) => game.board.slice(r * n, (r + 1) * n));
  return (
    <View testID="swipe-area" {...pan.panHandlers} style={styles.area}>
      <View
        accessible
        accessibilityLabel={`Board ${n} by ${n}`}
        accessibilityValue={{ text: rows.map((row) => row.map((t) => t?.value ?? 'empty').join(', ')).join('; ') }}
        accessibilityActions={DIRS.map((name) => ({ name, label: `Move ${name}` }))}
        onAccessibilityAction={(e) => {
          const name = e.nativeEvent.actionName as Dir; // also called with the platform's own names, e.g. `activate`
          if (DIRS.includes(name)) onSwipe(name);
        }}
        style={[styles.board, { width: side, height: side, backgroundColor: theme.rampBoard }]}>
        {/* The empty cells stay put; the tiles are laid over them. Every move gives the tiles new keys (they are remade in
            their end state), which is also what finishes a running animation when the next swipe comes. */}
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((_, c) => (
              <View key={c} style={[styles.cell, { width: tile, height: tile, backgroundColor: theme.rampEmpty }]} />
            ))}
          </View>
        ))}
        {/* ponytail: the merged tile shows its new value from the start of the slide, the ghost slides under it; a swap at the end of the slide needs a second layer per tile. Revisit if it looks wrong on the phone. */}
        {motion?.merges.map((m) => (
          <AnimatedTile
            key={`ghost-${m.removedId}:${motion.seq}`}
            ghost
            id={m.removedId}
            value={m.value / 2}
            size={tile}
            {...px(m.at)}
            {...from(m.removedId, m.at)}
            effect={null}
          />
        ))}
        {game.board.map(
          (t, cell) =>
            t && (
              <AnimatedTile
                key={`${t.id}:${motion?.seq ?? 0}`}
                id={t.id}
                value={t.value}
                size={tile}
                {...px(cell)}
                {...from(t.id, cell)}
                effect={
                  motion?.spawned?.id === t.id ? 'spawn' : motion?.merges.some((m) => m.id === t.id) ? 'pop' : null
                }
              />
            ),
        )}
        {over && (
          <Dim>
            <ThemedText type="subtitle">Game over</ThemedText>
          </Dim>
        )}
        {overlay}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, width: '100%', alignItems: 'center' },
  board: { padding: GAP, gap: GAP, borderRadius: Spacing.two, userSelect: 'none' },
  row: { flexDirection: 'row', gap: GAP },
  cell: { borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
});
