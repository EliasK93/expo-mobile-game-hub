import { EMPTY_STATS, average, isNewBest, recordGame, type Stats } from './stats';

describe('recordGame', () => {
  it('a first game counts as played and sets the best score, the total and the longest game', () => {
    expect(recordGame(EMPTY_STATS, 'normal', { apples: 23, ms: 95_000 }).normal).toEqual({
      played: 1,
      best: 23,
      totalApples: 23,
      longestMs: 95_000,
    });
  });

  it('the best score and the longest game keep their maximum, the total adds up', () => {
    let stats: Stats = recordGame(EMPTY_STATS, 'fast', { apples: 10, ms: 60_000 });
    stats = recordGame(stats, 'fast', { apples: 4, ms: 90_000 });
    expect(stats.fast).toEqual({ played: 2, best: 10, totalApples: 14, longestMs: 90_000 });
    stats = recordGame(stats, 'fast', { apples: 12, ms: 30_000 });
    expect(stats.fast).toEqual({ played: 3, best: 12, totalApples: 26, longestMs: 90_000 });
  });

  it('a game with no apple counts as played, but 0 is never a best score', () => {
    expect(recordGame(EMPTY_STATS, 'slow', { apples: 0, ms: 3_000 }).slow).toEqual({
      played: 1,
      best: 0,
      totalApples: 0,
      longestMs: 3_000,
    });
    const after = recordGame(recordGame(EMPTY_STATS, 'slow', { apples: 5, ms: 1_000 }), 'slow', { apples: 0, ms: 500 });
    expect(after.slow.best).toBe(5);
    expect(after.slow.played).toBe(2);
  });

  it('records into the chosen level and never touches the others', () => {
    const afterFast = recordGame(EMPTY_STATS, 'fast', { apples: 7, ms: 1_000 });
    expect(afterFast.fast.played).toBe(1);
    expect(afterFast.slow).toBe(EMPTY_STATS.slow);
    expect(afterFast.normal).toBe(EMPTY_STATS.normal);
    const afterSlow = recordGame(afterFast, 'slow', { apples: 1, ms: 1_000 });
    expect(afterSlow.fast).toBe(afterFast.fast);
  });
});

describe('isNewBest', () => {
  const before = recordGame(EMPTY_STATS, 'normal', { apples: 20, ms: 1_000 }).normal;

  it('is true for a score above the stored best', () => {
    expect(isNewBest(before, 21)).toBe(true);
  });

  it('is false for a score equal to or below the stored best', () => {
    expect(isNewBest(before, 20)).toBe(false);
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

  it('is the whole apples per game, rounded', () => {
    const play = (...scores: number[]) =>
      scores.reduce((stats, apples) => recordGame(stats, 'normal', { apples, ms: 1_000 }), EMPTY_STATS).normal;
    expect(average(play(12))).toBe(12);
    expect(average(play(10, 14))).toBe(12);
    expect(average(play(3, 4))).toBe(4); // 3.5
    expect(average(play(3, 3, 4))).toBe(3); // 3.33
    expect(average(play(0, 0, 5))).toBe(2); // 1.67
  });
});
