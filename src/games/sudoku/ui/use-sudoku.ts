import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { recordWin, type Stats } from '@/lib/stats';
import { load, remove, save } from '@/lib/storage';
import { newClock, readClock, startClock, stopClock } from '@/lib/timer';

import { isWon, newGame, redoGame, setValue, toggleNote, undoGame, type Game } from '../logic/game';
import { nextHint, type Hint } from '../logic/hint';
import { push, start } from '@/lib/history';
import {
  bucketOf,
  DEFAULT_LEVEL,
  fromSave,
  fromSettings,
  hasProgress,
  LEGACY_SAVE_VERSION,
  SAVE_KEY,
  SAVE_VERSION,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  STATS_KEY,
  STATS_VERSION,
  toSave,
  type LevelId,
} from '../logic/save';
import { pickPuzzle } from '../logic/pool';
import type { Level } from '../logic/techniques';

// loading = looking for a saved game, prompt = asking Continue or New game, picker = no game yet, pick a level,
// playing = the board.
type Status = 'loading' | 'prompt' | 'picker' | 'playing';

// Shown under the loading and picker screens; nothing reads it.
const BLANK = newGame({ puzzle: Array<number>(81).fill(0), solution: Array<number>(81).fill(0) });

// A game without progress is not worth resuming, so its save is deleted instead.
const writeSave = (game: Game, ms: number, hinted: boolean, level: LevelId) =>
  hasProgress(game) ? save(SAVE_KEY, SAVE_VERSION, toSave(game, ms, hinted, level)) : remove(SAVE_KEY);

// Version 2 first; a version 1 save (made before levels) is read as the same data without a level.
async function loadSave() {
  return (await load(SAVE_KEY, SAVE_VERSION)) ?? (await load(SAVE_KEY, LEGACY_SAVE_VERSION));
}

// Delete the save first: if the app dies in between, the win is lost rather than counted twice on resume.
async function recordWinStats(ms: number, hinted: boolean, level: LevelId) {
  await remove(SAVE_KEY);
  const stats = (await load<Stats>(STATS_KEY, STATS_VERSION)) ?? {};
  await save(STATS_KEY, STATS_VERSION, recordWin(stats, bucketOf(level), ms, hinted));
}

export function useSudoku() {
  const [history, setHistory] = useState(() => start(BLANK));
  const [level, setLevel] = useState<LevelId>(DEFAULT_LEVEL); // of the game on the board
  const [lastLevel, setLastLevel] = useState<Level>(DEFAULT_LEVEL); // marked in the picker
  const [picking, setPicking] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [pending, setPending] = useState<ReturnType<typeof fromSave>>(null);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [round, setRound] = useState(0); // counts games, so the clock effect restarts for a new game
  const clock = useRef(newClock());
  const hinted = useRef(false);
  const recorded = useRef(false);
  const game = history.present;
  const won = isWon(game);
  const running = status === 'playing' && focused && appActive && !won && !picking;

  // An effect event always sees the latest game, also when called from the clock's cleanup (a plain closure would
  // see the game from when the effect started). Nothing is saved once the game is won: the win deletes the save.
  const saveNow = useEffectEvent(() => {
    if (!won) writeSave(game, readClock(clock.current, Date.now()), hinted.current, level);
  });

  // Puts a game on the board with the clock at ms. The clock effect restarts because `round` changes.
  const startGame = useCallback((g: Game, lvl: LevelId, ms = 0, wasHinted = false) => {
    setHistory(start(g));
    setSelected(null);
    setNotesMode(false);
    setLevel(lvl);
    setHint(null);
    setPicking(false);
    hinted.current = wasHinted;
    recorded.current = false;
    clock.current = newClock(ms);
    setElapsedMs(ms);
    setRound((r) => r + 1);
    setStatus('playing');
  }, []);

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
    // ponytail: removes the key of the old on-device cache on every open; delete this line once every installed copy has opened Sudoku once.
    remove('sudoku:cache');
    Promise.all([loadSave(), load(SETTINGS_KEY, SETTINGS_VERSION)]).then(([data, settings]) => {
      if (!alive) return;
      setLastLevel(fromSettings(settings));
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

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  // The clock runs only while running; stopping it (leaving the screen, app to background) also saves the time.
  useEffect(() => {
    if (!running) return;
    clock.current = startClock(clock.current, Date.now());
    const id = setInterval(() => setElapsedMs(readClock(clock.current, Date.now())), 250);
    return () => {
      clearInterval(id);
      clock.current = stopClock(clock.current, Date.now());
      setElapsedMs(readClock(clock.current, Date.now()));
      saveNow();
    };
  }, [running, round]);

  // Save after every move, and when a hint is shown (it sets `hinted`). Not while loading or asking, or the saved
  // game would be overwritten before the user chose.
  useEffect(() => {
    if (status === 'playing') saveNow();
  }, [game, status, won, hint]);

  // The win is recorded once: `recorded` guards against the effect running again.
  useEffect(() => {
    if (!won || recorded.current) return;
    recorded.current = true;
    clock.current = stopClock(clock.current, Date.now());
    const ms = readClock(clock.current, Date.now());
    setElapsedMs(ms);
    recordWinStats(ms, hinted.current, level);
  }, [won, level]);

  // v = 0 always erases, even in notes mode. push ignores actions that changed nothing.
  const enter = (v: number) => {
    if (selected === null) return;
    setHint(null);
    setHistory((h) => push(h, v !== 0 && notesMode ? toggleNote(h.present, selected, v) : setValue(h.present, selected, v)));
  };

  return {
    game,
    level,
    lastLevel,
    picking,
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
