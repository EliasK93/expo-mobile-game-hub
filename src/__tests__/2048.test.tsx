import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { fromValues, type Dir, type Size } from '@/games/2048/logic/board';
import { newGame } from '@/games/2048/logic/game';
import { EMPTY_STATS, type SizeStats } from '@/games/2048/logic/stats';
import { SLIDE_MS } from '@/games/2048/ui/animated-tile';

// newGame is replaced so each test starts from a board built by hand; play and the rest stay real.
jest.mock('@/games/2048/logic/game', () => ({ ...jest.requireActual('@/games/2048/logic/game'), newGame: jest.fn() }));
const realNewGame = jest.requireActual<typeof import('@/games/2048/logic/game')>('@/games/2048/logic/game').newGame;

// A fresh 4×4 (or n×n) game with these values, 0 = empty cell, in reading order.
const start = (values: number[]) => {
  const size = Math.round(Math.sqrt(values.length)) as Size;
  // The tiles get the ids 1..k, so the next one is k + 1 (a spawn must not reuse an id: the board keys its tiles by it).
  const nextId = values.filter((v) => v > 0).length + 1;
  (newGame as jest.Mock)
    .mockReset()
    .mockReturnValue({ ...realNewGame(size, () => 0), board: fromValues(values), nextId });
};
const EMPTY = Array(16).fill(0);
const withTiles = (tiles: Record<number, number>) => EMPTY.map((v, i) => tiles[i] ?? v);

// settle() lets the pending storage promises finish (GameRoute's playtime write).
const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};
const open = async () => {
  renderRouter('./src/app', { initialUrl: '/2048' });
  await settle();
};

const saved = async (key: string) => JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');
const seed = (key: string, data: unknown) => AsyncStorage.setItem(key, JSON.stringify({ version: 1, data }));
// An unfinished game in storage, as a move would have left it.
const seedSave = (vals: number[], extra: Record<string, unknown> = {}) =>
  seed('2048:save', {
    size: Math.round(Math.sqrt(vals.length)),
    values: vals,
    score: 0,
    won: false,
    keptGoing: false,
    undoUsed: false,
    moves: 3,
    ...extra,
  });
const seedStats = (size: Size, stats: SizeStats) => seed('2048:stats', { ...EMPTY_STATS, [size]: stats });
// The screen reads storage when it opens, so a seed needs a reopen.
const reopen = async () => {
  screen.unmount();
  await settle();
  await open();
};
const useRealNewGame = () => (newGame as jest.Mock).mockReset().mockImplementation(realNewGame);
const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState.disabled;

// Every cell's value in reading order, 0 for an empty one, read from the board's accessibility value
// ("2, empty, 4, empty; ..." row by row).
const values = (): number[] =>
  screen
    .getByLabelText(/^Board \d+ by \d+/)
    .props.accessibilityValue.text.split(/[,;] /)
    .map((value: string) => (value === 'empty' ? 0 : Number(value)));
const tiles = () => values().filter((v) => v > 0);

const swipe = (dir: Dir) =>
  fireEvent(screen.getByLabelText(/^Board \d+ by \d+/), 'accessibilityAction', { nativeEvent: { actionName: dir } });

// A real drag through the swipe area's PanResponder handlers: touch down at (100, 100), move by (dx, dy), lift.
// The handlers are called directly: the testing library does not fire touch events at an element whose should-set handlers say no.
// A move too short for the area to take the gesture (onMoveShouldSet says no) ends the drag there, as on a device.
// The order is the device's: the area is asked at the move, is granted the gesture at that same move (which resets the
// distance PanResponder reports to 0) and the finger lifts; the pixels before the grant must still count.
const drag = (dx: number, dy: number) => {
  const pan = screen.getByTestId('swipe-area').props;
  const event = (x: number, y: number, t: number) => ({
    nativeEvent: { touches: [{}] },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: t,
      touchBank: [
        {
          touchActive: true,
          startPageX: 100,
          startPageY: 100,
          startTimeStamp: 1,
          currentPageX: x,
          currentPageY: y,
          currentTimeStamp: t,
          previousPageX: 100,
          previousPageY: 100,
          previousTimeStamp: 1,
        },
      ],
    },
  });
  act(() => {
    pan.onStartShouldSetResponderCapture(event(100, 100, 1));
    pan.onMoveShouldSetResponderCapture(event(100 + dx, 100 + dy, 2)); // this one updates PanResponder's distance
    if (!pan.onMoveShouldSetResponder(event(100 + dx, 100 + dy, 2))) return;
    pan.onResponderGrant(event(100 + dx, 100 + dy, 2));
    pan.onResponderMove(event(100 + dx, 100 + dy, 2));
    pan.onResponderRelease(event(100 + dx, 100 + dy, 2));
  });
};

beforeEach(async () => {
  // Spawns are predictable: the middle empty cell, a 2.
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  // Reduced motion on: no animation, so every test below sees the board change at once. The Animations tests switch it off.
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  start(withTiles({ 3: 2 }));
  await open();
});

// The testing library has unmounted the screen by now; let the last writes land before the next test clears storage
// (a late save would leak into it).
afterEach(async () => {
  await settle();
  jest.restoreAllMocks();
});

describe('2048 screen', () => {
  it('opens from home and shows a 4×4 board with Score and Best', () => {
    expect(screen.getByLabelText('Board 4 by 4', { exact: false })).toBeTruthy();
    expect(values()).toHaveLength(16);
    expect(screen.getByLabelText('Score 0')).toBeTruthy();
    expect(screen.getByLabelText('Best 0')).toBeTruthy();
  });

  it('moves the tiles on an accessibility action', () => {
    swipe('left');

    expect(values()[0]).toBe(2);
    expect(values()[3]).toBe(0);
    expect(tiles()).toHaveLength(2); // the moved tile and the new one
  });

  it('ignores accessibility actions that are not one of the four moves', () => {
    const before = values();

    fireEvent(screen.getByLabelText(/^Board \d+ by \d+/), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    expect(values()).toEqual(before);
    expect(screen.getByLabelText('Score 0')).toBeTruthy();
  });

  it('writes a four-digit score with a thousands comma', async () => {
    start(withTiles({ 0: 1024, 1: 1024 }));
    screen.unmount();
    await open();

    swipe('left');

    expect(screen.getByLabelText('Score 2,048')).toBeTruthy();
    expect(screen.getByLabelText('Best 2,048')).toBeTruthy();
  });

  it('merges equal tiles, adds the merge to Score and lets Best follow', async () => {
    start(withTiles({ 0: 2, 1: 2 }));
    screen.unmount();
    await open();

    swipe('left');

    expect(values()[0]).toBe(4);
    expect(screen.getByLabelText('Score 4')).toBeTruthy();
    expect(screen.getByLabelText('Best 4')).toBeTruthy();
    expect(screen.queryByTestId('ghost')).toBeNull(); // reduced motion: the merged-away tile is not drawn sliding
  });

  it('a swipe that changes nothing spawns no tile and leaves the score', async () => {
    start(withTiles({ 0: 2, 1: 4, 2: 8, 3: 16 }));
    screen.unmount();
    await open();
    const before = values();

    swipe('left');

    expect(values()).toEqual(before);
    expect(screen.getByLabelText('Score 0')).toBeTruthy();
  });

  it('moves the tiles on a drag across the board, ignoring a short one', () => {
    drag(-5, 3);
    expect(values()[3]).toBe(2); // 5 px is no swipe

    drag(-60, 4);
    expect(values()[0]).toBe(2);
    expect(values()[3]).toBe(0);
    expect(tiles()).toHaveLength(2);
  });

  it('counts a small drag: 10 px moves the tiles, 6 px does not', () => {
    drag(-6, 0);
    expect(values()[3]).toBe(2);

    drag(-10, 0);
    expect(values()[0]).toBe(2);
    expect(values()[3]).toBe(0);
  });

  it('takes swipes on a wrapper around the board and the free area below it, not on the board itself', () => {
    const area = screen.getByTestId('swipe-area');
    const board = screen.getByLabelText(/^Board \d+ by \d+/);

    expect(within(area).getByLabelText(/^Board \d+ by \d+/)).toBe(board);
    expect(board.props.onMoveShouldSetResponder).toBeUndefined();
    expect(area.props.onMoveShouldSetResponder).toBeDefined();

    drag(0, 40); // a drag that starts under the board reaches the same handlers
    expect(values()[15]).toBe(2);
  });

  it('a drag decides by its longer axis', () => {
    drag(5, 60);
    expect(values()[15]).toBe(2); // down: the tile at the top right slides to the bottom right
  });

  it('New game opens the size picker; a size starts a game of that size', () => {
    (newGame as jest.Mock).mockReset().mockImplementation(realNewGame);
    fireEvent.press(screen.getByLabelText('New game'));

    expect(screen.getByText('Pick a size')).toBeTruthy();
    expect(screen.queryByLabelText(/^Board/)).toBeNull();

    fireEvent.press(screen.getByLabelText('Size 7×7'));

    expect(screen.getByLabelText('Board 7 by 7', { exact: false })).toBeTruthy();
    expect(values()).toHaveLength(49);
    expect(tiles()).toHaveLength(2);
  });

  it('Cancel in the picker keeps the running game', () => {
    swipe('left');
    const running = values();

    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Cancel'));

    expect(values()).toEqual(running);
  });

  it('shows "Game over" when the last move fills the board, and further moves do nothing', async () => {
    // After a right move the last row is `. 4 8 4` and the new 2 fills the gap: no equal neighbours are left.
    start([4, 8, 4, 8, 8, 4, 8, 4, 4, 8, 4, 8, 4, 8, 4, 0]);
    screen.unmount();
    await open();
    expect(screen.queryByText('Game over')).toBeNull();

    swipe('right');
    fireEvent.press(screen.getByLabelText('Close')); // the stats panel opens by itself; Close shows the finished board

    expect(screen.getByText('Game over')).toBeTruthy();
    const final = values();
    expect(final.every((v) => v > 0)).toBe(true);

    swipe('left');
    drag(60, 0);

    expect(values()).toEqual(final);
  });
});

// A board one swipe left from ending the game: the last row's 2 2 merge, and the 2 that spawns fills the last gap.
const ENDING = [4, 8, 4, 8, 8, 4, 8, 4, 16, 8, 4, 8, 2, 2, 16, 32];
// Two halves of the win tile side by side: a swipe left reaches it.
const NEARLY_WON = withTiles({ 0: 1024, 1: 1024 });

const toGame = async (board: number[], extra?: Record<string, unknown>) => {
  await seedSave(board, extra);
  await reopen();
};

describe('undo', () => {
  it('restores the board and the score, and the spawned tile goes too', async () => {
    start(withTiles({ 0: 2, 1: 2 }));
    await reopen();
    const before = values();

    swipe('left');
    expect(values()[0]).toBe(4);
    expect(screen.getByLabelText('Score 4')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Undo'));

    expect(values()).toEqual(before);
    expect(screen.getByLabelText('Score 0')).toBeTruthy();
  });

  it('is disabled at the start, right after an undo and after a resume', async () => {
    expect(disabled('Undo')).toBe(true);

    swipe('left');
    expect(disabled('Undo')).toBeFalsy();
    fireEvent.press(screen.getByLabelText('Undo'));
    expect(disabled('Undo')).toBe(true);

    swipe('left');
    await settle();
    await reopen();
    expect(disabled('Undo')).toBe(true);
  });

  it('is saved, with the undo mark', async () => {
    swipe('left');
    fireEvent.press(screen.getByLabelText('Undo'));
    await settle();

    expect((await saved('2048:save')).data).toMatchObject({ undoUsed: true, score: 0 });
  });
});

describe('win', () => {
  beforeEach(async () => {
    start(NEARLY_WON);
    await reopen();
    swipe('left');
  });

  it('shows the overlay when the win tile is reached, and hides Undo while it is open', () => {
    expect(screen.getByText('You win!')).toBeTruthy();
    expect(screen.getByLabelText('Keep going')).toBeTruthy();
    expect(screen.queryByLabelText('Undo')).toBeNull();
  });

  it('ignores swipes while it is open', () => {
    const before = values();

    swipe('right');
    drag(60, 0);

    expect(values()).toEqual(before);
    expect(screen.getByText('You win!')).toBeTruthy();
  });

  it('Keep going closes it for good, brings Undo back and survives a reopen', async () => {
    fireEvent.press(screen.getByLabelText('Keep going'));
    await settle();

    expect(screen.queryByText('You win!')).toBeNull();
    expect(disabled('Undo')).toBeFalsy();
    swipe('right'); // the game carries on
    expect(values()[3]).not.toBe(0);

    await settle();
    await reopen();
    expect(screen.queryByText('You win!')).toBeNull();
    expect(screen.getByLabelText('Score 2,048')).toBeTruthy();
  });

  it('comes back on a reopen if Keep going was never pressed', async () => {
    await settle();
    await reopen();

    expect(screen.getByText('You win!')).toBeTruthy();
  });

  it('New game on it opens the size picker', () => {
    fireEvent.press(screen.getByLabelText('New game after win'));

    expect(screen.getByText('Pick a size')).toBeTruthy();
  });
});

describe('resume', () => {
  it('opens a saved game directly, at the same board and score', async () => {
    await toGame(withTiles({ 0: 8, 5: 64 }), { score: 1234 });

    expect(values()).toEqual(withTiles({ 0: 8, 5: 64 }));
    expect(screen.getByLabelText('Score 1,234')).toBeTruthy();
    expect(screen.queryByText('Pick a size')).toBeNull();
  });

  it('saves after every move', async () => {
    swipe('left');
    await settle();

    expect((await saved('2048:save')).data).toEqual({
      size: 4,
      values: values(),
      score: 0,
      won: false,
      keptGoing: false,
      undoUsed: false,
      moves: 1,
    });
  });

  it('without a save starts a new game of the stored size, 4×4 the first time', async () => {
    useRealNewGame();
    await reopen();
    expect(screen.getByLabelText('Board 4 by 4', { exact: false })).toBeTruthy();

    await seed('2048:settings', { size: 5 });
    await reopen();
    expect(screen.getByLabelText('Board 5 by 5', { exact: false })).toBeTruthy();
    expect(tiles()).toHaveLength(2);
  });

  it('ignores a save from a finished game', async () => {
    await toGame([4, 8, 4, 8, 8, 4, 8, 4, 4, 8, 4, 8, 8, 4, 8, 4]);

    expect(values()).toEqual(withTiles({ 3: 2 })); // the new game from start() in beforeEach
    expect(screen.queryByText('Game over')).toBeNull();
  });

  it('Best starts from the stored best score', async () => {
    await seedStats(4, { played: 2, wins: 0, bestScore: 500, bestTile: 64 });
    await reopen();

    expect(screen.getByLabelText('Best 500')).toBeTruthy();
  });
});

describe('size picker', () => {
  it('marks the last used size from the setting, not the running game, and shows the bests', async () => {
    await seedSave(
      Array(36)
        .fill(0)
        .map((v, i) => (i === 0 ? 2 : v)),
    );
    await seed('2048:settings', { size: 5 });
    await seedStats(6, { played: 1, wins: 0, bestScore: 4321, bestTile: 256 });
    await reopen();
    expect(screen.getByLabelText('Board 6 by 6', { exact: false })).toBeTruthy();

    fireEvent.press(screen.getByLabelText('New game'));

    expect(screen.getByLabelText('Size 5×5').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Size 6×6').props.accessibilityState.selected).toBeFalsy();
    expect(screen.getByText('Best 4,321')).toBeTruthy();
    expect(screen.queryByText(/^Best 0/)).toBeNull();
  });

  it('stores the picked size as the setting', async () => {
    useRealNewGame();
    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Size 6×6'));
    await settle();

    expect((await saved('2048:settings')).data).toEqual({ size: 6 });
  });
});

describe('abandoning', () => {
  it('a started game becomes a played game in the stats, and its save goes', async () => {
    start(withTiles({ 0: 2, 1: 2 }));
    await reopen();
    swipe('left'); // score 4, best tile 4
    await settle();
    expect(await saved('2048:save')).not.toBeNull();

    useRealNewGame();
    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Size 5×5'));
    await settle();

    expect((await saved('2048:stats')).data['4']).toEqual({ played: 1, wins: 0, bestScore: 4, bestTile: 4 });
    expect(await saved('2048:save')).toBeNull();
    expect(screen.getByLabelText('Board 5 by 5', { exact: false })).toBeTruthy();
  });

  it('a game that reached the win tile is recorded as a win', async () => {
    await toGame(NEARLY_WON);
    swipe('left');
    fireEvent.press(screen.getByLabelText('Keep going'));

    useRealNewGame();
    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Size 5×5'));
    await settle();

    expect((await saved('2048:stats')).data['4']).toEqual({ played: 1, wins: 1, bestScore: 2048, bestTile: 2048 });
  });

  it('an unstarted game is not recorded', async () => {
    useRealNewGame();
    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Size 5×5'));
    await settle();

    expect(await saved('2048:stats')).toBeNull();
  });

  it('Cancel records nothing and keeps the save', async () => {
    swipe('left');
    await settle();

    fireEvent.press(screen.getByLabelText('New game'));
    fireEvent.press(screen.getByLabelText('Cancel'));
    await settle();

    expect(await saved('2048:stats')).toBeNull();
    expect(await saved('2048:save')).not.toBeNull();
  });
});

describe('game over', () => {
  beforeEach(async () => {
    await seedSave(ENDING, { moves: 5 });
    await reopen();
    swipe('left');
    await settle();
  });

  it('opens the stats panel with the result line, a new best', () => {
    expect(screen.getByText('Score 4 · best tile 32 · New best!')).toBeTruthy();
    expect(screen.queryByLabelText(/^Board/)).toBeNull();
    expect(screen.getByLabelText('Play again')).toBeTruthy();
  });

  it('deletes the save and writes the stats', async () => {
    expect(await saved('2048:save')).toBeNull();
    expect((await saved('2048:stats')).data['4']).toEqual({ played: 1, wins: 0, bestScore: 4, bestTile: 32 });
  });

  it('Play again starts a new game of the same size', () => {
    useRealNewGame();
    fireEvent.press(screen.getByLabelText('Play again'));

    expect(screen.getByLabelText('Board 4 by 4', { exact: false })).toBeTruthy();
    expect(tiles()).toHaveLength(2);
    expect(screen.queryByText('Game over')).toBeNull();
  });

  it('Close shows the dimmed finished board, with Undo disabled', () => {
    fireEvent.press(screen.getByLabelText('Close'));

    expect(screen.getByText('Game over')).toBeTruthy();
    expect(values().every((v) => v > 0)).toBe(true);
    expect(disabled('Undo')).toBe(true);
  });

  it('a swipe on the finished board counts no second game', async () => {
    fireEvent.press(screen.getByLabelText('Close'));

    swipe('left');
    drag(60, 0);
    await settle();

    expect((await saved('2048:stats')).data['4'].played).toBe(1);
  });

  it('Change size opens the picker; picking one does not count the finished game again', async () => {
    useRealNewGame();
    fireEvent.press(screen.getByLabelText('Change size'));
    expect(screen.getByText('Pick a size')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Size 5×5'));
    await settle();

    expect(screen.getByLabelText('Board 5 by 5', { exact: false })).toBeTruthy();
    expect((await saved('2048:stats')).data['4'].played).toBe(1);
  });
});

describe('the undo rule', () => {
  it('a won game with undo counts as a win but leaves the bests alone', async () => {
    const won = [2048, 8, 4, 8, 8, 4, 8, 4, 4, 8, 4, 8, 4, 8, 4, 0];
    await seedStats(4, { played: 1, wins: 0, bestScore: 100, bestTile: 64 });
    await toGame(won, { score: 5000, won: true, keptGoing: true, undoUsed: true });
    expect(screen.getByLabelText('Best 100')).toBeTruthy(); // the score is higher, the Best box still shows the stored best

    swipe('right');
    await settle();

    expect(screen.getByText('Score 5,000 · best tile 2048 · with undo')).toBeTruthy();
    expect((await saved('2048:stats')).data['4']).toEqual({ played: 2, wins: 1, bestScore: 100, bestTile: 64 });
  });
});

describe('Animations', () => {
  const tick = (ms: number) => act(() => jest.advanceTimersByTime(ms));

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    start(withTiles({ 0: 2, 1: 2 }));
    await reopen(); // the screen reads the setting when it opens
  });

  afterEach(() => jest.useRealTimers());

  it('draws the merged-away tile sliding for one slide, then drops it', () => {
    swipe('left');

    expect(screen.getByTestId('ghost')).toBeTruthy();
    expect(values()[0]).toBe(4); // the board is final at once, the ghost is only drawn

    tick(SLIDE_MS - 1);
    expect(screen.getByTestId('ghost')).toBeTruthy();

    tick(1);
    expect(screen.queryByTestId('ghost')).toBeNull();
  });

  it('has the spawned tile on the board, and it is still there once the animation is over', () => {
    swipe('left');
    expect(screen.getByTestId('tile-3')).toBeTruthy(); // the new tile: the start() game's next id is 3

    tick(5 * SLIDE_MS);

    expect(screen.getByTestId('tile-3')).toBeTruthy();
    expect(tiles()).toHaveLength(2);
  });

  it('a swipe in the middle of an animation still applies: both moves are on the board and the ghost is gone', () => {
    swipe('left');
    tick(SLIDE_MS / 2);
    swipe('down');

    expect(screen.queryByTestId('ghost')).toBeNull();
    expect(values()[0]).toBe(0); // the 4 has moved down
    expect([...tiles()].sort((a, b) => a - b)).toEqual([2, 2, 4]); // the 4, the first spawn, the second spawn
    expect(screen.getByLabelText('Score 4')).toBeTruthy();

    tick(5 * SLIDE_MS);

    expect(tiles()).toHaveLength(3);
  });

  it('keeps a tile at least one pixel wide on a very short area', async () => {
    await toGame(
      Array(49)
        .fill(0)
        .map((v, i) => (i === 0 ? 2 : v)),
    );

    fireEvent(screen.getByTestId('game-area'), 'layout', { nativeEvent: { layout: { height: 50 } } });

    expect(StyleSheet.flatten(screen.getByTestId('tile-1').props.style).width).toBeGreaterThanOrEqual(1);
  });
});

describe('header Stats', () => {
  it('opens the panel with no result line and no new-game buttons, and Close returns to the game', () => {
    swipe('left');
    const board = values();

    fireEvent.press(screen.getByLabelText('Stats'));

    expect(screen.getByLabelText('Played: 0')).toBeTruthy();
    expect(screen.queryByText(/^Score /)).toBeNull();
    expect(screen.queryByLabelText('Play again')).toBeNull();
    expect(screen.queryByLabelText('Change size')).toBeNull();
    expect(screen.queryByLabelText(/^Board/)).toBeNull();

    fireEvent.press(screen.getByLabelText('Close'));

    expect(values()).toEqual(board);
  });

  it('the size switch opens on the current size and changes the numbers', async () => {
    await seedStats(5, { played: 3, wins: 1, bestScore: 12_345, bestTile: 512 });
    await reopen();

    fireEvent.press(screen.getByLabelText('Stats'));
    expect(screen.getByLabelText('4×4 stats').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Best score: —')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('5×5 stats'));

    expect(screen.getByLabelText('Played: 3')).toBeTruthy();
    expect(screen.getByLabelText('Wins: 1')).toBeTruthy();
    expect(screen.getByLabelText('Best score: 12,345')).toBeTruthy();
    expect(screen.getByLabelText('Best tile: 512')).toBeTruthy();
  });
});
