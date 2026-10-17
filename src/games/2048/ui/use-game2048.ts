import { useCallback, useState } from 'react';

import type { Dir, Size } from '../logic/board';
import { newGame, play } from '../logic/game';
import { liveBest } from '../logic/stats';

// The screen's state. Opening the screen starts a 4×4 game. ponytail: T2 keeps no stats, so Best is the best of this visit
// (no stored best); T3 loads and saves them, and the save, resume and abandon rules.
export function useGame2048() {
  const [game, setGame] = useState(() => newGame(4, Math.random));
  const [picking, setPicking] = useState(false);

  // The new game comes from the state updater, so swipe stays the same function for the board's PanResponder.
  const swipe = useCallback((dir: Dir) => setGame((g) => play(g, dir, Math.random).game), []);
  const openPicker = useCallback(() => setPicking(true), []);
  const closePicker = useCallback(() => setPicking(false), []);
  const pickSize = useCallback((size: Size) => {
    setGame(newGame(size, Math.random));
    setPicking(false);
  }, []);

  return { game, best: liveBest(null, game), picking, swipe, openPicker, closePicker, pickSize };
}
