import { LEVEL_IDS, replay, type Game, type Level } from './game';
import type { Order } from './order';
import {
  DEFAULT_SETTINGS,
  ORDER_KEY,
  ORDER_VERSION,
  SAVE_KEY,
  SAVE_VERSION,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  STATS_KEY,
  STATS_VERSION,
  fromOrders,
  fromSave,
  fromSettings,
  fromStats,
  toSave,
  type SaveData,
} from './save';
import type { Step } from './solve';
import { EMPTY_STATS, recordGame } from './stats';

// 3 3 8 8 solved in three steps: 8 ÷ 3, then 3 − 8/3, then 8 ÷ 1/3.
const STEPS: Step[] = [
  { first: 2, second: 0, op: '/' },
  { first: 1, second: 0, op: '-' },
  { first: 3, second: 0, op: '/' },
];
// 2 2 2 2 added up: three steps that end at 8, not 24.
const NOT_24: Step[] = [
  { first: 0, second: 1, op: '+' },
  { first: 2, second: 1, op: '+' },
  { first: 3, second: 1, op: '+' },
];

function built(numbers: number[], steps: Step[], level: Level = 'hard'): Game {
  const game = replay(level, numbers, steps);
  if (!game) throw new Error('the steps do not replay');
  return game;
}
const at = (n: number) => built([3, 3, 8, 8], STEPS.slice(0, n));

const roundTrip = (game: Game, elapsedMs: number) => fromSave(JSON.parse(JSON.stringify(toSave(game, elapsedMs))));
const good = (): SaveData => toSave({ ...at(2), hints: 2 }, 5000);

describe('keys', () => {
  it('are namespaced make24:, each at version 1', () => {
    expect([SAVE_KEY, STATS_KEY, SETTINGS_KEY, ORDER_KEY]).toEqual([
      'make24:save',
      'make24:stats',
      'make24:settings',
      'make24:order',
    ]);
    expect([SAVE_VERSION, STATS_VERSION, SETTINGS_VERSION, ORDER_VERSION]).toEqual([1, 1, 1, 1]);
  });
});

describe('toSave / fromSave', () => {
  it('stores the level, the sorted numbers, the steps, the hints and the elapsed time', () => {
    expect(toSave({ ...at(2), hints: 1 }, 900)).toEqual({
      level: 'hard',
      numbers: [3, 3, 8, 8],
      steps: STEPS.slice(0, 2),
      hints: 1,
      elapsedMs: 900,
    });
  });

  it.each([0, 1, 2])('round-trips a puzzle with %i step(s)', (n) => {
    expect(roundTrip(at(n), 12_345)).toEqual({ game: at(n), elapsedMs: 12_345 });
  });

  it('round-trips a puzzle with three steps that ended at 8, not 24', () => {
    const game = built([2, 2, 2, 2], NOT_24, 'easy');
    expect(game.status).toBe('playing');
    expect(roundTrip(game, 77)).toEqual({ game, elapsedMs: 77 });
  });

  it('round-trips on every level', () => {
    for (const level of LEVEL_IDS) {
      const game = built([3, 3, 8, 8], STEPS.slice(0, 1), level);
      expect(roundTrip(game, 5)).toEqual({ game, elapsedMs: 5 });
    }
  });

  it('keeps the hints and the elapsed time, and starts without a note', () => {
    const back = roundTrip({ ...at(1), hints: 3, note: { kind: 'hint', step: null } }, 61_000);
    expect(back?.game.hints).toBe(3);
    expect(back?.elapsedMs).toBe(61_000);
    expect(back?.game.note).toBeNull();
  });

  it('puts the last result back as the selected card, no operator', () => {
    const back = roundTrip(at(2), 0);
    expect(back?.game.selected).toBe(0);
    expect(back?.game.operator).toBeNull();
  });

  it('takes a fractional elapsed time: the clock does not count whole milliseconds', () => {
    expect(fromSave({ ...good(), elapsedMs: 1234.5 })?.elapsedMs).toBe(1234.5);
  });

  it('keeps only first, second and op of each step', () => {
    const data = { ...good(), steps: [{ ...STEPS[0], extra: 'x' }] };
    expect(fromSave(data)?.game.steps).toEqual([STEPS[0]]);
  });

  it.each<[string, unknown]>([
    ['not an object', 'x'],
    ['null', null],
    ['no level', { ...good(), level: undefined }],
    ['an unknown level', { ...good(), level: 'extreme' }],
    ['a level that is a number', { ...good(), level: 1 }],
    ['numbers that are not an array', { ...good(), numbers: '3388' }],
    ['three numbers', { ...good(), numbers: [3, 8, 8], steps: [] }],
    ['five numbers', { ...good(), numbers: [3, 3, 3, 8, 8], steps: [] }],
    ['a 0 among the numbers', { ...good(), numbers: [0, 3, 8, 8], steps: [] }],
    ['a 14 among the numbers', { ...good(), numbers: [3, 3, 8, 14], steps: [] }],
    ['a number that is not whole', { ...good(), numbers: [3, 3, 8, 8.5], steps: [] }],
    ['a number that is a string', { ...good(), numbers: [3, 3, 8, '8'], steps: [] }],
    ['numbers that are not sorted ascending', { ...good(), numbers: [8, 3, 3, 8], steps: [] }],
    ['steps that are not an array', { ...good(), steps: 'x' }],
    ['no steps', { ...good(), steps: undefined }],
    ['a step that is null', { ...good(), steps: [null] }],
    ['a step with no operator', { ...good(), steps: [{ first: 2, second: 0 }] }],
    ['an unknown operator', { ...good(), steps: [{ first: 2, second: 0, op: '^' }] }],
    ['a step place that is a string', { ...good(), steps: [{ first: '2', second: 0, op: '/' }] }],
    ['a negative step place', { ...good(), steps: [{ first: -1, second: 0, op: '/' }] }],
    ['a step place that is not whole', { ...good(), steps: [{ first: 2.5, second: 0, op: '/' }] }],
    ['a step place past the last card', { ...good(), steps: [{ first: 4, second: 0, op: '/' }] }],
    ['a step onto an empty place', { ...good(), steps: [STEPS[0], { first: 1, second: 2, op: '+' }] }],
    ['a step from an empty place', { ...good(), steps: [STEPS[0], { first: 2, second: 1, op: '+' }] }],
    ['a step with first the same as second', { ...good(), steps: [{ first: 1, second: 1, op: '+' }] }],
    [
      'a step that divides by 0',
      {
        ...good(),
        numbers: [1, 1, 5, 13],
        steps: [
          { first: 0, second: 1, op: '-' },
          { first: 2, second: 1, op: '/' },
        ],
      },
    ],
    ['more steps than the cards allow', { ...good(), steps: [...STEPS, { first: 0, second: 1, op: '+' }] }],
    ['a finished puzzle: the steps end at 24', { ...good(), steps: STEPS }],
    ['negative hints', { ...good(), hints: -1 }],
    ['hints that are not whole', { ...good(), hints: 1.5 }],
    ['hints that are a string', { ...good(), hints: '1' }],
    ['hints that are null', { ...good(), hints: null }],
    ['no hints', { ...good(), hints: undefined }],
    ['a negative elapsed time', { ...good(), elapsedMs: -1 }],
    ['an elapsed time that is not finite', { ...good(), elapsedMs: Infinity }],
    ['an elapsed time that is a string', { ...good(), elapsedMs: '5000' }],
    ['an elapsed time that is null', { ...good(), elapsedMs: null }],
    ['no elapsed time', { ...good(), elapsedMs: undefined }],
  ])('rejects %s', (_name, data) => {
    expect(fromSave(data)).toBeNull();
  });
});

describe('fromStats', () => {
  it('keeps valid stats', () => {
    let stats = recordGame(EMPTY_STATS, 'easy', { solved: true, hinted: false, ms: 42_000 });
    stats = recordGame(stats, 'hard', { solved: false, hinted: true, ms: 20_000 });

    expect(fromStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats);
  });

  it('drops keys that are not a level', () => {
    const stats = recordGame(EMPTY_STATS, 'medium', { solved: true, hinted: true, ms: 5_000 });
    const back = fromStats({ ...stats, extreme: EMPTY_STATS.easy, extra: 'x' });

    expect(back).toEqual(stats);
    expect(Object.keys(back)).toEqual(['easy', 'medium', 'hard']);
  });

  const withLevel = (level: Level, value: unknown) => ({ ...EMPTY_STATS, [level]: value });
  const { easy, medium, hard } = EMPTY_STATS;

  it.each([
    ['null', null],
    ['not an object', 'x'],
    ['a missing level', { easy, medium }],
    ['a level that is null', withLevel('medium', null)],
    ['a negative count', withLevel('easy', { ...easy, played: -1 })],
    ['a fractional count', withLevel('hard', { ...hard, solved: 0.5 })],
    ['a missing streak', withLevel('easy', { played: 0, solved: 0, currentStreak: 0, bestMs: null })],
    ['a bad best streak', withLevel('hard', { ...hard, bestStreak: '3' })],
    ['a missing best time', withLevel('medium', { played: 0, solved: 0, currentStreak: 0, bestStreak: 0 })],
    ['a bad best time', withLevel('easy', { ...easy, bestMs: 'fast' })],
    ['a negative best time', withLevel('medium', { ...medium, bestMs: -5 })],
    [
      'the old wins field instead of solved',
      withLevel('easy', { played: 0, wins: 0, currentStreak: 0, bestStreak: 0, bestMs: null }),
    ],
  ])('falls back to empty stats for %s', (_name, data) => {
    expect(fromStats(data)).toEqual(EMPTY_STATS);
  });
});

describe('fromSettings', () => {
  it('keeps a valid level', () => {
    for (const level of LEVEL_IDS) expect(fromSettings({ level })).toEqual({ level });
  });

  it('defaults to Easy', () => {
    expect(DEFAULT_SETTINGS).toEqual({ level: 'easy' });
  });

  it.each([
    ['null', null],
    ['not an object', 7],
    ['no level', {}],
    ['an unknown level', { level: 'extreme' }],
    ['a level that is a number', { level: 2 }],
  ])('falls back to the default for %s', (_name, data) => {
    expect(fromSettings(data)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('fromOrders', () => {
  const order = (): Order => ({
    puzzles: [
      [1, 2, 3, 4],
      [1, 5, 5, 13],
      [3, 3, 8, 8],
    ],
    next: 1,
  });

  it('keeps the orders of the levels it is given, as they are', () => {
    const orders = { easy: order(), hard: { puzzles: [[3, 3, 8, 8]], next: 0 } };
    expect(fromOrders(JSON.parse(JSON.stringify(orders)))).toEqual(orders);
  });

  it('takes a finished order (next at the end) and an empty one', () => {
    const orders = { easy: { puzzles: [[1, 2, 3, 4]], next: 1 }, medium: { puzzles: [], next: 0 } };
    expect(fromOrders(orders)).toEqual(orders);
  });

  it('keeps only the levels, no stray keys, and only the fields of an order', () => {
    const back = fromOrders({ easy: { ...order(), extra: 'x' }, extreme: order(), extra: 'x' });
    expect(back).toEqual({ easy: order() });
    expect(Object.keys(back)).toEqual(['easy']);
  });

  it.each([
    ['null', null],
    ['not an object', 'x'],
    ['a number', 7],
    ['an array of orders', [order()]],
  ])('gives no orders for %s', (_name, data) => {
    expect(fromOrders(data)).toEqual({});
  });

  it.each<[string, unknown]>([
    ['an order that is null', null],
    ['an order that is a string', 'x'],
    ['no puzzles', { next: 0 }],
    ['puzzles that are not an array', { puzzles: 'x', next: 0 }],
    ['a puzzle with three numbers', { puzzles: [[1, 2, 3]], next: 0 }],
    ['a puzzle with five numbers', { puzzles: [[1, 2, 3, 4, 5]], next: 0 }],
    ['a puzzle with a 0', { puzzles: [[0, 2, 3, 4]], next: 0 }],
    ['a puzzle with a 14', { puzzles: [[1, 2, 3, 14]], next: 0 }],
    ['a puzzle with a fraction', { puzzles: [[1, 2, 3, 1.5]], next: 0 }],
    ['a puzzle that is not an array', { puzzles: ['1234'], next: 0 }],
    ['no next', { puzzles: [[1, 2, 3, 4]] }],
    ['a negative next', { puzzles: [[1, 2, 3, 4]], next: -1 }],
    ['a next that is not whole', { puzzles: [[1, 2, 3, 4]], next: 0.5 }],
    ['a next that is a string', { puzzles: [[1, 2, 3, 4]], next: '0' }],
    ['a next past the end', { puzzles: [[1, 2, 3, 4]], next: 2 }],
  ])('drops a level with %s and keeps the others', (_name, bad) => {
    expect(fromOrders({ easy: bad, medium: order() })).toEqual({ medium: order() });
  });
});
