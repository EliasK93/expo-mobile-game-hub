import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { fromValues, type Dir, type Size } from '@/games/2048/logic/board';
import { newGame } from '@/games/2048/logic/game';

// newGame is replaced so each test starts from a board built by hand; play and the rest stay real.
jest.mock('@/games/2048/logic/game', () => ({ ...jest.requireActual('@/games/2048/logic/game'), newGame: jest.fn() }));
const realNewGame = jest.requireActual<typeof import('@/games/2048/logic/game')>('@/games/2048/logic/game').newGame;

// A fresh 4×4 (or n×n) game with these values, 0 = empty cell, in reading order.
const start = (values: number[]) => {
  const size = Math.round(Math.sqrt(values.length)) as Size;
  (newGame as jest.Mock).mockReset().mockReturnValue({ ...realNewGame(size, () => 0), board: fromValues(values) });
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

// A real drag through the board's PanResponder handlers: touch down at (100, 100), move by (dx, dy), lift.
// The handlers are called directly: the testing library does not fire touch events at an element whose should-set handlers say no.
const drag = (dx: number, dy: number) => {
  const pan = screen.getByTestId('board-pan').props;
  const event = (x: number, y: number, t: number) => ({
    nativeEvent: { touches: [{}] },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: t,
      touchBank: [
        { touchActive: true, startPageX: 100, startPageY: 100, startTimeStamp: 1, currentPageX: x, currentPageY: y, currentTimeStamp: t, previousPageX: 100, previousPageY: 100, previousTimeStamp: 1 },
      ],
    },
  });
  act(() => {
    pan.onStartShouldSetResponderCapture(event(100, 100, 1));
    pan.onResponderGrant(event(100, 100, 1));
    pan.onResponderMove(event(100 + dx, 100 + dy, 2));
    pan.onResponderRelease(event(100 + dx, 100 + dy, 2));
  });
};

beforeEach(async () => {
  // Spawns are predictable: the middle empty cell, a 2.
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  start(withTiles({ 3: 2 }));
  await open();
});

// The testing library unmounts the screen after each test; T2 saves nothing, so there is no late write to wait for.
afterEach(() => {
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

    fireEvent(screen.getByLabelText(/^Board \d+ by \d+/), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

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

    expect(screen.getByText('Game over')).toBeTruthy();
    const final = values();
    expect(final.every((v) => v > 0)).toBe(true);

    swipe('left');
    drag(60, 0);

    expect(values()).toEqual(final);
  });
});
