import { EMPTY_STATS, average, isNewBest, recordRound, type Stats } from './stats';

describe('recordRound', () => {
  it('a first round counts as played and sets the best score and the total', () => {
    expect(recordRound(EMPTY_STATS, 'normal', 12).normal).toEqual({ played: 1, best: 12, totalWords: 12 });
  });

  it('the best score keeps its maximum, the total adds up', () => {
    let stats: Stats = recordRound(EMPTY_STATS, 'hard', 8);
    stats = recordRound(stats, 'hard', 3);
    expect(stats.hard).toEqual({ played: 2, best: 8, totalWords: 11 });
    stats = recordRound(stats, 'hard', 9);
    expect(stats.hard).toEqual({ played: 3, best: 9, totalWords: 20 });
  });

  it('a round with no word counts as played, but 0 is never a best score', () => {
    expect(recordRound(EMPTY_STATS, 'easy', 0).easy).toEqual({ played: 1, best: 0, totalWords: 0 });
    const after = recordRound(recordRound(EMPTY_STATS, 'easy', 5), 'easy', 0);
    expect(after.easy.best).toBe(5);
    expect(after.easy.played).toBe(2);
  });

  it('records into the chosen level and never touches the others', () => {
    const afterHard = recordRound(EMPTY_STATS, 'hard', 7);
    expect(afterHard.hard.played).toBe(1);
    expect(afterHard.easy).toBe(EMPTY_STATS.easy);
    expect(afterHard.normal).toBe(EMPTY_STATS.normal);
    expect(recordRound(afterHard, 'easy', 1).hard).toBe(afterHard.hard);
  });
});

describe('isNewBest', () => {
  const before = recordRound(EMPTY_STATS, 'normal', 10).normal;

  it('is true for a score above the stored best', () => {
    expect(isNewBest(before, 11)).toBe(true);
  });

  it('is false for a score equal to or below the stored best', () => {
    expect(isNewBest(before, 10)).toBe(false);
    expect(isNewBest(before, 3)).toBe(false);
  });

  it('is true for the first score on a level, but a score of 0 is never a best', () => {
    expect(isNewBest(EMPTY_STATS.normal, 1)).toBe(true);
    expect(isNewBest(EMPTY_STATS.normal, 0)).toBe(false);
  });
});

describe('average', () => {
  it('is 0 when nothing was played', () => {
    expect(average(EMPTY_STATS.normal)).toBe(0);
  });

  it('is the whole words per round, rounded', () => {
    const play = (...scores: number[]) =>
      scores.reduce((stats, words) => recordRound(stats, 'normal', words), EMPTY_STATS).normal;
    expect(average(play(12))).toBe(12);
    expect(average(play(10, 14))).toBe(12);
    expect(average(play(3, 4))).toBe(4); // 3.5
    expect(average(play(3, 3, 4))).toBe(3); // 3.33
    expect(average(play(0, 0, 5))).toBe(2); // 1.67
  });
});
