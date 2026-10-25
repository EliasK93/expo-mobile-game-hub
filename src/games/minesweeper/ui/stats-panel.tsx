import { StatsPanel } from '@/components/stats-panel';
import { winPercent } from '@/lib/stats';
import { capitalize } from '@/lib/text';
import { formatTime } from '@/lib/timer';

import { LEVEL_IDS } from '../logic/board';
import type { Game } from '../logic/game';
import type { Stats } from '../logic/stats';

type Props = {
  stats: Stats;
  game: Game; // the game on the board; once it is over, the panel shows its result and the new-game buttons
  ms: number; // the time of that game
  newBest: boolean; // the game that just ended set a new best time
  onClose: () => void;
  onPlayAgain: () => void;
  onChangeLevel: () => void;
};

// The Beginner · Intermediate · Expert switch opens on the level of the game on the board.
export function MinesweeperStatsPanel({ stats, game, ms, newBest, onClose, onPlayAgain, onChangeLevel }: Props) {
  const over = game.status !== 'playing';
  const won = game.status === 'won';
  const result = over
    ? (won ? [`Won in ${formatTime(ms)}`, ...(newBest ? ['New best!'] : [])] : ['Boom!']).join(' · ')
    : null;

  return (
    <StatsPanel
      options={LEVEL_IDS.map((id) => ({ id, text: capitalize(id) }))}
      initial={game.level}
      numbersFor={(level) => {
        const s = stats[level];
        return [
          ['Played', String(s.played)],
          ['Win %', String(winPercent(s.played, s.wins))],
          ['Current streak', String(s.currentStreak)],
          ['Best streak', String(s.bestStreak)],
          ['Best time', s.bestMs === null ? '—' : formatTime(s.bestMs)],
        ];
      }}
      result={result}
      actions={over ? { change: 'Change level', onPlayAgain, onChange: onChangeLevel } : undefined}
      onClose={onClose}
    />
  );
}
