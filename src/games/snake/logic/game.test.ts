import { mulberry32 } from '@/lib/random';
import { CELLS, COLS, LEVEL_IDS, cell, type Dir, type Level } from './board';
import { placeApple } from './apple';
import { interval, isStarted, newGame, pause, resume, step, turn, type Game, type Status } from './game';

const random = mulberry32(1);

type At = [col: number, row: number];
const cells = (...at: At[]) => at.map(([col, row]) => cell(col, row));

// A running game on a hand-built position: the snake head first, the apple, the rest as in newGame.
const running = (snake: number[], dir: Dir, apple: number | null, extra: Partial<Game> = {}): Game => ({
  ...newGame('normal', mulberry32(1)),
  snake,
  dir,
  apple,
  status: 'running',
  ...extra,
});

// Heading up in the middle of the board, the apple far away.
const goingUp = () => running(cells([7, 10], [7, 11], [7, 12]), 'up', cell(0, 0));

// The first n cells of a path through the whole board: row 0 left to right, row 1 right to left, and so on. The last
// row (20) runs left to right again, so cell 313 is (13, 20) and cell 314, the last one, is (14, 20).
const serpentine = (n: number): number[] =>
  Array.from({ length: n }, (_, k) => {
    const row = Math.floor(k / COLS);
    const col = k % COLS;
    return cell(row % 2 === 0 ? col : COLS - 1 - col, row);
  });

const OTHER_STATUSES: Status[] = ['ready', 'paused', 'over', 'won'];

describe('newGame', () => {
  it.each(LEVEL_IDS)(
    '%s: length 3, vertical in the middle of the lower half, heading up, waiting for the first swipe',
    (level) => {
      const g = newGame(level, mulberry32(1));
      expect(g.level).toBe(level);
      expect(g.snake).toEqual(cells([7, 12], [7, 13], [7, 14])); // head at column 8, row 13 (1-based)
      expect(g.dir).toBe('up');
      expect(g.queue).toEqual([]);
      expect(g.apples).toBe(0);
      expect(g.status).toBe('ready');
    },
  );

  it('puts the apple on an empty cell, the same one for the same seed', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = newGame('normal', mulberry32(seed));
      expect(g.apple).not.toBeNull();
      expect(g.snake).not.toContain(g.apple);
      expect(g.apple).toBe(placeApple(g.snake, mulberry32(seed)));
    }
    expect(newGame('normal', mulberry32(9))).toEqual(newGame('normal', mulberry32(9)));
  });
});

describe('isStarted', () => {
  it('is false while waiting for the first swipe, true in every other state', () => {
    expect(isStarted(newGame('normal', random))).toBe(false);
    for (const status of ['running', 'paused', 'over', 'won'] as const) {
      expect(isStarted({ ...newGame('normal', random), status })).toBe(true);
    }
  });
});

describe('turn: the first swipe', () => {
  it.each<Dir>(['left', 'right', 'up'])('%s sets the direction and starts the game', (dir) => {
    const g = turn(newGame('normal', random), dir);
    expect(g.status).toBe('running');
    expect(g.dir).toBe(dir);
    expect(g.queue).toEqual([]);
    expect(isStarted(g)).toBe(true);
  });

  it('down (into its own body) is ignored: the same game, still waiting', () => {
    const g = newGame('normal', random);
    expect(turn(g, 'down')).toBe(g);
  });

  it('does not move the snake or touch the apple', () => {
    const g = newGame('normal', random);
    const started = turn(g, 'left');
    expect(started.snake).toEqual(g.snake);
    expect(started.apple).toBe(g.apple);
  });
});

describe('turn: the queue of a running game', () => {
  it('queues a turn without changing the direction yet', () => {
    const g = turn(goingUp(), 'left');
    expect(g.queue).toEqual(['left']);
    expect(g.dir).toBe('up');
  });

  it('holds 2 turns, in order, and drops a third', () => {
    const two = turn(turn(goingUp(), 'left'), 'down');
    expect(two.queue).toEqual(['left', 'down']);
    expect(turn(two, 'right')).toBe(two);
    expect(turn(two, 'left')).toBe(two);
  });

  it('ignores the current direction and its opposite when the queue is empty', () => {
    const g = goingUp();
    expect(turn(g, 'up')).toBe(g);
    expect(turn(g, 'down')).toBe(g);
  });

  it('checks a turn against the last queued one, not the current direction', () => {
    const left = turn(goingUp(), 'left');
    expect(turn(left, 'left')).toBe(left); // the same as the last queued
    expect(turn(left, 'right')).toBe(left); // the opposite of the last queued
    expect(turn(left, 'up').queue).toEqual(['left', 'up']); // the current direction is fine after a turn
    expect(turn(left, 'down').queue).toEqual(['left', 'down']); // up, left, down is a legal path
  });

  it.each<Status>(['paused', 'over', 'won'])('does nothing in a %s game', (status) => {
    const g = { ...goingUp(), status };
    expect(turn(g, 'left')).toBe(g);
  });
});

describe('step: moving', () => {
  it.each<[Dir, At[], At]>([
    [
      'up',
      [
        [7, 10],
        [7, 11],
        [7, 12],
      ],
      [7, 9],
    ],
    [
      'down',
      [
        [7, 10],
        [7, 9],
        [7, 8],
      ],
      [7, 11],
    ],
    [
      'left',
      [
        [7, 10],
        [8, 10],
        [9, 10],
      ],
      [6, 10],
    ],
    [
      'right',
      [
        [7, 10],
        [6, 10],
        [5, 10],
      ],
      [8, 10],
    ],
  ])('%s: the head moves one cell, the tail follows, the length stays', (dir, body, to) => {
    const g = running(cells(...body), dir, cell(0, 0));
    const after = step(g, random);
    expect(after.snake).toEqual([cell(...to), ...g.snake.slice(0, 2)]);
    expect(after.status).toBe('running');
    expect(after.apples).toBe(0);
    expect(after.apple).toBe(cell(0, 0));
  });

  it('takes the next cell before a wall without dying', () => {
    const g = running(cells([7, 1], [7, 2], [7, 3]), 'up', cell(0, 0));
    expect(step(g, random)).toMatchObject({ status: 'running', snake: cells([7, 0], [7, 1], [7, 2]) });
  });

  it.each<Status>(OTHER_STATUSES)('does nothing in a %s game', (status) => {
    const g = { ...goingUp(), status };
    expect(step(g, random)).toBe(g);
  });

  it('does not change the game it is given', () => {
    const g = running(cells([7, 10], [7, 11], [7, 12]), 'up', cell(7, 9), { queue: ['left'] });
    const before = JSON.stringify(g);
    step(g, mulberry32(4));
    expect(JSON.stringify(g)).toBe(before);
  });
});

describe('step: the turn queue', () => {
  it('with nothing queued the snake keeps its direction', () => {
    const g = step(step(goingUp(), random), random);
    expect(g.dir).toBe('up');
    expect(g.snake[0]).toBe(cell(7, 8));
  });

  it('takes one queued turn per tick: two quick swipes between ticks both count', () => {
    let g = turn(turn(goingUp(), 'left'), 'up');
    expect(g.queue).toEqual(['left', 'up']);

    g = step(g, random);
    expect(g.dir).toBe('left');
    expect(g.snake[0]).toBe(cell(6, 10));
    expect(g.queue).toEqual(['up']);

    g = step(g, random);
    expect(g.dir).toBe('up');
    expect(g.snake[0]).toBe(cell(6, 9));
    expect(g.queue).toEqual([]);

    g = step(g, random);
    expect(g.snake[0]).toBe(cell(6, 8)); // and it keeps going up
  });

  it('a turn queued after a tick starts a new queue', () => {
    let g = step(turn(goingUp(), 'left'), random);
    g = turn(g, 'down');
    expect(g.queue).toEqual(['down']);
    expect(step(g, random).snake[0]).toBe(cell(6, 11));
  });

  it('a third swipe between two ticks is dropped', () => {
    let g = turn(turn(turn(goingUp(), 'left'), 'down'), 'right');
    g = step(step(g, random), random);
    expect(g.dir).toBe('down');
    expect(g.queue).toEqual([]);
    expect(step(g, random).snake[0]).toBe(cell(6, 12)); // down, not right
  });
});

describe('step: eating', () => {
  const eating = () => running(cells([7, 10], [7, 11], [7, 12]), 'up', cell(7, 9));

  it('grows by one (the tail stays this tick), scores an apple and places a new apple with the given random', () => {
    const after = step(eating(), mulberry32(9));
    expect(after.snake).toEqual(cells([7, 9], [7, 10], [7, 11], [7, 12]));
    expect(after.apples).toBe(1);
    expect(after.status).toBe('running');
    expect(after.apple).toBe(placeApple(after.snake, mulberry32(9))); // on the snake as it is after the move
  });

  it('keeps the apple as it is when nothing is eaten, and only asks for a new one when eating', () => {
    const noRandom = () => {
      throw new Error('random used');
    };
    const g = running(cells([7, 10], [7, 11], [7, 12]), 'up', cell(3, 3));
    expect(step(g, noRandom).apple).toBe(cell(3, 3));
  });

  it('eating several apples in a row keeps counting and growing', () => {
    let g = eating();
    g = step(g, random); // eats (7, 9)
    g = { ...g, apple: cell(7, 8) };
    g = step(g, random);
    expect(g.apples).toBe(2);
    expect(g.snake).toHaveLength(5);
  });

  it('eating works while turning, too', () => {
    const g = turn(running(cells([7, 10], [7, 11], [7, 12]), 'up', cell(6, 10)), 'left');
    const after = step(g, random);
    expect(after.apples).toBe(1);
    expect(after.snake).toHaveLength(4);
    expect(after.snake[0]).toBe(cell(6, 10));
  });
});

describe('step: walls kill', () => {
  it.each<[string, Dir, At[]]>([
    [
      'top',
      'up',
      [
        [7, 0],
        [7, 1],
        [7, 2],
      ],
    ],
    [
      'bottom',
      'down',
      [
        [7, 20],
        [7, 19],
        [7, 18],
      ],
    ],
    [
      'left',
      'left',
      [
        [0, 5],
        [1, 5],
        [2, 5],
      ],
    ],
    [
      'right',
      'right',
      [
        [14, 5],
        [13, 5],
        [12, 5],
      ],
    ],
    [
      'top-left corner',
      'left',
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
    ],
    [
      'bottom-right corner',
      'down',
      [
        [14, 20],
        [14, 19],
        [14, 18],
      ],
    ],
  ])('%s: moving off the board ends the game and leaves the snake where it was', (_name, dir, body) => {
    const g = running(cells(...body), dir, cell(7, 7));
    const after = step(g, random);
    expect(after.status).toBe('over');
    expect(after.snake).toEqual(g.snake);
    expect(after.apples).toBe(0);
    expect(after.apple).toBe(cell(7, 7));
  });

  it('a queued turn into the wall kills on that tick', () => {
    const g = turn(running(cells([0, 5], [0, 6], [0, 7]), 'up', cell(7, 7)), 'left');
    expect(step(g, random).status).toBe('over');
  });

  it('the left edge does not wrap to the end of the row above', () => {
    const g = running(cells([0, 5], [1, 5], [2, 5]), 'left', cell(14, 4));
    const after = step(g, random);
    expect(after.status).toBe('over'); // eating the apple at (14, 4) would mean it wrapped
    expect(after.apples).toBe(0);
  });

  it('a finished game stays as it is: no step, no turn, no pause, no resume', () => {
    const over = step(running(cells([7, 0], [7, 1], [7, 2]), 'up', cell(3, 3)), random);
    expect(over.status).toBe('over');
    expect(step(over, random)).toBe(over);
    expect(turn(over, 'left')).toBe(over);
    expect(pause(over)).toBe(over);
    expect(resume(over)).toBe(over);
  });
});

describe('step: the body kills', () => {
  it('moving into the body ends the game and leaves the snake where it was', () => {
    // A hook: the head at (5, 5) heading up; turning right runs into (6, 5), the second to last cell, not the tail.
    const g = turn(running(cells([5, 5], [5, 6], [6, 6], [6, 5], [6, 4]), 'up', cell(0, 0)), 'right');
    expect(g.snake.indexOf(cell(6, 5))).toBe(g.snake.length - 2);
    const after = step(g, random);
    expect(after.status).toBe('over');
    expect(after.snake).toEqual(g.snake);
    expect(after.apples).toBe(0);
  });

  it('moving into the cell the tail leaves in the same tick is allowed', () => {
    // A 2 x 2 loop: the head at (5, 5) heading left turns down into (5, 6), where the tail is just leaving.
    const g = turn(running(cells([5, 5], [6, 5], [6, 6], [5, 6]), 'left', cell(0, 0)), 'down');
    const after = step(g, random);
    expect(after.status).toBe('running');
    expect(after.snake).toEqual(cells([5, 6], [5, 5], [6, 5], [6, 6]));
    expect(after.apples).toBe(0);
  });

  it('but not in a tick that grows: the tail stays, so the apple on the tail cell kills', () => {
    const g = turn(running(cells([5, 5], [6, 5], [6, 6], [5, 6]), 'left', cell(5, 6)), 'down');
    const after = step(g, random);
    expect(after.status).toBe('over');
    expect(after.snake).toEqual(g.snake);
    expect(after.apples).toBe(0);
  });
});

describe('step: a full board wins', () => {
  it('eating the last apple fills every cell: won, with no apple left', () => {
    // The snake follows the path over every cell but the last one, which holds the apple right in front of the head.
    const snake = serpentine(CELLS - 1).reverse();
    expect(snake[0]).toBe(cell(13, 20));
    const g = running(snake, 'right', cell(14, 20), { apples: CELLS - 1 - 3 });
    const after = step(g, random);
    expect(after.status).toBe('won');
    expect(after.snake).toHaveLength(CELLS);
    expect(new Set(after.snake).size).toBe(CELLS);
    expect(after.apple).toBeNull();
    expect(after.apples).toBe(CELLS - 3); // 312 apples
    expect(isStarted(after)).toBe(true);
  });

  it('a won game stays as it is', () => {
    const snake = serpentine(CELLS - 1).reverse();
    const won = step(running(snake, 'right', cell(14, 20), { apples: CELLS - 1 - 3 }), random);
    expect(step(won, random)).toBe(won);
    expect(turn(won, 'up')).toBe(won);
    expect(pause(won)).toBe(won);
    expect(resume(won)).toBe(won);
  });

  it('with two empty cells left, eating one puts the apple on the other and the game goes on', () => {
    const snake = serpentine(CELLS - 2).reverse(); // everything but the last two cells of the path
    const g = running(snake, 'right', cell(13, 20), { apples: CELLS - 2 - 3 });
    expect(snake[0]).toBe(cell(12, 20));
    const after = step(g, random);
    expect(after.status).toBe('running');
    expect(after.apple).toBe(cell(14, 20));
    expect(after.snake).toHaveLength(CELLS - 1);
  });
});

describe('pause / resume', () => {
  it('pause stops a running game, resume continues it with the same snake, direction and queue', () => {
    const g = turn(goingUp(), 'left');
    const paused = pause(g);
    expect(paused.status).toBe('paused');
    expect(paused).toEqual({ ...g, status: 'paused' });
    expect(resume(paused)).toEqual(g);
  });

  it('a paused game does not move', () => {
    const paused = pause(goingUp());
    expect(step(paused, random)).toBe(paused);
    expect(turn(paused, 'left')).toBe(paused);
  });

  it('pause only applies to a running game, resume only to a paused one', () => {
    const g = goingUp();
    expect(resume(g)).toBe(g);
    const ready = newGame('normal', random);
    expect(pause(ready)).toBe(ready);
    expect(resume(ready)).toBe(ready);
    const paused = pause(g);
    expect(pause(paused)).toBe(paused);
  });
});

describe('interval', () => {
  it.each<[Level, number, number]>([
    ['slow', 0, 220],
    ['normal', 0, 160],
    ['fast', 0, 110],
    ['slow', 4, 220],
    ['normal', 4, 160],
    ['fast', 4, 110],
    ['slow', 5, 209], // 5 % faster every 5 apples
    ['normal', 5, 152],
    ['slow', 10, 199], // 220 * 0.95^2 = 198.55
    ['normal', 10, 144],
    ['fast', 10, 99],
    ['slow', 35, 154], // the last step above the floor ...
    ['slow', 40, 150], // ... and the first one cut to it (145.9 would be below)
    ['normal', 45, 101],
    ['normal', 50, 100],
    ['fast', 40, 73],
    ['fast', 45, 70],
  ])('%s with %i apples: %i ms', (level, apples, ms) => {
    expect(interval({ level, apples })).toBe(ms);
  });

  it.each<[Level, number]>([
    ['slow', 150],
    ['normal', 100],
    ['fast', 70],
  ])('%s never gets below %i ms, however many apples, and never gets slower as it goes', (level, floor) => {
    let before = Infinity;
    for (let apples = 0; apples <= 400; apples++) {
      const ms = interval({ level, apples });
      expect(ms).toBeGreaterThanOrEqual(floor);
      expect(ms).toBeLessThanOrEqual(before);
      before = ms;
    }
    expect(before).toBe(floor);
  });
});
