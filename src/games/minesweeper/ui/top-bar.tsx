import { Pressable, StyleSheet, View } from 'react-native';

import { glyphStyle } from '@/components/glyph-style';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Face, type Mood } from './face';
import { clampLed, led } from './format';

export const TOP_BAR_HEIGHT = 48; // the face button's size, the usual minimum touch target
const FACE_SIZE = 40;
const LED_WIDTH = 72;

// One red LED box; the label is what a screen reader says.
function Led({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View accessible accessibilityLabel={label} style={[styles.led, { backgroundColor: theme.mineLed }]}>
      <ThemedText themeColor="mineLedDigit" style={[styles.digits, glyphStyle(28, 700), { fontVariant: ['tabular-nums'] }]}>
        {led(value)}
      </ThemedText>
    </View>
  );
}

// Mines left | face | seconds, as in the original. The face is the New game button.
type Props = { minesLeft: number; seconds: number; mood: Mood; onFace: () => void };

export function TopBar({ minesLeft, seconds, mood, onFace }: Props) {
  return (
    <View style={styles.bar}>
      <Led value={clampLed(minesLeft)} label={`Mines left ${clampLed(minesLeft)}`} />
      <Pressable accessibilityRole="button" accessibilityLabel="New game" testID={`face-${mood}`} onPress={onFace} style={styles.face}>
        <Face mood={mood} size={FACE_SIZE} />
      </Pressable>
      <Led value={seconds} label={`Time ${seconds} seconds`} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { width: '100%', maxWidth: MaxContentWidth, height: TOP_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  led: { width: LED_WIDTH, height: TOP_BAR_HEIGHT, borderRadius: Spacing.one, alignItems: 'center', justifyContent: 'center' },
  // Full width and centred, like the shared Button: Android cuts off shrink-wrapped bold text.
  digits: { alignSelf: 'stretch', textAlign: 'center' },
  face: { width: TOP_BAR_HEIGHT, height: TOP_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
