import { useCallback, useRef, useState } from 'react';

import { useGameClock } from '@/hooks/use-game-clock';

import type { Level } from '../logic/board';
import { isStarted, newGame, open, toggleFlag, type Game } from '../logic/game';

// dig = a tap opens and a long press flags; flag = the other way round.
export type Mode = 'dig' | 'flag';

// The screen's state. The game and the mode live in refs as well as in state: tap and hold must stay stable functions (the
// memoised cells (up to 216) are built from them, so a mode switch or another cell's change re-renders none of them), and a
// transition is computed outside any state updater, so nothing runs twice in development.
export function useMinesweeper() {
  const [game, setGame] = useState(() => newGame('beginner'));
  const [mode, setMode] = useState<Mode>('dig'); // not saved: every game starts in Dig mode
  const [picking, setPicking] = useState(false);
  const [lastLevel, setLastLevel] = useState<Level>('beginner'); // marks the picker; in memory until the setting is stored
  const gameRef = useRef(game);
  const modeRef = useRef(mode);

  // The clock starts with the first opening (the mines are placed then), so a first tap in Flag mode doesn't start it.
  // It stops by itself when the game ends or the picker opens. There is nothing to save when it stops until M3 adds the save.
  const { elapsedMs, reset } = useGameClock({
    enabled: game.status === 'playing' && isStarted(game) && !picking,
    onStop: () => {},
  });

  const put = useCallback((g: Game) => {
    gameRef.current = g;
    setGame(g);
  }, []);

  const chooseMode = useCallback((m: Mode) => {
    modeRef.current = m;
    setMode(m);
  }, []);

  // A pure transition that returns the same game when it does nothing (a flagged cell, an opened number, a finished game).
  const act = useCallback(
    (i: number, dig: boolean) => {
      const g = gameRef.current;
      const next = dig ? open(g, i, Math.random) : toggleFlag(g, i);
      if (next !== g) put(next);
    },
    [put],
  );
  const tap = useCallback((i: number) => act(i, modeRef.current === 'dig'), [act]);
  const hold = useCallback((i: number) => act(i, modeRef.current === 'flag'), [act]);

  const openPicker = useCallback(() => setPicking(true), []);
  const closePicker = useCallback(() => setPicking(false), []);

  // A new unmined board of the level, in Dig mode, with the clock at 0.
  const pickLevel = useCallback(
    (level: Level) => {
      setLastLevel(level);
      put(newGame(level));
      chooseMode('dig');
      setPicking(false);
      reset();
    },
    [put, chooseMode, reset],
  );

  return {
    game,
    mode,
    picking,
    lastLevel,
    elapsedMs,
    tap,
    hold,
    setMode: chooseMode,
    openPicker,
    closePicker,
    pickLevel,
  };
}
