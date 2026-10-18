import { LEVELS, cellCount, neighbours, type Level } from './board';
import { shuffle, type Random } from '@/lib/random';

// Places the level's mines after the first tap, anywhere except the tapped cell and its neighbours, so the first tap
// always opens an area. Its own module: open calls it, and the route tests swap it for hand-built boards.
export function placeMines(level: Level, safe: number, random: Random): boolean[] {
  const clear = new Set([safe, ...neighbours(level, safe)]);
  const candidates = Array.from({ length: cellCount(level) }, (_, i) => i).filter((i) => !clear.has(i));
  const mines: boolean[] = Array(cellCount(level)).fill(false);
  for (const i of shuffle(candidates, random).slice(0, LEVELS[level].mines)) mines[i] = true;
  return mines;
}
