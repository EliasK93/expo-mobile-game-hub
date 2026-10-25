// Per bucket (a level, see `bucketOf` in save.ts).
// Only solved games count. A hinted win raises `solved` but stays out of best and average time.
export type StatsEntry = { solved: number; timedCount: number; totalMs: number; bestMs: number | null };
export type Stats = Record<string, StatsEntry>;

export const EMPTY_ENTRY: StatsEntry = { solved: 0, timedCount: 0, totalMs: 0, bestMs: null };

export function recordWin(stats: Stats, bucket: string, ms: number, hinted: boolean): Stats {
  const e = stats[bucket] ?? EMPTY_ENTRY;
  const next: StatsEntry = hinted
    ? { ...e, solved: e.solved + 1 }
    : {
        solved: e.solved + 1,
        timedCount: e.timedCount + 1,
        totalMs: e.totalMs + ms,
        bestMs: e.bestMs === null ? ms : Math.min(e.bestMs, ms),
      };
  return { ...stats, [bucket]: next };
}

// The average time of the timed wins; null when there are none (hinted wins stay out of it).
export const averageMs = ({ timedCount, totalMs }: StatsEntry): number | null =>
  timedCount === 0 ? null : Math.round(totalMs / timedCount);
