import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import type { Level } from '@/games/make24/logic/game';
import { pickPuzzle, POOL } from '@/games/make24/logic/pool';
import { EMPTY_STATS, type LevelStats } from '@/games/make24/logic/stats';

// pickPuzzle is replaced so each test starts from hand-picked numbers; everything else stays real.
jest.mock('@/games/make24/logic/pool', () => ({
  ...jest.requireActual('@/games/make24/logic/pool'),
  pickPuzzle: jest.fn(),
}));

const realPickPuzzle =
  jest.requireActual<typeof import('@/games/make24/logic/pool')>('@/games/make24/logic/pool').pickPuzzle;

const M = '−'; // the minus sign, not a hyphen
const P3388 = [8, 3, 8, 3]; // the order the pool serves is not sorted on purpose: the game sorts it to 3 3 8 8
const P1234 = [1, 2, 3, 4];
const P1155 = [5, 1, 5, 1];

// The next puzzles the mock serves, in order; the last one repeats once the list is used up.
const serve = (...sets: number[][]) => {
  let i = 0;
  (pickPuzzle as jest.Mock).mockReset().mockImplementation(() => {
    const numbers = sets[Math.min(i++, sets.length - 1)];
    return { numbers, order: { puzzles: [], next: 0 } };
  });
};

// settle() lets the pending storage promises finish (GameRoute's playtime write).
const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};
const open = async (...sets: number[][]) => {
  serve(...(sets.length ? sets : [P3388, P1234]));
  renderRouter('./src/app', { initialUrl: '/make24' });
  await settle();
};

const OPS = { '+': 'Plus', '-': 'Minus', '*': 'Times', '/': 'Divided by' } as const;
type Op = keyof typeof OPS;

// Taps in order: a number is a card's place (0-3, left to right, top to bottom), an operator is the operator button.
const play = (...actions: (number | Op)[]) =>
  actions.forEach((a) =>
    fireEvent.press(typeof a === 'number' ? screen.getByTestId(`card-${a}`) : screen.getByLabelText(OPS[a])),
  );
const press = (label: string) => fireEvent.press(screen.getByLabelText(label));
const label = (i: number) => screen.getByTestId(`card-${i}`).props.accessibilityLabel as string;
const selected = (name: string) => screen.getByLabelText(name).props.accessibilityState.selected;
const disabled = (name: string) => screen.getByLabelText(name).props.accessibilityState.disabled;
// The colour of a card's face (CardFace's own view, testID face-<place>).
const faceColor = (i: number) => StyleSheet.flatten(screen.getByTestId(`face-${i}`).props.style).backgroundColor;
const tick = (ms: number) => act(() => jest.advanceTimersByTime(ms));

// 3 3 8 8 sits on places 0 1 2 3. Solved by 8 ÷ 3, then 3 − 8/3 (= 1/3), then 8 ÷ 1/3.
const SOLVE: (number | Op)[] = [2, '/', 0, 1, '-', 0, 3, '/', 0];

afterEach(async () => {
  jest.useRealTimers();
  await settle();
});

describe('opening', () => {
  it('home opens Make 24 on the first Easy puzzle: four cards sorted ascending and the timer at 0:00', async () => {
    serve(P3388);
    renderRouter('./src/app', { initialUrl: '/' });
    await settle();

    fireEvent.press(screen.getByText('Make 24'));
    await settle();

    expect(pickPuzzle).toHaveBeenCalledWith('easy', null, expect.any(Function));
    expect([0, 1, 2, 3].map(label)).toEqual(['Card 3', 'Card 3', 'Card 8', 'Card 8']);
    expect(screen.getByLabelText('Time 0:00')).toBeTruthy();
    expect(screen.getByText('Easy · 0:00')).toBeTruthy();
    expect(screen.queryByTestId(/^empty-/)).toBeNull();
  });
});

describe('selecting', () => {
  beforeEach(() => open());

  it('a tap selects a card, a second tap deselects it, another card switches the selection', () => {
    play(0);
    expect(label(0)).toBe('Card 3, selected');

    play(0);
    expect(label(0)).toBe('Card 3');

    play(0, 2);
    expect([label(0), label(2)]).toEqual(['Card 3', 'Card 8, selected']);
  });

  it('the selected card has the selection colour, the others the plain card colour', () => {
    play(0);

    expect(faceColor(0)).toBe(Colors.light.cellSelected);
    expect(faceColor(1)).toBe(Colors.light.backgroundElement);
  });

  it('an operator selects, switches and deselects while a card is selected', () => {
    play(0, '+');
    expect(selected('Plus')).toBe(true);

    play('*');
    expect([selected('Plus'), selected('Times')]).toEqual([false, true]);

    play('*');
    expect(selected('Times')).toBe(false);
  });
});

describe('combining', () => {
  beforeEach(() => open());

  it('8 − 3 is 5 and 3 − 8 is −5: the first card is the left side', () => {
    play(2, '-', 0);

    expect(label(0)).toBe('Card 5, selected');
  });

  it('3 − 8 is −5', () => {
    play(0, '-', 2);

    expect(label(2)).toBe(`Card ${M}5, selected`);
  });

  it('8 ÷ 3 is 8/3 in the second card’s place; the first place is empty and not a button, the result stays selected', () => {
    play(2, '/', 0);

    expect(label(0)).toBe('Card 8/3, selected');
    expect(screen.getByTestId('empty-2')).toBeTruthy();
    expect(screen.queryByTestId('card-2')).toBeNull();
    expect(screen.queryAllByLabelText(/^Card /)).toHaveLength(3);
    expect(selected('Divided by')).toBeFalsy(); // the operator is cleared
  });

  it('÷ 0 does not combine and says so: build a 0 first, then divide by it', () => {
    play(0, '-', 1); // 3 − 3 = 0 in place 1
    expect(label(1)).toBe('Card 0, selected');

    play(2, '/', 1); // 8 ÷ 0

    expect(StyleSheet.flatten(screen.getByText("Can't divide by 0").props.style).color).toBe(
      Colors.light.digitConflict,
    );
    expect([label(1), label(2)]).toEqual(['Card 0', 'Card 8, selected']);
  });
});

describe('finishing', () => {
  beforeEach(() => open());

  it('solving 3 3 8 8 by taps shows the result line and Next; Undo, Hint and Give up are gone, the operators are disabled', () => {
    play(...SOLVE);

    expect(label(0)).toBe('Card 24, selected');
    expect(screen.getByText('Solved in 0:00 · New best!')).toBeTruthy();
    expect(screen.getByLabelText('Next')).toBeTruthy();
    expect(screen.getByLabelText('New')).toBeTruthy();
    for (const name of ['Undo', 'Hint', 'Give up']) expect(screen.queryByLabelText(name)).toBeNull();
    for (const name of Object.values(OPS)) expect(disabled(name)).toBe(true);
    fireEvent.press(screen.getByTestId('card-0'));
    expect(label(0)).toBe('Card 24, selected');
  });

  it('one card left that is not 24 says so, and Undo brings the cards back', () => {
    play(0, '+', 1, 2, '+', 1, 3, '+', 1); // 3 + 3 + 8 + 8 = 22

    expect(screen.getByText("That's 22, not 24")).toBeTruthy();
    expect(screen.queryByText(/^Solved/)).toBeNull();

    press('Undo');

    expect(screen.queryByText("That's 22, not 24")).toBeNull();
    expect([label(1), label(3)]).toEqual(['Card 14', 'Card 8']);
  });

  it('Undo goes back step by step to the start, where it is disabled', () => {
    play(2, '/', 0, 1, '-', 0);
    expect(disabled('Undo')).toBe(false);

    press('Undo');
    expect([0, 1, 2].map((i) => screen.queryByTestId(`card-${i}`)?.props.accessibilityLabel)).toEqual([
      'Card 8/3',
      'Card 3',
      undefined,
    ]);
    expect(screen.getByTestId('empty-2')).toBeTruthy();

    press('Undo');
    expect([0, 1, 2, 3].map(label)).toEqual(['Card 3', 'Card 3', 'Card 8', 'Card 8']);
    expect(disabled('Undo')).toBe(true);
  });

  it('Hint shows a "Try" step and marks the two cards of it', () => {
    press('Hint');

    expect(screen.getByText(/^Try /)).toBeTruthy();
    expect(screen.queryAllByLabelText(/, hint$/)).toHaveLength(2);
    expect([0, 1, 2, 3].filter((i) => faceColor(i) === Colors.light.cellHint)).toHaveLength(2);
  });

  it('a solve after a hint says "with hints"', () => {
    press('Hint');
    play(...SOLVE);

    expect(screen.getByText('Solved with hints in 0:00')).toBeTruthy();
  });

  it('a hint on cards that cannot make 24 says to undo a step', () => {
    play(0, '-', 1); // 3 − 3 = 0: 0, 8 and 8 cannot make 24

    press('Hint');

    expect(screen.getByText("These cards can't make 24, undo a step")).toBeTruthy();
    expect(screen.queryAllByLabelText(/, hint$/)).toHaveLength(0);
  });

  it('Give up shows the solution steps and Next, which starts the next puzzle', () => {
    press('Give up');

    expect(screen.getByText(/ = 24$/).props.children).toMatch(/ · .* · /); // 3 3 8 8 takes three steps
    expect(screen.getByLabelText('Next')).toBeTruthy();
    expect(screen.queryByLabelText('Give up')).toBeNull();
    expect(screen.queryByText(/^Solved/)).toBeNull();

    press('Next');

    expect(label(0)).toBe('Card 1');
  });

  it('Next starts the next puzzle', () => {
    play(...SOLVE);

    press('Next');

    expect([0, 1, 2, 3].map(label)).toEqual(['Card 1', 'Card 2', 'Card 3', 'Card 4']);
    expect(pickPuzzle).toHaveBeenLastCalledWith('easy', expect.anything(), expect.any(Function));
    expect(screen.queryByText(/^Solved/)).toBeNull();
    expect(screen.getByLabelText('Hint')).toBeTruthy();
    expect(screen.queryByLabelText('Next')).toBeNull();
  });
});

describe('level picker', () => {
  beforeEach(() => open(P3388, P1234, P1155));

  it('New opens it in place of the cards, with Easy marked as last used', () => {
    press('New');

    expect(screen.getByText('Pick a level')).toBeTruthy();
    expect(screen.getByText('Easy (last used)')).toBeTruthy();
    expect(selected('Easy')).toBe(true);
    expect(selected('Medium')).toBeFalsy();
    expect(selected('Hard')).toBeFalsy();
    expect(screen.queryByTestId('card-0')).toBeNull();
    expect(screen.queryByLabelText('Plus')).toBeNull();
  });

  it('picking Hard after a solved puzzle starts a Hard puzzle and marks Hard the next time', () => {
    play(...SOLVE);
    press('New');
    press('Hard');

    expect(pickPuzzle).toHaveBeenLastCalledWith('hard', null, expect.any(Function));
    expect(screen.queryByText(/^Solved/)).toBeNull();
    expect([0, 1, 2, 3].map(label)).toEqual(['Card 1', 'Card 2', 'Card 3', 'Card 4']);
    expect(screen.getByText('Hard · 0:00')).toBeTruthy();

    press('New');
    expect(screen.getByText('Hard (last used)')).toBeTruthy();
    expect(selected('Hard')).toBe(true);
    expect(selected('Easy')).toBeFalsy();
  });

  it('Cancel returns to the same board', () => {
    play(2, '/', 0);

    press('New');
    press('Cancel');

    expect(label(0)).toBe('Card 8/3, selected');
    expect(screen.getByTestId('empty-2')).toBeTruthy();
    expect(pickPuzzle).toHaveBeenCalledTimes(1);
  });
});

describe('timer', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await open();
  });

  it('runs from the moment the puzzle is shown, not from the first tap', () => {
    tick(3000);

    expect(screen.getByLabelText('Time 0:03')).toBeTruthy();
    expect(screen.getByText('Easy · 0:03')).toBeTruthy();
  });

  it('stops when the puzzle is solved, and the result line shows that time', () => {
    tick(3000);
    play(...SOLVE);

    tick(5000);

    expect(screen.getByLabelText('Time 0:03')).toBeTruthy();
    expect(screen.getByText('Solved in 0:03 · New best!')).toBeTruthy();
  });

  it('stops while the picker is open', () => {
    tick(2000);

    press('New');
    tick(5000);
    press('Cancel');

    expect(screen.getByLabelText('Time 0:02')).toBeTruthy();
    tick(1000);
    expect(screen.getByLabelText('Time 0:03')).toBeTruthy();
  });

  it('goes back to 0:00 on Next and on a new level', () => {
    tick(3000);
    play(...SOLVE);
    press('Next');
    expect(screen.getByLabelText('Time 0:00')).toBeTruthy();
    tick(2000);
    expect(screen.getByLabelText('Time 0:02')).toBeTruthy();

    press('New');
    press('Medium');

    expect(screen.getByLabelText('Time 0:00')).toBeTruthy();
  });
});

// ---- M4: save, stats, abandon, order ----

const saved = async (key: string) => JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');
const seed = (key: string, data: unknown) => AsyncStorage.setItem(key, JSON.stringify({ version: 1, data }));
const stats = (played: number, solved: number, currentStreak: number, bestStreak: number, bestMs: number | null) =>
  ({ played, solved, currentStreak, bestStreak, bestMs }) satisfies LevelStats;
const seedStats = (level: Level, s: LevelStats) => seed('make24:stats', { ...EMPTY_STATS, [level]: s });
// Fake timers make the times in the result line and the save exact.
const openFake = async (...sets: number[][]) => {
  jest.useFakeTimers();
  await open(...sets);
};
// The real pickPuzzle (and so the real order), for the tests of the stored order.
const openReal = async () => {
  (pickPuzzle as jest.Mock).mockReset().mockImplementation(realPickPuzzle);
  renderRouter('./src/app', { initialUrl: '/make24' });
  await settle();
};
const cardsOf = (puzzle: number[]) => [...puzzle].sort((a, b) => a - b).map((n) => `Card ${n}`);
const onScreen = () => [0, 1, 2, 3].map(label);

// 3 3 8 8 after 8 ÷ 3 (place 2 into place 0), with one hint used and 42 s on the clock.
const STEP_DIV = { first: 2, second: 0, op: '/' } as const;
const SAVE = { level: 'easy', numbers: [3, 3, 8, 8], steps: [STEP_DIV], hints: 1, elapsedMs: 42_000 };
const SOLVE_STEPS = [STEP_DIV, { first: 1, second: 0, op: '-' }, { first: 3, second: 0, op: '/' }];

describe('resume', () => {
  it('opens a saved puzzle directly, with its cards, its hint and its time', async () => {
    jest.useFakeTimers();
    await seed('make24:save', SAVE);
    await open(P1234);

    expect(label(0)).toBe('Card 8/3, selected');
    expect(screen.getByTestId('empty-2')).toBeTruthy();
    expect(screen.getByLabelText('Time 0:42')).toBeTruthy();
    expect(pickPuzzle).not.toHaveBeenCalled();
    expect(screen.queryByText('Pick a level')).toBeNull();

    play(1, '-', 0, 3, '/', 0);

    expect(screen.getByText('Solved with hints in 0:42')).toBeTruthy();
  });

  it.each([
    ['a bad save', { ...SAVE, numbers: [3, 3, 8] }],
    ['a finished one', { ...SAVE, steps: SOLVE_STEPS }],
  ])('ignores %s and starts the next puzzle', async (_, data) => {
    await seed('make24:save', data);
    await open(P1234);

    expect(onScreen()).toEqual(['Card 1', 'Card 2', 'Card 3', 'Card 4']);
    expect(screen.getByLabelText('Time 0:00')).toBeTruthy();
  });

  it('without a save starts a puzzle of the stored last level, Easy the first time', async () => {
    await open(P1234);
    expect(pickPuzzle).toHaveBeenCalledWith('easy', null, expect.any(Function));

    screen.unmount();
    await settle(); // leaving the screen saves the puzzle too, so the save is removed after that
    await AsyncStorage.removeItem('make24:save');
    await seed('make24:settings', { level: 'hard' });
    serve(P1155);
    renderRouter('./src/app', { initialUrl: '/make24' });
    await settle();

    expect(pickPuzzle).toHaveBeenLastCalledWith('hard', null, expect.any(Function));
    expect(screen.getByText('Hard · 0:00')).toBeTruthy();
    press('New');
    expect(screen.getByText('Hard (last used)')).toBeTruthy();
  });
});

describe('saving', () => {
  it('saves after a combine and after a hint', async () => {
    await open();

    play(2, '/', 0);
    await settle();
    expect((await saved('make24:save')).data).toEqual({
      level: 'easy',
      numbers: [3, 3, 8, 8],
      steps: [STEP_DIV],
      hints: 0,
      elapsedMs: expect.any(Number),
    });

    press('Hint');
    await settle();
    expect((await saved('make24:save')).data).toMatchObject({ steps: [STEP_DIV], hints: 1 });
  });

  it('leaving the screen saves the time', async () => {
    await openFake();
    play(2, '/', 0);
    act(() => jest.advanceTimersByTime(4000));

    screen.unmount();
    await settle();

    expect((await saved('make24:save')).data).toMatchObject({ steps: [STEP_DIV], elapsedMs: 4000 });
  });

  it('Next saves the new puzzle', async () => {
    await open(P3388, P1234);
    press('Give up');
    await settle();
    expect(await saved('make24:save')).toBeNull();

    press('Next');
    await settle();

    expect((await saved('make24:save')).data).toEqual({
      level: 'easy',
      numbers: [1, 2, 3, 4],
      steps: [],
      hints: 0,
      elapsedMs: 0,
    });
  });
});

describe('order', () => {
  it('stores the order of the level and moves it on with each Next', async () => {
    await openReal();
    let { puzzles, next } = (await saved('make24:order')).data.easy;
    expect(puzzles).toHaveLength(POOL.easy.length);
    expect(next).toBe(1);
    expect(onScreen()).toEqual(cardsOf(puzzles[0]));

    press('Give up');
    press('Next');
    await settle();

    ({ puzzles, next } = (await saved('make24:order')).data.easy);
    expect(next).toBe(2);
    expect(onScreen()).toEqual(cardsOf(puzzles[1]));

    press('Give up');
    press('New');
    press('Medium'); // each level has its own order
    await settle();

    const { data } = await saved('make24:order');
    expect([data.easy.next, data.medium.next, data.hard]).toEqual([2, 1, undefined]);
  });

  it('continues a stored order with its next puzzle', async () => {
    const puzzles = [...POOL.easy].reverse();
    await seed('make24:order', { easy: { puzzles, next: 5 } });

    await openReal();

    expect(onScreen()).toEqual(cardsOf(puzzles[5]));
    expect((await saved('make24:order')).data.easy).toEqual({ puzzles, next: 6 });
  });
});

describe('stats', () => {
  it('a clean solve counts as played and solved, sets the streak and the best time, and says "New best!"', async () => {
    await openFake();
    act(() => jest.advanceTimersByTime(83_000));

    play(...SOLVE);
    await settle();

    expect(screen.getByText('Solved in 1:23 · New best!')).toBeTruthy();
    expect((await saved('make24:stats')).data).toEqual({
      ...EMPTY_STATS,
      easy: stats(1, 1, 1, 1, 83_000),
    });
    expect(await saved('make24:save')).toBeNull();
  });

  it('a solve that is no best time has no "New best!" and keeps the stored one', async () => {
    await seedStats('easy', stats(1, 1, 1, 1, 50_000));
    await openFake();
    act(() => jest.advanceTimersByTime(83_000));

    play(...SOLVE);
    await settle();

    expect(screen.getByText('Solved in 1:23')).toBeTruthy();
    expect((await saved('make24:stats')).data.easy).toEqual(stats(2, 2, 2, 2, 50_000));
  });

  it('a solve with a hint counts as solved, keeps the streak and sets no best time', async () => {
    await seedStats('easy', stats(2, 2, 2, 2, 100_000));
    await openFake();

    press('Hint');
    play(...SOLVE);
    await settle();

    expect(screen.getByText('Solved with hints in 0:00')).toBeTruthy();
    expect((await saved('make24:stats')).data.easy).toEqual(stats(3, 3, 2, 2, 100_000));
  });

  it('Give up counts as played and resets the streak', async () => {
    await seedStats('easy', stats(2, 2, 2, 2, 100_000));
    await open();

    press('Give up');
    await settle();

    expect((await saved('make24:stats')).data.easy).toEqual(stats(3, 2, 0, 2, 100_000));
    expect(await saved('make24:save')).toBeNull();
  });
});

describe('abandon', () => {
  beforeEach(() => seedStats('easy', stats(2, 2, 2, 2, 100_000)));

  it('a started puzzle left through the picker counts as played and resets the streak', async () => {
    await open(P3388, P1234);

    play(2, '/', 0);
    press('New');
    press('Medium');
    await settle();

    expect((await saved('make24:stats')).data.easy).toEqual(stats(3, 2, 0, 2, 100_000));
    expect((await saved('make24:save')).data).toMatchObject({ level: 'medium', steps: [] });
  });

  it('an unstarted puzzle left through the picker records nothing', async () => {
    await open(P3388, P1234);

    press('New');
    press('Medium');
    await settle();

    expect((await saved('make24:stats')).data).toEqual({ ...EMPTY_STATS, easy: stats(2, 2, 2, 2, 100_000) });
  });

  it('a finished puzzle is not counted again when the picker is used', async () => {
    await open();

    play(...SOLVE);
    press('New');
    press('Medium');
    await settle();

    expect((await saved('make24:stats')).data.easy).toEqual(stats(3, 3, 3, 3, expect.any(Number)));
  });

  it('the settings store the level', async () => {
    await open();

    press('New');
    press('Hard');
    await settle();

    expect(await saved('make24:settings')).toEqual({ version: 1, data: { level: 'hard' } });
  });
});

describe('stats panel and picker', () => {
  it('opens from the header on the level on screen, shows the other levels on the switch, and Close goes back', async () => {
    await seed('make24:settings', { level: 'hard' });
    await seed('make24:stats', {
      ...EMPTY_STATS,
      medium: stats(4, 3, 1, 2, 83_000),
      hard: stats(1, 1, 1, 1, 90_000),
    });
    await open();

    press('Stats');

    expect(screen.queryByTestId('card-0')).toBeNull();
    expect(screen.queryByLabelText('Plus')).toBeNull();
    expect(selected('Hard stats')).toBe(true);
    expect(selected('Medium stats')).toBeFalsy();
    expect(screen.getByLabelText('Played: 1')).toBeTruthy();
    expect(screen.getByLabelText('Best time: 1:30')).toBeTruthy();

    press('Medium stats');

    expect(selected('Medium stats')).toBe(true);
    expect(screen.getByLabelText('Played: 4')).toBeTruthy();
    expect(screen.getByLabelText('Solved %: 75')).toBeTruthy();
    expect(screen.getByLabelText('Current streak: 1')).toBeTruthy();
    expect(screen.getByLabelText('Best streak: 2')).toBeTruthy();
    expect(screen.getByLabelText('Best time: 1:23')).toBeTruthy();

    press('Easy stats');
    expect(screen.getByLabelText('Best time: —')).toBeTruthy();

    press('Close');

    expect(screen.getByTestId('card-0')).toBeTruthy();
    expect(screen.queryByLabelText('Played: 0')).toBeNull();
  });

  it('opening it from the picker closes the picker; the clock is paused while it is open', async () => {
    await openFake();
    act(() => jest.advanceTimersByTime(2000));

    press('New');
    press('Stats');
    expect(screen.queryByText('Pick a level')).toBeNull();
    expect(screen.getByLabelText('Played: 0')).toBeTruthy();
    act(() => jest.advanceTimersByTime(5000));
    press('Close');

    expect(screen.getByLabelText('Time 0:02')).toBeTruthy();
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByLabelText('Time 0:03')).toBeTruthy();
  });

  it('the picker shows the best time of each level that has one', async () => {
    await seedStats('medium', stats(1, 1, 1, 1, 42_000));
    await open();

    press('New');

    expect(screen.getByText('Best 0:42')).toBeTruthy();
    expect(screen.getAllByText(/^Best /)).toHaveLength(1);
  });
});
