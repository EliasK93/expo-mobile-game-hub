import { Pressable, StyleSheet } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';

type Props = {
  label: string; // accessibility label; also the text unless `text` is given
  text?: string;
  detail?: string; // a small second line under the text
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  flex?: boolean;
  primary?: boolean; // the accent button: use it for the one action a screen wants you to take
  background?: ThemeColor;
  textType?: ThemedTextProps['type'];
};

// The hub's one text button. A disabled one is dimmed.
// The label stretches to the full width of the button: a shrink-wrapped, centred Text gets its last word cut off on some Android fonts.
export function Button({ label, text = label, detail, onPress, selected, disabled, flex, primary, background = 'backgroundSelected', textType = 'smallBold' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[flex && styles.flex, disabled && styles.dimmed]}>
      <ThemedView type={primary ? 'accent' : background} style={styles.button}>
        <ThemedText type={textType} themeColor={primary ? 'onAccent' : undefined} style={styles.text}>{text}</ThemedText>
        {detail && (
          <ThemedText type="small" themeColor={primary ? 'onAccent' : 'textSecondary'} style={styles.text}>{detail}</ThemedText>
        )}
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
