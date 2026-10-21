import { useCallback, useEffect, useRef, useState } from 'react';

import { useGameClock } from '@/hooks/use-game-clock';
import { load, replaceSaveWithStats, save } from '@/lib/storage';

import {
  clear,
  endReveal,
  isInPlay,
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
import { EMPTY_STATS, isNewBest, recordRound, type Stats } from '../logic/stats';
import type { Level } from '../logic/words';

const REVEAL_MS = 1000; // how long the solution of a skipped word shows

// The screen's state. The round and the stats live in refs as well as in state, so the handlers stay stable functions,
// and every transition, save and stats write is computed outside any state updater (a transition that returns the same
// game does nothing). The game is null until storage is read: only the empty screen shows, so no placeholder flashes.
export function useAnagram() {
  const [game, setGame] = useState<Game | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [picking, setPicking] = useState(false);
  const [panel, setPanel] = useState(false); // the stats panel covers the game
  const [newBest, setNewBest] = useState(false); // the round that just ended set a new best
  const [lastLevel, setLastLevel] = useState<Level>('normal'); // the setting: marks the picker, not the round on screen
  const gameRef = useRef<Game | null>(null);
  const statsRef = useRef(stats);

  const put = useCallback((g: Game) => {
    gameRef.current = g;
    setGame(g);
  }, []);

  // The save holds the started, unfinished round on screen; a ready or finished round has none (toSave returns null).
  const persist = useCallback((g: Game, ms: number) => {
    const data = toSave(g, ms);
    if (data) save(SAVE_KEY, SAVE_VERSION, data);
  }, []);

  // A round ended or was abandoned: the stats count it, and the save goes first (see replaceSaveWithStats).
  // isNewBest is asked before recordRound overwrites the best.
  const finish = useCallback((g: Game) => {
    setNewBest(isNewBest(statsRef.current[g.level], g.solved));
    statsRef.current = recordRound(statsRef.current, g.level, g.solved);
    setStats(statsRef.current);
    replaceSaveWithStats(SAVE_KEY, STATS_KEY, STATS_VERSION, statsRef.current);
  }, []);

  // The clock (the time the round ran) runs while the round does, the screen is focused, the app is in front, and
  // neither the picker nor the panel is open. Whenever it stops while the round is still running (leaving the screen,
  // the app to the background, the picker or the panel opening) the round pauses, so it never runs unseen, and the
  // paused round is saved. onStop runs later, when act exists.
  const { elapsedMs, read, reset } = useGameClock({
    enabled: game?.status === 'running' && !picking && !panel,
    onStop: (ms) => {
      act((g) => pause(g, ms));
      if (gameRef.current) persist(gameRef.current, ms);
    },
  });

  // Opening resumes the saved round directly (paused), or shows a new ready round of the last used level.
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
      put(saved?.game ?? newRound(level, Math.random));
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
    if (!game?.revealed) return;
    const id = setTimeout(() => act((g) => endReveal(g, read())), REVEAL_MS);
    return () => clearTimeout(id);
  }, [game?.revealed, act, read]);

  // A new round of the level; the clock starts again at 0.
  const begin = useCallback(
    (level: Level) => {
      put(newRound(level, Math.random));
      setNewBest(false);
      reset();
    },
    [put, reset],
  );

  // The picker and the panel replace the letters; the panel also closes the picker.
  const openPanel = useCallback(() => {
    setPicking(false);
    setPanel(true);
  }, []);

  // Choosing a level ends a started round that is still going (it counts with the words solved); a finished round is
  // already recorded, and an unstarted one goes for free. The level is stored as the new last used one.
  const pickLevel = useCallback(
    (level: Level) => {
      const g = gameRef.current;
      if (g && isInPlay(g)) finish(g);
      setLastLevel(level);
      save(SETTINGS_KEY, SETTINGS_VERSION, { level });
      setPicking(false);
      begin(level);
    },
    [finish, begin],
  );

  return {
    game,
    remaining: game && game.status !== 'over' ? remainingMs(game, elapsedMs) : 0,
    best: game ? Math.max(stats[game.level].best, game.solved) : 0,
    newBest,
    picking,
    panel,
    lastLevel,
    stats,
    start: useCallback(() => act(start), [act]),
    pause: useCallback(() => act((g) => pause(g, read())), [act, read]),
    resume: useCallback(() => act(resume), [act]),
    place: useCallback((i: number) => act((g) => place(g, i, Math.random)), [act]),
    unplace: useCallback((slot: number) => act((g) => unplace(g, slot)), [act]),
    clear: useCallback(() => act(clear), [act]),
    shuffle: useCallback(() => act((g) => shuffleRack(g, Math.random)), [act]),
    skip: useCallback(() => act((g) => skip(g, read(), Math.random)), [act, read]),
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
