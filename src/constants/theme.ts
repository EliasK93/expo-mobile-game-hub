/**
 * The "Pencil & Paper" palette, light and dark: graphite on notebook paper, blue ink, pencil-yellow selection.
 * Every colour in the app comes from here. The Sudoku cell tokens and the 2048 ramp are part of it, so one place sets the whole look.
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
    onAccent: '#FFFFFF', // text on an accent background (the primary button)
    cellSelected: '#FBE7A1',
    cellRelated: '#F4F2EA',
    cellSameValue: '#E6E3D8', // a step darker than cellRelated, still lighter than the grid lines
    gridLine: '#DAD8CF',
    gridLineBold: '#2A2B2E',
    cellConflict: '#F8DCDA',
    digitConflict: '#C62828',
    cellHint: '#BFD0F5', // accent-blue tint: yellow is the selection, so the hint cannot be yellow too
    rampBoard: '#BBADA0', // 2048: the board frame, the empty cell, the tiles by value (ramp2 … ramp2048, rampSuper above 2048) and the numbers
    rampEmpty: '#CDC1B4',
    ramp2: '#EEE4DA',
    ramp4: '#EDE0C8',
    ramp8: '#F2B179',
    ramp16: '#F59563',
    ramp32: '#F67C5F',
    ramp64: '#F65E3B',
    ramp128: '#EDCF72',
    ramp256: '#EDCC61',
    ramp512: '#EDC850',
    ramp1024: '#EDC53F',
    ramp2048: '#EDC22E',
    rampSuper: '#3C3A32',
    rampTextDark: '#776E65', // number on 2 and 4
    rampTextLight: '#F9F6F2', // number on every other tile
  },
  dark: {
    text: '#ECECEA',
    background: '#18191B',
    backgroundElement: '#232427',
    backgroundSelected: '#323438',
    textSecondary: '#A5A7AB',
    accent: '#8FB0FF',
    onAccent: '#0E1530',
    cellSelected: '#4A4120',
    cellRelated: '#1F2022',
    cellSameValue: '#2C2E31',
    gridLine: '#323438',
    gridLineBold: '#B9BBBF',
    cellConflict: '#3A1F1F',
    digitConflict: '#FF8A80',
    cellHint: '#34507F',
    rampBoard: '#4A443D',
    rampEmpty: '#5A534B',
    ramp2: '#6B6157',
    ramp4: '#736650',
    ramp8: '#B97C4C',
    ramp16: '#BC6B45',
    ramp32: '#BD5B45',
    ramp64: '#BB4A2F',
    ramp128: '#B79D55',
    ramp256: '#B69A4A',
    ramp512: '#B5963E',
    ramp1024: '#B49332',
    ramp2048: '#B39126',
    rampSuper: '#23221E',
    rampTextDark: '#ECE6DD',
    rampTextLight: '#F9F6F2',
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
