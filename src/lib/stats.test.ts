import { average, recordWin, type Stats } from './stats';

describe('stats', () => {
  it('records a first timed win', () => {
    expect(recordWin({}, 'classic', 5000, false)).toEqual({
      classic: { solved: 1, timedCount: 1, totalMs: 5000, bestMs: 5000 },
    });
  });

  it('keeps the best time as the minimum and sums the total', () => {
    let s: Stats = {};
    s = recordWin(s, 'classic', 5000, false);
    s = recordWin(s, 'classic', 3000, false);
    s = recordWin(s, 'classic', 9000, false);
    expect(s.classic).toEqual({ solved: 3, timedCount: 3, totalMs: 17000, bestMs: 3000 });
  });

  it('counts a hinted win as solved but not in best or average', () => {
    let s = recordWin({}, 'classic', 5000, false);
    s = recordWin(s, 'classic', 1000, true);
    expect(s.classic).toEqual({ solved: 2, timedCount: 1, totalMs: 5000, bestMs: 5000 });
  });

  it('keeps buckets apart and does not mutate its input', () => {
    const before: Stats = { classic: { solved: 1, timedCount: 1, totalMs: 100, bestMs: 100 } };
    const after = recordWin(before, 'hard', 200, false);
    expect(before.classic.solved).toBe(1);
    expect(before.hard).toBeUndefined();
    expect(after.hard.solved).toBe(1);
    expect(after.classic).toEqual(before.classic);
  });

  it('average is totalMs / timedCount, or null with no timed wins', () => {
    expect(average({ solved: 2, timedCount: 2, totalMs: 10000, bestMs: 4000 })).toBe(5000);
    expect(average({ solved: 1, timedCount: 0, totalMs: 0, bestMs: null })).toBeNull();
  });
});
