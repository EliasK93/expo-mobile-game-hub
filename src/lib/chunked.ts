// Runs a generator function in small slices so the UI can redraw in between (a thread would be native-only).
// Each slice calls next() until sliceMs has passed (the last step may overshoot), then waits with setTimeout(0).
// The first slice runs at once. `promise` resolves with the generator's return value, or null after cancel().
export function runChunked<T>(
  iterator: Iterator<unknown, T>,
  { sliceMs = 8 }: { sliceMs?: number } = {},
): { promise: Promise<T | null>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finish: (value: T | null) => void = () => {};
  const promise = new Promise<T | null>((resolve) => (finish = resolve));

  const slice = () => {
    const start = Date.now();
    do {
      const r = iterator.next();
      if (r.done) return finish(r.value);
    } while (Date.now() - start < sliceMs);
    timer = setTimeout(slice, 0);
  };
  slice();

  return {
    promise,
    cancel: () => {
      clearTimeout(timer);
      finish(null); // no effect if the work already finished
    },
  };
}
