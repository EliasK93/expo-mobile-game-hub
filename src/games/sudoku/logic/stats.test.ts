import { averageMs, recordWin, type Stats } from './stats';

describe('recordWin', () => {
  it('records a first timed win', () => {
    expect(recordWin({}, '3', 5000, false)).toEqual({
      3: { solved: 1, timedCount: 1, totalMs: 5000, bestMs: 5000 },
    });
  });

  it('keeps the best time as the minimum and sums the total', () => {
    let s: Stats = {};
    s = recordWin(s, '3', 5000, false);
    s = recordWin(s, '3', 3000, false);
    s = recordWin(s, '3', 9000, false);
    expect(s['3']).toEqual({ solved: 3, timedCount: 3, totalMs: 17000, bestMs: 3000 });
  });

  it('counts a hinted win as solved but not in best or average', () => {
    let s = recordWin({}, '3', 5000, false);
    s = recordWin(s, '3', 1000, true);
    expect(s['3']).toEqual({ solved: 2, timedCount: 1, totalMs: 5000, bestMs: 5000 });
  });

  it('keeps buckets apart and does not mutate its input', () => {
    const before: Stats = { 3: { solved: 1, timedCount: 1, totalMs: 100, bestMs: 100 } };
    const after = recordWin(before, '4', 200, false);
    expect(before['3'].solved).toBe(1);
    expect(before['4']).toBeUndefined();
    expect(after['4'].solved).toBe(1);
    expect(after['3']).toEqual(before['3']);
  });
});

describe('averageMs', () => {
  it('is the total over the timed wins, rounded', () => {
    expect(averageMs({ solved: 5, timedCount: 4, totalMs: 968_000, bestMs: 190_000 })).toBe(242_000);
    expect(averageMs({ solved: 3, timedCount: 3, totalMs: 10_001, bestMs: 1 })).toBe(3334);
  });

  it('is null when every win was hinted', () => {
    expect(averageMs({ solved: 2, timedCount: 0, totalMs: 0, bestMs: null })).toBeNull();
  });
});
