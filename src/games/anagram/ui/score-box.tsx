import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, useWindowDimensions } from 'react-native';

import { scoreBoxStyles } from '@/components/score-box';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useSolvedFade } from './use-solved-fade';

export const POP_MS = 250; // the score pops once when a word is solved
const POP_SCALE = 1.15;

// "Normal · Score" is 94 px wide at 14 px (measured with Edge headless, the system font stacks of web and Android); below
// this box width it is within about 10% of clipping, so the titles get smaller. A 320 px phone has 96 px boxes.
const NARROW_BOX = 104;

// The Score, Time and Best boxes above the letters. `flash` (a word was just solved) fades the box from green and pops its
// number (not with `reduceMotion`); the value is what restarts that when it changes.
type Props = { title: string; value: number | string; flash?: boolean; reduceMotion?: boolean };

export function ScoreBox({ title, value, flash, reduceMotion = false }: Props) {
  const theme = useTheme();
  // Three boxes share the row: minus the screen's `container` padding and the `row` gap (both Spacing.two, twice).
  const narrow = (Math.min(useWindowDimensions().width, MaxContentWidth) - 4 * Spacing.two) / 3 < NARROW_BOX;
  const on = !!flash;
  const restart = on ? value : '';
  const fade = useSolvedFade(on, restart, reduceMotion);
  const [pop] = useState(() => new Animated.Value(0)); // 0 -> 1 over one pop
  useEffect(() => {
    if (!on || reduceMotion) return;
    pop.setValue(0);
    const run = Animated.timing(pop, {
      toValue: 1,
      duration: POP_MS,
      useNativeDriver: Platform.OS !== 'web', // react-native-web has no native driver
    });
    run.start();
    return () => run.stop();
  }, [on, restart, reduceMotion, pop]);

  return (
    <Animated.View
      accessible
      accessibilityLabel={`${title} ${value}`}
      style={[
        scoreBoxStyles.box,
        {
          backgroundColor: fade.interpolate({
            inputRange: [0, 1],
            outputRange: [theme.backgroundElement, theme.solvedTint],
          }),
        },
      ]}>
      <ThemedText type="small" themeColor="textSecondary" style={narrow && styles.narrowTitle}>
        {title}
      </ThemedText>
      {/* The pop is a scale (native driver) on its own view: the box's colour fade is JS driven and cannot share a node. */}
      <Animated.View
        style={{
          transform: [{ scale: pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, POP_SCALE, 1] }) }],
        }}>
        <ThemedText type="smallBold" style={scoreBoxStyles.value}>
          {value}
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  narrowTitle: { fontSize: 12 }, // same line height: the box doesn't change
});
