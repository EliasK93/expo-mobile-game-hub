import { useState } from 'react';

import { isWon, newGame, setValue } from '../logic/game';

export function useSudoku() {
  const [game, setGame] = useState(() => newGame());
  const [selected, setSelected] = useState<number | null>(null);

  const enter = (v: number) => {
    if (selected !== null) setGame((g) => setValue(g, selected, v));
  };

  return {
    game,
    selected,
    won: isWon(game),
    select: setSelected,
    enter,
    erase: () => enter(0),
    restart: () => {
      setGame(newGame());
      setSelected(null);
    },
  };
}
