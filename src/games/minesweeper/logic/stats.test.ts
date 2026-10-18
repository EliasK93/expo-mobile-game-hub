import { winPercent } from '@/lib/stats';
import { LEVEL_IDS } from './board';
import { EMPTY_STATS, isNewBest, recordGame, type Stats } from './stats';

const win = (ms: number) => ({ won: true, ms });
const loss = (ms: number) => ({ won: false, ms });

describe('EMPTY_STATS', () => {
  it('has nothing recorded on any level', () => {
    for (const level of LEVEL_IDS) {
      expect(EMPTY_STATS[level]).toEqual({ played: 0, wins: 0, currentStreak: 0, bestStreak: 0, bestMs: null });
    }
  });
});

describe('recordGame', () => {
  it('a first win counts as played and won, starts the streak and sets the best time', () => {
    expect(recordGame(EMPTY_STATS, 'beginner', win(83_000)).beginner).toEqual({
      played: 1,
      wins: 1,
      currentStreak: 1,
      bestStreak: 1,
      bestMs: 83_000,
    });
  });

  it('a first loss counts as played only: no win, no streak, no time', () => {
    expect(recordGame(EMPTY_STATS, 'beginner', loss(12_000)).beginner).toEqual({
      played: 1,
      wins: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestMs: null,
    });
  });

  it('the best time keeps the minimum: a slower win leaves it, a faster one replaces it', () => {
    let stats: Stats = recordGame(EMPTY_STATS, 'expert', win(90_000));
    stats = recordGame(stats, 'expert', win(120_000));
    expect(stats.expert.bestMs).toBe(90_000);
    stats = recordGame(stats, 'expert', win(60_000));
    expect(stats.expert.bestMs).toBe(60_000);
    expect(stats.expert.wins).toBe(3);
  });

  it('a loss never touches the best time, however fast it was', () => {
    const before = recordGame(EMPTY_STATS, 'beginner', win(40_000));
    expect(recordGame(before, 'beginner', loss(5_000)).beginner.bestMs).toBe(40_000);
  });

  it('wins in a row build the current streak, and a loss resets it', () => {
    let stats: Stats = EMPTY_STATS;
    for (let i = 0; i < 3; i++) stats = recordGame(stats, 'beginner', win(50_000));
    expect(stats.beginner.currentStreak).toBe(3);
    stats = recordGame(stats, 'beginner', loss(9_000));
    expect(stats.beginner.currentStreak).toBe(0);
    stats = recordGame(stats, 'beginner', win(50_000));
    expect(stats.beginner.currentStreak).toBe(1);
  });

  it('the best streak keeps its maximum over a shorter streak that follows', () => {
    let stats: Stats = EMPTY_STATS;
    for (const result of [win(1), win(1), win(1), loss(1), win(1), win(1)])
      stats = recordGame(stats, 'intermediate', result);
    expect(stats.intermediate).toMatchObject({ played: 6, wins: 5, currentStreak: 2, bestStreak: 3 });
  });

  it('the best streak grows past the old one when the current streak does', () => {
    let stats: Stats = EMPTY_STATS;
    for (const result of [win(1), loss(1), win(1), win(1)]) stats = recordGame(stats, 'beginner', result);
    expect(stats.beginner).toMatchObject({ currentStreak: 2, bestStreak: 2 });
  });

  it('abandoning a started game is the same call as a loss: played, streak reset, no best time', () => {
    const before = recordGame(recordGame(EMPTY_STATS, 'beginner', win(70_000)), 'beginner', win(65_000));
    const abandoned = recordGame(before, 'beginner', { won: false, ms: 3_000 });
    expect(abandoned.beginner).toEqual({ played: 3, wins: 2, currentStreak: 0, bestStreak: 2, bestMs: 65_000 });
    expect(abandoned).toEqual(recordGame(before, 'beginner', loss(3_000)));
  });

  it('win % follows the wins and games played', () => {
    let stats: Stats = recordGame(EMPTY_STATS, 'beginner', win(1));
    stats = recordGame(stats, 'beginner', loss(1));
    stats = recordGame(stats, 'beginner', loss(1));
    expect(winPercent(stats.beginner.played, stats.beginner.wins)).toBe(33);
  });

  it('records into the chosen level and never touches the others', () => {
    const afterExpert = recordGame(EMPTY_STATS, 'expert', win(1_000));
    expect(afterExpert.expert.played).toBe(1);
    expect(afterExpert.beginner).toBe(EMPTY_STATS.beginner);
    expect(afterExpert.intermediate).toBe(EMPTY_STATS.intermediate);
    const afterBeginner = recordGame(afterExpert, 'beginner', loss(1_000));
    expect(afterBeginner.expert).toBe(afterExpert.expert);
  });

  it('does not change the stats it is given', () => {
    const before = JSON.stringify(EMPTY_STATS);
    recordGame(EMPTY_STATS, 'beginner', win(10));
    recordGame(EMPTY_STATS, 'beginner', loss(10));
    expect(JSON.stringify(EMPTY_STATS)).toBe(before);
  });
});

describe('isNewBest', () => {
  const before = recordGame(EMPTY_STATS, 'beginner', win(60_000)).beginner;

  it('is true for a win faster than the stored best', () => {
    expect(isNewBest(before, win(59_999))).toBe(true);
  });

  it('is false for a win that is as slow as, or slower than, the stored best', () => {
    expect(isNewBest(before, win(60_000))).toBe(false);
    expect(isNewBest(before, win(61_000))).toBe(false);
  });

  it('is true for the first win', () => {
    expect(isNewBest(EMPTY_STATS.beginner, win(300_000))).toBe(true);
  });

  it('is false for a loss, even a quick one and even with nothing stored yet', () => {
    expect(isNewBest(before, loss(1_000))).toBe(false);
    expect(isNewBest(EMPTY_STATS.beginner, loss(1_000))).toBe(false);
  });
});
