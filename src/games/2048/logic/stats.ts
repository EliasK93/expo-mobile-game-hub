import type { Size } from './board';
import type { Result } from './game';

export type SizeStats = { played: number; wins: number; bestScore: number | null; bestTile: number | null };
export type Stats = Record<Size, SizeStats>;

const EMPTY_SIZE: SizeStats = { played: 0, wins: 0, bestScore: null, bestTile: null };
export const EMPTY_STATS: Stats = { 4: EMPTY_SIZE, 5: EMPTY_SIZE, 6: EMPTY_SIZE, 7: EMPTY_SIZE };

// Game over and abandoning a started game both come here. Every game counts as played, and as a win when it reached the
// win tile; a game with undo stays out of the bests, and a score of 0 is no best score.
export function recordGame(stats: Stats, size: Size, { score, bestTile, won, undoUsed }: Result): Stats {
  const s = stats[size];
  const next: SizeStats = { ...s, played: s.played + 1, wins: s.wins + (won ? 1 : 0) };
  if (!undoUsed) {
    if (score > 0) next.bestScore = Math.max(s.bestScore ?? 0, score);
    next.bestTile = Math.max(s.bestTile ?? 0, bestTile);
  }
  return { ...stats, [size]: next };
}
