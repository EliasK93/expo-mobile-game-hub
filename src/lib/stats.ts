import { load, replaceSaveWithStats } from './storage';
import { formatTime } from './timer';

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

// "5 solved · Best 3:10". An entry with only hinted wins shows just the count.
export const statsLine = (e: StatsEntry): string =>
  e.bestMs === null ? `${e.solved} solved` : `${e.solved} solved · Best ${formatTime(e.bestMs)}`;

export async function recordWinStored(o: { saveKey: string; statsKey: string; version: number; bucket: string; ms: number; hinted: boolean }) {
  const stats = (await load<Stats>(o.statsKey, o.version)) ?? {};
  await replaceSaveWithStats(o.saveKey, o.statsKey, o.version, recordWin(stats, o.bucket, o.ms, o.hinted));
}
