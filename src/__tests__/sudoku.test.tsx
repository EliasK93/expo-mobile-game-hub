import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AppState } from 'react-native';

import { parseGrid } from '@/games/sudoku/logic/board';
import { generate } from '@/games/sudoku/logic/generate';

// The real generator is replaced by a fixed puzzle with two empty cells: row 1 column 1 (answer 5) and row 9 column 9 (answer 9).
jest.mock('@/games/sudoku/logic/generate', () => ({ generate: jest.fn() }));

const SOLUTION = parseGrid('534678912672195348198342567859761423426853791713924856961537284287419635345286179');
const PUZZLE = parseGrid('.3467891267219534819834256785976142342685379171392485696153728428741963534528617.');

const FIRST_EMPTY = 'Row 1, column 1, empty';
const LAST_EMPTY = 'Row 9, column 9, empty';

const enter = (digit: number) => fireEvent.press(screen.getByLabelText(`Enter ${digit}`));

// Fake timers so the clock is exact. Storage is the AsyncStorage mock (jest.setup.js), cleared before each test.
// settle() lets the pending storage promises finish; they need no timers.
const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};
const open = async () => {
  renderRouter('./src/app', { initialUrl: '/sudoku' });
  await settle();
};
const tick = (ms: number) => act(() => jest.advanceTimersByTime(ms));
const saved = async (key: string) => JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');

beforeEach(async () => {
  jest.useFakeTimers();
  (generate as jest.Mock).mockReset().mockReturnValue({ puzzle: PUZZLE, solution: SOLUTION });
  await open();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Sudoku screen', () => {
  it('shows 81 cells', () => {
    expect(screen.getAllByLabelText(/^Row \d, column \d, /)).toHaveLength(81);
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('does not change a given cell', () => {
    fireEvent.press(screen.getByLabelText('Row 1, column 2, 3, given'));
    enter(9);

    expect(screen.getByLabelText('Row 1, column 2, 3, given')).toBeTruthy();
  });

  it('shows a digit entered in an empty cell, and erase clears it', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Erase'));
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('does not win with a wrong digit', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText(LAST_EMPTY));
    enter(8);

    expect(screen.queryByText(/^Solved!/)).toBeNull();
  });

  it('shows Solved! when the last cell is filled correctly, and locks the grid', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText(LAST_EMPTY));
    enter(9);

    expect(screen.getByText(/^Solved!/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Row 1, column 1, 5'));
    enter(1);
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
  });

  it('New game generates another puzzle and resets the board', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    expect(generate).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('New game'));

    expect(generate).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });
});

describe('Notes', () => {
  it('adds and removes a pencil mark while Notes is on', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    fireEvent.press(screen.getByLabelText('Notes'));
    expect(screen.getByLabelText('Notes').props.accessibilityState.selected).toBe(true);

    enter(5);
    expect(screen.getByLabelText('Row 1, column 1, notes 5')).toBeTruthy();

    enter(5);
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('ignores notes on a given cell and on a filled cell', () => {
    fireEvent.press(screen.getByLabelText('Notes'));
    fireEvent.press(screen.getByLabelText('Row 1, column 2, 3, given'));
    enter(5);
    expect(screen.getByLabelText('Row 1, column 2, 3, given')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Notes')); // off
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText('Notes')); // on
    enter(7);
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
  });

  it('placing a digit removes that note from the peers, and Undo brings it back', async () => {
    // Three empty cells: row 1 columns 1 and 2 are peers, row 9 column 9 is not.
    screen.unmount();
    (generate as jest.Mock).mockReturnValue({ puzzle: PUZZLE.map((v, i) => (i === 1 ? 0 : v)), solution: SOLUTION });
    await open();

    fireEvent.press(screen.getByLabelText('Notes'));
    fireEvent.press(screen.getByLabelText('Row 1, column 2, empty'));
    enter(5);
    enter(7);
    expect(screen.getByLabelText('Row 1, column 2, notes 5 7')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Notes')); // off
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    expect(screen.getByLabelText('Row 1, column 2, notes 7')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Undo'));
    expect(screen.getByLabelText('Row 1, column 2, notes 5 7')).toBeTruthy();
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });
});

describe('Conflicts', () => {
  it('marks a clashing digit and the given it clashes with, not a clean digit', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(3);
    expect(screen.getByLabelText('Row 1, column 1, 3, conflict')).toBeTruthy();
    expect(screen.getByLabelText('Row 1, column 2, 3, given, conflict')).toBeTruthy();

    enter(5);
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
    expect(screen.getByLabelText('Row 1, column 2, 3, given')).toBeTruthy();
  });
});

describe('Undo and Redo', () => {
  const state = (label: string) => screen.getByLabelText(label).props.accessibilityState;

  it('are disabled on a fresh game', () => {
    expect(state('Undo').disabled).toBe(true);
    expect(state('Redo').disabled).toBe(true);
  });

  it('undo removes the last digit and redo puts it back', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    expect(state('Undo').disabled).toBe(false);

    fireEvent.press(screen.getByLabelText('Undo'));
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
    expect(state('Redo').disabled).toBe(false);

    fireEvent.press(screen.getByLabelText('Redo'));
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
  });

  it('undo steps back through notes and erasing', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    fireEvent.press(screen.getByLabelText('Notes'));
    enter(4);
    fireEvent.press(screen.getByLabelText('Notes'));
    enter(5);
    fireEvent.press(screen.getByLabelText('Erase'));
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Undo')); // the erase
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Undo')); // the digit
    expect(screen.getByLabelText('Row 1, column 1, notes 4')).toBeTruthy();
  });

  it('are disabled after a win, and pressing Undo changes nothing', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText(LAST_EMPTY));
    enter(9);
    expect(screen.getByText(/^Solved!/)).toBeTruthy();

    expect(state('Undo').disabled).toBe(true);
    expect(state('Redo').disabled).toBe(true);
    fireEvent.press(screen.getByLabelText('Undo'));
    expect(screen.getByLabelText('Row 9, column 9, 9')).toBeTruthy();
  });

  it('New game clears the history', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    expect(state('Undo').disabled).toBe(false);

    fireEvent.press(screen.getByText('New game'));
    expect(state('Undo').disabled).toBe(true);
    expect(state('Redo').disabled).toBe(true);
  });
});

describe('Save and resume', () => {
  const CONTINUE = 'Continue saved game';
  const NEW_GAME = 'Start new game';

  it('saves nothing before the first move, and shows no prompt on the next visit', async () => {
    expect(await saved('sudoku:save')).toBeNull();

    screen.unmount();
    await open();
    expect(screen.queryByLabelText(CONTINUE)).toBeNull();
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('saves after a move', async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    await settle();

    const save = await saved('sudoku:save');
    expect(save.version).toBe(1);
    expect(save.data.values[0]).toBe(5);
  });

  it('asks to continue, and Continue brings back the digit, the notes and the time', async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText('Notes'));
    fireEvent.press(screen.getByLabelText(LAST_EMPTY));
    enter(7);
    await tick(3000);

    screen.unmount();
    await settle();
    await open();

    expect(screen.getByLabelText(CONTINUE)).toBeTruthy();
    expect(screen.queryByLabelText(/^Row 1, column 1/)).toBeNull();

    fireEvent.press(screen.getByLabelText(CONTINUE));
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
    expect(screen.getByLabelText('Row 9, column 9, notes 7')).toBeTruthy();
    expect(screen.getByText('0:03')).toBeTruthy();
    expect(screen.queryByLabelText(CONTINUE)).toBeNull();
  });

  it('the prompt\'s New game gives a fresh board and deletes the save', async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    screen.unmount();
    await settle();
    await open();

    fireEvent.press(screen.getByLabelText(NEW_GAME));
    await settle();

    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
    expect(screen.getByText('0:00')).toBeTruthy();
    expect(await saved('sudoku:save')).toBeNull();
  });

  it('an unusable save is ignored: no prompt, fresh board', async () => {
    screen.unmount();
    await AsyncStorage.setItem('sudoku:save', JSON.stringify({ version: 1, data: { values: [1, 2, 3] } }));
    await open();

    expect(screen.queryByLabelText(CONTINUE)).toBeNull();
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('undoing back to the empty board does not leave a stale save behind', async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    await settle();
    fireEvent.press(screen.getByLabelText('Undo'));
    await settle();

    screen.unmount();
    await settle();
    await open();
    expect(screen.queryByLabelText(CONTINUE)).toBeNull();
  });
});

describe('Timer', () => {
  it('shows 0:00 and counts seconds', async () => {
    expect(screen.getByText('0:00')).toBeTruthy();
    await tick(1000);
    expect(screen.getByText('0:01')).toBeTruthy();
    await tick(64_000);
    expect(screen.getByText('1:05')).toBeTruthy();
  });

  it('pauses while another screen is on top, and goes on when it is back', async () => {
    await tick(2000);
    await act(async () => router.push('/'));
    await tick(10_000);
    await act(async () => router.back());
    expect(screen.getByText('0:02')).toBeTruthy();

    await tick(1000);
    expect(screen.getByText('0:03')).toBeTruthy();
  });

  it('pauses while the app is in the background and goes on when it returns', async () => {
    const listeners: ((s: string) => void)[] = [];
    // RN's jest mock of AppState is a jest.fn; capture the listener of the next mount only (Once keeps the default for later tests).
    (AppState.addEventListener as jest.Mock).mockImplementationOnce((_: string, l: (s: string) => void) => {
      listeners.push(l);
      return { remove: () => {} };
    });
    screen.unmount();
    await open();
    const appState = (s: string) => act(() => listeners.forEach((l) => l(s)));

    await tick(2000);
    await appState('background');
    await tick(10_000);
    expect(screen.getByText('0:02')).toBeTruthy();

    await appState('active');
    await tick(1000);
    expect(screen.getByText('0:03')).toBeTruthy();
  });
});

describe('Win', () => {
  const win = async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    await tick(2000);
    fireEvent.press(screen.getByLabelText(LAST_EMPTY));
    enter(9);
    await settle();
  };

  it('records the win once with its time, deletes the save, and shows the time', async () => {
    await win();

    expect(screen.getByText('Solved! in 0:02')).toBeTruthy();
    expect((await saved('sudoku:stats')).data).toEqual({
      classic: { solved: 1, timedCount: 1, totalMs: 2000, bestMs: 2000 },
    });
    expect(await saved('sudoku:save')).toBeNull();
  });

  it('extra presses, rerenders and time after the win change nothing', async () => {
    await win();
    const statsWrites = () => (AsyncStorage.setItem as jest.Mock).mock.calls.filter(([k]) => k === 'sudoku:stats').length;
    expect(statsWrites()).toBe(1);

    fireEvent.press(screen.getByLabelText('Row 1, column 1, 5'));
    enter(1);
    fireEvent.press(screen.getByLabelText('Undo'));
    await tick(30_000);
    await settle();

    expect(statsWrites()).toBe(1);
    expect((await saved('sudoku:stats')).data.classic.solved).toBe(1);
    expect(screen.getByText('0:02')).toBeTruthy();
    expect(await saved('sudoku:save')).toBeNull();
  });

  it('adds to the stats of earlier wins', async () => {
    await AsyncStorage.setItem(
      'sudoku:stats',
      JSON.stringify({ version: 1, data: { classic: { solved: 2, timedCount: 2, totalMs: 10_000, bestMs: 4000 } } }),
    );
    await win();

    expect((await saved('sudoku:stats')).data.classic).toEqual({ solved: 3, timedCount: 3, totalMs: 12_000, bestMs: 2000 });
  });

  it('the next visit is a fresh game without a prompt', async () => {
    await win();
    screen.unmount();
    await settle();
    await open();

    expect(screen.queryByLabelText('Continue saved game')).toBeNull();
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('home shows the new result after a win', async () => {
    await win();
    await act(async () => router.navigate('/'));
    await settle();

    expect(screen.getByText('Solved 1 · Best 0:02 · Avg 0:02')).toBeTruthy();
  });
});
