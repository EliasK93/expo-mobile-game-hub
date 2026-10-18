import type { ThemeColor } from '@/constants/theme';

// The one place that maps a tile value to its colours: the 2048 ramp (tile values are powers of two), with one colour
// for everything above 2048. The numbers are dark on 2 and 4 and light on the rest.
export function rampColors(value: number): { background: ThemeColor; text: ThemeColor } {
  return {
    background: value <= 2048 ? (`ramp${value}` as ThemeColor) : 'rampSuper',
    text: value <= 4 ? 'rampTextDark' : 'rampTextLight',
  };
}
