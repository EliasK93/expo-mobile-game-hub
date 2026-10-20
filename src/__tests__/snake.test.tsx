import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { AppState } from 'react-native';

import { placeApple } from '@/games/snake/logic/apple';
import { cell, COLS, ROWS, type Dir, type Level } from '@/games/snake/logic/board';
import { EMPTY_STATS, type LevelStats } from '@/games/snake/logic/stats';
import { settle } from '@/test-utils/settle';

// placeApple is replaced so each test puts the apples where it wants them (the real one is tested in logic/).
jest.mock('@/games/snake/logic/apple', () => ({ placeApple: jest.fn() }));

// Cells are written as 1-based (column, row), like the board's accessibility value. AWAY is the bottom right corner:
// whatever is not placed by hand goes there, where the snakes of these tests never get.
const at = (col: number, row: number) => cell(col - 1, row - 1);
const AWAY = at(15, 21);
// The next apples, in order: the first for the game on screen or the next new game, then one per apple eaten.
const place = (...cells: number[]) => {
  const queue = [...cells];
  (placeApple as jest.Mock).mockReset().mockImplementation(() => queue.shift() ?? AWAY);
};

const open = async () => {
  renderRouter('./src/app', { initialUrl: '/snake' });
  await settle();
};

// Fake timers drive the ticks. A tick re-arms the next one only after React has rendered, so each tick is its own act.
const tick = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });
const ticks = async (n: number, ms = 160) => {
  for (let i = 0; i < n; i++) await tick(ms);
};

const swipe = (dir: Dir) =>
  fireEvent(screen.getByLabelText(/^Board 15 by 21/), 'accessibilityAction', { nativeEvent: { actionName: dir } });

// The head, the length and the apple, read from the board's accessibility value.
const board = () => {
  const text: string = screen.getByLabelText(/^Board 15 by 21/).props.accessibilityValue.text;
  const m = text.match(/^Head column (\d+), row (\d+), length (\d+), apple column (\d+), row (\d+)$/);
  if (!m) throw new Error(`unexpected board value: ${text}`);
  const [, hc, hr, length, ac, ar] = m.map(Number);
  return { head: [hc, hr], length, apple: [ac, ar] };
};
const head = () => board().head;
const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState.disabled;
const selected = (label: string) => screen.getByLabelText(label).props.accessibilityState.selected;
// The result overlay has its own New and Play again; the row above the board has the other New.
const result = () => within(screen.getByTestId('result'));

beforeEach(() => {
  jest.useFakeTimers();
  place();
});

afterEach(async () => {
  await settle();
  jest.useRealTimers();
});

describe('Snake screen', () => {
  it('opens from home ready: the snake and the apple shown, Swipe to start, Pause disabled, Score and Best 0', async () => {
    place(at(2, 5));
    await open();

    expect(board()).toEqual({ head: [8, 13], length: 3, apple: [2, 5] });
    expect(screen.getByText('Swipe to start')).toBeTruthy();
    expect(disabled('Pause')).toBe(true);
    expect(screen.getByText('Normal · Score')).toBeTruthy();
    expect(screen.getByLabelText('Normal · Score 0')).toBeTruthy();
    expect(screen.getByLabelText('Best 0')).toBeTruthy();
    expect(screen.queryByText('Paused')).toBeNull();
    expect(screen.queryByLabelText('Play again')).toBeNull();
  });

  it('does not move before the first swipe', async () => {
    await open();

    await tick(2000);

    expect(head()).toEqual([8, 13]);
    expect(screen.getByText('Swipe to start')).toBeTruthy();
  });

  it('a swipe starts it, and it moves one cell per 160 ms (Normal)', async () => {
    await open();

    swipe('up');
    expect(screen.queryByText('Swipe to start')).toBeNull();
    expect(disabled('Pause')).toBe(false);
    await tick(159);
    expect(head()).toEqual([8, 13]);
    await tick(1);
    expect(head()).toEqual([8, 12]);
    await tick(160);
    expect(head()).toEqual([8, 11]);
  });

  it('down as the first swipe does nothing', async () => {
    await open();

    swipe('down');
    await tick(1000);

    expect(head()).toEqual([8, 13]);
    expect(screen.getByText('Swipe to start')).toBeTruthy();
    expect(disabled('Pause')).toBe(true);
  });

  it('a turn changes the direction', async () => {
    await open();

    swipe('up');
    await tick(160);
    swipe('right');
    await tick(160);
    expect(head()).toEqual([9, 12]);
    swipe('down');
    await tick(160);
    expect(head()).toEqual([9, 13]);
  });

  it('a swipe just before a tick does not delay it', async () => {
    await open();
    swipe('up');
    await tick(150);

    swipe('left');
    await tick(10);

    expect(head()).toEqual([7, 13]);
  });

  it('eating raises Score and Best and grows the snake', async () => {
    place(at(8, 12), at(2, 2));
    await open();

    swipe('up');
    await tick(160);

    expect(screen.getByLabelText('Normal · Score 1')).toBeTruthy();
    expect(screen.getByLabelText('Best 1')).toBeTruthy();
    expect(board()).toEqual({ head: [8, 12], length: 4, apple: [2, 2] });
  });

  it('a wall ends it: the board stays, with the result line and Play again', async () => {
    await open();

    swipe('left');
    await ticks(7);
    expect(head()).toEqual([1, 13]);
    expect(screen.queryByTestId('result')).toBeNull();
    await tick(160);

    expect(head()).toEqual([1, 13]);
    expect(screen.getByText('Game over · 0 apples')).toBeTruthy();
    expect(screen.getByLabelText('Play again')).toBeTruthy();
    expect(disabled('Pause')).toBe(true);
    await tick(1000);
    expect(head()).toEqual([1, 13]);
  });

  it('its own body ends it', async () => {
    place(at(8, 12), at(8, 11), at(8, 10));
    await open();

    swipe('up');
    await ticks(3);
    expect(screen.getByLabelText('Normal · Score 3')).toBeTruthy();
    swipe('right');
    await tick(160);
    swipe('down');
    await tick(160);
    expect(screen.queryByTestId('result')).toBeNull();
    swipe('left');
    await tick(160);

    expect(screen.getByText('Game over · 3 apples · New best!')).toBeTruthy();
  });

  it('Pause stops the ticks and the swipes, Continue goes on in the same direction', async () => {
    await open();
    swipe('up');
    await tick(160);

    fireEvent.press(screen.getByLabelText('Pause'));
    expect(screen.getByText('Paused')).toBeTruthy();
    swipe('left');
    await tick(1000);
    expect(head()).toEqual([8, 12]);

    fireEvent.press(screen.getByLabelText('Continue'));
    expect(screen.queryByText('Paused')).toBeNull();
    await tick(160);
    expect(head()).toEqual([8, 11]);
  });

  it('leaving the screen pauses it, and it is paused when you come back', async () => {
    await open();
    swipe('up');
    await tick(160);

    await act(async () => router.push('/'));
    await tick(1000);
    await act(async () => router.back());

    expect(screen.getByText('Paused')).toBeTruthy();
    expect(head()).toEqual([8, 12]);
    fireEvent.press(screen.getByLabelText('Continue'));
    await tick(160);
    expect(head()).toEqual([8, 11]);
  });

  it('the app going to the background pauses it, and it stays paused when the app returns', async () => {
    const listeners: ((s: string) => void)[] = [];
    const subscribe = (_: string, l: (s: string) => void) => {
      listeners.push(l);
      return { remove: () => {} };
    };
    // Two listeners: the screen's clock and GameRoute's (playtime) clock.
    (AppState.addEventListener as jest.Mock).mockImplementationOnce(subscribe).mockImplementationOnce(subscribe);
    await open();
    const appState = (s: string) => act(async () => listeners.forEach((l) => l(s)));
    swipe('up');
    await tick(160);

    await appState('background');
    await tick(1000);
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(head()).toEqual([8, 12]);

    await appState('active');
    await tick(1000);
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(head()).toEqual([8, 12]);
    fireEvent.press(screen.getByLabelText('Continue'));
    await tick(160);
    expect(head()).toEqual([8, 11]);
  });

  it('Play again starts a new ready game of the same level', async () => {
    await open();
    fireEvent.press(screen.getByLabelText('New'));
    fireEvent.press(screen.getByLabelText('Fast'));
    swipe('left');
    await ticks(8, 110);
    expect(screen.getByText('Game over · 0 apples')).toBeTruthy();

    place(at(3, 3));
    fireEvent.press(screen.getByLabelText('Play again'));

    expect(screen.queryByTestId('result')).toBeNull();
    expect(board()).toEqual({ head: [8, 13], length: 3, apple: [3, 3] });
    expect(screen.getByText('Swipe to start')).toBeTruthy();
    swipe('up');
    await tick(109);
    expect(head()).toEqual([8, 13]);
    await tick(1);
    expect(head()).toEqual([8, 12]);
  });

  it('New opens the picker with the last used level marked, Cancel goes back paused, and the Score title shows the level', async () => {
    await open();
    swipe('up');
    await tick(160);

    fireEvent.press(screen.getByLabelText('New'));
    expect(screen.queryByLabelText(/^Board /)).toBeNull();
    expect(selected('Normal')).toBe(true);
    expect(selected('Fast')).toBeFalsy();
    expect(screen.getByText('Normal (last used)')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Cancel'));
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(head()).toEqual([8, 12]);

    fireEvent.press(screen.getByLabelText('New'));
    fireEvent.press(screen.getByLabelText('Fast'));
    expect(board()).toEqual({ head: [8, 13], length: 3, apple: [15, 21] });
    expect(screen.getByText('Swipe to start')).toBeTruthy();
    expect(screen.getByText('Fast · Score')).toBeTruthy();
    expect(screen.getByLabelText('Fast · Score 0')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('New'));
    expect(selected('Fast')).toBe(true);
    expect(selected('Normal')).toBeFalsy();
  });

  it('the result says New best! only when the score is above the stored best', async () => {
    await seed('snake:stats', { ...EMPTY_STATS, normal: { played: 1, best: 1, totalApples: 1, longestMs: 5000 } });
    place(at(8, 12));
    await open();
    swipe('up');
    await ticks(14);
    expect(screen.getByText('Game over · 1 apple')).toBeTruthy();
    expect(screen.getByLabelText('Best 1')).toBeTruthy();

    place(at(8, 12), at(8, 11));
    fireEvent.press(screen.getByLabelText('Play again'));
    expect(screen.getByLabelText('Best 1')).toBeTruthy();
    expect(screen.getByLabelText('Normal · Score 0')).toBeTruthy();
    swipe('up');
    await ticks(14);
    expect(screen.getByText('Game over · 2 apples · New best!')).toBeTruthy();

    place(at(8, 12), at(8, 11));
    fireEvent.press(screen.getByLabelText('Play again'));
    swipe('up');
    await ticks(14);
    expect(screen.getByText('Game over · 2 apples')).toBeTruthy();
    await settle();
    expect((await saved('snake:stats')).data.normal).toMatchObject({ played: 4, best: 2, totalApples: 6 });
  });

  it('New on the result goes to the picker', async () => {
    await open();
    swipe('left');
    await ticks(8);

    fireEvent.press(result().getByLabelText('New after game'));

    expect(screen.getByLabelText('Cancel')).toBeTruthy();
    expect(selected('Normal')).toBe(true);
  });
});

// What the screen-reader tests below do not repeat: the labels of the score boxes, the buttons and the picker, the board's
// label and value text, and a turn through an accessibility action are all used by the tests above.
describe('accessibility', () => {
  it('the board offers the four turns as labelled actions', async () => {
    await open();

    expect(screen.getByLabelText(/^Board 15 by 21/).props.accessibilityActions).toEqual([
      { name: 'up', label: 'Turn up' },
      { name: 'down', label: 'Turn down' },
      { name: 'left', label: 'Turn left' },
      { name: 'right', label: 'Turn right' },
    ]);
  });

  it('the board ignores an action that is not a turn (the platform sends its own, e.g. activate)', async () => {
    await open();

    fireEvent(screen.getByLabelText(/^Board 15 by 21/), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    await tick(1000);

    expect(head()).toEqual([8, 13]);
    expect(screen.getByText('Swipe to start')).toBeTruthy();
  });

  it('the result line is a polite live region', async () => {
    await open();
    swipe('left');
    await ticks(8);

    const line = screen.getByText('Game over · 0 apples');
    expect(line.props.accessibilityLiveRegion).toBe('polite');
  });

  it('the Continue button is not inside the accessible board, so a screen reader reaches it', async () => {
    await open();
    swipe('up');
    await tick(160);
    press('Pause');

    const boardView = screen.getByLabelText(/^Board 15 by 21/);
    expect(within(boardView).queryByLabelText('Continue')).toBeNull();
    expect(screen.getByLabelText('Continue')).toBeTruthy();
  });
});

// ---- S3: save, stats, abandon ----

const saved = async (key: string) => JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');
const seed = (key: string, data: unknown) => AsyncStorage.setItem(key, JSON.stringify({ version: 1, data }));
const stats = (played: number, best: number, totalApples: number, longestMs: number) =>
  ({ played, best, totalApples, longestMs }) satisfies LevelStats;
const seedStats = (level: Level, s: LevelStats) => seed('snake:stats', { ...EMPTY_STATS, [level]: s });
const press = (label: string) => fireEvent.press(screen.getByLabelText(label));

// A started game as it is stored: cells as [col, row] 0-based (head column 8, row 13 in the 1-based words of the tests).
const SAVE = {
  level: 'normal',
  snake: [
    [7, 12],
    [7, 13],
    [7, 14],
  ],
  dir: 'up',
  apple: [1, 4],
  apples: 0,
  elapsedMs: 42_000,
};
// Two apples eaten, on Fast: the head at column 8, row 11.
const SAVE_LONG = {
  ...SAVE,
  level: 'fast',
  snake: [
    [7, 10],
    [7, 11],
    [7, 12],
    [7, 13],
    [7, 14],
  ],
  apples: 2,
};
// A snake over every cell, row by row: what a won game would look like (it has no place for an apple).
const FULL = Array.from({ length: ROWS }, (_, r) =>
  Array.from({ length: COLS }, (_, c) => [r % 2 ? COLS - 1 - c : c, r]),
).flat();

describe('resume', () => {
  it('opens a saved game directly, paused, with its level, score, snake and apple; Continue ticks on', async () => {
    await seed('snake:save', SAVE_LONG);
    await open();

    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.queryByText('Swipe to start')).toBeNull();
    expect(screen.getByText('Fast · Score')).toBeTruthy();
    expect(screen.getByLabelText('Fast · Score 2')).toBeTruthy();
    expect(screen.getByLabelText('Best 2')).toBeTruthy();
    expect(board()).toEqual({ head: [8, 11], length: 5, apple: [2, 5] });
    expect(placeApple).not.toHaveBeenCalled();
    await tick(1000);
    expect(head()).toEqual([8, 11]);

    press('Continue');
    await tick(110);

    expect(head()).toEqual([8, 10]);

    // The clock stood at the saved time: a Pause after one tick stores that time plus the tick.
    press('Pause');
    await settle();
    expect((await saved('snake:save')).data.elapsedMs).toBe(42_000 + 110);
  });

  it.each([
    ['a bad save', { ...SAVE, snake: SAVE.snake.slice(0, 2) }],
    ['a finished-looking one', { ...SAVE, snake: FULL, apples: FULL.length - 3 }],
  ])('ignores %s and shows a new ready game of the stored level', async (_, data) => {
    await seed('snake:save', data);
    await seed('snake:settings', { level: 'slow' });
    place(at(4, 4));
    await open();

    expect(screen.getByText('Swipe to start')).toBeTruthy();
    expect(screen.queryByText('Paused')).toBeNull();
    expect(screen.getByLabelText('Slow · Score 0')).toBeTruthy();
    expect(board()).toEqual({ head: [8, 13], length: 3, apple: [4, 4] });
  });
});

describe('saving', () => {
  it('Pause saves the game: cells, direction, apple, apples and the time', async () => {
    place(at(2, 5));
    await open();
    swipe('up');
    await tick(160);

    press('Pause');
    await settle();

    expect(await saved('snake:save')).toEqual({
      version: 1,
      data: {
        level: 'normal',
        snake: [
          [7, 11],
          [7, 12],
          [7, 13],
        ],
        dir: 'up',
        apple: [1, 4],
        apples: 0,
        elapsedMs: 160,
      },
    });
  });

  it('leaving the screen saves the paused game', async () => {
    await open();
    swipe('up');
    await ticks(2);

    await act(async () => router.push('/'));
    await settle();

    expect((await saved('snake:save')).data).toMatchObject({
      snake: [
        [7, 10],
        [7, 11],
        [7, 12],
      ],
      elapsedMs: 320,
    });
  });

  it('the app going to the background saves the paused game', async () => {
    const listeners: ((s: string) => void)[] = [];
    const subscribe = (_: string, l: (s: string) => void) => {
      listeners.push(l);
      return { remove: () => {} };
    };
    (AppState.addEventListener as jest.Mock).mockImplementationOnce(subscribe).mockImplementationOnce(subscribe);
    await open();
    swipe('up');
    await tick(160);

    await act(async () => listeners.forEach((l) => l('background')));
    await settle();

    expect((await saved('snake:save')).data).toMatchObject({
      snake: [
        [7, 11],
        [7, 12],
        [7, 13],
      ],
      elapsedMs: 160,
    });
  });

  it('a ready game writes no save, not even when the screen is left', async () => {
    await open();
    press('New');
    press('Cancel');

    screen.unmount();
    await settle();

    expect(await saved('snake:save')).toBeNull();
  });

  it('game over removes the save and stores the stats', async () => {
    await open();
    swipe('up');
    await tick(160);
    press('Pause');
    await settle();
    expect(await saved('snake:save')).not.toBeNull();
    press('Continue');

    await ticks(14);
    await settle();

    expect(screen.getByText('Game over · 0 apples')).toBeTruthy();
    expect(await saved('snake:save')).toBeNull();
    expect((await saved('snake:stats')).data).toEqual({ ...EMPTY_STATS, normal: stats(1, 0, 0, 2080) });
  });
});

describe('level', () => {
  it('picking a level stores it, and reopening shows it marked in the picker', async () => {
    await open();

    press('New');
    press('Fast');
    await settle();
    expect(await saved('snake:settings')).toEqual({ version: 1, data: { level: 'fast' } });

    screen.unmount();
    await settle();
    await open();

    expect(screen.getByLabelText('Fast · Score 0')).toBeTruthy();
    press('New');
    expect(selected('Fast')).toBe(true);
    expect(selected('Normal')).toBeFalsy();
  });
});

describe('abandon', () => {
  it('picking a level with a started game counts it: played +1, its apples in best and average, the save gone', async () => {
    await seedStats('normal', stats(1, 1, 1, 1000));
    place(at(8, 12), at(8, 11));
    await open();
    swipe('up');
    await ticks(2);
    expect(screen.getByLabelText('Normal · Score 2')).toBeTruthy();

    press('New');
    await settle();
    expect(await saved('snake:save')).not.toBeNull();
    press('Fast');
    await settle();

    expect((await saved('snake:stats')).data).toEqual({ ...EMPTY_STATS, normal: stats(2, 2, 3, 1000) });
    expect(await saved('snake:save')).toBeNull();
    expect(screen.getByText('Swipe to start')).toBeTruthy();
    expect(screen.getByLabelText('Fast · Score 0')).toBeTruthy();
  });

  it('an unstarted game changes nothing', async () => {
    await open();

    press('New');
    press('Fast');
    await settle();

    expect(await saved('snake:stats')).toBeNull();
    expect(await saved('snake:save')).toBeNull();
  });

  it('a finished game is not counted again when the picker is used', async () => {
    await open();
    swipe('left');
    await ticks(8);
    await settle();
    expect((await saved('snake:stats')).data.normal.played).toBe(1);

    press('New after game');
    press('Slow');
    await settle();

    expect((await saved('snake:stats')).data.normal.played).toBe(1);
  });
});

describe('stats', () => {
  it('the Best box and the picker read the stored bests', async () => {
    await seed('snake:stats', {
      ...EMPTY_STATS,
      normal: stats(4, 23, 50, 83_000),
      fast: stats(1, 7, 7, 30_000),
    });
    await open();

    expect(screen.getByLabelText('Best 23')).toBeTruthy();

    press('New');
    expect(screen.getByText('Best 23')).toBeTruthy();
    expect(screen.getByText('Best 7')).toBeTruthy();
    expect(screen.getAllByText(/^Best /)).toHaveLength(2);
  });
});

describe('stats panel', () => {
  it('opens from the header on the current level with its numbers; the switch shows another level; Close goes back', async () => {
    await seed('snake:settings', { level: 'fast' });
    await seed('snake:stats', {
      ...EMPTY_STATS,
      normal: stats(4, 23, 50, 83_000),
      fast: stats(1, 7, 7, 90_000),
    });
    await open();

    press('Stats');

    expect(screen.queryByLabelText(/^Board /)).toBeNull();
    expect(selected('Fast stats')).toBe(true);
    expect(selected('Normal stats')).toBeFalsy();
    expect(screen.getByLabelText('Played: 1')).toBeTruthy();
    expect(screen.getByLabelText('Best: 7')).toBeTruthy();
    expect(screen.getByLabelText('Average: 7')).toBeTruthy();
    expect(screen.getByLabelText('Longest: 1:30')).toBeTruthy();

    press('Normal stats');

    expect(selected('Normal stats')).toBe(true);
    expect(screen.getByLabelText('Played: 4')).toBeTruthy();
    expect(screen.getByLabelText('Best: 23')).toBeTruthy();
    expect(screen.getByLabelText('Average: 13')).toBeTruthy();
    expect(screen.getByLabelText('Longest: 1:23')).toBeTruthy();

    press('Slow stats');

    expect(screen.getByLabelText('Played: 0')).toBeTruthy();
    expect(screen.getByLabelText('Best: —')).toBeTruthy();
    expect(screen.getByLabelText('Average: —')).toBeTruthy();
    expect(screen.getByLabelText('Longest: —')).toBeTruthy();

    press('Close');

    expect(screen.getByLabelText(/^Board /)).toBeTruthy();
    expect(screen.queryByLabelText('Played: 0')).toBeNull();
  });

  it('opening it pauses a running game and saves it; Close leaves it paused', async () => {
    await open();
    swipe('up');
    await tick(160);

    press('Stats');
    await tick(1000);
    await settle();
    expect((await saved('snake:save')).data).toMatchObject({
      snake: [
        [7, 11],
        [7, 12],
        [7, 13],
      ],
      elapsedMs: 160,
    });
    press('Close');

    expect(screen.getByText('Paused')).toBeTruthy();
    expect(head()).toEqual([8, 12]);
    press('Continue');
    await tick(160);
    expect(head()).toEqual([8, 11]);
  });

  it('opening it from the picker closes the picker', async () => {
    await open();

    press('New');
    press('Stats');

    expect(screen.queryByText('Pick a level')).toBeNull();
    expect(screen.getByLabelText('Played: 0')).toBeTruthy();
  });
});
