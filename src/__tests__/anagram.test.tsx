import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { AppState, StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';
import { pickWord, scramble } from '@/games/anagram/logic/words';
import { settle } from '@/test-utils/settle';

// pickWord and scramble are replaced so every test knows its words and racks (the real ones are tested in logic/).
// The words below have no repeated letter, so a tile is found by its letter.
jest.mock('@/games/anagram/logic/words', () => ({
  ...jest.requireActual('@/games/anagram/logic/words'),
  pickWord: jest.fn(),
  scramble: jest.fn(),
}));

// The rack order of each word: never a word itself.
const RACKS: Record<string, string> = {
  plate: 'tlpea',
  house: 'uoshe',
  water: 'tewra',
  light: 'gthli',
  bake: 'ekab',
};
// The next words, in order: the first for the round on screen or the next new round, then one per word shown.
const words = (...list: string[]) => {
  const queue = [...list];
  (pickWord as jest.Mock).mockReset().mockImplementation(() => queue.shift() ?? 'water');
};

const open = async () => {
  renderRouter('./src/app', { initialUrl: '/anagram' });
  await settle();
};

// Fake timers drive the clock (it updates every 250 ms) and the 1 s the solution of a skip shows.
const tick = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });
const press = (label: string) => fireEvent.press(screen.getByLabelText(label));
const tap = (letters: string) => {
  for (const letter of letters) press(`Letter ${letter.toUpperCase()}`);
};
const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState.disabled;
const selected = (label: string) => screen.getByLabelText(label).props.accessibilityState.selected;
// The rack as the letters on screen, in order (a placed tile leaves an empty spot, so it is not listed).
const rack = () => screen.queryAllByLabelText(/^Letter /).map((n) => n.props.accessibilityLabel.slice(7));
const faceColor = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style).backgroundColor;

beforeEach(() => {
  jest.useFakeTimers();
  words();
  (scramble as jest.Mock).mockReset().mockImplementation((w: string) => RACKS[w]);
});

afterEach(async () => {
  await settle();
  jest.useRealTimers();
});

describe('Anagrams screen', () => {
  it('opens from home ready: the letters hidden, Normal, Score 0, Time 1:00, Best 0, Start shown', async () => {
    words('plate');
    await open();

    expect(screen.getByText('Normal · Score')).toBeTruthy();
    expect(screen.getByLabelText('Normal · Score 0')).toBeTruthy();
    expect(screen.getByLabelText('Time 1:00')).toBeTruthy();
    expect(screen.getByLabelText('Best 0')).toBeTruthy();
    expect(screen.getByLabelText('Start')).toBeTruthy();
    expect(rack()).toEqual([]);
    expect(screen.queryByLabelText(/^Empty slot/)).toBeNull();
    expect(screen.queryByText('Paused')).toBeNull();
    expect(screen.queryByTestId('result')).toBeNull();
  });

  it('Start shows the letters and an empty answer row, and the clock counts down', async () => {
    words('plate');
    await open();

    press('Start');

    expect(rack()).toEqual(['T', 'L', 'P', 'E', 'A']);
    for (const slot of [1, 2, 3, 4, 5]) expect(screen.getByLabelText(`Empty slot ${slot}`)).toBeTruthy();
    expect(screen.queryByLabelText('Start')).toBeNull();
    expect(screen.getByLabelText('Time 1:00')).toBeTruthy();
    await tick(1000);
    expect(screen.getByLabelText('Time 0:59')).toBeTruthy();
    await tick(10_000);
    expect(screen.getByLabelText('Time 0:49')).toBeTruthy();
  });

  it('a tapped letter goes into the next empty slot and leaves a gap in the rack; a tap on the slot sends it back', async () => {
    words('plate');
    await open();
    press('Start');

    press('Letter P');
    press('Letter A');

    expect(screen.getByLabelText('Answer letter P, slot 1')).toBeTruthy();
    expect(screen.getByLabelText('Answer letter A, slot 2')).toBeTruthy();
    expect(screen.getByLabelText('Empty slot 3')).toBeTruthy();
    expect(rack()).toEqual(['T', 'L', 'E']);

    press('Answer letter P, slot 1');

    expect(screen.getByLabelText('Empty slot 1')).toBeTruthy();
    expect(screen.getByLabelText('Answer letter A, slot 2')).toBeTruthy();
    expect(rack()).toEqual(['T', 'L', 'P', 'E']);
    press('Letter T'); // fills the hole
    expect(screen.getByLabelText('Answer letter T, slot 1')).toBeTruthy();
  });

  it('Clear sends every letter back; Shuffle reorders the rack tiles', async () => {
    words('plate');
    await open();
    press('Start');
    tap('pl');

    press('Clear');

    expect(rack()).toEqual(['T', 'L', 'P', 'E', 'A']);
    expect(screen.getByLabelText('Empty slot 1')).toBeTruthy();

    press('Shuffle');

    expect(rack()).not.toEqual(['T', 'L', 'P', 'E', 'A']);
    expect([...rack()].sort()).toEqual(['A', 'E', 'L', 'P', 'T']);
  });

  it('spelling the word scores it and the next word comes at once', async () => {
    words('plate', 'house');
    await open();
    press('Start');

    tap('plate');

    expect(screen.getByLabelText('Normal · Score 1')).toBeTruthy();
    expect(screen.getByLabelText('Best 1')).toBeTruthy();
    expect(rack()).toEqual(['U', 'O', 'S', 'H', 'E']);
    expect(screen.getByLabelText('Empty slot 1')).toBeTruthy();
  });

  it('another accepted anagram of the word counts too', async () => {
    words('plate', 'house');
    await open();
    press('Start');

    tap('pleat');

    expect(screen.getByLabelText('Normal · Score 1')).toBeTruthy();
    expect(rack()).toEqual(['U', 'O', 'S', 'H', 'E']);
  });

  it('a wrong full row stays, shows in the conflict colours, and can be taken apart and fixed', async () => {
    words('plate', 'house');
    await open();
    press('Start');

    tap('tlpea');

    expect(screen.getByLabelText('Normal · Score 0')).toBeTruthy();
    expect(screen.getByLabelText('Answer letter T, slot 1')).toBeTruthy();
    expect(screen.getByLabelText('Answer letter A, slot 5')).toBeTruthy();
    expect(faceColor('answer-face-0')).toBe(Colors.light.cellConflict);
    expect(faceColor('answer-face-4')).toBe(Colors.light.cellConflict);

    press('Answer letter P, slot 3');

    expect(faceColor('answer-face-0')).toBe(Colors.light.backgroundElement);
    press('Clear');
    tap('plate');

    expect(screen.getByLabelText('Normal · Score 1')).toBeTruthy();
  });

  it('Skip shows the solution for 1 s, costs 5 s and moves on', async () => {
    words('plate', 'house');
    await open();
    press('Start');
    await tick(2000);
    tap('pl');

    press('Skip');

    expect(screen.getByLabelText('Time 0:53')).toBeTruthy(); // 60 - 2 - 5
    for (const [k, letter] of [...'PLATE'].entries()) {
      expect(screen.getByLabelText(`Solution letter ${letter}, slot ${k + 1}`)).toBeTruthy();
    }
    expect(screen.queryByLabelText(/^Empty slot/)).toBeNull();
    expect(rack()).toEqual(['U', 'O', 'S', 'H', 'E']);
    expect(disabled('Letter H')).toBe(true);
    expect(disabled('Skip')).toBe(true);
    expect(disabled('Shuffle')).toBe(true);
    expect(disabled('Clear')).toBe(true);
    press('Letter H');
    expect(screen.queryByLabelText(/^Answer letter/)).toBeNull();
    await tick(999);
    expect(screen.queryAllByLabelText(/^Solution letter/)).toHaveLength(5);

    await tick(1);

    expect(screen.queryByLabelText(/^Solution letter/)).toBeNull();
    expect(screen.getByLabelText('Empty slot 1')).toBeTruthy();
    expect(disabled('Letter H')).toBe(false);
    expect(screen.getByLabelText('Normal · Score 0')).toBeTruthy();
    expect(screen.getByLabelText('Time 0:52')).toBeTruthy();
    press('Letter H');
    expect(screen.getByLabelText('Answer letter H, slot 1')).toBeTruthy();
  });

  it('a skip that uses up the last seconds shows the solution, then the round ends', async () => {
    words('plate', 'house');
    await open();
    press('Start');
    await tick(56_000);
    expect(screen.getByLabelText('Time 0:04')).toBeTruthy();

    press('Skip');

    expect(screen.getByLabelText('Time 0:00')).toBeTruthy();
    expect(screen.getByLabelText('Solution letter P, slot 1')).toBeTruthy();
    expect(screen.queryByTestId('result')).toBeNull();
    expect(pickWord).toHaveBeenCalledTimes(1); // no next word
    await tick(999);
    expect(screen.queryByTestId('result')).toBeNull();
    await tick(1);

    expect(screen.getByText('Time! · 0 words')).toBeTruthy();
    expect(screen.queryByLabelText(/^Solution letter/)).toBeNull();
    expect(screen.getByLabelText('Play again')).toBeTruthy();
  });

  it('Pause during the solution drops it; Continue goes on with the next word and the clock counting', async () => {
    words('plate', 'house');
    await open();
    press('Start');
    await tick(2000);
    press('Skip');
    press('Pause');
    await tick(1000);

    press('Continue');

    expect(screen.queryByLabelText(/^Solution letter/)).toBeNull();
    expect(rack()).toEqual(['U', 'O', 'S', 'H', 'E']);
    expect(screen.getByLabelText('Time 0:53')).toBeTruthy();
    await tick(1000);
    expect(screen.getByLabelText('Time 0:52')).toBeTruthy();
    expect(screen.queryByTestId('result')).toBeNull();
  });

  it('Pause during the solution of the last skip: Continue ends the round at once', async () => {
    words('plate', 'house');
    await open();
    press('Start');
    await tick(56_000);
    press('Skip');
    press('Pause');
    await tick(1000);

    press('Continue');
    await tick(250);

    expect(screen.queryByLabelText(/^Solution letter/)).toBeNull();
    expect(screen.getByText('Time! · 0 words')).toBeTruthy();
  });

  it('at 0:00 the round ends: the result line, Play again and New, and the buttons are off', async () => {
    words('plate', 'house');
    await open();
    press('Start');
    tap('plate');
    await tick(59_000);
    expect(screen.queryByTestId('result')).toBeNull();

    await tick(1000);

    expect(screen.getByText('Time! · 1 word · New best!')).toBeTruthy();
    expect(screen.getByLabelText('Time 0:00')).toBeTruthy();
    expect(screen.getByLabelText('Play again')).toBeTruthy();
    expect(screen.getByLabelText('New after game')).toBeTruthy();
    for (const label of ['Pause', 'Shuffle', 'Clear', 'Skip', 'Letter H']) expect(disabled(label)).toBe(true);
    press('Letter H');
    expect(screen.queryByLabelText(/^Answer letter/)).toBeNull();
    await tick(5000);
    expect(screen.getByLabelText('Time 0:00')).toBeTruthy();
  });

  it('Play again starts a new ready round of the same level; New best! only when the score beats the session best', async () => {
    words('plate', 'house', 'water');
    await open();
    press('Start');
    tap('plate');
    await tick(60_000);
    expect(screen.getByText('Time! · 1 word · New best!')).toBeTruthy();

    words('water');
    press('Play again');

    expect(screen.queryByTestId('result')).toBeNull();
    expect(screen.getByLabelText('Start')).toBeTruthy();
    expect(screen.getByLabelText('Normal · Score 0')).toBeTruthy();
    expect(screen.getByLabelText('Time 1:00')).toBeTruthy();
    expect(screen.getByLabelText('Best 1')).toBeTruthy();
    press('Start');
    expect(rack()).toEqual(['T', 'E', 'W', 'R', 'A']);
    await tick(60_000);
    expect(screen.getByText('Time! · 0 words')).toBeTruthy();
    expect(screen.getByLabelText('Best 1')).toBeTruthy();
  });

  it('Play again keeps a picked level', async () => {
    words('plate', 'bake');
    await open();
    press('New');
    press('Easy');
    press('Start');
    await tick(60_000);
    expect(screen.getByText('Time! · 0 words')).toBeTruthy();

    words('bake');
    press('Play again');

    expect(screen.getByLabelText('Easy · Score 0')).toBeTruthy();
    press('Start');
    expect(rack()).toEqual(['E', 'K', 'A', 'B']);
    expect(screen.getByLabelText('Empty slot 4')).toBeTruthy();
    expect(screen.queryByLabelText('Empty slot 5')).toBeNull();
  });

  it('Pause hides the letters and stops the clock; Continue brings them back with the answer', async () => {
    words('plate');
    await open();
    press('Start');
    await tick(2000);
    tap('p');

    press('Pause');

    expect(screen.getByText('Paused')).toBeTruthy();
    expect(rack()).toEqual([]);
    expect(screen.queryByLabelText(/^Answer letter/)).toBeNull();
    expect(disabled('Pause')).toBe(true);
    expect(disabled('Skip')).toBe(true);
    await tick(5000);
    expect(screen.getByLabelText('Time 0:58')).toBeTruthy();

    press('Continue');

    expect(screen.queryByText('Paused')).toBeNull();
    expect(screen.getByLabelText('Answer letter P, slot 1')).toBeTruthy();
    expect(rack()).toEqual(['T', 'L', 'E', 'A']);
    await tick(1000);
    expect(screen.getByLabelText('Time 0:57')).toBeTruthy();
  });

  it('leaving the screen pauses the round, and it is paused when you come back', async () => {
    words('plate');
    await open();
    press('Start');
    await tick(3000);

    await act(async () => router.push('/'));
    await tick(10_000);
    await act(async () => router.back());

    expect(screen.getByText('Paused')).toBeTruthy();
    expect(rack()).toEqual([]);
    expect(screen.getByLabelText('Time 0:57')).toBeTruthy();
    press('Continue');
    await tick(1000);
    expect(screen.getByLabelText('Time 0:56')).toBeTruthy();
  });

  it('the app going to the background pauses the round, and it stays paused when the app returns', async () => {
    const listeners: ((s: string) => void)[] = [];
    const subscribe = (_: string, l: (s: string) => void) => {
      listeners.push(l);
      return { remove: () => {} };
    };
    // Two listeners: the screen's clock and GameRoute's (playtime) clock.
    (AppState.addEventListener as jest.Mock).mockImplementationOnce(subscribe).mockImplementationOnce(subscribe);
    words('plate');
    await open();
    const appState = (s: string) => act(async () => listeners.forEach((l) => l(s)));
    press('Start');
    await tick(3000);

    await appState('background');
    await tick(10_000);
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(rack()).toEqual([]);

    await appState('active');
    await tick(10_000);
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.getByLabelText('Time 0:57')).toBeTruthy();
    press('Continue');
    await tick(1000);
    expect(screen.getByLabelText('Time 0:56')).toBeTruthy();
  });

  it('the picker marks the last level, Cancel goes back, and a level starts a new ready round of its word length', async () => {
    words('plate', 'bake');
    await open();
    press('Start');
    await tick(1000);

    press('New');

    expect(screen.getByText('Pick a level')).toBeTruthy();
    expect(screen.queryByLabelText('Skip')).toBeNull();
    expect(selected('Normal')).toBe(true);
    expect(selected('Easy')).toBeFalsy();
    expect(screen.getByText('Normal (last used)')).toBeTruthy();
    press('Cancel');
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.getByLabelText('Time 0:59')).toBeTruthy();

    press('New');
    press('Easy');

    expect(screen.queryByText('Pick a level')).toBeNull();
    expect(screen.getByLabelText('Easy · Score 0')).toBeTruthy();
    expect(screen.getByLabelText('Time 1:00')).toBeTruthy();
    press('Start');
    expect(rack()).toEqual(['E', 'K', 'A', 'B']);
    expect(screen.queryByLabelText('Empty slot 5')).toBeNull();
    expect(screen.getByLabelText('Empty slot 4')).toBeTruthy();

    press('New');
    expect(selected('Easy')).toBe(true);
    expect(selected('Normal')).toBeFalsy();
  });

  it('the picker shows the best of each level this session', async () => {
    words('plate', 'house');
    await open();
    press('Start');
    tap('plate');
    await tick(60_000);

    press('New after game');

    expect(screen.getByText('5 letters · Best 1')).toBeTruthy();
    expect(screen.getByText('4 letters')).toBeTruthy();
    expect(screen.getByText('6 letters')).toBeTruthy();
  });

  it('the buttons are disabled when they cannot act', async () => {
    words('plate');
    await open();

    for (const label of ['Pause', 'Shuffle', 'Clear', 'Skip']) expect(disabled(label)).toBe(true);
    expect(disabled('New')).toBeFalsy();
    expect(disabled('Start')).toBeFalsy();

    press('Start');

    for (const label of ['Pause', 'Shuffle', 'Clear', 'Skip', 'Letter T']) expect(disabled(label)).toBeFalsy();
  });
});

describe('home tile', () => {
  it('lays the letters out as two rows of three, also when the measured side is fractional', async () => {
    renderRouter('./src/app', { initialUrl: '/' });
    await settle();

    // A fractional width is what a scaled browser display measures; a wrapping row put letters on their own rows.
    const side = 101.333;
    fireEvent(screen.getByTestId('anagram-tile-grid'), 'layout', {
      nativeEvent: { layout: { width: side, height: side } },
    });

    for (const row of [0, 1]) {
      const faces = within(screen.getByTestId(`anagram-tile-row-${row}`)).getAllByTestId(/^anagram-tile-letter-/);
      expect(faces).toHaveLength(3);
      const sizes = faces.map((f) => StyleSheet.flatten(f.props.style).width);
      expect(sizes[0] * 3).toBeLessThanOrEqual(side);
      expect(sizes[0]).toBe(Math.floor(sizes[0]));
    }
  });
});

describe('accessibility', () => {
  it('the result line is a polite live region', async () => {
    await open();
    press('Start');
    await tick(60_000);

    const line = screen.getByText('Time! · 0 words');
    expect(line.props.accessibilityLiveRegion).toBe('polite');
    expect(within(screen.getByTestId('result')).getByLabelText('Play again')).toBeTruthy();
  });
});
