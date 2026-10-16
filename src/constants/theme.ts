/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    cellSelected: '#A9CBF8',
    cellRelated: '#E8EEF7',
    cellSameValue: '#C9DDF9',
    gridLine: '#C4C7CE',
    gridLineBold: '#1C1E21',
    digitEntered: '#1F6FDB',
    cellConflict: '#F8C9C9',
    digitConflict: '#C62828',
    cellHint: '#FFE9A8',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    cellSelected: '#2F5FA8',
    cellRelated: '#1A1D22',
    cellSameValue: '#27456F',
    gridLine: '#3A3D43',
    gridLineBold: '#B0B4BA',
    digitEntered: '#6FAEFF',
    cellConflict: '#6B2A2A',
    digitConflict: '#FF8A80',
    cellHint: '#6B5A1F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  one: 4,
  two: 8,
  three: 16,
  four: 24,
} as const;

export const MaxContentWidth = 800;
