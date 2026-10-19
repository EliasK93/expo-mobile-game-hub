import type { Random } from '@/lib/random';

import puzzles from '../data/puzzles.json';
import type { Level } from './game';
import { nextPuzzle, type Order } from './order';

// The shipped pool (data/puzzles.json, built by build-puzzles.test.ts), each level in rating order.
export const POOL = puzzles as Record<Level, number[][]>;

// The next puzzle of the level and the order to keep. In its own module so route tests can swap it for hand-picked numbers.
export const pickPuzzle = (level: Level, order: Order | null, random: Random) => nextPuzzle(order, POOL[level], random);
