import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { Colors } from '@/constants/theme';
import { LEVELS, cellCount, type Level } from '@/games/minesweeper/logic/board';
import { placeMines } from '@/games/minesweeper/logic/generate';
import { buttonLook } from '@/test-utils/button-look';

// placeMines is replaced so each test starts from a mine layout built by hand; open and the rest stay real.
jest.mock('@/games/minesweeper/logic/generate', () => ({ ...jest.requireActual('@/games/minesweeper/logic/generate'), placeMines: jest.fn() }));
const realPlaceMines = jest.requireActual<typeof import('@/games/minesweeper/logic/generate')>('@/games/minesweeper/logic/generate').placeMines;

// The next first tap gets these cells as mines, whatever the level and the tapped cell.
const layout = (indices: number[]) =>
  (placeMines as jest.Mock).mockReset().mockImplementation((level: Level) => Array.from({ length: cellCount(level) }, (_, i) => indices.includes(i)));
const useRealPlaceMines = () => (placeMines as jest.Mock).mockReset().mockImplementation(realPlaceMines);

// Beginner is 8 columns: a wall of mines down column 4 (opening the left side floods columns 0-3), and exactly the
// mines of Beginner packed at the top (a tap on the last cell floods everything else open and wins).
const BEGINNER = LEVELS.beginner;
const CELLS = cellCount('beginner');
const COLS = BEGINNER.cols;
const MINES = BEGINNER.mines;
const LEFT = 4 * BEGINNER.rows; // the cells of columns 0-3
const WALL = Array.from({ length: BEGINNER.rows }, (_, r) => r * COLS + 4);
const TOP = Array.from({ length: MINES }, (_, i) => i);

// settle() lets the pending storage promises finish (GameRoute's playtime write).
const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};
const open = async () => {
  renderRouter('./src/app', { initialUrl: '/minesweeper' });
  await settle();
};

// A cell by its index in reading order, found by its label "Row r, column c, <state>" (rows and columns count from 1).
const cell = (i: number, cols = COLS) => screen.getByLabelText(new RegExp(`^Row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}, `));
const stateOf = (i: number, cols = COLS) => cell(i, cols).props.accessibilityLabel.split(', ').slice(2).join(', ');
const tap = (i: number, cols = COLS) => fireEvent.press(cell(i, cols));
const hold = (i: number, cols = COLS) => fireEvent(cell(i, cols), 'longPress');
const count = (state: RegExp) => screen.queryAllByLabelText(state).length;
const covered = () => count(/^Row \d+, column \d+, covered$/);
const selected = (label: string) => screen.getByLabelText(label).props.accessibilityState.selected;

beforeEach(async () => {
  useRealPlaceMines();
  await open();
});

// The testing library has unmounted the screen by now; let the last writes land before the next test clears storage.
afterEach(async () => {
  await settle();
  jest.restoreAllMocks();
});

describe('Minesweeper screen', () => {
  it('opens from home on an unmined Beginner board, with the LEDs and the normal face', () => {
    expect(covered()).toBe(CELLS);
    expect(count(/^Row \d+, column \d+, /)).toBe(CELLS);
    expect(screen.getByLabelText(`Mines left ${MINES}`)).toBeTruthy();
    expect(screen.getByLabelText('Time 0 seconds')).toBeTruthy();
    expect(screen.getByTestId('face-normal')).toBeTruthy();
    expect(screen.getByLabelText('New game')).toBeTruthy();
  });

  it('starts in Dig mode', () => {
    expect(selected('Dig')).toBe(true);
    expect(selected('Flag')).toBeFalsy();
  });

  it('the active mode button is the accent one and the inactive one has grey text, after switching both ways', () => {
    const look = (label: string) => ({ selected: selected(label), ...buttonLook(label) });
    const active = { selected: true, background: Colors.light.accent, text: Colors.light.onAccent };
    const inactive = { selected: false, background: Colors.light.backgroundElement, text: Colors.light.textSecondary };

    expect([look('Dig'), look('Flag')]).toEqual([active, inactive]);
    fireEvent.press(screen.getByLabelText('Flag'));
    expect([look('Dig'), look('Flag')]).toEqual([inactive, active]);
    fireEvent.press(screen.getByLabelText('Dig'));
    expect([look('Dig'), look('Flag')]).toEqual([active, inactive]);
  });

  it('a tap opens: the first tap floods an area, a number opens alone', () => {
    layout(WALL);

    tap(0);
    expect(stateOf(0)).toBe('empty');
    expect(stateOf(3)).toBe('2');
    expect(covered()).toBe(CELLS - LEFT); // columns 0-3
    expect(stateOf(4)).toBe('covered');

    tap(5); // next to the mines of the wall
    expect(stateOf(5)).toBe('2');
    expect(covered()).toBe(CELLS - LEFT - 1);
    expect(stateOf(6)).toBe('covered');
  });

  it('a tap on an opened cell does nothing', () => {
    layout(WALL);
    tap(0);

    tap(3);

    expect(stateOf(3)).toBe('2');
    expect(covered()).toBe(CELLS - LEFT);
    expect(screen.getByTestId('face-normal')).toBeTruthy();
  });

  it('a long press flags and unflags, and "Mines left" follows', () => {
    hold(44);
    expect(stateOf(44)).toBe('flagged');
    expect(screen.getByLabelText(`Mines left ${MINES - 1}`)).toBeTruthy();

    hold(44);
    expect(stateOf(44)).toBe('covered');
    expect(screen.getByLabelText(`Mines left ${MINES}`)).toBeTruthy();
  });

  it('a flagged cell does not open on a tap', () => {
    layout(WALL);
    hold(44); // a mine

    tap(44);

    expect(stateOf(44)).toBe('flagged');
    expect(screen.getByTestId('face-normal')).toBeTruthy();
    expect(screen.getByLabelText(`Mines left ${MINES - 1}`)).toBeTruthy();
  });

  it('one flag too many makes the mine counter negative', () => {
    for (let i = 0; i <= MINES; i++) hold(i);

    expect(screen.getByLabelText('Mines left -1')).toBeTruthy();
  });
});

describe('Flag mode', () => {
  beforeEach(() => {
    fireEvent.press(screen.getByLabelText('Flag'));
  });

  it('marks Flag as selected, and Dig brings the old behaviour back', () => {
    expect(selected('Flag')).toBe(true);
    expect(selected('Dig')).toBeFalsy();

    fireEvent.press(screen.getByLabelText('Dig'));
    tap(44);

    expect(selected('Dig')).toBe(true);
    expect(stateOf(44)).not.toBe('flagged');
  });

  it('a tap flags and takes the flag off again; a long press opens', () => {
    layout(WALL);

    tap(44);
    expect(stateOf(44)).toBe('flagged');
    expect(screen.getByLabelText(`Mines left ${MINES - 1}`)).toBeTruthy();
    tap(44);
    expect(stateOf(44)).toBe('covered');

    hold(0);
    expect(stateOf(0)).toBe('empty');
    expect(covered()).toBe(CELLS - LEFT);
  });

  it('a first tap flags and leaves the board unmined: the first opening still asks for the mines', () => {
    layout(WALL);
    tap(44);
    expect(placeMines).not.toHaveBeenCalled();

    hold(0);

    expect(placeMines).toHaveBeenCalledTimes(1);
    expect(stateOf(0)).toBe('empty');
    expect(stateOf(44)).toBe('flagged');
  });
});

describe('loss', () => {
  // The wall, a flood of the left side, a right flag on a wall mine (20), a wrong flag on a safe cell (7), then the mine 12.
  beforeEach(() => {
    layout(WALL);
    tap(0);
    hold(20);
    hold(7);
    tap(12);
  });

  it('shows the dizzy face, every mine, the exploded mine and the wrong flag', () => {
    expect(screen.getByTestId('face-dizzy')).toBeTruthy();
    expect(stateOf(12)).toBe('exploded mine');
    expect(stateOf(4)).toBe('mine');
    expect(stateOf(76)).toBe('mine');
    expect(stateOf(20)).toBe('flagged'); // a right flag stays
    expect(stateOf(7)).toBe('wrong flag');
    expect(count(/, mine$/)).toBe(WALL.length - 2); // all but the exploded and the flagged one
  });

  it('taps and long presses do nothing afterwards', () => {
    tap(61);
    hold(61);
    hold(7);
    tap(20);

    expect(stateOf(61)).toBe('covered');
    expect(stateOf(7)).toBe('wrong flag');
    expect(stateOf(20)).toBe('flagged');
    expect(screen.getByTestId('face-dizzy')).toBeTruthy();
  });
});

describe('win', () => {
  it('opening the last safe cell shows the cool face, every mine flagged and no mines left', () => {
    layout(TOP);

    tap(80);

    expect(screen.getByTestId('face-cool')).toBeTruthy();
    for (const i of TOP) expect(stateOf(i)).toBe('flagged');
    expect(covered()).toBe(0);
    expect(screen.getByLabelText('Mines left 0')).toBeTruthy();
  });

  it('taps do nothing afterwards', () => {
    layout(TOP);
    tap(80);

    hold(80);
    tap(0);

    expect(stateOf(0)).toBe('flagged');
    expect(stateOf(80)).toBe('empty');
    expect(screen.getByTestId('face-cool')).toBeTruthy();
  });
});

describe('timer', () => {
  const tick = (ms: number) => act(() => jest.advanceTimersByTime(ms));

  beforeEach(async () => {
    screen.unmount();
    await settle();
    jest.useFakeTimers();
    await open(); // the clock reads the screen's focus when it mounts
  });

  afterEach(() => jest.useRealTimers());

  it('stays at 0 before the first opening and after a first tap in Flag mode', () => {
    tick(3000);
    expect(screen.getByLabelText('Time 0 seconds')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Flag'));
    tap(44);
    tick(3000);

    expect(screen.getByLabelText('Time 0 seconds')).toBeTruthy();
  });

  it('counts from the first opening and stops when the game ends', () => {
    layout(WALL);
    tap(0);

    tick(3000);
    expect(screen.getByLabelText('Time 3 seconds')).toBeTruthy();

    tap(12); // a mine
    tick(5000);

    expect(screen.getByTestId('face-dizzy')).toBeTruthy();
    expect(screen.getByLabelText('Time 3 seconds')).toBeTruthy();
  });

  it('stops on a win, too', () => {
    layout(TOP);
    tick(2000); // nothing runs yet
    tap(80);

    tick(5000);

    expect(screen.getByTestId('face-cool')).toBeTruthy();
    expect(screen.getByLabelText('Time 0 seconds')).toBeTruthy();
  });

  it('stops while the picker is open', () => {
    layout(WALL);
    tap(0);
    tick(2000);

    fireEvent.press(screen.getByLabelText('New game'));
    tick(5000);
    fireEvent.press(screen.getByLabelText('Cancel'));

    expect(screen.getByLabelText('Time 2 seconds')).toBeTruthy();
  });
});

describe('level picker', () => {
  it('the face opens it with the current level marked, in place of the board', () => {
    fireEvent.press(screen.getByLabelText('New game'));

    expect(screen.getByText('Pick a level')).toBeTruthy();
    expect(screen.queryByLabelText(/^Row \d+, column/)).toBeNull();
    expect(selected('Beginner')).toBe(true);
    expect(selected('Intermediate')).toBeFalsy();
    expect(selected('Expert')).toBeFalsy();
    expect(screen.getByText('8 × 12 · 12 mines')).toBeTruthy();
    expect(screen.getByText('10 × 15 · 24 mines')).toBeTruthy();
    expect(screen.getByText('12 × 18 · 45 mines')).toBeTruthy();
  });

  it('Cancel returns to the same board', () => {
    layout(WALL);
    tap(0);
    hold(44);

    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Cancel'));

    expect(stateOf(0)).toBe('empty');
    expect(stateOf(44)).toBe('flagged');
    expect(covered()).toBe(CELLS - LEFT - 1);
    expect(screen.getByLabelText(`Mines left ${MINES - 1}`)).toBeTruthy();
  });

  it('Expert gives a 12 × 18 board with 45 mines that can be played', () => {
    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Expert'));

    expect(covered()).toBe(cellCount('expert'));
    expect(cellCount('expert')).toBe(216);
    expect(screen.getByLabelText('Mines left 45')).toBeTruthy();
    expect(screen.getByLabelText('Row 18, column 12, covered')).toBeTruthy();

    hold(0, 12); // flagged first: a flood leaves a flag alone, wherever the real mine placement puts the mines
    tap(113, 12); // row 10, column 6; the real placement keeps this cell and its neighbours free
    expect(stateOf(113, 12)).not.toBe('covered');
    expect(stateOf(0, 12)).toBe('flagged');
    expect(screen.getByTestId('face-normal')).toBeTruthy();
    expect(screen.getByLabelText('Mines left 44')).toBeTruthy();
  });

  it('a new level starts in Dig mode, a new game of the same level too', () => {
    fireEvent.press(screen.getByLabelText('Flag'));
    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Intermediate'));

    expect(selected('Dig')).toBe(true);
    expect(covered()).toBe(LEVELS.intermediate.cols * LEVELS.intermediate.rows);
    expect(screen.getByLabelText('Mines left 24')).toBeTruthy();

    // The picker marks the level just picked.
    fireEvent.press(screen.getByLabelText('New game'));
    expect(selected('Intermediate')).toBe(true);
  });

  it('a lost game is replaced by an unmined board and a normal face', () => {
    layout(WALL);
    tap(0);
    tap(12);
    expect(screen.getByTestId('face-dizzy')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Beginner'));

    expect(screen.getByTestId('face-normal')).toBeTruthy();
    expect(covered()).toBe(CELLS);
    expect(screen.getByLabelText('Time 0 seconds')).toBeTruthy();
  });
});
