import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const SPIKE_ANGLES = [0, 45, 90, 135];

// The mine, drawn from Views (an emoji differs per platform and ignores the theme): a ball
// with four spikes through it and a highlight. Fills a square of `size`.
export function Mine({ size }: { size: number }) {
  const theme = useTheme();
  const ball = size * 0.5;
  const thick = Math.max(1, size * 0.1);
  const dot = Math.max(1, size * 0.12);
  return (
    <View style={{ width: size, height: size }}>
      {SPIKE_ANGLES.map((deg) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            left: size * 0.1,
            top: (size - thick) / 2,
            width: size * 0.8,
            height: thick,
            borderRadius: thick / 2,
            backgroundColor: theme.mineBomb,
            transform: [{ rotate: `${deg}deg` }],
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: (size - ball) / 2,
          top: (size - ball) / 2,
          width: ball,
          height: ball,
          borderRadius: ball / 2,
          backgroundColor: theme.mineBomb,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: (size - ball) / 2 + ball * 0.2,
          top: (size - ball) / 2 + ball * 0.2,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: theme.mineOpen,
        }}
      />
    </View>
  );
}
