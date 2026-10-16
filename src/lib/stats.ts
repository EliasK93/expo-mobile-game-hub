// Per bucket (a game's own key, e.g. a difficulty).
// Only solved games count. A hinted win raises `solved` but stays out of best and average time.
export type StatsEntry = { solved: number; timedCount: number; totalMs: number; bestMs: number | null };
export type Stats = Record<string, StatsEntry>;

const EMPTY: StatsEntry = { solved: 0, timedCount: 0, totalMs: 0, bestMs: null };

export function recordWin(stats: Stats, bucket: string, ms: number, hinted: boolean): Stats {
  const e = stats[bucket] ?? EMPTY;
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

export const average = (e: StatsEntry): number | null => (e.timedCount === 0 ? null : e.totalMs / e.timedCount);
