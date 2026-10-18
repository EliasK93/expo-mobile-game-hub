import { memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { LEVELS } from '../logic/board';
import { cellViews, type Game } from '../logic/game';
import { MinesweeperCell } from './cell';

const FRAME = 3; // the sunken frame's edge
const MIN_CELL = 8; // a very short area gets small cells and an overflowing board, never a zero or negative cell

// available = the height the board may use (the screen's measured area minus everything else), null until measured:
// then the board is sized by the width alone. onTap and onHold must be stable functions: the cells are memoised on them.
type Props = {
  game: Game;
  available: number | null;
  onTap: (i: number) => void;
  onHold: (i: number) => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
};

// memo: the screen re-renders on every clock tick, and the props (game, available, the handlers) stay the same between ticks.
export const MinesweeperBoard = memo(function MinesweeperBoard({
  game,
  available,
  onTap,
  onHold,
  onHoldStart,
  onHoldEnd,
}: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { cols, rows } = LEVELS[game.level];
  const views = useMemo(() => cellViews(game), [game]);
  const limitW = Math.floor(Math.min(width, MaxContentWidth) - 2 * Spacing.two) - 2 * FRAME;
  const limitH = available === null ? Infinity : Math.floor(available) - 2 * FRAME;
  const size = Math.max(MIN_CELL, Math.floor(Math.min(limitW / cols, limitH / rows)));

  return (
    <View
      style={[
        styles.frame,
        {
          borderTopColor: theme.mineBevelDark,
          borderLeftColor: theme.mineBevelDark,
          borderBottomColor: theme.mineBevelLight,
          borderRightColor: theme.mineBevelLight,
        },
      ]}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: cols }, (_, c) => {
            const i = r * cols + c;
            return (
              <MinesweeperCell
                key={i}
                index={i}
                cols={cols}
                view={views[i]}
                size={size}
                playing={game.status === 'playing'}
                onTap={onTap}
                onHold={onHold}
                onHoldStart={onHoldStart}
                onHoldEnd={onHoldEnd}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: { borderWidth: FRAME, userSelect: 'none' },
  row: { flexDirection: 'row' },
});
