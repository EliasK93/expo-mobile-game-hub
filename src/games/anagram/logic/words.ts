import { shuffle, type Random } from '@/lib/random';
import data from '../data/words.json';

export const LEVEL_IDS = ['easy', 'normal', 'hard'] as const;
export type Level = (typeof LEVEL_IDS)[number];
export const LENGTH: Record<Level, number> = { easy: 4, normal: 5, hard: 6 };

// The shipped lists by word length: answers are the puzzles, accepted is every word that counts when spelled.
const lists = data as Record<number, { answers: string[]; accepted: string[] }>;
const accepted = Object.fromEntries(Object.entries(lists).map(([n, list]) => [n, new Set(list.accepted)]));

export const isAccepted = (letters: string): boolean => accepted[letters.length]?.has(letters) ?? false;

// A random answer of the level that is not in used (all of them used cannot happen in 60 s: then any answer).
export function pickWord(level: Level, used: string[], random: Random): string {
  const answers = lists[LENGTH[level]].answers;
  const fresh = answers.filter((w) => !used.includes(w));
  const from = fresh.length > 0 ? fresh : answers;
  return from[Math.floor(random() * from.length)];
}

export function* permutations(letters: string): Generator<string> {
  if (letters.length <= 1) return yield letters;
  for (let i = 0; i < letters.length; i++) {
    for (const rest of permutations(letters.slice(0, i) + letters.slice(i + 1))) yield letters[i] + rest;
  }
}

// One shuffle of the letters, or the first letter order after it (the shuffle itself comes first) that is not an
// accepted word. No retry loop, so it ends even with a constant random; the data test proves every answer has such an
// order, and the answer itself is accepted, so the word is never returned.
export function scramble(word: string, random: Random): string {
  const first = shuffle([...word], random).join('');
  for (const p of permutations(first)) if (!isAccepted(p)) return p;
  return first; // unreachable for the shipped data
}
