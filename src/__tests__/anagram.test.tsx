import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { AccessibilityInfo, Animated, AppState, Dimensions, StyleSheet } from 'react-native';

import { COMPACT_HEIGHT } from '@/components/button';
import { Colors, Spacing } from '@/constants/theme';
import { LAYER_HEIGHT } from '@/games/anagram/ui/anagram-screen';
import { SHAKE_MS } from '@/games/anagram/ui/letters';
import { POP_MS, SCORE_BOX_HEIGHT } from '@/games/anagram/ui/score-box';
import { FLASH_MS } from '@/games/anagram/ui/use-anagram';
import { EMPTY_STATS, type LevelStats } from '@/games/anagram/logic/stats';
import { pickWord, scramble, type Level } from '@/games/anagram/logic/words';
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
  garden: 'dnegra',
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

// Takes over AppState's subscriptions (the screen's clock and GameRoute's playtime clock, in mount order) and returns
// the function that sends an app state change to both.
const appStates = () => {
  const listeners: ((s: string) => void)[] = [];
  const subscribe = (_: string, l: (s: string) => void) => {
    listeners.push(l);
    return { remove: () => {} };
  };
  (AppState.addEventListener as jest.Mock).mockImplementationOnce(subscribe).mockImplementationOnce(subscribe);
  return (s: string) => act(async () => listeners.forEach((l) => l(s)));
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

  it('Pause during the solution of the last skip ends the round at once: nothing is left to continue', async () => {
    words('plate', 'house');
    await open();
    press('Start');
    await tick(56_000);
    press('Skip');

    press('Pause');
    await settle();

    expect(screen.queryByLabelText(/^Solution letter/)).toBeNull();
    expect(screen.getByText('Time! · 0 words')).toBeTruthy();
    expect(screen.queryByLabelText('Continue')).toBeNull();
    expect((await saved('anagram:stats')).data.normal).toEqual(stats(1, 0, 0));
    expect(await saved('anagram:save')).toBeNull();
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
    const appState = appStates();
    words('plate');
    await open();
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

  it('the picker shows the best of each level', async () => {
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

// ---- A4: save, stats, abandon ----

const saved = async (key: string) => JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');
const seed = (key: string, data: unknown) => AsyncStorage.setItem(key, JSON.stringify({ version: 1, data }));
const stats = (played: number, best: number, totalWords: number) => ({ played, best, totalWords }) satisfies LevelStats;
const seedStats = (level: Level, s: LevelStats) => seed('anagram:stats', { ...EMPTY_STATS, [level]: s });

// A started round as it is stored: PLATE in the rack order T L P E A, P and A placed (rack indices 2 and 4), three words
// solved, one skip, 42 s run: 60 - 42 - 5 = 13 s left.
const SAVE = {
  level: 'normal',
  word: 'plate',
  rack: 'tlpea',
  answer: [2, 4, null, null, null],
  solved: 3,
  skips: 1,
  used: ['house', 'water', 'light', 'plate'],
  elapsedMs: 42_000,
};

describe('resume', () => {
  it('opens a saved round directly, paused, with its level, word, rack, answer, score and time; Continue goes on', async () => {
    await seed('anagram:save', SAVE);
    await open();

    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.queryByLabelText('Start')).toBeNull();
    expect(screen.getByLabelText('Normal · Score 3')).toBeTruthy();
    expect(screen.getByLabelText('Time 0:13')).toBeTruthy();
    expect(screen.getByLabelText('Best 3')).toBeTruthy();
    expect(rack()).toEqual([]);
    expect(pickWord).not.toHaveBeenCalled();
    await tick(5000);
    expect(screen.getByLabelText('Time 0:13')).toBeTruthy();

    press('Continue');

    expect(rack()).toEqual(['T', 'L', 'E']);
    expect(screen.getByLabelText('Answer letter P, slot 1')).toBeTruthy();
    expect(screen.getByLabelText('Answer letter A, slot 2')).toBeTruthy();
    expect(screen.getByLabelText('Empty slot 3')).toBeTruthy();
    await tick(1000);
    expect(screen.getByLabelText('Time 0:12')).toBeTruthy();

    // The clock stood at the saved time: a Pause stores that time plus the second that ran.
    press('Pause');
    await settle();
    expect((await saved('anagram:save')).data.elapsedMs).toBe(43_000);
  });

  it.each([
    ['a bad save', { ...SAVE, word: 'plat' }],
    ['one with no time left', { ...SAVE, elapsedMs: 55_000 }],
  ])('ignores %s and shows a new ready round of the stored level', async (_, data) => {
    await seed('anagram:save', data);
    await seed('anagram:settings', { level: 'easy' });
    words('bake');
    await open();

    expect(screen.getByLabelText('Start')).toBeTruthy();
    expect(screen.queryByText('Paused')).toBeNull();
    expect(screen.getByLabelText('Easy · Score 0')).toBeTruthy();
    expect(screen.getByLabelText('Time 1:00')).toBeTruthy();
    press('Start');
    expect(rack()).toEqual(['E', 'K', 'A', 'B']);
  });
});

describe('saving', () => {
  it('Pause saves the round: word, rack, answer, score, skips, words shown and the time', async () => {
    words('plate');
    await open();
    press('Start');
    await tick(2000);
    tap('p');

    press('Pause');
    await settle();

    expect(await saved('anagram:save')).toEqual({
      version: 1,
      data: {
        level: 'normal',
        word: 'plate',
        rack: 'tlpea',
        answer: [2, null, null, null, null],
        solved: 0,
        skips: 0,
        used: ['plate'],
        elapsedMs: 2000,
      },
    });
  });

  it('navigating away from the screen saves the paused round', async () => {
    words('plate');
    await open();
    press('Start');
    await tick(3000);

    await act(async () => router.push('/'));
    await settle();

    expect((await saved('anagram:save')).data).toMatchObject({ word: 'plate', elapsedMs: 3000 });
  });

  it('the app going to the background saves the paused round', async () => {
    const appState = appStates();
    words('plate');
    await open();
    press('Start');
    await tick(3000);

    await appState('background');
    await settle();

    expect((await saved('anagram:save')).data).toMatchObject({ word: 'plate', elapsedMs: 3000 });
  });

  it('the app going to the background during the solution of the last skip ends the round: counted, no save, a fresh round on reopen', async () => {
    const appState = appStates();
    words('plate', 'house');
    await open();
    press('Start');
    await tick(56_000);
    press('Skip');

    await appState('background');
    await settle();

    expect((await saved('anagram:stats')).data.normal).toEqual(stats(1, 0, 0));
    expect(await saved('anagram:save')).toBeNull();

    screen.unmount();
    await settle();
    words('water');
    await open();

    expect(screen.getByLabelText('Start')).toBeTruthy();
    expect(screen.queryByText('Paused')).toBeNull();
    expect(screen.getByLabelText('Time 1:00')).toBeTruthy();
    expect(screen.getByLabelText('Normal · Score 0')).toBeTruthy();
  });

  it('a ready round writes no save, not even when the screen is left', async () => {
    await open();
    press('New');
    press('Cancel');

    screen.unmount();
    await settle();

    expect(await saved('anagram:save')).toBeNull();
  });

  it('the end of the round removes the save and stores the stats', async () => {
    words('plate', 'house');
    await open();
    press('Start');
    await tick(2000);
    press('Pause');
    await settle();
    expect(await saved('anagram:save')).not.toBeNull();
    press('Continue');
    tap('plate');

    await tick(58_000);
    await settle();

    expect(screen.getByText('Time! · 1 word · New best!')).toBeTruthy();
    expect(await saved('anagram:save')).toBeNull();
    expect((await saved('anagram:stats')).data).toEqual({ ...EMPTY_STATS, normal: stats(1, 1, 1) });
  });
});

describe('level', () => {
  it('picking a level stores it, and reopening shows it marked in the picker', async () => {
    words('plate', 'bake');
    await open();

    press('New');
    press('Hard');
    await settle();
    expect(await saved('anagram:settings')).toEqual({ version: 1, data: { level: 'hard' } });

    screen.unmount();
    await settle();
    await open();

    expect(screen.getByLabelText('Hard · Score 0')).toBeTruthy();
    press('New');
    expect(selected('Hard')).toBe(true);
    expect(selected('Normal')).toBeFalsy();
  });
});

describe('abandon', () => {
  it('picking a level with a started round counts it: played +1, its words in best and total, the save gone', async () => {
    await seedStats('normal', stats(1, 1, 1));
    words('plate', 'house', 'water');
    await open();
    press('Start');
    tap('plate');
    tap('house');
    expect(screen.getByLabelText('Normal · Score 2')).toBeTruthy();

    press('New');
    await settle();
    expect(await saved('anagram:save')).not.toBeNull();
    press('Hard');
    await settle();

    expect((await saved('anagram:stats')).data).toEqual({ ...EMPTY_STATS, normal: stats(2, 2, 3) });
    expect(await saved('anagram:save')).toBeNull();
    expect(screen.getByLabelText('Start')).toBeTruthy();
    expect(screen.getByLabelText('Hard · Score 0')).toBeTruthy();
  });

  it('a paused round is counted too', async () => {
    words('plate');
    await open();
    press('Start');
    tap('p');
    press('Pause');

    press('New');
    press('Easy');
    await settle();

    expect((await saved('anagram:stats')).data).toEqual({ ...EMPTY_STATS, normal: stats(1, 0, 0) });
    expect(await saved('anagram:save')).toBeNull();
  });

  it('a ready round changes nothing', async () => {
    await open();

    press('New');
    press('Easy');
    await settle();

    expect(await saved('anagram:stats')).toBeNull();
    expect(await saved('anagram:save')).toBeNull();
  });

  it('a finished round is not counted again when the picker is used', async () => {
    await open();
    press('Start');
    await tick(60_000);
    await settle();
    expect((await saved('anagram:stats')).data.normal.played).toBe(1);

    press('New after game');
    press('Easy');
    await settle();

    expect((await saved('anagram:stats')).data.normal.played).toBe(1);
  });
});

describe('stats', () => {
  it('the Best box and the picker read the stored bests', async () => {
    await seed('anagram:stats', { ...EMPTY_STATS, normal: stats(4, 23, 50), hard: stats(1, 7, 7) });
    await open();

    expect(screen.getByLabelText('Best 23')).toBeTruthy();

    press('New');
    expect(screen.getByText('5 letters · Best 23')).toBeTruthy();
    expect(screen.getByText('6 letters · Best 7')).toBeTruthy();
    expect(screen.getByText('4 letters')).toBeTruthy();
  });

  it('New best! comes from the stored best: a tie is not one, a higher score is', async () => {
    await seedStats('normal', stats(1, 1, 1));
    words('plate', 'house', 'water');
    await open();
    press('Start');
    tap('plate');
    await tick(60_000);
    expect(screen.getByText('Time! · 1 word')).toBeTruthy();

    words('plate', 'house', 'water');
    press('Play again');
    press('Start');
    tap('plate');
    tap('house');
    await tick(60_000);
    await settle();

    expect(screen.getByText('Time! · 2 words · New best!')).toBeTruthy();
    expect(screen.getByLabelText('Best 2')).toBeTruthy();
    expect((await saved('anagram:stats')).data.normal).toEqual(stats(3, 2, 4));
  });
});

describe('stats panel', () => {
  it('opens from the header on the current level with its numbers; the switch shows another level; Close goes back', async () => {
    await seed('anagram:settings', { level: 'hard' });
    await seed('anagram:stats', { ...EMPTY_STATS, normal: stats(4, 23, 50), hard: stats(1, 7, 7) });
    await open();

    press('Stats');

    expect(screen.queryByLabelText('Start')).toBeNull();
    expect(selected('Hard stats')).toBe(true);
    expect(selected('Normal stats')).toBeFalsy();
    expect(screen.getByLabelText('Played: 1')).toBeTruthy();
    expect(screen.getByLabelText('Best: 7')).toBeTruthy();
    expect(screen.getByLabelText('Average: 7')).toBeTruthy();
    expect(screen.getByLabelText('Words: 7')).toBeTruthy();

    press('Normal stats');

    expect(selected('Normal stats')).toBe(true);
    expect(screen.getByLabelText('Played: 4')).toBeTruthy();
    expect(screen.getByLabelText('Best: 23')).toBeTruthy();
    expect(screen.getByLabelText('Average: 13')).toBeTruthy();
    expect(screen.getByLabelText('Words: 50')).toBeTruthy();

    press('Easy stats');

    expect(screen.getByLabelText('Played: 0')).toBeTruthy();
    expect(screen.getByLabelText('Best: —')).toBeTruthy();
    expect(screen.getByLabelText('Average: —')).toBeTruthy();
    expect(screen.getByLabelText('Words: —')).toBeTruthy();

    press('Close');

    expect(screen.getByLabelText('Start')).toBeTruthy();
    expect(screen.queryByLabelText('Played: 0')).toBeNull();
  });

  it('opening it pauses a running round and saves it; Close leaves it paused', async () => {
    words('plate');
    await open();
    press('Start');
    await tick(2000);
    tap('p');

    press('Stats');
    await tick(1000);
    await settle();
    expect((await saved('anagram:save')).data).toMatchObject({ answer: [2, null, null, null, null], elapsedMs: 2000 });
    press('Close');

    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.getByLabelText('Time 0:58')).toBeTruthy();
    press('Continue');
    await tick(1000);
    expect(screen.getByLabelText('Time 0:57')).toBeTruthy();
  });

  it('opening it from the picker closes the picker', async () => {
    await open();

    press('New');
    press('Stats');

    expect(screen.queryByText('Pick a level')).toBeNull();
    expect(screen.getByLabelText('Played: 0')).toBeTruthy();
  });
});

// ---- A5: polish ----

describe('polish', () => {
  // The slots' outline and the Score box's background are animated colours: they read back as rgba() strings.
  const rgba = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, 1)`;
  };
  const { cellConflict } = Colors.light;
  const [backgroundElement, gridLine, solvedTint, solvedLine] = [
    Colors.light.backgroundElement,
    Colors.light.gridLine,
    Colors.light.solvedTint,
    Colors.light.solvedLine,
  ].map(rgba);
  const style = (label: string) => StyleSheet.flatten(screen.getByLabelText(label).props.style);
  const slotBorder = (n: number) => style(`Empty slot ${n}`).borderColor;
  const boxBackground = (label: string) => style(label).backgroundColor;
  const announced = () => screen.getByTestId('announce').props.children;

  // The window the screen is laid out in; the Jest default is 750 wide.
  const win = Dimensions.get('window');
  const screenSize = Dimensions.get('screen');
  const resize = (width: number, height: number) =>
    act(() => Dimensions.set({ window: { ...win, width, height }, screen: { ...screenSize, width, height } }));

  // The reduce-motion tests set the answer on the jest.fn itself (spyOn returns an existing mock as it is), so restoring does
  // not undo it: every test starts with the setting off.
  beforeEach(() => jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false));

  afterEach(() => {
    resize(win.width, win.height);
    jest.restoreAllMocks(); // the Animated and AccessibilityInfo spies; the module mocks above are jest.fn()s
  });

  describe('solved feedback', () => {
    // The Animated calls of one kind: the colour fade (JS driven) and the score's pop (native driven).
    const runs = (timing: jest.SpyInstance, duration: number) =>
      timing.mock.calls.filter(([, c]) => c.duration === duration).map(([, c]) => c);

    it(`turns the new empty slots and the Score box muted green and fades them back over ${FLASH_MS} ms; typing does not wait`, async () => {
      words('plate', 'house');
      await open();
      press('Start');
      expect(slotBorder(1)).toBe(gridLine);
      expect(boxBackground('Normal · Score 0')).toBe(backgroundElement);

      tap('plate');

      for (const slot of [1, 2, 3, 4, 5]) expect(slotBorder(slot)).toBe(solvedLine);
      expect(boxBackground('Normal · Score 1')).toBe(solvedTint);
      press('Letter H');
      expect(screen.getByLabelText('Answer letter H, slot 1')).toBeTruthy();
      await tick(FLASH_MS / 2);
      expect(slotBorder(2)).not.toBe(solvedLine); // on its way back
      expect(slotBorder(2)).not.toBe(gridLine);
      expect(boxBackground('Normal · Score 1')).not.toBe(solvedTint);
      expect(boxBackground('Normal · Score 1')).not.toBe(backgroundElement);

      await tick(FLASH_MS / 2);

      expect(slotBorder(2)).toBe(gridLine);
      expect(boxBackground('Normal · Score 1')).toBe(backgroundElement);
    });

    it('runs the fade on the JS driver and the score pops once on the native one', async () => {
      words('plate', 'house');
      await open();
      press('Start');
      const timing = jest.spyOn(Animated, 'timing');

      tap('plate');

      // the slots and the box fade (colours cannot use the native driver)
      expect(runs(timing, FLASH_MS)).toHaveLength(2);
      expect(runs(timing, FLASH_MS).every((c) => c.useNativeDriver === false && c.toValue === 0)).toBe(true);
      expect(runs(timing, POP_MS)).toHaveLength(1);
      expect(runs(timing, POP_MS)[0].useNativeDriver).toBe(true); // the scale only: jest runs as a native platform
    });

    it(`with reduce motion on the green stays for ${FLASH_MS} ms and goes: no fade, no pop`, async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      words('plate', 'house');
      await open();
      press('Start');
      const timing = jest.spyOn(Animated, 'timing');

      tap('plate');

      expect(boxBackground('Normal · Score 1')).toBe(solvedTint);
      expect(slotBorder(1)).toBe(solvedLine);
      await tick(FLASH_MS - 1);
      expect(boxBackground('Normal · Score 1')).toBe(solvedTint);
      expect(slotBorder(1)).toBe(solvedLine);
      await tick(1);

      expect(boxBackground('Normal · Score 1')).toBe(backgroundElement);
      expect(slotBorder(1)).toBe(gridLine);
      expect(runs(timing, FLASH_MS)).toHaveLength(0);
      expect(runs(timing, POP_MS)).toHaveLength(0);
    });

    it('a second solve during the fade starts it again', async () => {
      words('plate', 'house', 'water');
      await open();
      press('Start');
      tap('plate');
      await tick(FLASH_MS / 2);
      expect(boxBackground('Normal · Score 1')).not.toBe(solvedTint);

      tap('house');

      expect(boxBackground('Normal · Score 2')).toBe(solvedTint);
      expect(slotBorder(1)).toBe(solvedLine);
      // half a fade after the second solve, the first fade would be over by now (a full one after the first)
      await tick(FLASH_MS / 2);
      expect(boxBackground('Normal · Score 2')).not.toBe(backgroundElement);
      expect(boxBackground('Normal · Score 2')).not.toBe(solvedTint);
      await tick(FLASH_MS / 2);
      expect(boxBackground('Normal · Score 2')).toBe(backgroundElement);
    });

    it('a wrong row and a skip do not flash', async () => {
      words('plate', 'house', 'water');
      await open();
      press('Start');

      tap('tlpea');
      expect(boxBackground('Normal · Score 0')).toBe(backgroundElement);
      press('Clear');
      press('Skip');
      await tick(1000);

      expect(boxBackground('Normal · Score 0')).toBe(backgroundElement);
      expect(slotBorder(1)).toBe(gridLine);
    });

    it('pausing ends the flash at once', async () => {
      words('plate', 'house');
      await open();
      press('Start');
      tap('plate');

      press('Pause');
      press('Continue');

      expect(slotBorder(1)).toBe(gridLine);
      expect(boxBackground('Normal · Score 1')).toBe(backgroundElement);
    });
  });

  describe('wrong shake', () => {
    // The shake is one Animated.timing of SHAKE_MS; the spy is made after the screen is open and the round started.
    const shakes = (timing: jest.SpyInstance) => timing.mock.calls.filter(([, c]) => c.duration === SHAKE_MS).length;

    it('a wrong row shakes once each time it turns wrong, and stays red; Pause and Continue do not shake it again', async () => {
      words('plate', 'house');
      await open();
      press('Start');
      const timing = jest.spyOn(Animated, 'timing');

      tap('tlpea');

      expect(shakes(timing)).toBe(1);
      expect(StyleSheet.flatten(screen.getByTestId('answer-row').props.style).transform).toHaveLength(1); // the row is bound to it
      expect(faceColor('answer-face-0')).toBe(cellConflict);
      press('Pause');
      press('Continue');
      expect(shakes(timing)).toBe(1);
      expect(faceColor('answer-face-0')).toBe(cellConflict);
      press('Answer letter P, slot 3');
      press('Letter P');
      expect(shakes(timing)).toBe(2);
    });

    it('a right word does not shake', async () => {
      words('plate', 'house');
      await open();
      press('Start');
      const timing = jest.spyOn(Animated, 'timing');

      tap('plate');

      expect(shakes(timing)).toBe(0);
    });

    it('with reduce motion on the row only turns red', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      words('plate', 'house');
      await open();
      press('Start');
      const timing = jest.spyOn(Animated, 'timing');

      tap('tlpea');

      expect(shakes(timing)).toBe(0);
      expect(faceColor('answer-face-0')).toBe(cellConflict);
    });
  });

  describe('announcements', () => {
    it('a polite live region says "Not a word" for a wrong row and "Solved" for the flash; the Time box has none', async () => {
      words('plate', 'house');
      await open();
      press('Start');
      expect(screen.getByTestId('announce').props.accessibilityLiveRegion).toBe('polite');
      expect(announced()).toBe('');

      tap('tlpea');
      expect(announced()).toBe('Not a word');
      press('Answer letter P, slot 3');
      expect(announced()).toBe('');
      press('Clear');
      tap('plate');
      expect(announced()).toBe('Solved');
      await tick(FLASH_MS);

      expect(announced()).toBe('');
      expect(screen.getByLabelText(/^Time /).props.accessibilityLiveRegion).toBeUndefined();
    });
  });

  describe('narrow screens', () => {
    const titleSize = () => StyleSheet.flatten(screen.getByText('Normal · Score').props.style).fontSize;

    it('the Score title has the same size at 360 as at the 750 px default, and a smaller one at 320', async () => {
      await open();
      const full = titleSize();
      screen.unmount();
      await settle();

      resize(360, 640);
      await open();
      expect(titleSize()).toBe(full);
      screen.unmount();
      await settle();

      resize(320, 568);
      await open();
      expect(titleSize()).toBeLessThan(full);
      expect(screen.getByText('Normal · Score')).toBeTruthy(); // still the whole title
    });

    const HEADER = 56; // the navigation header's usual height

    it.each([
      ['easy', 'bake', 4],
      ['normal', 'plate', 5],
      ['hard', 'garden', 6],
    ] as const)(
      '%s: the tile and block sizes at 360×640 and 320×568 give one row of tiles, a block that holds the layers, and a stack that fits the height',
      async (level, word, n) => {
        for (const [width, height] of [
          [360, 640],
          [320, 568],
        ]) {
          resize(width, height);
          await seed('anagram:settings', { level });
          words(word);
          await open();
          press('Start');

          const sizes = screen.getAllByTestId(/^rack-face-/).map((f) => StyleSheet.flatten(f.props.style).width);
          expect(sizes).toHaveLength(n);
          const size = sizes[0];
          expect(sizes.every((s) => s === size)).toBe(true);
          expect(n * size + (n - 1) * Spacing.two).toBeLessThanOrEqual(width - 2 * Spacing.two); // one row
          expect(size).toBeGreaterThanOrEqual(40); // and readable
          expect(screen.getAllByLabelText(/^Empty slot/)).toHaveLength(n);

          const block = StyleSheet.flatten(screen.getByTestId('letter-block').props.style).height;
          expect(block).toBeGreaterThanOrEqual(2 * size + Spacing.three);
          expect(block).toBeGreaterThanOrEqual(LAYER_HEIGHT);
          // padding, the boxes, the New row, the letter block, the button row, and the gaps between the four
          const stack = 2 * Spacing.two + SCORE_BOX_HEIGHT + COMPACT_HEIGHT + block + 48 + 3 * Spacing.three;
          expect(stack).toBeLessThanOrEqual(height - HEADER);

          await tick(60_000);
          expect(screen.getByTestId('result')).toBeTruthy();
          screen.unmount();
          await settle();
        }
      },
    );
  });
});
