import AsyncStorage from '@react-native-async-storage/async-storage';

import { recordWin, recordWinStored, statsLine, winPercent, type Stats } from './stats';
import { load, save } from './storage';

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

  describe('recordWinStored', () => {
    const where = { saveKey: 'test:save', statsKey: 'test:stats', version: 1 };

    it('deletes the save and adds the win to the stored stats', async () => {
      await save('test:save', 1, { game: 'half done' });
      await save('test:stats', 1, recordWin({}, 'easy', 4000, false));

      await recordWinStored({ ...where, bucket: 'easy', ms: 3000, hinted: false });

      expect(await AsyncStorage.getItem('test:save')).toBeNull();
      expect(await load<Stats>('test:stats', 1)).toEqual({
        easy: { solved: 2, timedCount: 2, totalMs: 7000, bestMs: 3000 },
      });    });

    it('starts the stats when there are none', async () => {
      await recordWinStored({ ...where, bucket: 'easy', ms: 3000, hinted: true });
      expect(await load<Stats>('test:stats', 1)).toEqual({ easy: { solved: 1, timedCount: 0, totalMs: 0, bestMs: null } });
    });

    it('deletes the save before it writes the stats, so a crash in between loses the win rather than counting it twice', async () => {
      await recordWinStored({ ...where, bucket: 'easy', ms: 3000, hinted: false });
      const [removed] = (AsyncStorage.removeItem as jest.Mock).mock.invocationCallOrder;
      const [written] = (AsyncStorage.setItem as jest.Mock).mock.invocationCallOrder;
      expect(removed).toBeLessThan(written);
    });
  });

  describe('winPercent', () => {
    it('is 0 when nothing is played', () => {
      expect(winPercent(0, 0)).toBe(0);
    });

    it('is the share of games won, from 0 to 100', () => {
      expect(winPercent(4, 0)).toBe(0);
      expect(winPercent(4, 1)).toBe(25);
      expect(winPercent(4, 4)).toBe(100);
    });

    it('rounds to a whole number, halves up', () => {
      expect(winPercent(3, 1)).toBe(33);
      expect(winPercent(3, 2)).toBe(67);
      expect(winPercent(8, 1)).toBe(13); // 12.5
    });
  });

  describe('statsLine', () => {
    it('shows the solved count and the best time', () => {
      expect(statsLine({ solved: 5, timedCount: 2, totalMs: 484_000, bestMs: 190_000 })).toBe('5 solved · Best 3:10');
    });

    it('shows just the count when every win was hinted', () => {
      expect(statsLine({ solved: 2, timedCount: 0, totalMs: 0, bestMs: null })).toBe('2 solved');
    });
  });
});
