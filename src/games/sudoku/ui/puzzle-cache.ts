import { runChunked } from '@/lib/chunked';
import { load, save } from '@/lib/storage';

import { CACHE_KEY, CACHE_VERSION, fromCache, PER_LEVEL, type PuzzleCache } from '../logic/cache';
import type { Puzzle } from '../logic/game';
import { generateLevel } from '../logic/generate';
import { LEVELS, type Level } from '../logic/techniques';

// One shared puzzle cache (a module singleton, so there is only ever one filler). It lives while the Sudoku screen is
// open: open() on mount, close() on unmount. Generation runs only through runChunked, in slices between screen updates.
// ponytail: the filler stops when the Sudoku screen closes (home does not fill it); fill it from the app root if
// the cache is often empty on the phone.
let cache: PuzzleCache | null = null;
type Job = { promise: Promise<Puzzle | null>; cancel: () => void };
let filler: Job | null = null; // the background job
let urgent: Job | null = null; // a puzzle the player is waiting for
let session = 0; // close() bumps it, so a late storage read cannot revive a closed cache

const persist = () => cache && save(CACHE_KEY, CACHE_VERSION, cache);

const generate = (level: Level) => runChunked<Puzzle>(strip(generateLevel(level)));

// generateLevel also reports `attempts`, which the cache does not keep.
function* strip(it: Generator<void, Puzzle & { attempts: number }>): Generator<void, Puzzle> {
  const { puzzle, solution } = yield* it;
  return { puzzle, solution };
}

// Loads the stored puzzles. Does not start filling (see fillPuzzleCache).
export async function openPuzzleCache(): Promise<void> {
  const mine = session;
  const loaded = fromCache(await load(CACHE_KEY, CACHE_VERSION));
  if (mine === session) cache = loaded;
}

// Stops every job and forgets the memory copy (storage keeps the puzzles).
export function closePuzzleCache(): void {
  session++;
  filler?.cancel();
  urgent?.cancel();
  filler = urgent = cache = null;
}

// Tops up the level with the fewest puzzles, one at a time, until every level has PER_LEVEL. Safe to call any time.
export function fillPuzzleCache(): void {
  const mine = cache;
  if (!mine || filler || urgent) return;
  const level = [...LEVELS].sort((a, b) => mine[a].length - mine[b].length).find((l) => mine[l].length < PER_LEVEL);
  if (level === undefined) return;
  const job = (filler = generate(level));
  job.promise.then((p) => {
    if (cache !== mine || !p) return; // closed or cancelled
    filler = null;
    mine[level].push(p);
    persist();
    fillPuzzleCache();
  });
}

// A ready puzzle for the level, or null when none is cached. Instant. Refills in the background afterwards.
export function takeCached(level: Level): Puzzle | null {
  const p = cache?.[level].shift() ?? null;
  if (p) {
    persist();
    fillPuzzleCache();
  }
  return p;
}

// Generates a puzzle now, for when the cache has none. The background filler waits meanwhile.
// Resolves with null if the cache was closed first.
export async function makePuzzle(level: Level): Promise<Puzzle | null> {
  filler?.cancel();
  filler = null;
  const job = (urgent = generate(level));
  const p = await job.promise;
  if (urgent === job) urgent = null;
  fillPuzzleCache();
  return p;
}
