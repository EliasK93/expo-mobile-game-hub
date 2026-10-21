import { mulberry32, shuffle } from '@/lib/random';
import words from '../data/words.json';
import { LENGTH, LEVEL_IDS, isAccepted, permutations, pickWord, scramble, type Level } from './words';

const lists = words as Record<string, { answers: string[]; accepted: string[] }>;
const answersOf = (level: Level) => lists[LENGTH[level]].answers;
const sorted = (w: string) => [...w].sort().join('');

describe('levels', () => {
  it('Easy, Normal and Hard are 4, 5 and 6 letters', () => {
    expect(LEVEL_IDS).toEqual(['easy', 'normal', 'hard']);
    expect(LEVEL_IDS.map((level) => LENGTH[level])).toEqual([4, 5, 6]);
  });
});

describe('isAccepted', () => {
  it('accepts answers and words that are only accepted', () => {
    expect(isAccepted('tape')).toBe(true);
    expect(isAccepted('cats')).toBe(true); // an inflected form: accepted, never a puzzle
    expect(isAccepted('walked')).toBe(true);
    expect(isAccepted('hazier')).toBe(true);
    expect(isAccepted('tapes')).toBe(true);
  });

  it.each(LEVEL_IDS)('%s: accepts every answer', (level) => {
    expect(answersOf(level).filter((w) => !isAccepted(w))).toEqual([]);
  });

  it('rejects letters that spell no word, the wrong length, upper case and the empty string', () => {
    expect(isAccepted('zqxj')).toBe(false);
    expect(isAccepted('tap')).toBe(false);
    expect(isAccepted('tapesxx')).toBe(false);
    expect(isAccepted('TAPE')).toBe(false);
    expect(isAccepted('')).toBe(false);
  });
});

describe('pickWord', () => {
  it.each(LEVEL_IDS)('%s: picks an answer of the level length', (level) => {
    const random = mulberry32(1);
    for (let k = 0; k < 50; k++) expect(answersOf(level)).toContain(pickWord(level, [], random));
  });

  it('is the same for the same seed and covers many different words', () => {
    const run = (seed: number) =>
      Array.from(
        { length: 30 },
        (
          (random) => () =>
            pickWord('normal', [], random)
        )(mulberry32(seed)),
      );
    expect(run(7)).toEqual(run(7));
    expect(new Set(run(7)).size).toBeGreaterThan(20);
  });

  it('never picks a used word', () => {
    const answers = answersOf('easy');
    const used = answers.slice(0, -1);
    for (let seed = 0; seed < 20; seed++)
      expect(pickWord('easy', used, mulberry32(seed))).toBe(answers[answers.length - 1]);
  });

  it('picks any answer when every answer was used', () => {
    const answers = answersOf('easy');
    expect(answers).toContain(pickWord('easy', answers, mulberry32(3)));
  });
});

describe('permutations', () => {
  it('yields every letter order, starting with the letters as they are', () => {
    const all = [...permutations('abc')];
    expect(all[0]).toBe('abc');
    expect(all.sort()).toEqual(['abc', 'acb', 'bac', 'bca', 'cab', 'cba']);
  });

  it('yields n! orders for n different letters', () => {
    expect([...permutations('abcdef')]).toHaveLength(720);
  });
});

describe('scramble', () => {
  it.each(LEVEL_IDS)(
    '%s: every answer scrambles to its own letters, in an order that is not an accepted word',
    (level) => {
      const random = mulberry32(42);
      for (const w of answersOf(level)) {
        const s = scramble(w, random);
        expect(sorted(s)).toBe(sorted(w));
        expect(isAccepted(s)).toBe(false);
      }
    },
  );

  it('finishes with a constant random, still not an accepted word', () => {
    for (const level of LEVEL_IDS) {
      for (const w of answersOf(level)) {
        const s = scramble(w, () => 0);
        expect(sorted(s)).toBe(sorted(w));
        expect(isAccepted(s)).toBe(false);
      }
    }
  });

  it('returns its first shuffle when that is not a word, otherwise another order of the letters', () => {
    let kept = 0;
    let moved = 0;
    for (const w of answersOf('easy')) {
      const first = shuffle([...w], () => 0).join('');
      const s = scramble(w, () => 0);
      if (isAccepted(first)) {
        moved++;
        expect(s).not.toBe(first);
      } else {
        kept++;
        expect(s).toBe(first);
      }
    }
    expect(kept).toBeGreaterThan(0);
    expect(moved).toBeGreaterThan(0);
  });
});
