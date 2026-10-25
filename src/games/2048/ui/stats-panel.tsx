import { StatsPanel } from '@/components/stats-panel';

import { SIZES } from '../logic/board';
import { resultOf, type Game } from '../logic/game';
import type { Stats } from '../logic/stats';
import { formatScore } from './format';

type Props = {
  stats: Stats;
  game: Game; // the game on the board; once it is over, the panel shows its result and the new-game buttons
  newBest: boolean; // the game that just ended set a new best score
  onClose: () => void;
  onPlayAgain: () => void;
  onChangeSize: () => void;
};

// The 4×4 · 5×5 · 6×6 · 7×7 switch opens on the size of the game on the board.
export function Game2048StatsPanel({ stats, game, newBest, onClose, onPlayAgain, onChangeSize }: Props) {
  const over = game.status === 'over';
  const { score, bestTile, undoUsed } = resultOf(game);
  const result = over
    ? [
        `Score ${formatScore(score)}`,
        `best tile ${bestTile}`,
        ...(newBest ? ['New best!'] : []),
        ...(undoUsed ? ['with undo'] : []),
      ].join(' · ')
    : null;

  return (
    <StatsPanel
      options={SIZES.map((n) => ({ id: n, text: `${n}×${n}` }))}
      initial={game.size}
      numbersFor={(size) => {
        const s = stats[size];
        return [
          ['Played', String(s.played)],
          ['Wins', String(s.wins)],
          ['Best score', s.bestScore === null ? '—' : formatScore(s.bestScore)],
          ['Best tile', s.bestTile === null ? '—' : String(s.bestTile)],
        ];
      }}
      result={result}
      actions={over ? { change: 'Change size', onPlayAgain, onChange: onChangeSize } : undefined}
      onClose={onClose}
    />
  );
}
