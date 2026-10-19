import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import { pickPuzzle } from '@/games/make24/logic/pool';

// pickPuzzle is replaced so each test starts from hand-picked numbers; everything else stays real.
jest.mock('@/games/make24/logic/pool', () => ({
  ...jest.requireActual('@/games/make24/logic/pool'),
  pickPuzzle: jest.fn(),
}));

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
    expect(screen.getByText('Solved in 0:00')).toBeTruthy();
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
    expect(screen.getByText('Solved in 0:03')).toBeTruthy();
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
