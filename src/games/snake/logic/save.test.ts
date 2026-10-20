import { mulberry32 } from '@/lib/random';
import { CELLS, COLS, LEVEL_IDS, ROWS, cell, type Dir, type Level } from './board';
import { newGame, pause, step, turn, type Game, type Status } from './game';
import { DEFAULT_SETTINGS, fromSave, fromSettings, fromStats, toSave, type SaveData } from './save';
import { EMPTY_STATS, recordGame } from './stats';

type At = [col: number, row: number];
const cells = (...at: At[]) => at.map(([col, row]) => cell(col, row));

// A running game on a hand-built position: the snake head first, the apple, the rest as in newGame.
const running = (level: Level, snake: At[], dir: Dir, apple: At, apples: number): Game => ({
  ...newGame(level, mulberry32(1)),
  snake: cells(...snake),
  dir,
  apple: cell(...apple),
  apples,
  status: 'running',
});

// A snake of 5 that went up and then right along the bottom: 2 apples eaten.
const BODY: At[] = [
  [7, 12],
  [7, 13],
  [7, 14],
  [8, 14],
  [9, 14],
];
const grown = (level: Level = 'normal') => running(level, BODY, 'up', [3, 4], 2);

const roundTrip = (game: Game, elapsedMs: number) => fromSave(JSON.parse(JSON.stringify(toSave(game, elapsedMs))));

const good = () => toSave(grown(), 5000) as SaveData;

describe('toSave', () => {
  it('stores the cells as [col, row], the snake head first, and the elapsed time', () => {
    expect(toSave(grown('fast'), 900)).toEqual({
      level: 'fast',
      snake: [
        [7, 12],
        [7, 13],
        [7, 14],
        [8, 14],
        [9, 14],
      ],
      dir: 'up',
      apple: [3, 4],
      apples: 2,
      elapsedMs: 900,
    });
  });

  it.each<Status>(['ready', 'over', 'won'])('saves no %s game: only a started, unfinished one is saved', (status) => {
    expect(toSave({ ...grown(), status }, 0)).toBeNull();
  });

  it('saves no game that ended against a wall, although its snake looks fine', () => {
    const wall = step(
      running(
        'normal',
        [
          [7, 0],
          [7, 1],
          [7, 2],
        ],
        'up',
        [3, 3],
        0,
      ),
      mulberry32(1),
    );
    expect(wall.status).toBe('over');
    expect(toSave(wall, 1000)).toBeNull();
  });

  it('leaves the turn queue out', () => {
    const queued = turn(turn(grown(), 'left'), 'down');
    expect(queued.queue).toHaveLength(2);
    expect(toSave(queued, 0)).not.toHaveProperty('queue');
  });
});

describe('fromSave', () => {
  it('round-trips a started game, and it loads paused with an empty queue', () => {
    const game = grown();
    expect(roundTrip(game, 12_345)).toEqual({ game: { ...game, status: 'paused' }, elapsedMs: 12_345 });
  });

  it('round-trips a game that was just started by the first swipe, and one that is already paused', () => {
    const started = turn(newGame('slow', mulberry32(2)), 'left');
    expect(roundTrip(started, 0)).toEqual({ game: { ...started, status: 'paused' }, elapsedMs: 0 });
    expect(roundTrip(pause(started), 8)).toEqual({ game: pause(started), elapsedMs: 8 });
  });

  it('round-trips a game after some ticks, whichever way it went', () => {
    let game = turn(newGame('normal', mulberry32(4)), 'right');
    for (let k = 0; k < 4; k++) game = step(game, mulberry32(4 + k));
    game = turn(step(game, mulberry32(4)), 'up');
    game = step(game, mulberry32(5));
    expect(game.status).toBe('running');
    expect(roundTrip(game, 3000)).toEqual({ game: { ...game, status: 'paused', queue: [] }, elapsedMs: 3000 });
  });

  it('takes a fractional elapsed time: the clock does not count whole milliseconds', () => {
    expect(fromSave({ ...good(), elapsedMs: 1234.5 })?.elapsedMs).toBe(1234.5);
  });

  it('takes a snake along the edge of the board, in any of the four directions', () => {
    for (const [snake, dir] of [
      [
        [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
        'down',
      ],
      [
        [
          [14, 20],
          [14, 19],
          [14, 18],
        ],
        'left',
      ],
      [
        [
          [0, 20],
          [0, 19],
          [0, 18],
        ],
        'right',
      ],
      [
        [
          [14, 0],
          [13, 0],
          [12, 0],
        ],
        'down',
      ],
    ] as [At[], Dir][]) {
      expect(fromSave({ ...good(), snake, dir, apples: 0, apple: [7, 7] })).not.toBeNull();
    }
  });

  const dir = (v: unknown) => ({ ...good(), dir: v });
  const snakeOf = (snake: unknown, apples = 2) => ({ ...good(), snake, apples });

  it.each<[string, unknown]>([
    ['not an object', 'x'],
    ['null', null],
    ['no level', { ...good(), level: undefined }],
    ['an unknown level', { ...good(), level: 'extreme' }],
    ['a level that is a number', { ...good(), level: 1 }],
    ['no direction', dir(undefined)],
    ['an unknown direction', dir('north')],
    ['a direction that is a number', dir(0)],
    ['a direction into the neck', dir('down')], // the neck is below the head
    [
      'a direction into a horizontal neck',
      {
        ...good(),
        snake: [
          [5, 5],
          [4, 5],
          [3, 5],
        ],
        apples: 0,
        dir: 'left',
      },
    ],
    ['a negative elapsed time', { ...good(), elapsedMs: -1 }],
    ['an elapsed time that is not finite', { ...good(), elapsedMs: Infinity }],
    ['an elapsed time that is a string', { ...good(), elapsedMs: '5000' }],

    ['a snake that is not an array', snakeOf('x')],
    ['no snake', snakeOf(undefined)],
    ['an empty snake', snakeOf([], -3)],
    [
      'a snake of 2 cells',
      snakeOf(
        [
          [7, 12],
          [7, 13],
        ],
        -1,
      ),
    ],
    ['a cell that is a number', snakeOf([[7, 12], 13, [7, 14], [8, 14], [9, 14]])],
    [
      'a cell with 3 numbers',
      snakeOf([
        [7, 12],
        [7, 13, 0],
        [7, 14],
        [8, 14],
        [9, 14],
      ]),
    ],
    [
      'a column past the board',
      snakeOf([
        [COLS, 12],
        [COLS - 1, 12],
        [COLS - 2, 12],
        [COLS - 3, 12],
        [COLS - 4, 12],
      ]),
    ],
    [
      'a row past the board',
      snakeOf([
        [7, ROWS],
        [7, ROWS - 1],
        [7, ROWS - 2],
        [7, ROWS - 3],
        [7, ROWS - 4],
      ]),
    ],
    [
      'a negative column',
      snakeOf([
        [-1, 12],
        [0, 12],
        [1, 12],
        [2, 12],
        [3, 12],
      ]),
    ],
    [
      'a snake that overlaps itself',
      snakeOf([
        [7, 12],
        [7, 13],
        [7, 14],
        [8, 14],
        [7, 14],
      ]),
    ],
    [
      'a snake that crosses itself (head on the second cell)',
      snakeOf([
        [7, 12],
        [7, 13],
        [7, 12],
        [7, 13],
        [7, 14],
      ]),
    ],
    [
      'a snake with a gap',
      snakeOf([
        [7, 12],
        [7, 13],
        [7, 15],
        [8, 15],
        [9, 15],
      ]),
    ],
    [
      'a snake that touches only diagonally',
      snakeOf([
        [7, 12],
        [7, 13],
        [7, 14],
        [8, 15],
        [9, 15],
      ]),
    ],
    [
      'a snake that wraps around the edge of the board',
      {
        ...good(),
        snake: [
          [2, 6],
          [1, 6],
          [0, 6],
          [14, 5],
        ],
        apples: 1,
        dir: 'right',
      },
    ],
    [
      'a snake that wraps from the last cell to the first',
      {
        ...good(),
        snake: [
          [1, 0],
          [0, 0],
          [14, 20],
        ],
        apples: 0,
        dir: 'right',
      },
    ],

    ['no apple', { ...good(), apple: undefined }],
    ['an apple that is a number', { ...good(), apple: 5 }],
    ['an apple with 3 numbers', { ...good(), apple: [3, 4, 0] }],
    ['an apple past the last column', { ...good(), apple: [COLS, 4] }],
    ['an apple past the last row', { ...good(), apple: [3, ROWS] }],
    ['an apple at a negative cell', { ...good(), apple: [-1, 4] }],
    ['an apple on the head', { ...good(), apple: [7, 12] }],
    ['an apple on the body', { ...good(), apple: [8, 14] }],
    ['an apple on the tail', { ...good(), apple: [9, 14] }],

    ['apples that are one too many for the length', { ...good(), apples: 3 }],
    ['apples that are one too few for the length', { ...good(), apples: 1 }],
    ['no apples', { ...good(), apples: undefined }],
    ['apples that are negative', { ...good(), apples: -1 }],
    ['apples that are fractional', { ...good(), apples: 2.5 }],
    ['apples that are a string', { ...good(), apples: '2' }],

    [
      'a snake that fills the board (a finished game: there is no room for an apple)',
      {
        ...good(),
        snake: Array.from({ length: CELLS }, (_, k) => [
          Math.floor(k / COLS) % 2 === 0 ? k % COLS : COLS - 1 - (k % COLS),
          Math.floor(k / COLS),
        ]),
        apples: CELLS - 3,
      },
    ],
  ])('rejects %s', (_name, data) => {
    expect(fromSave(data)).toBeNull();
  });
});

describe('fromStats', () => {
  it('keeps valid stats', () => {
    let stats = recordGame(EMPTY_STATS, 'normal', { apples: 23, ms: 83_000 });
    stats = recordGame(stats, 'fast', { apples: 0, ms: 2_000 });

    expect(fromStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats);
  });

  it('drops keys that are not a level', () => {
    const stats = recordGame(EMPTY_STATS, 'slow', { apples: 5, ms: 5_000 });
    const back = fromStats({ ...stats, extreme: EMPTY_STATS.slow, extra: 'x' });

    expect(back).toEqual(stats);
    expect(Object.keys(back)).toEqual(['slow', 'normal', 'fast']);
  });

  it('takes a fractional longest game: the clock does not count whole milliseconds', () => {
    const stats = { ...EMPTY_STATS, normal: { played: 1, best: 2, totalApples: 2, longestMs: 1234.5 } };
    expect(fromStats(stats)).toEqual(stats);
  });

  const withLevel = (level: Level, value: unknown) => ({ ...EMPTY_STATS, [level]: value });
  const { slow, normal, fast } = EMPTY_STATS;

  it.each([
    ['null', null],
    ['not an object', 'x'],
    ['a missing level', { slow, normal }],
    ['a level that is null', withLevel('normal', null)],
    ['a negative count', withLevel('slow', { ...slow, played: -1 })],
    ['a fractional best score', withLevel('fast', { ...fast, best: 0.5 })],
    ['a total that is a string', withLevel('normal', { ...normal, totalApples: '3' })],
    ['a missing best score', withLevel('slow', { played: 0, totalApples: 0, longestMs: 0 })],
    ['a missing longest game', withLevel('slow', { played: 0, best: 0, totalApples: 0 })],
    ['a longest game that is null', withLevel('normal', { ...normal, longestMs: null })],
    ['a negative longest game', withLevel('normal', { ...normal, longestMs: -5 })],
    ['a longest game that is not finite', withLevel('fast', { ...fast, longestMs: Infinity })],
  ])('falls back to empty stats for %s', (_name, data) => {
    expect(fromStats(data)).toEqual(EMPTY_STATS);
  });
});

describe('fromSettings', () => {
  it('keeps a valid level', () => {
    for (const level of LEVEL_IDS) expect(fromSettings({ level })).toEqual({ level });
  });

  it('defaults to Normal', () => {
    expect(DEFAULT_SETTINGS).toEqual({ level: 'normal' });
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
