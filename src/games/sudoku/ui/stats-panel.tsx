import { StatsPanel } from '@/components/stats-panel';
import { formatTime } from '@/lib/timer';

import { bucketOf } from '../logic/save';
import { averageMs, EMPTY_ENTRY, type Stats } from '../logic/stats';
import { LEVEL_NAMES, LEVELS, type Level } from '../logic/techniques';

type Props = { stats: Stats; current: Level; onClose: () => void };

// The five-level switch opens on `current`. "Very easy" (level 1) is shortened to fit five buttons in a row on a narrow
// phone; the labels keep the full names. Times come from timed wins only; hinted wins are counted apart.
// No result line and no Play again row: Sudoku keeps its own win screen.
export function SudokuStatsPanel({ stats, current, onClose }: Props) {
  return (
    <StatsPanel
      options={LEVELS.map((id) => ({
        id,
        text: id === 1 ? 'V. easy' : LEVEL_NAMES[id],
        label: `${LEVEL_NAMES[id]} stats`,
      }))}
      initial={current}
      numbersFor={(level) => {
        const e = stats[bucketOf(level)] ?? EMPTY_ENTRY;
        const average = averageMs(e);
        const hinted = e.solved - e.timedCount;
        return [
          ['Solved', String(e.solved)],
          ['Best', e.bestMs === null ? '—' : formatTime(e.bestMs)],
          ['Average', average === null ? '—' : formatTime(average)],
          ['Hinted', hinted === 0 ? '—' : String(hinted)],
        ];
      }}
      onClose={onClose}
    />
  );
}
