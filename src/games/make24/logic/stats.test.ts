import { winPercent } from '@/lib/stats';
import { LEVEL_IDS } from './game';
import { EMPTY_STATS, isNewBest, recordGame, type Stats } from './stats';

const clean = (ms: number) => ({ solved: true, hinted: false, ms });
const hinted = (ms: number) => ({ solved: true, hinted: true, ms });
const failed = (ms: number) => ({ solved: false, hinted: false, ms });

describe('EMPTY_STATS', () => {
  it('has nothing recorded on any level', () => {
    for (const level of LEVEL_IDS) {
      expect(EMPTY_STATS[level]).toEqual({ played: 0, solved: 0, currentStreak: 0, bestStreak: 0, bestMs: null });
    }
    expect(Object.keys(EMPTY_STATS)).toEqual(['easy', 'medium', 'hard']);
  });
});

describe('recordGame', () => {
  it('a first clean solve counts as played and solved, starts the streak and sets the best time', () => {
    expect(recordGame(EMPTY_STATS, 'easy', clean(42_000)).easy).toEqual({
      played: 1,
      solved: 1,
      currentStreak: 1,
      bestStreak: 1,
      bestMs: 42_000,
    });
  });

  it('a first failure counts as played only: nothing solved, no streak, no time', () => {
    expect(recordGame(EMPTY_STATS, 'easy', failed(12_000)).easy).toEqual({
      played: 1,
      solved: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestMs: null,
    });
  });

  it('the best time keeps the minimum: a slower solve leaves it, a faster one replaces it', () => {
    let stats: Stats = recordGame(EMPTY_STATS, 'hard', clean(90_000));
    stats = recordGame(stats, 'hard', clean(120_000));
    expect(stats.hard.bestMs).toBe(90_000);
    stats = recordGame(stats, 'hard', clean(60_000));
    expect(stats.hard.bestMs).toBe(60_000);
    expect(stats.hard.solved).toBe(3);
  });

  it('a failure never touches the best time, however fast it was', () => {
    const before = recordGame(EMPTY_STATS, 'easy', clean(40_000));
    expect(recordGame(before, 'easy', failed(5_000)).easy.bestMs).toBe(40_000);
  });

  it('clean solves in a row build the current streak, and a failure resets it', () => {
    let stats: Stats = EMPTY_STATS;
    for (let i = 0; i < 3; i++) stats = recordGame(stats, 'easy', clean(50_000));
    expect(stats.easy.currentStreak).toBe(3);
    stats = recordGame(stats, 'easy', failed(9_000));
    expect(stats.easy.currentStreak).toBe(0);
    stats = recordGame(stats, 'easy', clean(50_000));
    expect(stats.easy.currentStreak).toBe(1);
  });

  it('the best streak keeps its maximum over a shorter streak that follows', () => {
    let stats: Stats = EMPTY_STATS;
    for (const result of [clean(1), clean(1), clean(1), failed(1), clean(1), clean(1)])
      stats = recordGame(stats, 'medium', result);
    expect(stats.medium).toMatchObject({ played: 6, solved: 5, currentStreak: 2, bestStreak: 3 });
  });

  it('the best streak grows past the old one when the current streak does', () => {
    let stats: Stats = EMPTY_STATS;
    for (const result of [clean(1), failed(1), clean(1), clean(1)]) stats = recordGame(stats, 'easy', result);
    expect(stats.easy).toMatchObject({ currentStreak: 2, bestStreak: 2 });
  });

  it('give up and abandoning a started puzzle arrive as solved: false: played, streak reset, no best time', () => {
    const before = recordGame(recordGame(EMPTY_STATS, 'easy', clean(70_000)), 'easy', clean(65_000));
    const abandoned = recordGame(before, 'easy', failed(3_000));
    expect(abandoned.easy).toEqual({ played: 3, solved: 2, currentStreak: 0, bestStreak: 2, bestMs: 65_000 });
  });

  it('a failure after hints is the same as any other failure', () => {
    const before = recordGame(EMPTY_STATS, 'easy', clean(70_000));
    expect(recordGame(before, 'easy', { solved: false, hinted: true, ms: 3_000 })).toEqual(
      recordGame(before, 'easy', failed(3_000)),
    );
  });

  describe('the hint rule', () => {
    const streak2 = recordGame(recordGame(EMPTY_STATS, 'easy', clean(40_000)), 'easy', clean(45_000));

    it('a hinted solve counts as played and solved but leaves the streak and the best time alone', () => {
      expect(recordGame(streak2, 'easy', hinted(10_000)).easy).toEqual({
        played: 3,
        solved: 3,
        currentStreak: 2,
        bestStreak: 2,
        bestMs: 40_000,
      });
    });

    it('a first hinted solve gives no streak and no best time', () => {
      expect(recordGame(EMPTY_STATS, 'easy', hinted(30_000)).easy).toEqual({
        played: 1,
        solved: 1,
        currentStreak: 0,
        bestStreak: 0,
        bestMs: null,
      });
    });

    it('a hinted solve neither extends nor resets the streak: the next clean solve carries on', () => {
      let stats = recordGame(streak2, 'easy', hinted(10_000));
      stats = recordGame(stats, 'easy', clean(50_000));
      expect(stats.easy).toMatchObject({ currentStreak: 3, bestStreak: 3 });
    });
  });

  it('win % follows the solved puzzles and the puzzles played', () => {
    let stats: Stats = recordGame(EMPTY_STATS, 'easy', clean(1));
    stats = recordGame(stats, 'easy', failed(1));
    stats = recordGame(stats, 'easy', failed(1));
    expect(winPercent(stats.easy.played, stats.easy.solved)).toBe(33);
  });

  it('records into the chosen level and never touches the others', () => {
    const afterHard = recordGame(EMPTY_STATS, 'hard', clean(1_000));
    expect(afterHard.hard.played).toBe(1);
    expect(afterHard.easy).toBe(EMPTY_STATS.easy);
    expect(afterHard.medium).toBe(EMPTY_STATS.medium);
    const afterEasy = recordGame(afterHard, 'easy', failed(1_000));
    expect(afterEasy.hard).toBe(afterHard.hard);
  });

  it('does not change the stats it is given', () => {
    const before = JSON.stringify(EMPTY_STATS);
    recordGame(EMPTY_STATS, 'easy', clean(10));
    recordGame(EMPTY_STATS, 'easy', hinted(10));
    recordGame(EMPTY_STATS, 'easy', failed(10));
    expect(JSON.stringify(EMPTY_STATS)).toBe(before);
  });
});

describe('isNewBest', () => {
  const before = recordGame(EMPTY_STATS, 'easy', clean(60_000)).easy;

  it('is true for a clean solve faster than the stored best', () => {
    expect(isNewBest(before, clean(59_999))).toBe(true);
  });

  it('is false for a clean solve that is as slow as, or slower than, the stored best', () => {
    expect(isNewBest(before, clean(60_000))).toBe(false);
    expect(isNewBest(before, clean(61_000))).toBe(false);
  });

  it('is true for the first clean solve', () => {
    expect(isNewBest(EMPTY_STATS.easy, clean(300_000))).toBe(true);
  });

  it('is false for a hinted solve, even a faster one and even with nothing stored yet', () => {
    expect(isNewBest(before, hinted(1_000))).toBe(false);
    expect(isNewBest(EMPTY_STATS.easy, hinted(1_000))).toBe(false);
  });

  it('is false when it was not solved, even a quick one and even with nothing stored yet', () => {
    expect(isNewBest(before, failed(1_000))).toBe(false);
    expect(isNewBest(EMPTY_STATS.easy, failed(1_000))).toBe(false);
  });
});
