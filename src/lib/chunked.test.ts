import { runChunked } from './chunked';

// Fake timers freeze Date.now(), so every step of the work "takes" `stepMs` by moving the fake clock.
function* work(steps: number, stepMs: number, log: number[] = []) {
  for (let i = 0; i < steps; i++) {
    jest.setSystemTime(Date.now() + stepMs);
    log.push(i);
    yield;
  }
  return 'done';
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('runChunked', () => {
  it('runs a first slice at once, then waits with setTimeout between slices', async () => {
    const log: number[] = [];
    const job = runChunked(work(10, 3, log), { sliceMs: 8 });

    expect(log).toEqual([0, 1, 2]); // 3 ms per step: the slice ends after 9 ms
    expect(jest.getTimerCount()).toBe(1); // the rest waits for a timer
    for (let i = 0; i < 10; i++) await jest.advanceTimersByTimeAsync(1);
    await expect(job.promise).resolves.toBe('done');
    expect(log).toHaveLength(10);
  });

  it('resolves with the return value of the iterator, also when the first slice finishes it', async () => {
    await expect(runChunked(work(2, 1), { sliceMs: 8 }).promise).resolves.toBe('done');
  });

  it('cancel stops the work, resolves with null and leaves no timer behind', async () => {
    const log: number[] = [];
    const job = runChunked(work(100, 5, log), { sliceMs: 8 });
    const before = log.length;

    job.cancel();
    await expect(job.promise).resolves.toBeNull();
    await jest.advanceTimersByTimeAsync(1000);

    expect(log).toHaveLength(before);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancel after the work has finished changes nothing', async () => {
    const job = runChunked(work(1, 1), { sliceMs: 8 });
    job.cancel();
    await expect(job.promise).resolves.toBe('done');
  });
});
