import { useCallback, useRef, useState } from 'react';

import { useGameClock } from '@/hooks/use-game-clock';

import { giveUp, hint, newGame, tapCard, tapOperator, undo, type Game, type Level } from '../logic/game';
import type { Order } from '../logic/order';
import { pickPuzzle } from '../logic/pool';
import type { Op } from '../logic/solve';

// The screen's state. The game lives in a ref as well as in state, so the handlers stay stable functions, and every
// transition is computed outside any state updater (a transition that returns the same game does nothing).
// Nothing is stored yet: the puzzle orders and the last level live in memory only (storage comes with M4).
export function useMake24() {
  const [first] = useState(() => pickPuzzle('easy', null, Math.random)); // the puzzle on screen at the start
  const orders = useRef<Partial<Record<Level, Order>>>({ easy: first.order });
  // The next puzzle of the level in the level's order (the order is kept for the next pick).
  const start = useCallback((level: Level): Game => {
    const { numbers, order } = pickPuzzle(level, orders.current[level] ?? null, Math.random);
    orders.current[level] = order;
    return newGame(level, numbers);
  }, []);

  const [game, setGame] = useState(() => newGame('easy', first.numbers));
  const [picking, setPicking] = useState(false);
  const [lastLevel, setLastLevel] = useState<Level>('easy'); // the picker's mark, not the running puzzle's level
  const gameRef = useRef(game);

  // The time runs from the moment a puzzle is shown, until it ends or the picker opens.
  const { elapsedMs, reset, stop } = useGameClock({
    enabled: game.status === 'playing' && !picking,
    onStop: () => {}, // M4 saves the unfinished puzzle here
  });

  const put = useCallback((g: Game) => {
    gameRef.current = g;
    setGame(g);
  }, []);

  const act = useCallback(
    (transition: (g: Game) => Game) => {
      const g = gameRef.current;
      const next = transition(g);
      if (next === g) return;
      put(next);
      if (next.status !== 'playing') stop();
    },
    [put, stop],
  );

  const begin = useCallback(
    (level: Level) => {
      put(start(level));
      reset();
    },
    [put, start, reset],
  );

  return {
    game,
    picking,
    lastLevel,
    elapsedMs,
    tapCard: useCallback((i: number) => act((g) => tapCard(g, i)), [act]),
    tapOperator: useCallback((op: Op) => act((g) => tapOperator(g, op)), [act]),
    undo: useCallback(() => act(undo), [act]),
    hint: useCallback(() => act(hint), [act]),
    giveUp: useCallback(() => act(giveUp), [act]),
    next: useCallback(() => begin(gameRef.current.level), [begin]),
    openPicker: useCallback(() => setPicking(true), []),
    closePicker: useCallback(() => setPicking(false), []),
    pickLevel: useCallback(
      (level: Level) => {
        setLastLevel(level);
        setPicking(false);
        begin(level);
      },
      [begin],
    ),
  };
}
