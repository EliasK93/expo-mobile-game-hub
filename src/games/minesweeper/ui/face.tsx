import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// normal while playing, surprised while a cell is held down, cool after a win, dizzy after a loss.
export type Mood = 'normal' | 'surprised' | 'cool' | 'dizzy';

// The face, drawn from Views like the mine and the flag: a yellow circle with an outline. Fills a square of `size`.
export function Face({ mood, size }: { mood: Mood; size: number }) {
  const theme = useTheme();
  const ink = theme.mineFaceInk;
  const stroke = Math.max(1, size * 0.07);
  const eyeY = size * 0.34; // the middle of the eyes, from the top
  const eyeXs = [size * 0.32, size * 0.68];
  const dot = size * 0.14;
  const arm = size * 0.22; // length of each bar of an x eye
  const bar = { position: 'absolute', backgroundColor: ink, borderRadius: stroke / 2 } as const;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.mineFace,
        borderWidth: stroke,
        borderColor: ink,
      }}>
      {(mood === 'normal' || mood === 'surprised') &&
        eyeXs.map((x) => {
          const d = mood === 'surprised' ? dot * 1.5 : dot; // wide eyes
          return (
            <View
              key={x}
              style={[
                bar,
                { left: x - d / 2 - stroke, top: eyeY - d / 2 - stroke, width: d, height: d, borderRadius: d / 2 },
              ]}
            />
          );
        })}
      {mood === 'cool' && (
        // sunglasses: one dark bar across both eyes
        <View
          style={[
            bar,
            { left: size * 0.14 - stroke, top: eyeY - size * 0.08 - stroke, width: size * 0.72, height: size * 0.16 },
          ]}
        />
      )}
      {mood === 'dizzy' &&
        eyeXs.flatMap((x) =>
          [45, -45].map((deg) => (
            <View
              key={`${x}:${deg}`}
              style={[
                bar,
                {
                  left: x - arm / 2 - stroke,
                  top: eyeY - stroke / 2 - stroke,
                  width: arm,
                  height: stroke,
                  transform: [{ rotate: `${deg}deg` }],
                },
              ]}
            />
          )),
        )}
      {mood === 'dizzy' || mood === 'surprised' ? (
        // a round open mouth
        <View
          style={{
            position: 'absolute',
            left: size * 0.4 - stroke,
            top: size * 0.58 - stroke,
            width: size * 0.2,
            height: size * 0.2,
            borderRadius: size * 0.1,
            borderWidth: stroke,
            borderColor: ink,
          }}
        />
      ) : (
        // a smile: the bottom edge of a box with round bottom corners
        <View
          style={{
            position: 'absolute',
            left: size * 0.25 - stroke,
            top: size * 0.5 - stroke,
            width: size * 0.5,
            height: size * 0.25,
            borderBottomWidth: stroke,
            borderBottomColor: ink,
            borderBottomLeftRadius: size * 0.25,
            borderBottomRightRadius: size * 0.25,
          }}
        />
      )}
    </View>
  );
}
