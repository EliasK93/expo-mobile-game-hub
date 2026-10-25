import { StatsPanel } from '@/components/stats-panel';
import { capitalize } from '@/lib/text';
import { formatTime } from '@/lib/timer';

import { LEVEL_IDS, type Level } from '../logic/board';
import { average, type Stats } from '../logic/stats';

type Props = { stats: Stats; current: Level; onClose: () => void };

// The Slow · Normal · Fast switch opens on the level on screen. The result of a game stays on the board, not here.
export function SnakeStatsPanel({ stats, current, onClose }: Props) {
  return (
    <StatsPanel
      options={LEVEL_IDS.map((id) => ({ id, text: capitalize(id) }))}
      initial={current}
      numbersFor={(level) => {
        const s = stats[level];
        return [
          ['Played', String(s.played)],
          ['Best', s.best === 0 ? '—' : String(s.best)],
          ['Average', s.played === 0 ? '—' : String(average(s))],
          ['Longest', s.played === 0 ? '—' : formatTime(s.longestMs)],
        ];
      }}
      onClose={onClose}
    />
  );
}
