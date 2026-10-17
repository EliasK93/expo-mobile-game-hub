import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';

import { glyphStyle } from '@/components/glyph-style';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { rampColors } from './ramp';

// A swipe slides the tiles for SLIDE_MS; after that a merged tile pops and a new tile grows in for POP_MS.
export const SLIDE_MS = 100;
const POP_MS = 100;
const POP_SCALE = 1.15;

// The tile's inner margin, and a bold digit's width as a share of the font size (0.6 em is a little wide, so it errs safe).
const MARGIN = 4;
const DIGIT_EM = 0.6;

// The font size of a number: half a tile, less once its digits would not fit (a five-digit number on a 7×7 board).
export const numberSize = (tile: number, value: number) =>
  Math.floor(Math.min(tile * 0.5, (tile - MARGIN) / (DIGIT_EM * String(value).length)));

// x, y = where the tile ends up (px from the board's corner); dx, dy = how far from there it starts and slides in (0 = it
// does not slide). effect = what it does after the slide. ghost = a tile that merged away: drawn sliding into the merge for
// one slide, then dropped. Only transform is animated, so the native driver runs it off the JS thread on Android.
// Nothing here reacts to new props: a new move gives the tile a new key, so a swipe in the middle of an animation replaces
// the running one by tiles that stand at their end already.
type Props = {
  id: number;
  value: number;
  size: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  effect: 'pop' | 'spawn' | null;
  ghost?: boolean;
};

export function AnimatedTile({ id, value, size, x, y, dx, dy, effect, ghost }: Props) {
  const theme = useTheme();
  const [slide] = useState(() => new Animated.Value(dx || dy ? 1 : 0)); // 1 = at the start, 0 = in place
  const [pulse] = useState(() => new Animated.Value(effect ? 0 : 1)); // 0 -> 1 after the slide
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!ghost && !dx && !dy && !effect) return;
    const useNativeDriver = Platform.OS !== 'web'; // react-native-web has no native driver
    // Only what applies: a plain slide has no pulse, a tile that stays put has no slide.
    const run = Animated.parallel([
      ...(dx || dy ? [Animated.timing(slide, { toValue: 0, duration: SLIDE_MS, useNativeDriver })] : []),
      ...(effect ? [Animated.timing(pulse, { toValue: 1, delay: SLIDE_MS, duration: POP_MS, useNativeDriver })] : []),
    ]);
    run.start();
    const timer = ghost ? setTimeout(() => setGone(true), SLIDE_MS) : undefined;
    return () => {
      run.stop();
      clearTimeout(timer);
    };
  }, [slide, pulse, dx, dy, effect, ghost]);

  if (gone) return null;
  const colors = rampColors(value);
  const scale = effect === 'pop' ? pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, POP_SCALE, 1] }) : pulse;

  return (
    <Animated.View
      testID={ghost ? 'ghost' : `tile-${id}`}
      style={[
        styles.tile,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          backgroundColor: theme[colors.background],
          zIndex: effect === 'pop' ? 1 : 0, // a popping tile grows past its neighbours' edges: draw it on top
          transform: [
            { translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
            { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
            { scale },
          ],
        },
      ]}>
      <ThemedText themeColor={colors.text} style={glyphStyle(numberSize(size, value), 700)}>
        {value}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: { position: 'absolute', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
});
