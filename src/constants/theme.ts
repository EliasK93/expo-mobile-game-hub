/**
 * The "Pencil & Paper" palette, light and dark: graphite on notebook paper, blue ink, pencil-yellow selection.
 * Every colour in the app comes from here. The Sudoku cell tokens, the 2048 ramp, the Minesweeper and Snake tokens, Anagrams' solved green and the home tiles' glyph accents are part of it, so one place sets the whole look.
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
    solvedTint: '#D5E8D4', // Anagrams, a word solved: the Score box fades from this muted green (4.5:1 under textSecondary, 12.5:1 under text)
    solvedLine: '#3E8E4E', // and the new empty slots' outline (3.9:1 on the paper)
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
    mineCell: '#E6E0D2', // Minesweeper: the covered cell and its bevel edges, the opened cell and its grid line, the numbers 1-8, the LEDs, mine, flag, hit mine and face
    mineBevelLight: '#FFFFFF',
    mineBevelDark: '#A39C8E',
    mineOpen: '#F3EFE6',
    mineGrid: '#CFC8BA',
    mineNum1: '#1F4FD1',
    mineNum2: '#2E7D32',
    mineNum3: '#D32F2F',
    mineNum4: '#1A237E',
    mineNum5: '#8B1A1A',
    mineNum6: '#00796B',
    mineNum7: '#212121',
    mineNum8: '#757575',
    mineLed: '#1A1A1A',
    mineLedDigit: '#FF2A1A',
    mineBomb: '#1A1A1A',
    mineFlag: '#D32F2F',
    mineHit: '#E53935',
    mineFace: '#F2C230',
    mineFaceInk: '#1A1A1A', // the face's outline, eyes and mouth: dark in both modes, unlike `text`
    snakeBoard: '#EFEDE5', // Snake: the board, its grid lines, the body (soft graphite), the head and the apple; the snake colours are muted like 2048's ramp
    snakeGrid: '#DAD8CF',
    snakeBody: '#5F6368',
    snakeHead: '#5B7FC7',
    snakeApple: '#C9594F',
    glyphSudoku: '#3C5CCC', // The home tiles: each game's accent, for its glyph and (at 16%) its tile. Ratios are glyph vs tint over the paper: 4.5:1
    glyph2048: '#C0622A', // 3.3:1
    glyphMinesweeper: '#C0412A', // 4.0:1
    glyphMake24: '#9A7A0A', // 3.2:1
    glyphSnake: '#1F7A6E', // 4.0:1
    glyphAnagram: '#7B5CC4', // 3.9:1
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
    solvedTint: '#264030', // 4.7:1 under textSecondary, 9.6:1 under text
    solvedLine: '#6FBF7F', // 7.9:1 on the dark background
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
    mineCell: '#4A4640',
    mineBevelLight: '#6B665D',
    mineBevelDark: '#262320',
    mineOpen: '#33302C',
    mineGrid: '#24221F',
    mineNum1: '#7FA6FF',
    mineNum2: '#7CCB7F',
    mineNum3: '#FF7B72',
    mineNum4: '#A7B0FF',
    mineNum5: '#E08A8A',
    mineNum6: '#6FD3C7',
    mineNum7: '#E0E0E0',
    mineNum8: '#B0B0B0',
    mineLed: '#000000',
    mineLedDigit: '#FF4433',
    mineBomb: '#E6E1D8',
    mineFlag: '#FF6B5E',
    mineHit: '#B3261E',
    mineFace: '#E0B12A',
    mineFaceInk: '#1A1A1A',
    snakeBoard: '#232427',
    snakeGrid: '#323438',
    snakeBody: '#B8B9B6',
    snakeHead: '#7F9AD6',
    snakeApple: '#D9786F',
    glyphSudoku: '#8EA8F2', // 20% tint over the dark background: 5.2:1
    glyph2048: '#D8874F', // 4.6:1
    glyphMinesweeper: '#D0624C', // 3.6:1
    glyphMake24: '#C6A744', // 5.2:1
    glyphSnake: '#5CBFB1', // 5.5:1
    glyphAnagram: '#B29CF0', // 5.2:1
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
