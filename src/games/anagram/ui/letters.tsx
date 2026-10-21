import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { glyphStyle } from '@/components/glyph-style';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { isWrong, type Game } from '../logic/game';
import { useSolvedFade } from './use-solved-fade';

const GAP = Spacing.two;
export const SHAKE_MS = 300; // a wrong row shakes once; the same length as the solved flash
const SHAKE_PX = 8;
const MIN_TILE = 24; // a very narrow screen gets small tiles and an overflowing row, never a zero or negative tile
const MAX_TILE = 64;

// The side of a tile: n tiles and the gaps between them fit the content width (n = the word length).
export function tileSize(width: number, n: number) {
  const fit = Math.floor((Math.min(width, MaxContentWidth) - 2 * Spacing.two - (n - 1) * GAP) / n);
  return Math.max(MIN_TILE, Math.min(MAX_TILE, fit));
}

// normal = a letter; wrong = a full row that is no word; revealed = the solution of a skipped word; solved = the home tile's
// answer row.
export type FaceState = 'normal' | 'wrong' | 'revealed' | 'solved';
const TEXT: Record<FaceState, ThemeColor> = {
  normal: 'text',
  wrong: 'digitConflict',
  revealed: 'textSecondary',
  solved: 'accent',
};

// What a letter tile looks like, in one place (the game and the home tile both draw with it): Make 24's card look, a paper
// card with a thicker bottom edge. A wrong row is drawn in the conflict colours.
export function LetterFace({
  letter,
  size,
  state = 'normal',
  testID,
}: {
  letter: string;
  size: number;
  state?: FaceState;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: state === 'wrong' ? theme.cellConflict : theme.backgroundElement,
          borderColor: theme.gridLine,
          borderBottomColor: theme.backgroundSelected,
          borderBottomWidth: Math.max(3, Math.round(size * 0.04)),
          borderRadius: Math.round(size * 0.08),
        },
      ]}>
      <ThemedText themeColor={TEXT[state]} style={[styles.text, glyphStyle(Math.floor(size * 0.5), 700)]}>
        {letter.toUpperCase()}
      </ThemedText>
    </View>
  );
}

// The answer row: one place per letter. A placed letter is a button that sends it back; an empty place is an outlined
// box (green, fading out, while `flash` is on); a skipped word's solution shows in grey and cannot be tapped. A row that
// turns wrong shakes once, not with reduced motion (the red alone shows it).
type AnswerProps = {
  game: Game;
  size: number;
  live: boolean;
  flash: boolean;
  reduceMotion: boolean;
  onUnplace: (slot: number) => void;
};

export function AnswerRow({ game, size, live, flash, reduceMotion, onUnplace }: AnswerProps) {
  const theme = useTheme();
  const fade = useSolvedFade(flash, game.solved, reduceMotion);
  const outline = fade.interpolate({ inputRange: [0, 1], outputRange: [theme.gridLine, theme.solvedLine] });
  const wrong = isWrong(game);
  const [shake] = useState(() => new Animated.Value(0)); // 0 -> 1 over one shake
  const wasWrong = useRef(wrong); // starts as the row is: the row mounts again after a pause, which is no new wrong
  useEffect(() => {
    const turnedWrong = wrong && !wasWrong.current;
    wasWrong.current = wrong;
    if (!turnedWrong || reduceMotion) return;
    shake.setValue(0);
    const run = Animated.timing(shake, {
      toValue: 1,
      duration: SHAKE_MS,
      useNativeDriver: Platform.OS !== 'web', // react-native-web has no native driver
    });
    run.start();
    return () => run.stop();
  }, [wrong, reduceMotion, shake]);

  return (
    <Animated.View
      testID="answer-row"
      style={[
        styles.row,
        {
          transform: [
            {
              translateX: shake.interpolate({
                inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                outputRange: [0, -SHAKE_PX, SHAKE_PX, -SHAKE_PX, SHAKE_PX, 0],
              }),
            },
          ],
        },
      ]}>
      {game.answer.map((k, slot) => {
        const n = slot + 1;
        if (game.revealed !== null) {
          return (
            <View
              key={slot}
              accessible
              accessibilityLabel={`Solution letter ${game.revealed[slot].toUpperCase()}, slot ${n}`}>
              <LetterFace letter={game.revealed[slot]} size={size} state="revealed" />
            </View>
          );
        }
        if (k === null) {
          return (
            <Animated.View
              key={slot}
              accessible
              accessibilityLabel={`Empty slot ${n}`}
              style={[
                styles.empty,
                {
                  width: size,
                  height: size,
                  borderColor: outline,
                  borderRadius: Math.round(size * 0.08),
                },
              ]}
            />
          );
        }
        const letter = game.rack[k];
        return (
          <Pressable
            key={slot}
            accessibilityRole="button"
            accessibilityLabel={`Answer letter ${letter.toUpperCase()}, slot ${n}`}
            disabled={!live}
            onPress={() => onUnplace(slot)}>
            <LetterFace letter={letter} size={size} state={wrong ? 'wrong' : 'normal'} testID={`answer-face-${slot}`} />
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

// The rack: a tile that is placed leaves an empty spot of its size, so the others keep their places.
export function Rack({
  game,
  size,
  live,
  onPlace,
}: {
  game: Game;
  size: number;
  live: boolean;
  onPlace: (i: number) => void;
}) {
  return (
    <View testID="rack" style={styles.row}>
      {game.rack.map((letter, i) =>
        game.answer.includes(i) ? (
          <View key={i} style={{ width: size, height: size }} />
        ) : (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Letter ${letter.toUpperCase()}`}
            accessibilityState={{ disabled: !live }}
            disabled={!live}
            onPress={() => onPlace(i)}>
            <LetterFace letter={letter} size={size} testID={`rack-face-${i}`} />
          </Pressable>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP },
  tile: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: 2 },
  // Full width and centred, like the shared Button: Android cuts off shrink-wrapped bold text.
  text: { alignSelf: 'stretch', textAlign: 'center' },
});
