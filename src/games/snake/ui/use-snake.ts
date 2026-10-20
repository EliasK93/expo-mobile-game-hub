import { useCallback, useEffect, useRef, useState } from 'react';

import { useGameClock } from '@/hooks/use-game-clock';
import { load, replaceSaveWithStats, save } from '@/lib/storage';

import type { Dir, Level } from '../logic/board';
import { interval, isInPlay, newGame, pause, resume, step, turn, type Game } from '../logic/game';
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
import { EMPTY_STATS, isNewBest, recordGame, type Result, type Stats } from '../logic/stats';

// The screen's state. The game and the stats live in refs as well as in state, so the handlers stay stable functions,
// and every transition, save and stats write is computed outside any state updater (a transition that returns the same
// game does nothing). The game is null until storage is read: only the empty screen shows, so no placeholder flashes.
export function useSnake() {
  const [game, setGame] = useState<Game | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [picking, setPicking] = useState(false);
  const [panel, setPanel] = useState(false); // the stats panel covers the game
  const [newBest, setNewBest] = useState(false); // the game that just ended set a new best
  const [lastLevel, setLastLevel] = useState<Level>('normal'); // the setting: marks the picker, not the game on screen
  const gameRef = useRef<Game | null>(null);
  const statsRef = useRef(stats);

  const put = useCallback((g: Game) => {
    gameRef.current = g;
    setGame(g);
  }, []);

  // The save holds the started, unfinished game on screen; a ready or finished game has none (toSave returns null).
  const persist = useCallback((g: Game, ms: number) => {
    const data = toSave(g, ms);
    if (data) save(SAVE_KEY, SAVE_VERSION, data);
  }, []);

  // A game ended or was abandoned: the stats count it, and the save goes first (see replaceSaveWithStats).
  // isNewBest is asked before recordGame overwrites the best.
  const finish = useCallback((level: Level, result: Result) => {
    setNewBest(isNewBest(statsRef.current[level], result.apples));
    statsRef.current = recordGame(statsRef.current, level, result);
    setStats(statsRef.current);
    replaceSaveWithStats(SAVE_KEY, STATS_KEY, STATS_VERSION, statsRef.current);
  }, []);

  // The clock (the time the snake ran) and the tick timer run together: while the snake runs, the screen is focused,
  // the app is in front, and neither the picker nor the panel is open. Whenever the clock stops while the game is still
  // running (leaving the screen, the app to the background, the picker or the panel opening) the game pauses, so it
  // never runs unseen, and the paused game is saved. onStop runs later, when act exists.
  const { running, read, reset, stop } = useGameClock({
    enabled: game?.status === 'running' && !picking && !panel,
    onStop: (ms) => {
      act(pause);
      if (gameRef.current) persist(gameRef.current, ms);
    },
  });

  // Opening resumes the saved game directly (paused), or shows a new ready game of the last used level.
  useEffect(() => {
    let alive = true;
    Promise.all([
      load(SAVE_KEY, SAVE_VERSION),
      load(STATS_KEY, STATS_VERSION),
      load(SETTINGS_KEY, SETTINGS_VERSION),
    ]).then(([data, storedStats, storedSettings]) => {
      if (!alive) return;
      const { level } = fromSettings(storedSettings);
      const saved = fromSave(data);
      statsRef.current = fromStats(storedStats);
      setStats(statsRef.current);
      setLastLevel(level);
      put(saved?.game ?? newGame(level, Math.random));
      reset(saved?.elapsedMs);
    });
    return () => {
      alive = false;
    };
  }, [put, reset]);

  const act = useCallback(
    (transition: (g: Game) => Game) => {
      const g = gameRef.current;
      if (!g) return;
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
    const g = gameRef.current;
    if (!running || !g) return;
    const id = setTimeout(() => act((cur) => step(cur, Math.random)), interval(g));
    return () => clearTimeout(id);
  }, [running, game?.snake, act]);

  // A new game of the level; the clock starts again at 0.
  const begin = useCallback(
    (level: Level) => {
      put(newGame(level, Math.random));
      setNewBest(false);
      reset();
    },
    [put, reset],
  );

  // The picker and the panel replace the board; the panel also closes the picker.
  const openPanel = useCallback(() => {
    setPicking(false);
    setPanel(true);
  }, []);

  // Choosing a level ends a started game that is still going (it counts with the apples it reached); a finished game is
  // already recorded, and an unstarted one goes for free. The level is stored as the new last used one.
  const pickLevel = useCallback(
    (level: Level) => {
      const g = gameRef.current;
      if (g && isInPlay(g)) finish(g.level, { apples: g.apples, ms: read() });
      setLastLevel(level);
      save(SETTINGS_KEY, SETTINGS_VERSION, { level });
      setPicking(false);
      begin(level);
    },
    [finish, read, begin],
  );

  return {
    game,
    best: game ? Math.max(stats[game.level].best, game.apples) : 0,
    newBest,
    picking,
    panel,
    lastLevel,
    stats,
    swipe: useCallback((dir: Dir) => act((g) => turn(g, dir)), [act]),
    pause: useCallback(() => act(pause), [act]),
    resume: useCallback(() => act(resume), [act]),
    playAgain: useCallback(() => {
      if (gameRef.current) begin(gameRef.current.level);
    }, [begin]),
    openPicker: useCallback(() => setPicking(true), []),
    closePicker: useCallback(() => setPicking(false), []),
    openPanel,
    closePanel: useCallback(() => setPanel(false), []),
    pickLevel,
  };
}
