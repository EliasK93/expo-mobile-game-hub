import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { AppState, StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import { parseGrid } from '@/games/sudoku/logic/board';
import { pickPuzzle } from '@/games/sudoku/logic/pool';

// The pool pick is replaced by a fixed puzzle with two empty cells: row 1 column 1 (answer 5) and row 9 column 9 (answer 9).
jest.mock('@/games/sudoku/logic/pool', () => ({ pickPuzzle: jest.fn() }));

const SOLUTION = parseGrid('534678912672195348198342567859761423426853791713924856961537284287419635345286179');
const PUZZLE = parseGrid('.3467891267219534819834256785976142342685379171392485696153728428741963534528617.');
// Three empty cells: row 1 columns 1 and 2 are peers, row 9 column 9 is not.
const WIDE = PUZZLE.map((v, i) => (i === 1 ? 0 : v));

const FIRST_EMPTY = 'Row 1, column 1, empty';
const LAST_EMPTY = 'Row 9, column 9, empty';

const enter = (digit: number) => fireEvent.press(screen.getByLabelText(`Enter ${digit}`));
const level = (name: string) => fireEvent.press(screen.getByLabelText(`Level: ${name}`));
const newGame = (name = 'Medium') => {
  fireEvent.press(screen.getByLabelText('New game'));
  level(name);
};

// Every level hands out this puzzle.
const makeAll = (puzzle = PUZZLE) =>
  (pickPuzzle as jest.Mock).mockReset().mockReturnValue({ puzzle, solution: SOLUTION });

// Fake timers so the clock is exact. Storage is the AsyncStorage mock (jest.setup.js), cleared before each test.
// settle() lets the pending storage promises finish; they need no timers.
const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};
// Opening shows the Continue prompt or the level picker; no game starts by itself.
const open = async () => {
  renderRouter('./src/app', { initialUrl: '/sudoku' });
  await settle();
};
// Starts over: leaves the screen, empties storage, then opens it again.
const reopen = async (setup?: () => Promise<void>) => {
  screen.unmount();
  await settle();
  await AsyncStorage.clear();
  await setup?.();
  await open();
};
const tick = (ms: number) => act(() => jest.advanceTimersByTime(ms));
const saved = async (key: string) => JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');
const seed = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));

// Most tests start from a running Medium game: open Sudoku (no save, so the picker) and pick Medium.
beforeEach(async () => {
  jest.useFakeTimers();
  makeAll();
  await open();
  level('Medium');
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

  it('without a save opens on the level picker at once, with nothing started and nothing to cancel back to', async () => {
    (pickPuzzle as jest.Mock).mockClear();
    await reopen();

    expect(pickPuzzle).not.toHaveBeenCalled();
    expect(screen.queryAllByLabelText(/^Row \d, column \d/)).toHaveLength(0);
    for (const name of ['Very easy', 'Easy', 'Medium', 'Hard', 'Expert'])
      expect(screen.getByLabelText(`Level: ${name}`)).toBeTruthy();
    expect(screen.getByLabelText('Level: Medium').props.accessibilityState.selected).toBe(true); // the first game is Medium
    expect(screen.queryByLabelText('Cancel')).toBeNull();

    level('Medium');
    expect(pickPuzzle).toHaveBeenCalledWith(3);
    expect(screen.getByText('Medium')).toBeTruthy();
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy(); // in the same press, nothing to wait for
  });

  it('New game resets the board', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);

    newGame();

    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });
});

describe('Level picker', () => {
  it('New game shows the five levels, with the last one used marked', () => {
    fireEvent.press(screen.getByLabelText('New game'));

    const names = ['Very easy', 'Easy', 'Medium', 'Hard', 'Expert'];
    for (const name of names) {
      const selected = screen.getByLabelText(`Level: ${name}`).props.accessibilityState.selected;
      expect(selected).toBe(name === 'Medium');
    }
  });

  it('Cancel closes the picker and keeps the game', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Cancel'));

    expect(screen.queryByLabelText('Level: Easy')).toBeNull();
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
  });

  it('replaces the grid, the number pad and the hint row while open, and Cancel brings back the same board', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText('New game'));

    expect(screen.queryAllByLabelText(/^Row \d, column \d/)).toHaveLength(0);
    expect(screen.queryByLabelText('Enter 1')).toBeNull();
    expect(screen.queryByLabelText('Hint')).toBeNull();
    for (const name of ['Very easy', 'Easy', 'Medium', 'Hard', 'Expert'])
      expect(screen.getByLabelText(`Level: ${name}`)).toBeTruthy();
    expect(screen.getByLabelText('Cancel')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Cancel'));
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
    expect(screen.getByLabelText('Enter 1')).toBeTruthy();
  });

  it('picking a level starts a game at that level, shows it next to the timer, and remembers it', async () => {
    newGame('Expert');
    await settle();

    expect(screen.getByText('Expert')).toBeTruthy();
    expect((await saved('sudoku:settings')).data).toEqual({ level: 5 });

    await reopen(() => seed('sudoku:settings', { version: 1, data: { level: 5 } }));
    expect(screen.queryAllByLabelText(/^Row \d, column \d/)).toHaveLength(0); // the picker, nothing started
    expect(screen.getByLabelText('Level: Expert').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Level: Medium').props.accessibilityState.selected).toBe(false);
  });

  describe('stats', () => {
    const STATS = {
      2: { solved: 5, timedCount: 4, totalMs: 968_000, bestMs: 190_000 },
      3: { solved: 2, timedCount: 0, totalMs: 0, bestMs: null }, // only hinted wins
      4: { solved: 0, timedCount: 0, totalMs: 0, bestMs: null },
    };
    const detail = (name: string) => within(screen.getByLabelText(`Level: ${name}`));

    it('each level button shows its solved count and best time; a level without wins shows nothing', async () => {
      await reopen(() => seed('sudoku:stats', { version: 1, data: STATS }));

      expect(detail('Easy').getByText('5 solved · Best 3:10')).toBeTruthy();
      expect(detail('Medium').getByText('2 solved')).toBeTruthy(); // hinted wins count, but have no best time
      expect(detail('Hard').queryByText(/solved/)).toBeNull();
      expect(detail('Very easy').queryByText(/solved/)).toBeNull();
      expect(screen.queryByText(/^Classic/)).toBeNull();
    });

    it('shows the same stats when the picker is opened from a running game', async () => {
      await reopen(() => seed('sudoku:stats', { version: 1, data: STATS }));
      level('Medium');
      fireEvent.press(screen.getByLabelText('New game'));

      expect(detail('Easy').getByText('5 solved · Best 3:10')).toBeTruthy();
    });

    it('ignores a leftover classic entry in the stored stats: no line for it, the levels still show', async () => {
      const classic = { solved: 3, timedCount: 2, totalMs: 780_000, bestMs: 252_000 };
      await reopen(() => seed('sudoku:stats', { version: 1, data: { ...STATS, classic } }));

      expect(screen.queryByText(/^Classic/)).toBeNull();
      expect(detail('Easy').getByText('5 solved · Best 3:10')).toBeTruthy();
    });

    it('does not show an average time', async () => {
      await reopen(() => seed('sudoku:stats', { version: 1, data: STATS }));

      expect(screen.queryByText(/Avg/)).toBeNull();
    });
  });

  it('every level starts at once with the pool puzzle', () => {
    makeAll(WIDE);
    for (const [l, name] of [
      [1, 'Very easy'],
      [2, 'Easy'],
      [3, 'Medium'],
      [4, 'Hard'],
      [5, 'Expert'],
    ] as const) {
      newGame(name);

      expect(pickPuzzle).toHaveBeenLastCalledWith(l);
      expect(screen.getByLabelText('Row 1, column 2, empty')).toBeTruthy(); // the picked puzzle, in the same press
      expect(screen.getByText(name)).toBeTruthy();
    }
  });
});

describe('Hint', () => {
  const press = (label: string) => fireEvent.press(screen.getByLabelText(label));
  const hintCells = () => screen.queryAllByLabelText(/, hint$/);

  it('highlights the cells and explains, then Apply places the digit and Undo takes it back', () => {
    press('Hint');

    expect(screen.getByText(/^Full house/)).toBeTruthy();
    expect(hintCells().map((c) => c.props.accessibilityLabel)).toContain('Row 1, column 1, empty, hint');

    press('Apply hint');
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
    expect(hintCells()).toHaveLength(0);
    expect(screen.queryByLabelText('Apply hint')).toBeNull();

    press('Undo');
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('Close drops the hint without a move', () => {
    press('Hint');
    press('Close hint');
    expect(hintCells()).toHaveLength(0);
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('replaces the number pad and the Undo/Redo/Notes/Erase row while shown; the grid stays; Close and Apply bring the pad back', () => {
    press('Hint');

    expect(screen.queryByLabelText('Enter 1')).toBeNull();
    expect(screen.queryByLabelText('Undo')).toBeNull();
    expect(screen.getByText(/^Full house/)).toBeTruthy();
    expect(screen.getByLabelText('Apply hint')).toBeTruthy();
    expect(screen.getByLabelText('Close hint')).toBeTruthy();
    expect(screen.getByLabelText(FIRST_EMPTY.replace('empty', 'empty, hint'))).toBeTruthy();
    expect(screen.getByLabelText(LAST_EMPTY)).toBeTruthy();

    press('Close hint');
    expect(screen.getByLabelText('Enter 1')).toBeTruthy();
    expect(screen.getByLabelText('Undo')).toBeTruthy();

    press('Hint');
    press('Apply hint');
    expect(screen.getByLabelText('Enter 1')).toBeTruthy();
    expect(screen.getByLabelText('Undo')).toBeTruthy();
  });

  it('reports a wrong digit first, and Apply erases it', () => {
    press(FIRST_EMPTY);
    enter(8);
    press('Hint');

    expect(screen.getByText('This 8 is wrong.')).toBeTruthy();
    press('Apply hint');
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('is off after the win', () => {
    press(FIRST_EMPTY);
    enter(5);
    press(LAST_EMPTY);
    enter(9);

    expect(screen.getByLabelText('Hint').props.accessibilityState.disabled).toBe(true);
  });

  it('a win after a hint counts as solved but leaves best and average time alone', async () => {
    await seed('sudoku:stats', {
      version: 1,
      data: { 3: { solved: 2, timedCount: 2, totalMs: 10_000, bestMs: 4000 } },
    });
    press('Hint');
    press('Apply hint');
    await tick(1000);
    press(LAST_EMPTY);
    enter(9);
    await settle();

    expect(screen.getByText(/^Solved!/)).toBeTruthy();
    expect((await saved('sudoku:stats')).data['3']).toEqual({
      solved: 3,
      timedCount: 2,
      totalMs: 10_000,
      bestMs: 4000,
    });
  });

  it('showing a hint is saved as hinted, with the level', async () => {
    press(FIRST_EMPTY);
    enter(5);
    press('Hint');
    await settle();

    const save = await saved('sudoku:save');
    expect(save.version).toBe(2);
    expect(save.data.hinted).toBe(true);
    expect(save.data.level).toBe(3);
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
    makeAll(WIDE);
    await reopen();
    level('Medium');

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

    newGame();
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
    expect(screen.getByLabelText('Level: Medium')).toBeTruthy(); // the picker
  });

  it('saves after a move', async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    await settle();

    const save = await saved('sudoku:save');
    expect(save.version).toBe(2);
    expect(save.data.values[0]).toBe(5);
    expect(save.data.level).toBe(3);
  });

  it('a version 1 save is rejected: no prompt, the level picker, then a fresh board', async () => {
    const v1 = {
      puzzle: PUZZLE,
      solution: SOLUTION,
      values: PUZZLE.map((v, i) => (i === 0 ? 5 : v)),
      notes: Array(81).fill(0),
      elapsedMs: 4000,
      hinted: false,
    };
    await reopen(() => seed('sudoku:save', { version: 1, data: v1 }));

    expect(screen.queryByLabelText(CONTINUE)).toBeNull();
    level('Medium');
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
    expect(screen.getByText('0:00')).toBeTruthy();
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

  it('with a save the prompt shows at once, and no puzzle is picked until a level is', async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    await settle();
    screen.unmount();
    await settle();
    (pickPuzzle as jest.Mock).mockClear();
    await open();

    expect(screen.getByLabelText(CONTINUE)).toBeTruthy();
    expect(screen.getByLabelText(NEW_GAME)).toBeTruthy();
    expect(screen.queryByLabelText('Level: Medium')).toBeNull();
    expect(pickPuzzle).not.toHaveBeenCalled();
  });

  it('the picker from the prompt replaces the prompt, and Cancel brings the prompt back', async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    screen.unmount();
    await settle();
    await open();

    fireEvent.press(screen.getByLabelText(NEW_GAME));
    expect(screen.queryByLabelText(NEW_GAME)).toBeNull();
    expect(screen.queryAllByLabelText(/^Row \d, column \d/)).toHaveLength(0);
    for (const name of ['Very easy', 'Easy', 'Medium', 'Hard', 'Expert'])
      expect(screen.getByLabelText(`Level: ${name}`)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Cancel'));
    fireEvent.press(screen.getByLabelText(CONTINUE));
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
  });

  it("the prompt's New game opens the picker; a level gives a fresh board and deletes the save", async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    screen.unmount();
    await settle();
    await open();

    fireEvent.press(screen.getByLabelText(NEW_GAME));
    expect(screen.queryByLabelText(CONTINUE)).toBeNull(); // the picker replaces the prompt; nothing is lost until a level is picked
    await settle();
    expect(await saved('sudoku:save')).not.toBeNull();
    level('Hard');
    await settle();

    expect(screen.getByText('Hard')).toBeTruthy();

    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
    expect(screen.getByText('0:00')).toBeTruthy();
    expect(await saved('sudoku:save')).toBeNull();
  });

  it('an unusable save is ignored: no prompt, the level picker, then a fresh board', async () => {
    screen.unmount();
    await AsyncStorage.setItem('sudoku:save', JSON.stringify({ version: 1, data: { values: [1, 2, 3] } }));
    await open();

    expect(screen.queryByLabelText(CONTINUE)).toBeNull();
    level('Medium');
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

describe('Primary buttons', () => {
  const textColor = (label: string, text: string) =>
    StyleSheet.flatten(within(screen.getByLabelText(label)).getByText(text).props.style).color;

  it('New game on the game screen is the accent button; the other buttons are not', () => {
    expect(textColor('New game', 'New game')).toBe(Colors.light.onAccent);
    expect(textColor('Hint', 'Hint')).toBe(Colors.light.text);
    expect(textColor('Enter 1', '1')).toBe(Colors.light.text);
  });

  it('Continue in the Continue prompt is the accent button, New game there is not', async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    await settle();
    screen.unmount();
    await open();

    expect(textColor('Continue saved game', 'Continue')).toBe(Colors.light.onAccent);
    expect(textColor('Start new game', 'New game')).toBe(Colors.light.text);
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

  it('pauses and hides the time and level while the level picker is open, and Cancel goes on from the same time', async () => {
    await tick(3000);
    expect(screen.getByText('0:03')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('New game'));
    await tick(10_000);
    expect(screen.queryByText(/^\d+:\d\d$/)).toBeNull();
    expect(screen.queryByText('Medium')).toBeNull();

    fireEvent.press(screen.getByLabelText('Cancel'));
    expect(screen.getByText('0:03')).toBeTruthy();
    expect(screen.getByText('Medium')).toBeTruthy();

    await tick(1000);
    expect(screen.getByText('0:04')).toBeTruthy();
  });

  it('pauses while the app is in the background and goes on when it returns', async () => {
    const listeners: ((s: string) => void)[] = [];
    // RN's jest mock of AppState is a jest.fn; capture the listeners of the next mount only (Once keeps the default for later tests).
    // Two clocks listen: the hub's GameRoute (playtime) and the Sudoku timer.
    const capture = (_: string, l: (s: string) => void) => {
      listeners.push(l);
      return { remove: () => {} };
    };
    (AppState.addEventListener as jest.Mock).mockImplementationOnce(capture).mockImplementationOnce(capture);
    screen.unmount();
    await open();
    level('Medium');
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
      3: { solved: 1, timedCount: 1, totalMs: 2000, bestMs: 2000 },
    });
    expect(await saved('sudoku:save')).toBeNull();
  });

  it('extra presses, rerenders and time after the win change nothing', async () => {
    await win();
    const statsWrites = () =>
      (AsyncStorage.setItem as jest.Mock).mock.calls.filter(([k]) => k === 'sudoku:stats').length;
    expect(statsWrites()).toBe(1);

    fireEvent.press(screen.getByLabelText('Row 1, column 1, 5'));
    enter(1);
    fireEvent.press(screen.getByLabelText('Undo'));
    await tick(30_000);
    await settle();

    expect(statsWrites()).toBe(1);
    expect((await saved('sudoku:stats')).data['3'].solved).toBe(1);
    expect(screen.getByText('0:02')).toBeTruthy();
    expect(await saved('sudoku:save')).toBeNull();
  });

  it('adds to the stats of earlier wins', async () => {
    await seed('sudoku:stats', {
      version: 1,
      data: { 3: { solved: 2, timedCount: 2, totalMs: 10_000, bestMs: 4000 } },
    });
    await win();

    expect((await saved('sudoku:stats')).data['3']).toEqual({
      solved: 3,
      timedCount: 3,
      totalMs: 12_000,
      bestMs: 2000,
    });
  });

  it('the next visit shows the level picker, without a prompt', async () => {
    await win();
    screen.unmount();
    await settle();
    await open();

    expect(screen.queryByLabelText('Continue saved game')).toBeNull();
    expect(screen.getByLabelText('Level: Medium')).toBeTruthy();
    level('Medium');
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('the level picker shows the new result after a win', async () => {
    await win();
    fireEvent.press(screen.getByLabelText('New game'));

    expect(within(screen.getByLabelText('Level: Medium')).getByText('1 solved · Best 0:02')).toBeTruthy();
  });
});
