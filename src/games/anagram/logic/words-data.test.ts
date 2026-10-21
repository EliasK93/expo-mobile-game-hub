import words from '../data/words.json';
import { permutations } from './words';

const fs = jest.requireActual<{ readFileSync(path: string, encoding: 'utf8'): string }>('fs');
const lists = words as Record<string, { answers: string[]; accepted: string[] }>;
const LENGTHS = [4, 5, 6];
// The exact counts of the build (it is deterministic); update them after a rebuild.
const COUNTS: Record<number, { answers: number; accepted: number }> = {
  4: { answers: 1464, accepted: 4982 },
  5: { answers: 1925, accepted: 11250 },
  6: { answers: 2603, accepted: 19896 },
};
// Inflected forms of answers: accepted, but never an answer (the build drops them).
const NOT_ANSWERS = ['cats', 'walked', 'making', 'hazier', 'jugged', 'safest'];
const wordsIn = (file: string) =>
  fs
    .readFileSync(`src/games/anagram/data/${file}`, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
const excluded = wordsIn('excluded.txt');
const kept = wordsIn('keep.txt');

describe('anagram word lists', () => {
  it('has exactly the lengths 4, 5 and 6', () => {
    expect(Object.keys(lists).sort()).toEqual(LENGTHS.map(String));
  });

  it.each(LENGTHS)('%i letters: lower case a-z, the right length, sorted, no duplicates', (n) => {
    for (const list of [lists[n].answers, lists[n].accepted]) {
      for (const w of list) expect(w).toMatch(new RegExp(`^[a-z]{${n}}$`));
      expect(list).toEqual([...new Set(list)].sort());
    }
  });

  it.each(LENGTHS)('%i letters: every answer is accepted', (n) => {
    const accepted = new Set(lists[n].accepted);
    expect(lists[n].answers.filter((w) => !accepted.has(w))).toEqual([]);
  });

  it('excluded.txt is not empty, none of its words is an answer, every one of them is accepted', () => {
    expect(excluded.length).toBeGreaterThan(0);
    const answers = new Set(LENGTHS.flatMap((n) => lists[n].answers));
    const accepted = new Set(LENGTHS.flatMap((n) => lists[n].accepted));
    expect(excluded.filter((w) => answers.has(w))).toEqual([]);
    expect(excluded.filter((w) => !accepted.has(w))).toEqual([]);
  });

  it('every word in keep.txt is an answer', () => {
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.filter((w) => !lists[w.length].answers.includes(w))).toEqual([]);
  });

  it('inflected forms are accepted but not answers', () => {
    for (const w of NOT_ANSWERS) {
      expect(lists[w.length].answers).not.toContain(w);
      expect(lists[w.length].accepted).toContain(w);
    }
  });

  it.each(LENGTHS)('%i letters: every answer has a letter order that is not an accepted word', (n) => {
    const accepted = new Set(lists[n].accepted);
    const stuck = lists[n].answers.filter((w) => {
      for (const p of permutations(w)) if (!accepted.has(p)) return false;
      return true;
    });
    expect(stuck).toEqual([]);
  });

  it.each(LENGTHS)('%i letters: the counts are those of the build (update COUNTS after a rebuild)', (n) => {
    expect({ answers: lists[n].answers.length, accepted: lists[n].accepted.length }).toEqual(COUNTS[n]);
  });
});
