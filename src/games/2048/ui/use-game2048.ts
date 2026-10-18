import { useCallback, useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { load, replaceSaveWithStats, save } from '@/lib/storage';

import type { Dir, Size } from '../logic/board';
import type { Motion } from './board';
import { isStarted, keepGoing, newGame, play, resultOf, undo, winOpen, type Game } from '../logic/game';
import {
  fromSave,
  fromSettings,
  fromStats,
  SAVE_KEY,
  SAVE_VERSION,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  STATS_KEY,
  STATS_VERSION,
  toSave,
} from '../logic/save';
import { EMPTY_STATS, isNewBest, liveBest, recordGame, type Stats } from '../logic/stats';

// The screen's state. The current game and the stats live in refs as well as in state: swipe must stay one stable function
// (the board's PanResponder is built from it once), and the saves and stats writes are side effects that must not run inside
// a state updater (React may run updaters twice in development).
export function useGame2048() {
  // The first game is a placeholder under the loading screen; the stored one (or a new one) replaces it when storage is read.
  const [game, setGame] = useState(() => newGame(4, Math.random));
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [lastSize, setLastSize] = useState<Size>(4); // the setting: marks the picker, not the running game
  const [newBest, setNewBest] = useState(false); // the game that just ended set a new best score
  const [picking, setPicking] = useState(false);
  const [panel, setPanel] = useState(false); // the stats panel covers the game
  const [motion, setMotion] = useState<Motion | null>(null); // the last move, for the board's animations
  const gameRef = useRef(game);
  const statsRef = useRef(stats);
  const seqRef = useRef(0);
  const reduceMotion = useReducedMotion();

  // m = the move that led here; anything else that changes the board (start, resume, undo) passes none.
  const put = useCallback((g: Game, m: Motion | null = null) => {
    gameRef.current = g;
    setGame(g);
    setMotion(m);
  }, []);

  // Every move, undo and Keep going: an unfinished game is the one thing saved.
  const persist = useCallback((g: Game) => {
    if (g.status === 'playing') save(SAVE_KEY, SAVE_VERSION, toSave(g));
  }, []);

  // The end of a game, by game over or by abandoning it.
  const finish = useCallback((g: Game) => {
    const result = resultOf(g);
    const next = recordGame(statsRef.current, g.size, result);
    setNewBest(isNewBest(statsRef.current[g.size], result));
    statsRef.current = next;
    setStats(next);
    replaceSaveWithStats(SAVE_KEY, STATS_KEY, STATS_VERSION, next);
  }, []);

  // A fresh game on the board, with the panel and the picker closed.
  const startGame = useCallback(
    (g: Game) => {
      put(g);
      setNewBest(false);
      setPicking(false);
      setPanel(false);
    },
    [put],
  );

  // Opening resumes the saved game directly, or starts a new one of the last used size.
  useEffect(() => {
    let alive = true;
    Promise.all([
      load(SAVE_KEY, SAVE_VERSION),
      load(STATS_KEY, STATS_VERSION),
      load(SETTINGS_KEY, SETTINGS_VERSION),
    ]).then(([data, storedStats, storedSettings]) => {
      if (!alive) return;
      const { size } = fromSettings(storedSettings);
      statsRef.current = fromStats(storedStats);
      setStats(statsRef.current);
      setLastSize(size);
      put(fromSave(data) ?? newGame(size, Math.random));
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [put]);

  const swipe = useCallback(
    (dir: Dir) => {
      const g = gameRef.current;
      if (winOpen(g)) return; // play doesn't block moves behind the overlay, so the UI does
      const { game: next, ...moved } = play(g, dir, Math.random);
      if (next === g) return;
      // A game that ends opens the stats panel at once, so there is nothing to animate.
      put(next, next.status === 'over' ? null : { seq: ++seqRef.current, ...moved });
      if (next.status === 'over') {
        finish(next);
        setPanel(true);
      } else persist(next);
    },
    [put, finish, persist],
  );

  // Undo and Keep going: a pure transition that returns the same game when it does nothing; anything else is saved.
  const step = useCallback(
    (transition: (g: Game) => Game) => {
      const next = transition(gameRef.current);
      if (next === gameRef.current) return;
      put(next);
      persist(next);
    },
    [put, persist],
  );

  // Choosing a size ends a running game that has started (it counts like a game over); a finished one is already recorded.
  const pickSize = useCallback(
    (size: Size) => {
      const g = gameRef.current;
      if (g.status === 'playing' && isStarted(g)) finish(g);
      setLastSize(size);
      save(SETTINGS_KEY, SETTINGS_VERSION, { size });
      startGame(newGame(size, Math.random));
    },
    [finish, startGame],
  );

  // The picker and the panel replace the board; it comes back as it stands, without playing the last move again.
  const openPicker = useCallback(() => {
    setMotion(null);
    setPicking(true);
  }, []);
  const closePicker = useCallback(() => setPicking(false), []);
  const openPanel = useCallback(() => {
    setMotion(null);
    setPicking(false);
    setPanel(true);
  }, []);
  const closePanel = useCallback(() => setPanel(false), []);

  return {
    loaded,
    game,
    motion: reduceMotion ? null : motion,
    stats,
    best: liveBest(stats[game.size].bestScore, game),
    lastSize,
    newBest,
    picking,
    panel,
    canUndo: game.prev !== null && game.status === 'playing',
    winOpen: winOpen(game),
    swipe,
    undo: () => step(undo),
    keepGoing: () => step(keepGoing),
    openPicker,
    closePicker,
    pickSize,
    openPanel,
    closePanel,
  };
}
