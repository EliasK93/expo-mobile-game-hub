import { useCallback, useEffect, useRef, useState } from 'react';

import { useGameClock } from '@/hooks/use-game-clock';

import {
  clear,
  endReveal,
  newRound,
  pause,
  place,
  remainingMs,
  resume,
  shuffleRack,
  skip,
  start,
  tick,
  unplace,
  type Game,
} from '../logic/game';
import { EMPTY_STATS, isNewBest, recordRound, type Stats } from '../logic/stats';
import type { Level } from '../logic/words';

const REVEAL_MS = 1000; // how long the solution of a skipped word shows

// The screen's state. The round and the stats live in refs as well as in state, so the handlers stay stable functions,
// and every transition and stats update is computed outside any state updater (a transition that returns the same game
// does nothing). The stats are for this visit only until A4 stores them.
export function useAnagram() {
  const [game, setGame] = useState(() => newRound('normal', Math.random));
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [picking, setPicking] = useState(false);
  const [newBest, setNewBest] = useState(false); // the round that just ended set a new best
  const gameRef = useRef(game);
  const statsRef = useRef(stats);

  const put = useCallback((g: Game) => {
    gameRef.current = g;
    setGame(g);
  }, []);

  // A round ended: the stats count it. isNewBest is asked before recordRound overwrites the best.
  const finish = useCallback((g: Game) => {
    setNewBest(isNewBest(statsRef.current[g.level], g.solved));
    statsRef.current = recordRound(statsRef.current, g.level, g.solved);
    setStats(statsRef.current);
  }, []);

  // The clock (the time the round ran) runs while the round does, the screen is focused, the app is in front and the
  // picker is closed. Whenever it stops while the round is still running (leaving the screen, the app to the
  // background, the picker opening) the round pauses, so it never runs unseen. onStop runs later, when act exists.
  const { elapsedMs, read, reset } = useGameClock({
    enabled: game.status === 'running' && !picking,
    onStop: () => act(pause),
  });

  const act = useCallback(
    (transition: (g: Game) => Game) => {
      const g = gameRef.current;
      const next = transition(g);
      if (next === g) return;
      put(next);
      if (next.status === 'over') finish(next);
    },
    [put, finish],
  );

  // The countdown ends the round at 0:00 (tick does nothing while a solution shows or the round isn't running). The
  // game is a dependency too, so a round that resumes at 0:00 ends at once.
  useEffect(() => act((g) => tick(g, elapsedMs)), [elapsedMs, game, act]);

  // The solution of a skipped word shows for REVEAL_MS while the clock keeps running; then the round goes on, or ends
  // if the skip used up the time. Pausing clears it, which cancels the timeout.
  useEffect(() => {
    if (game.revealed === null) return;
    const id = setTimeout(() => act((g) => endReveal(g, read())), REVEAL_MS);
    return () => clearTimeout(id);
  }, [game.revealed, act, read]);

  // A new round of the level; the clock starts again at 0.
  const begin = useCallback(
    (level: Level) => {
      put(newRound(level, Math.random));
      setNewBest(false);
      reset();
    },
    [put, reset],
  );

  const pickLevel = useCallback(
    (level: Level) => {
      setPicking(false);
      begin(level);
    },
    [begin],
  );

  return {
    game,
    remaining: game.status === 'over' ? 0 : remainingMs(game, elapsedMs),
    best: Math.max(stats[game.level].best, game.solved),
    newBest,
    picking,
    stats,
    start: useCallback(() => act(start), [act]),
    pause: useCallback(() => act(pause), [act]),
    resume: useCallback(() => act(resume), [act]),
    place: useCallback((i: number) => act((g) => place(g, i, Math.random)), [act]),
    unplace: useCallback((slot: number) => act((g) => unplace(g, slot)), [act]),
    clear: useCallback(() => act(clear), [act]),
    shuffle: useCallback(() => act((g) => shuffleRack(g, Math.random)), [act]),
    skip: useCallback(() => act((g) => skip(g, read(), Math.random)), [act, read]),
    playAgain: useCallback(() => begin(gameRef.current.level), [begin]),
    openPicker: useCallback(() => setPicking(true), []),
    closePicker: useCallback(() => setPicking(false), []),
    pickLevel,
  };
}
