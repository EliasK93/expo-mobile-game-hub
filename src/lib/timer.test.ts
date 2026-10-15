import { formatTime, newClock, readClock, startClock, stopClock } from './timer';

describe('clock', () => {
  it('stands still until started', () => {
    expect(readClock(newClock(), 1000)).toBe(0);
    expect(readClock(newClock(4000), 99999)).toBe(4000);
  });

  it('counts from the start time and adds to what was already elapsed', () => {
    const c = startClock(newClock(4000), 1000);
    expect(readClock(c, 3500)).toBe(6500);
  });

  it('stop freezes the elapsed time', () => {
    const c = stopClock(startClock(newClock(), 1000), 2500);
    expect(c).toEqual({ elapsedMs: 1500, startedAt: null });
    expect(readClock(c, 99999)).toBe(1500);
  });

  it('start on a running clock and stop on a stopped clock change nothing', () => {
    const running = startClock(newClock(), 1000);
    expect(startClock(running, 5000)).toBe(running);
    const stopped = newClock(300);
    expect(stopClock(stopped, 5000)).toBe(stopped);
  });
});

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [999, '0:00'],
    [1000, '0:01'],
    [65_000, '1:05'],
    [252_000, '4:12'],
    [3_599_999, '59:59'],
    [3_600_000, '1:00:00'],
    [3_723_000, '1:02:03'],
  ])('%i ms -> %s', (ms, text) => {
    expect(formatTime(ms)).toBe(text);
  });
});
