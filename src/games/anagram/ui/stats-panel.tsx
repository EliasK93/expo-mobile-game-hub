import { StatsPanel } from '@/components/stats-panel';
import { capitalize } from '@/lib/text';

import { average, type Stats } from '../logic/stats';
import { LEVEL_IDS, type Level } from '../logic/words';

type Props = { stats: Stats; current: Level; onClose: () => void };

// The Easy · Normal · Hard switch opens on the level on screen. The result of a round stays on the game screen, not here.
export function AnagramStatsPanel({ stats, current, onClose }: Props) {
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
          ['Words', s.played === 0 ? '—' : String(s.totalWords)],
        ];
      }}
      onClose={onClose}
    />
  );
}
