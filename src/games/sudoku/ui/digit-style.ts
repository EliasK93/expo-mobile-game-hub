import type { TextStyle } from 'react-native';

// Text style for a digit in a cell. Line height = font size and no font padding, so the glyph sits in the middle of the
// cell on Android as on the web (extra line height plus Android's font padding pushed digits down).
export function digitStyle(fontSize: number, fontWeight: TextStyle['fontWeight']): TextStyle {
  return { fontSize, lineHeight: fontSize, fontWeight, includeFontPadding: false, textAlignVertical: 'center' };
}
