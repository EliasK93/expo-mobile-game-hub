import { Pressable, StyleSheet } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';

export const COMPACT_HEIGHT = 36;

type Props = {
  label: string; // accessibility label; also the text unless `text` is given
  text?: string;
  detail?: string; // a small second line under the text
  onPress: () => void;
  selected?: boolean; // the chosen option of a switch, picker or toggle: the accent look, like `primary`
  disabled?: boolean;
  flex?: boolean;
  primary?: boolean; // the accent button: use it for the one action a screen wants you to take
  compact?: boolean; // a slim button (36 instead of 48 high) for secondary actions
  muted?: boolean; // grey label (and detail) on the lighter grey background: for the inactive ones of a switch; `primary` and `selected` win
  background?: ThemeColor;
  textType?: ThemedTextProps['type'];
};

// The hub's one text button. A disabled one is dimmed.
// The label stretches to the full width of the button: a shrink-wrapped, centred Text gets its last word cut off on some Android fonts.
export function Button({ label, text = label, detail, onPress, selected, disabled, flex, primary, compact, muted, background = 'backgroundSelected', textType = 'smallBold' }: Props) {
  const accent = primary || selected;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[flex && styles.flex, disabled && styles.dimmed]}>
      <ThemedView type={accent ? 'accent' : muted ? 'backgroundElement' : background} style={[styles.button, compact && styles.compact]}>
        <ThemedText type={textType} themeColor={accent ? 'onAccent' : muted ? 'textSecondary' : undefined} style={styles.text}>{text}</ThemedText>
        {detail && (
          <ThemedText type="small" themeColor={accent ? 'onAccent' : 'textSecondary'} style={styles.text}>{detail}</ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: { minHeight: 48, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  // ponytail: 36 is below the 48 px touch target, by the user's request for a slim row; revisit if taps miss on the phone (Android check).
  compact: { minHeight: COMPACT_HEIGHT },
  text: { alignSelf: 'stretch', textAlign: 'center' },
  dimmed: { opacity: 0.4 },
});
