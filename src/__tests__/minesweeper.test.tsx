import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { Colors } from '@/constants/theme';
import { LEVELS, cellCount, type Level } from '@/games/minesweeper/logic/board';
import { placeMines } from '@/games/minesweeper/logic/generate';
import { EMPTY_STATS, type LevelStats } from '@/games/minesweeper/logic/stats';
import { PANEL_DELAY_MS } from '@/games/minesweeper/ui/use-minesweeper';
import { buttonLook } from '@/test-utils/button-look';
import { press, selected, tick } from '@/test-utils/events';
import { settle } from '@/test-utils/settle';
import { saved, seed } from '@/test-utils/storage';

// placeMines is replaced so each test starts from a mine layout built by hand; open and the rest stay real.
jest.mock('@/games/minesweeper/logic/generate', () => ({
  ...jest.requireActual('@/games/minesweeper/logic/generate'),
  placeMines: jest.fn(),
}));
const realPlaceMines = jest.requireActual<typeof import('@/games/minesweeper/logic/generate')>(
  '@/games/minesweeper/logic/generate',
).placeMines;

// The next first tap gets these cells as mines, whatever the level and the tapped cell.
const layout = (indices: number[]) =>
  (placeMines as jest.Mock)
    .mockReset()
    .mockImplementation((level: Level) => Array.from({ length: cellCount(level) }, (_, i) => indices.includes(i)));
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

const open = async () => {
  renderRouter('./src/app', { initialUrl: '/minesweeper' });
  await settle();
};

// A cell by its index in reading order, found by its label "Row r, column c, <state>" (rows and columns count from 1).
const cell = (i: number, cols = COLS) =>
  screen.getByLabelText(new RegExp(`^Row ${Math.floor(i / cols) + 1}, column ${(i % cols) + 1}, `));
const stateOf = (i: number, cols = COLS) => cell(i, cols).props.accessibilityLabel.split(', ').slice(2).join(', ');
const tap = (i: number, cols = COLS) => fireEvent.press(cell(i, cols));
const hold = (i: number, cols = COLS) => fireEvent(cell(i, cols), 'longPress');
const count = (state: RegExp) => screen.queryAllByLabelText(state).length;
const covered = () => count(/^Row \d+, column \d+, covered$/);
const seedStats = (level: Level, stats: LevelStats) => seed('minesweeper:stats', 1, { ...EMPTY_STATS, [level]: stats });
const NO_GAMES: LevelStats = { played: 0, wins: 0, currentStreak: 0, bestStreak: 0, bestMs: null };
// The screen reads storage when it opens, so a seed needs a reopen.
const reopen = async () => {
  screen.unmount();
  await settle();
  await open();
};
const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);

// An unfinished Beginner game as the wall layout leaves it after a tap on cell 0, with a flag on the wall mine 44.
const WALL_SAVE = {
  level: 'beginner',
  mines: WALL,
  opened: range(0, CELLS).filter((i) => i % COLS < 4),
  flagged: [44],
  elapsedMs: 65_000,
};
// A game one tap from the win: the mines are the first cells, every other cell but the last is open, so a tap on the
// last cell wins and a tap on cell 0 (a mine) loses.
const nearlyWon = (level: Level, elapsedMs: number) => {
  const { mines } = LEVELS[level];
  return { level, mines: range(0, mines), opened: range(mines, cellCount(level) - 1), flagged: [], elapsedMs };
};

beforeEach(async () => {
  useRealPlaceMines();
  await open();
});

// The testing library has unmounted the screen by now; let the last writes land before the next test clears storage.
afterEach(async () => {
  await settle();
  jest.restoreAllMocks();
  jest.useRealTimers(); // the tests that switch to fake timers don't undo it on a failure
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
  beforeEach(async () => {
    screen.unmount();
    await settle();
    jest.useFakeTimers();
    await open(); // the clock reads the screen's focus when it mounts
  });

  it('stays at 0 before the first opening and after a first tap in Flag mode', async () => {
    await tick(3000);
    expect(screen.getByLabelText('Time 0 seconds')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Flag'));
    tap(44);
    await tick(3000);

    expect(screen.getByLabelText('Time 0 seconds')).toBeTruthy();
  });

  it('counts from the first opening and stops when the game ends', async () => {
    layout(WALL);
    tap(0);

    await tick(3000);
    expect(screen.getByLabelText('Time 3 seconds')).toBeTruthy();

    tap(12); // a mine
    await tick(5000);
    fireEvent.press(screen.getByLabelText('Close')); // the stats panel has opened over the board by now

    expect(screen.getByTestId('face-dizzy')).toBeTruthy();
    expect(screen.getByLabelText('Time 3 seconds')).toBeTruthy();
  });

  it('stops on a win, too', async () => {
    layout(TOP);
    await tick(2000); // nothing runs yet
    tap(80);

    await tick(5000);
    fireEvent.press(screen.getByLabelText('Close')); // the stats panel has opened over the board by now

    expect(screen.getByTestId('face-cool')).toBeTruthy();
    expect(screen.getByLabelText('Time 0 seconds')).toBeTruthy();
  });

  it('stops while the picker is open', async () => {
    layout(WALL);
    tap(0);
    await tick(2000);

    fireEvent.press(screen.getByLabelText('New game'));
    await tick(5000);
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

describe('resume', () => {
  it('opens a saved game directly, with the saved cells, flags and time', async () => {
    await seed('minesweeper:save', 1, WALL_SAVE);
    await reopen();

    expect(stateOf(0)).toBe('empty');
    expect(stateOf(3)).toBe('2');
    expect(stateOf(44)).toBe('flagged');
    expect(covered()).toBe(CELLS - LEFT - 1);
    expect(screen.getByLabelText(`Mines left ${MINES - 1}`)).toBeTruthy();
    expect(screen.getByLabelText('Time 65 seconds')).toBeTruthy();
    expect(screen.queryByText('Pick a level')).toBeNull();
    expect(selected('Dig')).toBe(true); // the mode is not saved
  });

  it('a bad or old save starts a fresh board of the last level', async () => {
    await seed('minesweeper:settings', 1, { level: 'intermediate' });
    await seed('minesweeper:save', 1, { ...WALL_SAVE, mines: [0] }); // 1 mine is not Beginner's 12
    await reopen();

    expect(covered()).toBe(cellCount('intermediate'));
    expect(screen.getByLabelText('Time 0 seconds')).toBeTruthy();

    await seed('minesweeper:save', 0, WALL_SAVE);
    await reopen();

    expect(covered()).toBe(cellCount('intermediate'));
  });

  it('without a save starts a board of the stored last level, Beginner the first time', async () => {
    expect(covered()).toBe(CELLS);

    await seed('minesweeper:settings', 1, { level: 'expert' });
    await reopen();

    expect(covered()).toBe(cellCount('expert'));
    expect(screen.getByLabelText('Mines left 45')).toBeTruthy();
  });

  describe('the timer', () => {
    beforeEach(async () => {
      screen.unmount();
      await settle();
      jest.useFakeTimers();
      await seed('minesweeper:save', 1, WALL_SAVE);
      await open();
    });

    it('continues from the saved time', async () => {
      expect(screen.getByLabelText('Time 65 seconds')).toBeTruthy();

      await tick(3000);

      expect(screen.getByLabelText('Time 68 seconds')).toBeTruthy();
    });
  });
});

describe('saving', () => {
  it('after an open and after a flag, the save matches the board', async () => {
    layout(WALL);
    tap(0);
    await settle();

    expect((await saved('minesweeper:save')).data).toEqual({
      level: 'beginner',
      mines: WALL,
      opened: WALL_SAVE.opened,
      flagged: [],
      elapsedMs: expect.any(Number),
    });

    hold(44);
    await settle();

    expect((await saved('minesweeper:save')).data).toMatchObject({ mines: WALL, flagged: [44] });
  });

  it('a flag on an unmined board is saved too, with no mines', async () => {
    hold(7);
    await settle();

    expect((await saved('minesweeper:save')).data).toMatchObject({ mines: [], opened: [], flagged: [7] });
  });

  describe('the time', () => {
    beforeEach(async () => {
      screen.unmount();
      await settle();
      jest.useFakeTimers();
      await open();
    });

    it('leaving the screen saves it', async () => {
      layout(WALL);
      tap(0);
      await tick(4000);

      screen.unmount();
      await settle();

      expect((await saved('minesweeper:save')).data).toMatchObject({ mines: WALL, elapsedMs: 4000 });
    });
  });
});

describe('after a win', () => {
  beforeEach(async () => {
    screen.unmount();
    await settle();
    jest.useFakeTimers();
    await seed('minesweeper:save', 1, nearlyWon('beginner', 83_000));
    await open();
    tap(CELLS - 1);
  });

  it('counts the game, the streak and the best time, and deletes the save', async () => {
    await settle();

    expect((await saved('minesweeper:stats')).data.beginner).toEqual({
      played: 1,
      wins: 1,
      currentStreak: 1,
      bestStreak: 1,
      bestMs: 83_000,
    });
    expect((await saved('minesweeper:stats')).data.expert).toEqual(NO_GAMES);
    expect(await saved('minesweeper:save')).toBeNull();
  });

  it('opens the panel after 1 s, not before, with the result line and a new best', async () => {
    expect(screen.getByTestId('face-cool')).toBeTruthy();
    await tick(999);
    expect(screen.getByTestId('face-cool')).toBeTruthy();
    expect(screen.queryByLabelText('Played: 1')).toBeNull();

    await tick(1);

    expect(screen.getByText('Won in 1:23 · New best!')).toBeTruthy();
    expect(screen.queryByLabelText(/^Row \d+, column/)).toBeNull();
    expect(screen.getByLabelText('Beginner stats').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Played: 1')).toBeTruthy();
    expect(screen.getByLabelText('Win %: 100')).toBeTruthy();
    expect(screen.getByLabelText('Current streak: 1')).toBeTruthy();
    expect(screen.getByLabelText('Best streak: 1')).toBeTruthy();
    expect(screen.getByLabelText('Best time: 1:23')).toBeTruthy();
  });

  it('Play again starts a new game of the same level, with the clock at 0', async () => {
    await tick(1000);

    press('Play again');
    await settle();

    expect(screen.getByTestId('face-normal')).toBeTruthy();
    expect(covered()).toBe(CELLS);
    expect(screen.getByLabelText('Time 0 seconds')).toBeTruthy();
    expect((await saved('minesweeper:save')).data).toMatchObject({
      level: 'beginner',
      mines: [],
      opened: [],
      flagged: [],
      elapsedMs: 0,
    });
  });

  it('Close shows the finished board', async () => {
    await tick(1000);

    press('Close');

    expect(screen.getByTestId('face-cool')).toBeTruthy();
    expect(covered()).toBe(0);
    expect(screen.queryByLabelText('Played: 1')).toBeNull();
  });

  it('the face during the second opens the picker, and the panel never opens behind it', async () => {
    press('New game');

    await tick(5000);
    expect(screen.getByText('Pick a level')).toBeTruthy();
    press('Cancel');

    expect(screen.getByTestId('face-cool')).toBeTruthy();
    expect(screen.queryByLabelText('Played: 1')).toBeNull();
  });

  it('the header Stats during the second opens the panel at once, and it stays as it is when the second is over', async () => {
    await tick(500);

    press('Stats');
    expect(screen.getByLabelText('Played: 1')).toBeTruthy();
    await tick(500);

    expect(screen.getByLabelText('Played: 1')).toBeTruthy();
  });

  it('closing the header Stats panel before the second is over: it does not open again', async () => {
    await tick(500);
    press('Stats');
    press('Close');

    await tick(5000);

    expect(screen.getByTestId('face-cool')).toBeTruthy();
    expect(screen.queryByLabelText('Played: 1')).toBeNull();
  });

  it('the panel does not open on a new game started during the second', async () => {
    press('New game');
    press('Intermediate');

    await tick(5000);

    expect(screen.queryByLabelText('Played: 1')).toBeNull();
    expect(covered()).toBe(cellCount('intermediate'));
  });
});

describe('the panel timer', () => {
  // React no longer warns about a state update after unmount, so the check is that the timer is cleared.
  it('leaving the screen during the second clears it', async () => {
    screen.unmount();
    await settle();
    jest.useFakeTimers();
    await seed('minesweeper:save', 1, nearlyWon('beginner', 83_000));
    await open();
    const set = jest.spyOn(globalThis, 'setTimeout');
    const clear = jest.spyOn(globalThis, 'clearTimeout');

    tap(CELLS - 1);
    const id = set.mock.results[set.mock.calls.findIndex(([, ms]) => ms === PANEL_DELAY_MS)]?.value;
    expect(id).toBeDefined();
    screen.unmount();

    expect(clear).toHaveBeenCalledWith(id);
  });
});

describe('after a win that is no best', () => {
  it('has no "New best!" and keeps the stored best time', async () => {
    jest.useFakeTimers();
    screen.unmount();
    await settle();
    await seedStats('beginner', { played: 1, wins: 1, currentStreak: 1, bestStreak: 1, bestMs: 50_000 });
    await seed('minesweeper:save', 1, nearlyWon('beginner', 83_000));
    await open();

    tap(CELLS - 1);
    await tick(1000);
    await settle();

    expect(screen.getByText('Won in 1:23')).toBeTruthy();
    expect(screen.getByLabelText('Played: 2')).toBeTruthy();
    expect(screen.getByLabelText('Best time: 0:50')).toBeTruthy();
    expect((await saved('minesweeper:stats')).data.beginner).toMatchObject({
      played: 2,
      wins: 2,
      currentStreak: 2,
      bestMs: 50_000,
    });
  });
});

describe('after a loss', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    screen.unmount();
    await settle();
    await seedStats('beginner', { played: 2, wins: 2, currentStreak: 2, bestStreak: 2, bestMs: 100_000 });
    await seed('minesweeper:save', 1, nearlyWon('beginner', 20_000));
    await open();
    tap(0); // a mine
    await tick(1000);
    await settle();
  });

  it('opens the panel with "Boom!", counts the game and resets the streak', async () => {
    expect(screen.getByText('Boom!')).toBeTruthy();
    expect(screen.getByLabelText('Played: 3')).toBeTruthy();
    expect(screen.getByLabelText('Win %: 67')).toBeTruthy();
    expect(screen.getByLabelText('Current streak: 0')).toBeTruthy();
    expect(screen.getByLabelText('Best streak: 2')).toBeTruthy();
    expect(screen.getByLabelText('Best time: 1:40')).toBeTruthy();
    expect((await saved('minesweeper:stats')).data.beginner).toEqual({
      played: 3,
      wins: 2,
      currentStreak: 0,
      bestStreak: 2,
      bestMs: 100_000,
    });
    expect(await saved('minesweeper:save')).toBeNull();
  });

  it('Change level opens the picker, and picking one does not count the finished game again', async () => {
    press('Change level');
    expect(screen.getByText('Pick a level')).toBeTruthy();

    press('Expert');
    await settle();

    expect(covered()).toBe(cellCount('expert'));
    expect((await saved('minesweeper:stats')).data.beginner.played).toBe(3);
    expect((await saved('minesweeper:settings')).data).toEqual({ level: 'expert' });
  });
});

describe('abandoning', () => {
  it('picking a level during a started game records a loss and starts the new level', async () => {
    layout(WALL);
    tap(0);
    press('New game');
    press('Intermediate');
    await settle();

    expect((await saved('minesweeper:stats')).data.beginner).toEqual({
      played: 1,
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestMs: null,
    });
    expect((await saved('minesweeper:save')).data).toMatchObject({ level: 'intermediate', mines: [], opened: [] }); // the old save is gone
    expect(covered()).toBe(cellCount('intermediate'));
    expect((await saved('minesweeper:settings')).data).toEqual({ level: 'intermediate' });
  });

  it('an unstarted board is not recorded', async () => {
    press('New game');
    press('Expert');
    await settle();

    expect(await saved('minesweeper:stats')).toBeNull();
  });

  it('nor is one with flags only, and its save does not come back', async () => {
    hold(7);
    await settle();

    press('New game');
    press('Intermediate');
    await settle();

    expect(await saved('minesweeper:stats')).toBeNull();
    expect((await saved('minesweeper:save')).data).toMatchObject({ level: 'intermediate', flagged: [] });
  });

  it('Cancel records nothing and keeps the save', async () => {
    layout(WALL);
    tap(0);

    press('New game');
    press('Cancel');
    await settle();

    expect(await saved('minesweeper:stats')).toBeNull();
    expect((await saved('minesweeper:save')).data).toMatchObject({ mines: WALL });
  });
});

describe('header Stats', () => {
  it('while a game runs: no result line, no new-game buttons, the clock paused, and Close returns to the game', async () => {
    jest.useFakeTimers();
    screen.unmount();
    await settle();
    await open();
    layout(WALL);
    tap(0);
    await tick(2000);

    press('Stats');

    expect(screen.getByLabelText('Played: 0')).toBeTruthy();
    expect(screen.queryByText(/^Won in|^Boom/)).toBeNull();
    expect(screen.queryByLabelText('Play again')).toBeNull();
    expect(screen.queryByLabelText('Change level')).toBeNull();
    expect(screen.queryByLabelText(/^Row \d+, column/)).toBeNull();

    await tick(5000);
    press('Close');

    expect(screen.getByLabelText('Time 2 seconds')).toBeTruthy();
    expect(stateOf(0)).toBe('empty');
    await tick(1000);
    expect(screen.getByLabelText('Time 3 seconds')).toBeTruthy();
  });

  it("the level switch opens on the board's level and shows each level's numbers", async () => {
    await seedStats('intermediate', { played: 3, wins: 1, currentStreak: 1, bestStreak: 1, bestMs: 83_000 });
    await reopen();

    press('Stats');
    expect(screen.getByLabelText('Beginner stats').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Played: 0')).toBeTruthy();
    expect(screen.getByLabelText('Best time: —')).toBeTruthy();

    press('Intermediate stats');

    expect(screen.getByLabelText('Intermediate stats').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Played: 3')).toBeTruthy();
    expect(screen.getByLabelText('Win %: 33')).toBeTruthy();
    expect(screen.getByLabelText('Current streak: 1')).toBeTruthy();
    expect(screen.getByLabelText('Best streak: 1')).toBeTruthy();
    expect(screen.getByLabelText('Best time: 1:23')).toBeTruthy();
  });
});

// ---- Held cells, screen reader, picker with stats ----

describe('a held cell', () => {
  it('shows the surprised face while a covered cell is pressed in, and the normal one when it is let go', () => {
    fireEvent(cell(44), 'pressIn');
    expect(screen.getByTestId('face-surprised')).toBeTruthy();
    expect(screen.queryByTestId('face-normal')).toBeNull();

    fireEvent(cell(44), 'pressOut');
    expect(screen.getByTestId('face-normal')).toBeTruthy();
  });

  it('a long press that flags the cell ends the surprise, even if the release never arrives', () => {
    fireEvent(cell(44), 'pressIn');

    hold(44);

    expect(stateOf(44)).toBe('flagged');
    expect(screen.getByTestId('face-normal')).toBeTruthy();
  });

  it('is not a thing on a flagged cell, an opened cell or a finished game', () => {
    layout(WALL);
    tap(0);
    hold(44);

    fireEvent(cell(44), 'pressIn'); // flagged
    expect(screen.getByTestId('face-normal')).toBeTruthy();
    fireEvent(cell(3), 'pressIn'); // opened
    expect(screen.getByTestId('face-normal')).toBeTruthy();

    tap(12); // a mine: the game is lost
    fireEvent(cell(61), 'pressIn');
    expect(screen.getByTestId('face-dizzy')).toBeTruthy();
  });

  it('a press in whose release never comes, because the board went away, does not leave the face surprised', () => {
    fireEvent(cell(44), 'pressIn');

    fireEvent.press(screen.getByLabelText('Stats'));
    fireEvent.press(screen.getByLabelText('Close'));
    expect(screen.getByTestId('face-normal')).toBeTruthy();

    fireEvent(cell(44), 'pressIn');
    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Cancel'));
    expect(screen.getByTestId('face-normal')).toBeTruthy();
  });

  it('a press in that is still held when the game ends does not leave the face surprised', () => {
    layout(WALL);
    tap(0);
    fireEvent(cell(61), 'pressIn');

    tap(12);

    expect(screen.getByTestId('face-dizzy')).toBeTruthy();
  });
});

describe('screen reader', () => {
  it('a covered or flagged cell is a button, an opened one is disabled text with no button role', () => {
    layout(WALL);
    tap(0);
    hold(44);

    expect(cell(61).props.accessibilityRole).toBe('button');
    expect(cell(44).props.accessibilityRole).toBe('button');
    expect(cell(3).props.accessibilityRole).toBeUndefined();
    expect(cell(3).props.accessibilityState).toMatchObject({ disabled: true });
    expect(cell(0).props.accessibilityRole).toBeUndefined(); // an empty cell too
  });

  it('after the game ends no cell is a button any more', () => {
    layout(WALL);
    tap(0);
    tap(12);

    expect(screen.queryAllByRole('button', { name: /^Row \d+, column/ })).toHaveLength(0);
  });

  // TalkBack's double-tap-and-hold arrives as the `longpress` accessibility action (a double tap stays the press).
  const action = (i: number, actionName: string) =>
    fireEvent(cell(i), 'accessibilityAction', { nativeEvent: { actionName } });

  it('the longpress action flags in Dig mode', () => {
    action(44, 'longpress');

    expect(stateOf(44)).toBe('flagged');
    action(44, 'longpress');
    expect(stateOf(44)).toBe('covered');
  });

  it('the longpress action opens in Flag mode', () => {
    layout(WALL);
    fireEvent.press(screen.getByLabelText('Flag'));

    action(0, 'longpress');

    expect(stateOf(0)).toBe('empty');
    expect(covered()).toBe(CELLS - LEFT);
  });

  it('a long press on a flagged cell in Flag mode changes nothing', () => {
    layout(WALL);
    hold(44);
    fireEvent.press(screen.getByLabelText('Flag'));

    hold(44);

    expect(stateOf(44)).toBe('flagged');
    expect(covered()).toBe(CELLS - 1);
    expect(screen.getByTestId('face-normal')).toBeTruthy();
  });

  it('other actions, such as activate, do nothing', () => {
    action(44, 'activate');

    expect(stateOf(44)).toBe('covered');
  });
});

describe('level picker with stats', () => {
  it('shows the best times and marks the last used level from the setting', async () => {
    await seedStats('intermediate', { played: 3, wins: 1, currentStreak: 1, bestStreak: 1, bestMs: 83_000 });
    await seed('minesweeper:settings', 1, { level: 'expert' });
    await reopen();

    press('New game');

    expect(selected('Expert')).toBe(true);
    expect(selected('Beginner')).toBeFalsy();
    expect(screen.getByText('10 × 15 · 24 mines · Best 1:23')).toBeTruthy();
    expect(screen.getByText('8 × 12 · 12 mines')).toBeTruthy();
    expect(screen.getByText('12 × 18 · 45 mines')).toBeTruthy();
  });
});
