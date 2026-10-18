// A pure clock: the caller passes `now` (Date.now()), so tests need no real time.
// elapsedMs = time banked while stopped; startedAt = when it last started, or null when stopped.
export type Clock = { elapsedMs: number; startedAt: number | null };

export const newClock = (elapsedMs = 0): Clock => ({ elapsedMs, startedAt: null });

// Starting a running clock or stopping a stopped one returns the same object.
export const startClock = (c: Clock, now: number): Clock => (c.startedAt === null ? { ...c, startedAt: now } : c);

export const stopClock = (c: Clock, now: number): Clock =>
  c.startedAt === null ? c : { elapsedMs: c.elapsedMs + now - c.startedAt, startedAt: null };

export const readClock = (c: Clock, now: number): number =>
  c.elapsedMs + (c.startedAt === null ? 0 : now - c.startedAt);

const two = (n: number) => String(n).padStart(2, '0');

// m:ss, and h:mm:ss from one hour on.
export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}
