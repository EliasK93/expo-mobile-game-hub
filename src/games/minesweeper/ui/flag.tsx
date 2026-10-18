import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// The flag, drawn from Views: a red triangle on a pole with a base. Fills a square of `size`.
export function Flag({ size }: { size: number }) {
  const theme = useTheme();
  const pole = Math.max(1, size * 0.1);
  const poleX = size * 0.55;
  const cloth = size * 0.5; // height of the triangle
  return (
    <View style={{ width: size, height: size }}>
      {/* the cloth: a triangle made of a thick right border, pointing left from the pole */}
      <View
        style={{
          position: 'absolute',
          left: poleX - cloth,
          top: size * 0.08,
          width: 0,
          height: 0,
          borderTopWidth: cloth / 2,
          borderBottomWidth: cloth / 2,
          borderRightWidth: cloth,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderRightColor: theme.mineFlag,
        }}
      />
      <View style={{ position: 'absolute', left: poleX, top: size * 0.08, width: pole, height: size * 0.74, backgroundColor: theme.mineBomb }} />
      <View
        style={{
          position: 'absolute',
          left: size * 0.25,
          top: size * 0.82,
          width: size * 0.6,
          height: Math.max(1, size * 0.12),
          borderRadius: 1,
          backgroundColor: theme.mineBomb,
        }}
      />
    </View>
  );
}
