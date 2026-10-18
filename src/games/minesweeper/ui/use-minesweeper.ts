import { useCallback, useEffect, useRef, useState } from 'react';

import { useGameClock } from '@/hooks/use-game-clock';
import { load, replaceSaveWithStats, save } from '@/lib/storage';

import type { Level } from '../logic/board';
import { isStarted, newGame, open, toggleFlag, type Game } from '../logic/game';
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
import { EMPTY_STATS, isNewBest, recordGame, type Stats } from '../logic/stats';

// dig = a tap opens and a long press flags; flag = the other way round.
export type Mode = 'dig' | 'flag';

// How long the finished board stays before the stats panel opens over it.
export const PANEL_DELAY_MS = 1000;

// The screen's state. The game, the stats and the mode live in refs as well as in state: tap and hold must stay stable
// functions (the memoised cells (up to 216) are built from them, so a mode switch or another cell's change re-renders none
// of them), and a transition, a save or a stats write is computed outside any state updater, so nothing runs twice in development.
export function useMinesweeper() {
  // The first game is a placeholder under the blank screen; the stored one (or a new one) replaces it when storage is read.
  const [game, setGame] = useState(() => newGame('beginner'));
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [mode, setMode] = useState<Mode>('dig'); // not saved: every game starts in Dig mode
  const [picking, setPicking] = useState(false);
  const [panel, setPanel] = useState(false); // the stats panel covers the game
  const [newBest, setNewBest] = useState(false); // the game that just ended set a new best time
  const [holding, setHolding] = useState(false); // a covered cell is pressed in: the face is surprised
  const [lastLevel, setLastLevel] = useState<Level>('beginner'); // the setting: marks the picker, not the running game
  const gameRef = useRef(game);
  const statsRef = useRef(stats);
  const modeRef = useRef(mode);
  const panelTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cancelPanel = useCallback(() => clearTimeout(panelTimer.current), []);
  useEffect(() => cancelPanel, [cancelPanel]);

  // The save always holds the unfinished board on screen; a finished game has none.
  const persist = useCallback((g: Game, ms: number) => {
    if (g.status === 'playing') save(SAVE_KEY, SAVE_VERSION, toSave(g, ms));
  }, []);

  // The clock starts with the first opening (the mines are placed then), so a first tap in Flag mode doesn't start it.
  // It stops by itself when the game ends or the picker or the panel opens; stopping it (also leaving the screen, app to
  // background) saves the time. The clock hook calls persist as it is at that moment.
  const { elapsedMs, read, reset, stop } = useGameClock({
    enabled: loaded && game.status === 'playing' && isStarted(game) && !picking && !panel,
    onStop: (ms) => persist(game, ms),
  });

  const put = useCallback((g: Game) => {
    gameRef.current = g;
    setGame(g);
  }, []);

  const chooseMode = useCallback((m: Mode) => {
    modeRef.current = m;
    setMode(m);
  }, []);

  // A game ended or was abandoned: the stats count it, and the save goes first (see replaceSaveWithStats).
  const finish = useCallback((level: Level, won: boolean, ms: number) => {
    const result = { won, ms };
    const next = recordGame(statsRef.current, level, result);
    setNewBest(isNewBest(statsRef.current[level], result));
    statsRef.current = next;
    setStats(next);
    replaceSaveWithStats(SAVE_KEY, STATS_KEY, STATS_VERSION, next);
  }, []);

  // Opening resumes the saved game directly, or starts an unmined board of the last used level.
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
      put(saved?.game ?? newGame(level));
      reset(saved?.elapsedMs);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [put, reset]);

  // A pure transition that returns the same game when it does nothing (a flagged cell, an opened number, a finished game).
  const act = useCallback(
    (i: number, dig: boolean) => {
      const g = gameRef.current;
      const next = dig ? open(g, i, Math.random) : toggleFlag(g, i);
      if (next === g) return;
      put(next);
      setHolding(false); // a long press acts while the finger is still down, and the release may not reach a cell that changed
      if (next.status === 'playing') persist(next, read());
      else {
        finish(next.level, next.status === 'won', stop());
        panelTimer.current = setTimeout(() => setPanel(true), PANEL_DELAY_MS);
      }
    },
    [put, persist, read, stop, finish],
  );
  const tap = useCallback((i: number) => act(i, modeRef.current === 'dig'), [act]);
  const hold = useCallback((i: number) => act(i, modeRef.current === 'flag'), [act]);
  const pressIn = useCallback(() => setHolding(true), []);
  const pressOut = useCallback(() => setHolding(false), []);

  // The picker and the panel replace the board; they also cancel a panel that was about to open by itself.
  // They also end a hold: the board unmounts, so the held cell never sends its release.
  const openPicker = useCallback(() => {
    cancelPanel();
    setHolding(false);
    setPicking(true);
  }, [cancelPanel]);
  const closePicker = useCallback(() => setPicking(false), []);
  const openPanel = useCallback(() => {
    cancelPanel();
    setHolding(false);
    setPicking(false);
    setPanel(true);
  }, [cancelPanel]);
  const closePanel = useCallback(() => setPanel(false), []);

  // Choosing a level ends a running game that has started (it counts as a loss); a finished one is already recorded.
  // The new board is an unmined one in Dig mode, with the clock at 0, and it replaces whatever was saved.
  const pickLevel = useCallback(
    (level: Level) => {
      const g = gameRef.current;
      if (g.status === 'playing' && isStarted(g)) finish(g.level, false, read());
      cancelPanel();
      const fresh = newGame(level);
      setLastLevel(level);
      save(SETTINGS_KEY, SETTINGS_VERSION, { level });
      put(fresh);
      persist(fresh, 0); // on purpose: it overwrites a flag-only save, which an unstarted game leaves behind
      chooseMode('dig');
      setNewBest(false);
      setHolding(false);
      setPicking(false);
      setPanel(false);
      reset();
    },
    [finish, read, cancelPanel, put, persist, chooseMode, reset],
  );

  return {
    loaded,
    game,
    mode,
    stats,
    newBest,
    picking,
    panel,
    lastLevel,
    elapsedMs,
    holding,
    tap,
    hold,
    pressIn,
    pressOut,
    setMode: chooseMode,
    openPicker,
    closePicker,
    openPanel,
    closePanel,
    pickLevel,
  };
}
