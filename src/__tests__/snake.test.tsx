import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { AppState } from 'react-native';

import { placeApple } from '@/games/snake/logic/apple';
import { cell, type Dir } from '@/games/snake/logic/board';
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

  it('the result says New best! only when the score beats the best of the session', async () => {
    place(at(8, 12));
    await open();
    swipe('up');
    await ticks(14);
    expect(screen.getByText('Game over · 1 apple · New best!')).toBeTruthy();
    expect(screen.getByLabelText('Best 1')).toBeTruthy();

    place(at(8, 12));
    fireEvent.press(screen.getByLabelText('Play again'));
    expect(screen.getByLabelText('Best 1')).toBeTruthy();
    expect(screen.getByLabelText('Normal · Score 0')).toBeTruthy();
    swipe('up');
    await ticks(14);
    expect(screen.getByText('Game over · 1 apple')).toBeTruthy();

    place(at(8, 12), at(8, 11));
    fireEvent.press(screen.getByLabelText('Play again'));
    swipe('up');
    await ticks(14);
    expect(screen.getByText('Game over · 2 apples · New best!')).toBeTruthy();
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
