// Generic undo/redo: knows nothing about Sudoku. Snapshots are immutable values, so sharing them is safe.
export type History<T> = { past: readonly T[]; present: T; future: readonly T[] };

export const start = <T>(present: T): History<T> => ({ past: [], present, future: [] });

// Returns the same history when next is the present value (===), so a no-op action creates no undo step.
export function push<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h;
  return { past: [...h.past, h.present], present: next, future: [] };
}

export const canUndo = <T>(h: History<T>) => h.past.length > 0;
export const canRedo = <T>(h: History<T>) => h.future.length > 0;

export function undo<T>(h: History<T>): History<T> {
  if (!canUndo(h)) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo<T>(h: History<T>): History<T> {
  if (!canRedo(h)) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
