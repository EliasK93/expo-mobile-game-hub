import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';

import { useGameClock } from '@/hooks/use-game-clock';
import { push, start } from '@/lib/history';
import { load, remove, replaceSaveWithStats, save } from '@/lib/storage';

import { isWon, newGame, redoGame, setValue, toggleNote, undoGame, type Game } from '../logic/game';
import { nextHint, type Hint } from '../logic/hint';
import {
  bucketOf,
  DEFAULT_LEVEL,
  fromSave,
  fromSettings,
  fromStats,
  hasProgress,
  SAVE_KEY,
  SAVE_VERSION,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  STATS_KEY,
  STATS_VERSION,
  toSave,
} from '../logic/save';
import { pickPuzzle } from '../logic/pool';
import { recordWin, type Stats } from '../logic/stats';
import type { Level } from '../logic/techniques';

// loading = looking for a saved game, prompt = asking Continue or New game, picker = no game yet, pick a level,
// playing = the board.
type Status = 'loading' | 'prompt' | 'picker' | 'playing';

// Shown under the loading and picker screens; nothing reads it.
const BLANK = newGame({ puzzle: Array<number>(81).fill(0), solution: Array<number>(81).fill(0) });

// A game without progress is not worth resuming, so its save is deleted instead.
const writeSave = (game: Game, ms: number, hinted: boolean, level: Level) =>
  hasProgress(game) ? save(SAVE_KEY, SAVE_VERSION, toSave(game, ms, hinted, level)) : remove(SAVE_KEY);

export function useSudoku() {
  const [history, setHistory] = useState(() => start(BLANK));
  const [level, setLevel] = useState<Level>(DEFAULT_LEVEL); // of the game on the board
  const [lastLevel, setLastLevel] = useState<Level>(DEFAULT_LEVEL); // marked in the picker
  const [picking, setPicking] = useState(false);
  const [panel, setPanel] = useState(false); // the stats panel covers the screen
  const [hint, setHint] = useState<Hint | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [pending, setPending] = useState<ReturnType<typeof fromSave>>(null);
  const [stats, setStats] = useState<Stats>({}); // shown in the picker and the stats panel
  const hinted = useRef(false);
  const recorded = useRef(false);
  const game = history.present;
  const won = isWon(game);

  // Nothing is saved once the game is won: the win deletes the save.
  const persist = (ms: number) => {
    if (!won) writeSave(game, ms, hinted.current, level);
  };

  // The clock runs while a game is on the board; stopping it (leaving the screen, app to background) saves the time.
  // The clock hook calls persist as it is at that moment, not as it was when the clock started.
  const { elapsedMs, read, reset, stop } = useGameClock({
    enabled: status === 'playing' && !won && !picking && !panel,
    onStop: persist,
  });

  // An effect event sees the latest game and time without being a dependency of the effect below.
  const saveNow = useEffectEvent(() => persist(read()));

  // Puts a game on the board with the clock at ms.
  const startGame = useCallback(
    (g: Game, lvl: Level, ms = 0, wasHinted = false) => {
      setHistory(start(g));
      setSelected(null);
      setNotesMode(false);
      setLevel(lvl);
      setHint(null);
      setPicking(false);
      hinted.current = wasHinted;
      recorded.current = false;
      reset(ms);
      setStatus('playing');
    },
    [reset],
  );

  // Starts a game at the level, at once: the puzzle comes out of the shipped pool.
  const begin = useCallback(
    (lvl: Level) => {
      setLastLevel(lvl);
      save(SETTINGS_KEY, SETTINGS_VERSION, { level: lvl });
      startGame(newGame(pickPuzzle(lvl)), lvl);
    },
    [startGame],
  );

  // Opening shows the Continue prompt if there is a game worth resuming, otherwise the level picker. No game starts by itself.
  useEffect(() => {
    let alive = true;
    Promise.all([
      load(SAVE_KEY, SAVE_VERSION),
      load(SETTINGS_KEY, SETTINGS_VERSION),
      load(STATS_KEY, STATS_VERSION),
    ]).then(([data, settings, stored]) => {
      if (!alive) return;
      setLastLevel(fromSettings(settings));
      setStats(fromStats(stored));
      const saved = fromSave(data);
      if (saved && hasProgress(saved.game)) {
        setPending(saved);
        setStatus('prompt');
      } else {
        setStatus('picker');
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Save after every move, and when a hint is shown (it sets `hinted`). Not while loading or asking, or the saved
  // game would be overwritten before the user chose.
  useEffect(() => {
    if (status === 'playing') saveNow();
  }, [game, status, won, hint]);

  // The win is recorded once: `recorded` guards against the effect running again. The shown stats (picker, panel) get
  // it at once (the same recordWin as the stored ones, no waiting for storage).
  useEffect(() => {
    if (!won || recorded.current) return;
    recorded.current = true;
    const ms = stop();
    const bucket = bucketOf(level);
    const wasHinted = hinted.current;
    setStats((s) => recordWin(s, bucket, ms, wasHinted));
    // The stored stats are read again, so the win lands on what is in storage now. The save goes first.
    load(STATS_KEY, STATS_VERSION).then((stored) =>
      replaceSaveWithStats(SAVE_KEY, STATS_KEY, STATS_VERSION, recordWin(fromStats(stored), bucket, ms, wasHinted)),
    );
  }, [won, level, stop]);

  // v = 0 always erases, even in notes mode. push ignores actions that changed nothing.
  const enter = (v: number) => {
    if (selected === null) return;
    setHint(null);
    setHistory((h) =>
      push(h, v !== 0 && notesMode ? toggleNote(h.present, selected, v) : setValue(h.present, selected, v)),
    );
  };

  return {
    game,
    level,
    lastLevel,
    stats,
    picking,
    panel,
    hint,
    selected,
    notesMode,
    won,
    status,
    elapsedMs,
    // The win lock lives in undoGame/redoGame: if they would return the same history, the button is off.
    canUndo: undoGame(history) !== history,
    canRedo: redoGame(history) !== history,
    select: setSelected,
    enter,
    erase: () => enter(0),
    undo: () => {
      setHint(null);
      setHistory(undoGame);
    },
    redo: () => {
      setHint(null);
      setHistory(redoGame);
    },
    toggleNotes: () => setNotesMode((on) => !on),
    openPicker: () => {
      setHint(null);
      setPicking(true);
    },
    closePicker: () => setPicking(false),
    // The panel has the screen to itself, so it also closes the picker.
    openPanel: () => {
      setPicking(false);
      setPanel(true);
    },
    closePanel: () => setPanel(false),
    // Picking a level from the Continue prompt gives up the saved game.
    pickLevel: (lvl: Level) => {
      if (status === 'prompt') {
        remove(SAVE_KEY);
        setPending(null);
      }
      begin(lvl);
    },
    // Showing a hint counts as using one, even if the player then makes the move alone.
    showHint: () => {
      const h = nextHint(game.values, game.solution);
      if (!h) return;
      hinted.current = true;
      setPicking(false);
      setHint(h);
    },
    // Apply is a normal move, so Undo takes it back. digit 0 erases a wrong digit.
    applyHint: () => {
      if (!hint) return;
      setHistory((h) => push(h, setValue(h.present, hint.cell, hint.digit)));
      setSelected(hint.cell);
      setHint(null);
    },
    closeHint: () => setHint(null),
    // The prompt's Continue button.
    continueSaved: () => {
      if (!pending) return;
      startGame(pending.game, pending.level, pending.elapsedMs, pending.hinted);
      setPending(null);
    },
  };
}
