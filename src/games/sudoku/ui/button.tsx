import { Pressable, StyleSheet } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';

type Props = {
  label: string; // accessibility label; also the text unless `text` is given
  text?: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  flex?: boolean;
  background?: ThemeColor;
  textType?: ThemedTextProps['type'];
};

// The one text button of the Sudoku screens (screen buttons and number pad). A disabled one is dimmed.
// The label stretches to the full width of the button: a shrink-wrapped, centred Text gets its last word cut off on some Android fonts.
export function Button({ label, text = label, onPress, selected, disabled, flex, background = 'backgroundSelected', textType = 'smallBold' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[flex && styles.flex, disabled && styles.dimmed]}>
      <ThemedView type={background} style={styles.button}>
        <ThemedText type={textType} style={styles.text}>{text}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: { minHeight: 48, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  text: { alignSelf: 'stretch', textAlign: 'center' },
  dimmed: { opacity: 0.4 },
});
