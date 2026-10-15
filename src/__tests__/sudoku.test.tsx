import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AppState } from 'react-native';

import { parseGrid } from '@/games/sudoku/logic/board';
import { generateLevel } from '@/games/sudoku/logic/generate';

// The real generator is replaced by a fixed puzzle with two empty cells: row 1 column 1 (answer 5) and row 9 column 9 (answer 9).
// It is a generator function like the real one, so the real runner (runChunked) drives it.
jest.mock('@/games/sudoku/logic/generate', () => ({ generateLevel: jest.fn() }));

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

const generator = (puzzle = PUZZLE) =>
  function* () {
    yield;
    return { puzzle, solution: SOLUTION, attempts: 1 };
  };
const makeAll = (puzzle = PUZZLE) => (generateLevel as jest.Mock).mockReset().mockImplementation(generator(puzzle));
const asCache = (byLevel: Record<number, number[][]>) => ({
  version: 1,
  data: Object.fromEntries(Object.entries(byLevel).map(([l, ps]) => [l, ps.map((puzzle) => ({ puzzle, solution: SOLUTION }))])),
});
// Every level holds a full set (3), so the filler has nothing to make; `own` replaces the puzzles of some levels.
const fullCache = (own: Record<number, number[]> = {}) =>
  asCache(Object.fromEntries([1, 2, 3, 4, 5].map((l) => [l, Array(3).fill(own[l] ?? PUZZLE)])));

// Fake timers so the clock is exact. Storage is the AsyncStorage mock (jest.setup.js), cleared before each test.
// settle() lets the pending storage promises finish; they need no timers.
const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};
const open = async () => {
  renderRouter('./src/app', { initialUrl: '/sudoku' });
  await settle();
};
// Starts over: leaves the screen, empties storage (and so the puzzle cache), then opens it again.
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

beforeEach(async () => {
  jest.useFakeTimers();
  makeAll();
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

  it('opens on its own at the last level, first Medium, without any button press', () => {
    expect(generateLevel).toHaveBeenCalledWith(3);
    expect(screen.getByText('Medium')).toBeTruthy();
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
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

  it('picking a level starts a game at that level, shows it next to the timer, and remembers it', async () => {
    newGame('Expert');
    await settle();

    expect(screen.getByText('Expert')).toBeTruthy();
    expect((await saved('sudoku:settings')).data).toEqual({ level: 5 });

    await reopen(() => seed('sudoku:settings', { version: 1, data: { level: 5 } }));
    expect(screen.getByText('Expert')).toBeTruthy(); // starts the last level right away
    fireEvent.press(screen.getByLabelText('New game'));
    expect(screen.getByLabelText('Level: Expert').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Level: Medium').props.accessibilityState.selected).toBe(false);
  });

  it('takes a ready puzzle from the cache straight away, with no generation', async () => {
    const OTHER = PUZZLE.map((v, i) => (i === 1 ? 0 : v));
    await reopen(() => seed('sudoku:cache', fullCache({ 2: OTHER })));
    (generateLevel as jest.Mock).mockClear();
    expect(generateLevel).not.toHaveBeenCalled(); // the first game came out of the cache too

    newGame('Easy');

    expect(screen.queryByText('Making a puzzle…')).toBeNull();
    expect(screen.getByLabelText('Row 1, column 2, empty')).toBeTruthy(); // the cached puzzle, in the same press
    expect(screen.getByText('Easy')).toBeTruthy();
  });

  it('refills the cache after a puzzle was taken', async () => {
    await reopen(() => seed('sudoku:cache', fullCache()));
    (generateLevel as jest.Mock).mockClear();

    newGame('Hard');
    await settle();

    expect(generateLevel).toHaveBeenCalledWith(4);
    expect((await saved('sudoku:cache')).data['4']).toHaveLength(3);
  });

  it('shows "Making a puzzle…" while the level is made when the cache has none', async () => {
    let release = false;
    // Every step "takes" 10 ms on the fake clock, so the runner has to wait with setTimeout between steps.
    (generateLevel as jest.Mock).mockReset().mockImplementation(function* () {
      while (!release) {
        jest.setSystemTime(Date.now() + 10);
        yield;
      }
      return { puzzle: WIDE, solution: SOLUTION, attempts: 1 };
    });
    await reopen();

    expect(screen.getByText('Making a puzzle…')).toBeTruthy();
    expect(screen.queryByLabelText(/^Row 1, column 1, /)).toBeNull();

    release = true;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(50);
    });

    expect(screen.queryByText('Making a puzzle…')).toBeNull();
    expect(screen.getByLabelText('Row 1, column 2, empty')).toBeTruthy();
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

  it('Close drops the hint without a move, and any move closes it too', () => {
    press('Hint');
    press('Close hint');
    expect(hintCells()).toHaveLength(0);
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();

    press('Hint');
    press(LAST_EMPTY);
    enter(9);
    expect(screen.queryByLabelText('Apply hint')).toBeNull();
    expect(hintCells()).toHaveLength(0);
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
    await seed('sudoku:stats', { version: 1, data: { 3: { solved: 2, timedCount: 2, totalMs: 10_000, bestMs: 4000 } } });
    press('Hint');
    press('Apply hint');
    await tick(1000);
    press(LAST_EMPTY);
    enter(9);
    await settle();

    expect(screen.getByText(/^Solved!/)).toBeTruthy();
    expect((await saved('sudoku:stats')).data['3']).toEqual({ solved: 3, timedCount: 2, totalMs: 10_000, bestMs: 4000 });
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
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
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

  it('a version 1 save resumes as Classic, and its win counts as Classic', async () => {
    const v1 = { puzzle: PUZZLE, solution: SOLUTION, values: PUZZLE.map((v, i) => (i === 0 ? 5 : v)), notes: Array(81).fill(0), elapsedMs: 4000, hinted: false };
    await reopen(() => seed('sudoku:save', { version: 1, data: v1 }));

    fireEvent.press(screen.getByLabelText(CONTINUE));
    expect(screen.getByText('Classic')).toBeTruthy();
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(LAST_EMPTY));
    enter(9);
    await settle();
    expect((await saved('sudoku:stats')).data.classic.solved).toBe(1);
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

  it('the prompt\'s New game opens the picker; a level gives a fresh board and deletes the save', async () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    screen.unmount();
    await settle();
    await open();

    fireEvent.press(screen.getByLabelText(NEW_GAME));
    expect(screen.getByLabelText(CONTINUE)).toBeTruthy(); // nothing is lost until a level is picked
    level('Hard');
    await settle();

    expect(screen.getByText('Hard')).toBeTruthy();

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
      3: { solved: 1, timedCount: 1, totalMs: 2000, bestMs: 2000 },
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
    expect((await saved('sudoku:stats')).data['3'].solved).toBe(1);
    expect(screen.getByText('0:02')).toBeTruthy();
    expect(await saved('sudoku:save')).toBeNull();
  });

  it('adds to the stats of earlier wins', async () => {
    await seed('sudoku:stats', { version: 1, data: { 3: { solved: 2, timedCount: 2, totalMs: 10_000, bestMs: 4000 } } });
    await win();

    expect((await saved('sudoku:stats')).data['3']).toEqual({ solved: 3, timedCount: 3, totalMs: 12_000, bestMs: 2000 });
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

    expect(screen.getByText('Medium: 1 · Best 0:02 · Avg 0:02')).toBeTruthy();
  });
});
