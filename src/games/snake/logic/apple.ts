import { CELLS } from './board';
import type { Random } from '@/lib/random';

// A uniformly random empty cell, or null when the snake fills the board. Its own module: step calls it, and the route
// tests swap it for hand-placed apples.
export function placeApple(snake: number[], random: Random): number | null {
  const taken = new Set(snake);
  const free = Array.from({ length: CELLS }, (_, i) => i).filter((i) => !taken.has(i));
  return free.length === 0 ? null : free[Math.floor(random() * free.length)];
}
