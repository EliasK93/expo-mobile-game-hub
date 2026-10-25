import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// `name` is the button's text, `label` its accessibility label (the name when left out), `detail` the line under it.
type Option<T> = { id: T; name: string; label?: string; detail?: string };
type Props<T> = { heading: string; options: Option<T>[]; last: T; onPick: (id: T) => void; onCancel?: () => void };

// The level or size picker: one button per option, the last used one marked (from the setting, not the running game).
// Cancel goes back to where the picker was opened; without onCancel there is nowhere to go back to, so no Cancel.
export function OptionPicker<T extends string | number>({ heading, options, last, onPick, onCancel }: Props<T>) {
  return (
    <ThemedView style={styles.panel}>
      <ThemedText type="subtitle" style={styles.heading}>
        {heading}
      </ThemedText>
      {options.map(({ id, name, label, detail }) => (
        <Button
          key={id}
          label={label ?? name}
          text={id === last ? `${name} (last used)` : name}
          detail={detail}
          selected={id === last}
          onPress={() => onPick(id)}
        />
      ))}
      {onCancel && <Button label="Cancel" onPress={onCancel} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two, alignItems: 'stretch' },
  heading: { textAlign: 'center' },
});
