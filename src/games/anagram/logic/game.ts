import { shuffle, type Random } from '@/lib/random';
import { LENGTH, isAccepted, permutations, pickWord, scramble, type Level } from './words';

// ready = the level is shown, waiting for Start; over = the countdown reached 0. rack is the scrambled letters and
// answer the answer row: one slot per letter holding the rack index of the tile placed there, or null. A placed tile
// stays at its rack position (the UI shows it empty). used = every word shown this round, the current one last.
// revealed = the solution of a skipped word, for the UI to show for about 1 s. The time is not here: the UI's clock
// owns it, like Snake's.
export type Status = 'ready' | 'running' | 'paused' | 'over';
export type Game = {
  level: Level;
  word: string;
  rack: string[];
  answer: (number | null)[];
  solved: number;
  skips: number;
  used: string[];
  revealed: string | null;
  status: Status;
};

export const ROUND_MS = 60_000;
export const SKIP_MS = 5_000;

// The countdown: a skip costs SKIP_MS of the round.
export const remainingMs = ({ skips }: Pick<Game, 'skips'>, elapsedMs: number): number =>
  Math.max(0, ROUND_MS - elapsedMs - skips * SKIP_MS);

// The next word of the round: new rack, empty answer row, the word added to used.
const nextWord = (game: Game, random: Random): Game => {
  const word = pickWord(game.level, game.used, random);
  return {
    ...game,
    word,
    rack: [...scramble(word, random)],
    answer: Array(LENGTH[game.level]).fill(null),
    used: [...game.used, word],
  };
};

export const newRound = (level: Level, random: Random): Game =>
  nextWord(
    { level, word: '', rack: [], answer: [], solved: 0, skips: 0, used: [], revealed: null, status: 'ready' },
    random,
  );

// In play = running or paused: the rounds that are saved, and the ones abandoning counts.
export const isInPlay = (game: Game) => game.status === 'running' || game.status === 'paused';

// The answer row is full while running: it is not a word, or the round would have moved on.
export const isWrong = (game: Game) => game.status === 'running' && game.answer.every((k) => k !== null);

export const start = (game: Game): Game => (game.status === 'ready' ? { ...game, status: 'running' } : game);
export const pause = (game: Game): Game =>
  game.status === 'running' ? { ...game, revealed: null, status: 'paused' } : game;
export const resume = (game: Game): Game => (game.status === 'paused' ? { ...game, status: 'running' } : game);

// What the player can do: only in a running round, and not while a skipped solution shows.
const live = (game: Game) => game.status === 'running' && game.revealed === null;

// A tap on a rack tile puts it into the first empty slot. A tap that leaves the row full (also one that filled a hole)
// checks the answer: any accepted word counts (not only the picked one) and the next word comes at once; otherwise the
// letters stay for the player to fix.
export function place(game: Game, i: number, random: Random): Game {
  const slot = game.answer.indexOf(null);
  if (!live(game) || game.rack[i] === undefined || game.answer.includes(i) || slot < 0) return game;
  const answer = game.answer.map((k, s) => (s === slot ? i : k));
  const next = { ...game, answer };
  if (answer.includes(null) || !isAccepted(answer.map((k) => game.rack[k as number]).join(''))) return next;
  return nextWord({ ...next, solved: game.solved + 1 }, random);
}

// Empties the slot and leaves a hole: the next tap fills it.
export const unplace = (game: Game, slot: number): Game =>
  live(game) && game.answer[slot] != null
    ? { ...game, answer: game.answer.map((k, s) => (s === slot ? null : k)) }
    : game;

export const clear = (game: Game): Game => (live(game) ? { ...game, answer: game.answer.map(() => null) } : game);

// Reorders the tiles still in the rack; placed tiles keep their position. The new order is one shuffle, or the first
// letter order after it, that differs from the current one and, with nothing placed, is not an accepted word (so the
// rack never shows the word). Nothing to reorder (one tile, or the same letter throughout) returns the game as it is.
export function shuffleRack(game: Game, random: Random): Game {
  if (!live(game)) return game;
  const free = game.rack.map((_, k) => k).filter((k) => !game.answer.includes(k));
  const letters = free.map((k) => game.rack[k]).join('');
  const allFree = free.length === game.rack.length;
  for (const order of permutations(shuffle([...letters], random).join(''))) {
    if (order === letters || (allFree && isAccepted(order))) continue;
    const rack = [...game.rack];
    free.forEach((k, n) => (rack[k] = order[n]));
    return { ...game, rack };
  }
  return game;
}

// Costs SKIP_MS and counts no word. The skipped word is revealed and the next one comes; the countdown reaching 0
// ends the round instead.
export function skip(game: Game, elapsedMs: number, random: Random): Game {
  if (!live(game)) return game;
  const skipped = { ...game, skips: game.skips + 1 };
  if (remainingMs(skipped, elapsedMs) === 0) return { ...skipped, status: 'over' };
  return { ...nextWord(skipped, random), revealed: game.word };
}

export const endReveal = (game: Game): Game => (game.revealed !== null ? { ...game, revealed: null } : game);

// The round is over at 0:00, with nothing revealed (a finished round never changes, endReveal included).
export const tick = (game: Game, elapsedMs: number): Game =>
  game.status === 'running' && remainingMs(game, elapsedMs) === 0 ? { ...game, revealed: null, status: 'over' } : game;
