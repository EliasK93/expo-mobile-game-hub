import { StatsPanel } from '@/components/stats-panel';
import { winPercent } from '@/lib/stats';
import { capitalize } from '@/lib/text';
import { formatTime } from '@/lib/timer';

import { LEVEL_IDS, type Level } from '../logic/game';
import type { Stats } from '../logic/stats';

type Props = { stats: Stats; current: Level; onClose: () => void };

// The Easy · Medium · Hard switch opens on the level on screen. The result of a puzzle stays on the board, not here.
export function Make24StatsPanel({ stats, current, onClose }: Props) {
  return (
    <StatsPanel
      options={LEVEL_IDS.map((id) => ({ id, text: capitalize(id) }))}
      initial={current}
      numbersFor={(level) => {
        const s = stats[level];
        return [
          ['Played', String(s.played)],
          ['Solved %', String(winPercent(s.played, s.solved))],
          ['Current streak', String(s.currentStreak)],
          ['Best streak', String(s.bestStreak)],
          ['Best time', s.bestMs === null ? '—' : formatTime(s.bestMs)],
        ];
      }}
      onClose={onClose}
    />
  );
}
