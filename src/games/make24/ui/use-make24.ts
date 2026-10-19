import { useCallback, useEffect, useRef, useState } from 'react';

import { useGameClock } from '@/hooks/use-game-clock';
import { load, replaceSaveWithStats, save } from '@/lib/storage';

import { giveUp, hint, isStarted, newGame, tapCard, tapOperator, undo, type Game, type Level } from '../logic/game';
import { pickPuzzle } from '../logic/pool';
import {
  fromOrders,
  fromSave,
  fromSettings,
  fromStats,
  ORDER_KEY,
  ORDER_VERSION,
  SAVE_KEY,
  SAVE_VERSION,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  STATS_KEY,
  STATS_VERSION,
  toSave,
  type Orders,
} from '../logic/save';
import type { Op } from '../logic/solve';
import { EMPTY_STATS, isNewBest, recordGame, type Result, type Stats } from '../logic/stats';

// The screen's state. The game, the stats and the orders live in refs as well as in state, so the handlers stay stable
// functions, and every transition, save and stats write is computed outside any state updater (a transition that
// returns the same game does nothing).
export function useMake24() {
  // The first game is a placeholder under the blank screen; the stored one (or a new one) replaces it when storage is read.
  const [game, setGame] = useState(() => newGame('easy', [1, 2, 3, 4]));
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [picking, setPicking] = useState(false);
  const [panel, setPanel] = useState(false); // the stats panel covers the game
  const [newBest, setNewBest] = useState(false); // the puzzle that just ended set a new best time
  const [lastLevel, setLastLevel] = useState<Level>('easy'); // the setting: marks the picker, not the running puzzle's level
  const gameRef = useRef(game);
  const statsRef = useRef(stats);
  const orders = useRef<Orders>({});

  // The save always holds the unfinished puzzle on screen; a finished one has none.
  const persist = useCallback((g: Game, ms: number) => {
    if (g.status === 'playing') save(SAVE_KEY, SAVE_VERSION, toSave(g, ms));
  }, []);

  // The time runs from the moment a puzzle is shown, until it ends or the picker or the panel opens. Stopping it (also
  // leaving the screen, app to background) saves the time.
  const { elapsedMs, read, reset, stop } = useGameClock({
    enabled: loaded && game.status === 'playing' && !picking && !panel,
    onStop: (ms) => persist(gameRef.current, ms),
  });

  const put = useCallback((g: Game) => {
    gameRef.current = g;
    setGame(g);
  }, []);

  // The next puzzle of the level in the level's order. The order is saved at once, so a puzzle that was served counts
  // as served even if the app closes before it is played.
  const start = useCallback((level: Level): Game => {
    const { numbers, order } = pickPuzzle(level, orders.current[level] ?? null, Math.random);
    orders.current = { ...orders.current, [level]: order };
    save(ORDER_KEY, ORDER_VERSION, orders.current);
    return newGame(level, numbers);
  }, []);

  // A puzzle ended or was abandoned: the stats count it, and the save goes first (see replaceSaveWithStats).
  const finish = useCallback((level: Level, result: Result) => {
    const next = recordGame(statsRef.current, level, result);
    setNewBest(isNewBest(statsRef.current[level], result));
    statsRef.current = next;
    setStats(next);
    replaceSaveWithStats(SAVE_KEY, STATS_KEY, STATS_VERSION, next);
  }, []);

  // Opening resumes the saved puzzle directly, or starts the next one of the last used level (and saves it, so
  // closing the app at once does not use up another).
  useEffect(() => {
    let alive = true;
    Promise.all([
      load(SAVE_KEY, SAVE_VERSION),
      load(STATS_KEY, STATS_VERSION),
      load(SETTINGS_KEY, SETTINGS_VERSION),
      load(ORDER_KEY, ORDER_VERSION),
    ]).then(([data, storedStats, storedSettings, storedOrders]) => {
      if (!alive) return;
      const { level } = fromSettings(storedSettings);
      const saved = fromSave(data);
      orders.current = fromOrders(storedOrders);
      statsRef.current = fromStats(storedStats);
      setStats(statsRef.current);
      setLastLevel(level);
      const g = saved?.game ?? start(level);
      put(g);
      if (!saved) persist(g, 0);
      reset(saved?.elapsedMs);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [put, start, persist, reset]);

  const act = useCallback(
    (transition: (g: Game) => Game) => {
      const g = gameRef.current;
      const next = transition(g);
      if (next === g) return;
      put(next);
      if (next.status === 'playing') persist(next, read());
      else finish(next.level, { solved: next.status === 'solved', hinted: next.hints > 0, ms: stop() });
    },
    [put, persist, read, stop, finish],
  );

  // A new puzzle replaces whatever was saved, and starts the clock at 0.
  const begin = useCallback(
    (level: Level) => {
      const fresh = start(level);
      put(fresh);
      persist(fresh, 0);
      setNewBest(false);
      reset();
    },
    [start, put, persist, reset],
  );

  // The picker and the panel replace the board; the panel also closes the picker.
  const openPanel = useCallback(() => {
    setPicking(false);
    setPanel(true);
  }, []);

  // Choosing a level ends a running puzzle that has started (it counts as not solved); a finished one is already
  // recorded, and an unstarted one goes for free.
  const pickLevel = useCallback(
    (level: Level) => {
      const g = gameRef.current;
      if (g.status === 'playing' && isStarted(g)) finish(g.level, { solved: false, hinted: false, ms: read() });
      setLastLevel(level);
      save(SETTINGS_KEY, SETTINGS_VERSION, { level });
      setPicking(false);
      begin(level);
    },
    [finish, read, begin],
  );

  return {
    loaded,
    game,
    stats,
    newBest,
    picking,
    panel,
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
    openPanel,
    closePanel: useCallback(() => setPanel(false), []),
    pickLevel,
  };
}
