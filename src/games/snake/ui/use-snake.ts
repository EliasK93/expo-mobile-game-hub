import { useCallback, useEffect, useRef, useState } from 'react';

import { useGameClock } from '@/hooks/use-game-clock';

import type { Dir, Level } from '../logic/board';
import { interval, newGame, pause, resume, step, turn, type Game } from '../logic/game';
import { EMPTY_STATS, isNewBest, recordGame, type Result, type Stats } from '../logic/stats';

// The screen's state. The game and the stats live in refs as well as in state, so the handlers stay stable functions,
// and every transition and stats write is computed outside any state updater (a transition that returns the same game
// does nothing). Stats are in memory only until S3 stores them.
export function useSnake() {
  const [game, setGame] = useState(() => newGame('normal', Math.random));
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [picking, setPicking] = useState(false);
  const [newBest, setNewBest] = useState(false); // the game that just ended set a new best
  const [lastLevel, setLastLevel] = useState<Level>('normal'); // marks the picker, not the game on screen
  const gameRef = useRef(game);
  const statsRef = useRef(stats);

  const put = useCallback((g: Game) => {
    gameRef.current = g;
    setGame(g);
  }, []);

  // A game ended: the stats count it. isNewBest is asked before recordGame overwrites the best.
  const finish = useCallback((level: Level, result: Result) => {
    setNewBest(isNewBest(statsRef.current[level], result.apples));
    statsRef.current = recordGame(statsRef.current, level, result);
    setStats(statsRef.current);
  }, []);

  // The clock (the time the snake ran) and the tick timer run together: while the snake runs, the screen is focused and
  // the app is in front. Whenever the clock stops while the game is still running (leaving the screen, the app to the
  // background, the picker opening) the game pauses, so it never runs unseen and is paused when it comes back.
  // onStop runs later, when act exists.
  const { running, reset, stop } = useGameClock({
    enabled: game.status === 'running' && !picking,
    onStop: () => act(pause),
  });

  const act = useCallback(
    (transition: (g: Game) => Game) => {
      const g = gameRef.current;
      const next = transition(g);
      if (next === g) return;
      put(next);
      if (next.status === 'over' || next.status === 'won') finish(next.level, { apples: next.apples, ms: stop() });
    },
    [put, finish, stop],
  );

  // One tick after the level's interval, chained: re-armed when the snake has moved (game.snake is a new array per step)
  // or the clock starts or stops, but not on a swipe, so a queued turn never delays the next tick.
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => act((g) => step(g, Math.random)), interval(gameRef.current));
    return () => clearTimeout(id);
  }, [running, game.snake, act]);

  // A new game of the level; the clock starts again at 0.
  const begin = useCallback(
    (level: Level) => {
      put(newGame(level, Math.random));
      setNewBest(false);
      reset();
    },
    [put, reset],
  );

  // S3 adds the abandon rule (a started game is recorded when a level is picked) and storing the last level.
  const pickLevel = useCallback(
    (level: Level) => {
      setLastLevel(level);
      setPicking(false);
      begin(level);
    },
    [begin],
  );

  return {
    game,
    best: Math.max(stats[game.level].best, game.apples),
    newBest,
    picking,
    lastLevel,
    stats,
    swipe: useCallback((dir: Dir) => act((g) => turn(g, dir)), [act]),
    pause: useCallback(() => act(pause), [act]),
    resume: useCallback(() => act(resume), [act]),
    playAgain: useCallback(() => begin(gameRef.current.level), [begin]),
    openPicker: useCallback(() => setPicking(true), []),
    closePicker: useCallback(() => setPicking(false), []),
    pickLevel,
  };
}
