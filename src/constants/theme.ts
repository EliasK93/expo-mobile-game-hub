/**
 * The "Pencil & Paper" palette, light and dark: graphite on notebook paper, blue ink, pencil-yellow selection.
 * Every colour in the app comes from here. The Sudoku cell tokens are part of it, so one place sets the whole look.
 * `cellSameValue` and `cellHint` have no counterpart in the palette mock-up; they are derived (see comments).
 */

export const Colors = {
  light: {
    text: '#202124',
    background: '#FBFAF6',
    backgroundElement: '#EFEDE5',
    backgroundSelected: '#DAD8CF',
    textSecondary: '#62656B',
    accent: '#2D5BD3',
    cellSelected: '#FBE7A1',
    cellRelated: '#F4F2EA',
    cellSameValue: '#E6E3D8', // a step darker than cellRelated, still lighter than the grid lines
    gridLine: '#DAD8CF',
    gridLineBold: '#2A2B2E',
    cellConflict: '#F8DCDA',
    digitConflict: '#C62828',
    cellHint: '#BFD0F5', // accent-blue tint: yellow is the selection, so the hint cannot be yellow too
  },
  dark: {
    text: '#ECECEA',
    background: '#18191B',
    backgroundElement: '#232427',
    backgroundSelected: '#323438',
    textSecondary: '#A5A7AB',
    accent: '#8FB0FF',
    cellSelected: '#4A4120',
    cellRelated: '#1F2022',
    cellSameValue: '#2C2E31',
    gridLine: '#323438',
    gridLineBold: '#B9BBBF',
    cellConflict: '#3A1F1F',
    digitConflict: '#FF8A80',
    cellHint: '#34507F',
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
