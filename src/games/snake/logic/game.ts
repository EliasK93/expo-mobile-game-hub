import { cell, next, opposite, type Dir, type Level } from './board';
import { placeApple } from './apple';
import type { Random } from '@/lib/random';

// ready = the snake and the apple are shown, waiting for the first swipe; over = a wall or the body; won = the snake
// fills the board. apple is null only in a won game. snake is cell indices, head first. queue = the turns waiting for
// the next ticks (at most 2). The time is not here: the UI's clock owns it, like Minesweeper's.
export type Status = 'ready' | 'running' | 'paused' | 'over' | 'won';
export type Game = {
  level: Level;
  snake: number[];
  dir: Dir;
  queue: Dir[];
  apple: number | null;
  apples: number;
  status: Status;
};

export const START_LENGTH = 3; // the score is the apples eaten: length - START_LENGTH
const QUEUE_SIZE = 2;
const APPLES_PER_SPEEDUP = 5;

// Vertical in the middle of the lower half, heading up: the head at column 8, row 13 (1-based), the body below it.
export const newGame = (level: Level, random: Random): Game => {
  const snake = Array.from({ length: START_LENGTH }, (_, k) => cell(7, 12 + k));
  return { level, snake, dir: 'up', queue: [], apple: placeApple(snake, random), apples: 0, status: 'ready' };
};

// Started = the first swipe has been made; only a started game is recorded when abandoned.
export const isStarted = (game: Game) => game.status !== 'ready';

// A swipe. The first one starts the game (any way but down, into its own body). In a running game it joins the queue,
// unless the queue is full or it is the same as, or the opposite of, the last turn before it (the last queued one, else
// the current direction). Anything else returns the same game.
export function turn(game: Game, dir: Dir): Game {
  if (game.status === 'ready') return dir === opposite(game.dir) ? game : { ...game, dir, status: 'running' };
  if (game.status !== 'running' || game.queue.length >= QUEUE_SIZE) return game;
  const last = game.queue[game.queue.length - 1] ?? game.dir;
  return dir === last || dir === opposite(last) ? game : { ...game, queue: [...game.queue, dir] };
}

// One tick of a running game (anything else returns the same game): takes the next queued turn and moves the head. Off
// the board or into the body ends the game, with the snake left where it was. The apple grows the snake (the tail stays)
// and a new one is placed; with no room left the game is won. The tail's cell is free to enter, because the tail leaves
// in the same tick, unless the snake grows in it.
export function step(game: Game, random: Random): Game {
  if (game.status !== 'running') return game;
  const dir = game.queue[0] ?? game.dir;
  const queue = game.queue.slice(1);
  const head = next(game.snake[0], dir);
  const eats = head === game.apple;
  const body = eats ? game.snake : game.snake.slice(0, -1);
  if (head === null || body.includes(head)) return { ...game, dir, queue, status: 'over' };
  const snake = [head, ...body];
  if (!eats) return { ...game, snake, dir, queue };
  const apple = placeApple(snake, random);
  return { ...game, snake, dir, queue, apple, apples: game.apples + 1, status: apple === null ? 'won' : 'running' };
}

export const pause = (game: Game): Game => (game.status === 'running' ? { ...game, status: 'paused' } : game);
export const resume = (game: Game): Game => (game.status === 'paused' ? { ...game, status: 'running' } : game);

// The tick interval in ms (tune): each level starts at start, gets 5 % faster every 5 apples and stops at floor.
const SPEEDS: Record<Level, { start: number; floor: number }> = {
  slow: { start: 220, floor: 150 },
  normal: { start: 160, floor: 100 },
  fast: { start: 110, floor: 70 },
};

export function interval({ level, apples }: Pick<Game, 'level' | 'apples'>): number {
  const { start, floor } = SPEEDS[level];
  return Math.max(floor, Math.round(start * 0.95 ** Math.floor(apples / APPLES_PER_SPEEDUP)));
}
