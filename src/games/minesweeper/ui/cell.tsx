import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { glyphStyle } from '@/components/glyph-style';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import type { CellView } from '../logic/game';
import { numberColor } from './colors';
import { Flag } from './flag';
import { Mine } from './mine';

// What a cell looks like, in one place (the board and the home tile both draw with it). Covered cells and flags are raised
// (light top and left edge, dark bottom and right), opened cells are flat with a grid line.
function CellFace({ view, size }: { view: CellView; size: number }) {
  const theme = useTheme();
  const raised = view === 'covered' || view === 'flag' || view === 'wrongFlag';
  const edge = Math.max(1, Math.round(size * 0.12));
  const look = raised
    ? {
        backgroundColor: theme.mineCell,
        borderWidth: edge,
        borderTopColor: theme.mineBevelLight,
        borderLeftColor: theme.mineBevelLight,
        borderBottomColor: theme.mineBevelDark,
        borderRightColor: theme.mineBevelDark,
      }
    : { backgroundColor: view === 'hit' ? theme.mineHit : theme.mineOpen, borderWidth: 1, borderColor: theme.mineGrid };
  const cross = {
    position: 'absolute',
    width: size * 0.8,
    height: Math.max(1, size * 0.08),
    backgroundColor: theme.mineBomb,
  } as const;

  return (
    <View style={[styles.cell, { width: size, height: size }, look]}>
      {typeof view === 'number' && view !== 0 && (
        <ThemedText themeColor={numberColor(view)} style={[styles.text, glyphStyle(Math.round(size * 0.6), 700)]}>
          {view}
        </ThemedText>
      )}
      {(view === 'mine' || view === 'hit') && <Mine size={size * 0.85} />}
      {(view === 'flag' || view === 'wrongFlag') && <Flag size={size * 0.6} />}
      {view === 'wrongFlag' && (
        <>
          <View style={[cross, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[cross, { transform: [{ rotate: '-45deg' }] }]} />
        </>
      )}
    </View>
  );
}

const STATE: Partial<Record<CellView, string>> = {
  0: 'empty',
  covered: 'covered',
  flag: 'flagged',
  wrongFlag: 'wrong flag',
  mine: 'mine',
  hit: 'exploded mine',
};

// "Row 3, column 4, covered": rows and columns count from 1, a number reads as itself.
const cellLabel = (index: number, cols: number, view: CellView) =>
  `Row ${Math.floor(index / cols) + 1}, column ${(index % cols) + 1}, ${STATE[view] ?? view}`;

// Primitive props only, and stable handlers from the hook: a tap re-renders just the cells that changed. A tap is the
// press, the long press the other action (the hook decides which is which from the mode); no delayLongPress, the
// defaults are the same on the web and on the phone. `playing` is false once the game is over.
// Only covered and flagged cells of a running game are buttons. An opened cell (or any cell after the end) is disabled
// text for a screen reader: it keeps its label, but there is nothing to press. TalkBack's double-tap-and-hold arrives as
// the `longpress` accessibility action (a double tap stays the press); react-native-web ignores actions, so that part is
// checked on the phone only. The held cell looks opened and empty while it is pressed (a pressed state local to this cell).
type Props = {
  index: number;
  cols: number;
  view: CellView;
  size: number;
  playing: boolean;
  onTap: (i: number) => void;
  onHold: (i: number) => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
};

export const MinesweeperCell = memo(function MinesweeperCell({
  index,
  cols,
  view,
  size,
  playing,
  onTap,
  onHold,
  onHoldStart,
  onHoldEnd,
}: Props) {
  const interactive = playing && (view === 'covered' || view === 'flag');
  return (
    <Pressable
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={cellLabel(index, cols, view)}
      accessibilityActions={interactive ? [{ name: 'longpress' }] : undefined}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && onHold(index)}
      disabled={!interactive}
      onPress={() => onTap(index)}
      onLongPress={() => onHold(index)}
      onPressIn={view === 'covered' ? onHoldStart : undefined}
      onPressOut={onHoldEnd}>
      {({ pressed }) => <CellFace view={pressed && view === 'covered' ? 0 : view} size={size} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: { alignItems: 'center', justifyContent: 'center' },
  // Full width and centred, like the shared Button: Android cuts off shrink-wrapped bold text.
  text: { alignSelf: 'stretch', textAlign: 'center' },
});
