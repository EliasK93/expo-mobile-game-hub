import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { recordWin, type Stats } from '@/lib/stats';
import { load, remove, save } from '@/lib/storage';
import { newClock, readClock, startClock, stopClock } from '@/lib/timer';

import { isWon, newGame, redoGame, setValue, toggleNote, undoGame, type Game } from '../logic/game';
import { push, start } from '../logic/history';
import { fromSave, hasProgress, SAVE_KEY, SAVE_VERSION, STATS_BUCKET, STATS_KEY, STATS_VERSION, toSave } from '../logic/save';

// loading = looking for a saved game, prompt = asking Continue or New game, playing = the board.
type Status = 'loading' | 'prompt' | 'playing';

// A game without progress is not worth resuming, so its save is deleted instead.
const writeSave = (game: Game, ms: number, hinted: boolean) =>
  hasProgress(game) ? save(SAVE_KEY, SAVE_VERSION, toSave(game, ms, hinted)) : remove(SAVE_KEY);

// Delete the save first: if the app dies in between, the win is lost rather than counted twice on resume.
async function recordWinStats(ms: number, hinted: boolean) {
  await remove(SAVE_KEY);
  const stats = (await load<Stats>(STATS_KEY, STATS_VERSION)) ?? {};
  await save(STATS_KEY, STATS_VERSION, recordWin(stats, STATS_BUCKET, ms, hinted));
}

export function useSudoku() {
  const [history, setHistory] = useState(() => start(newGame()));
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [pending, setPending] = useState<ReturnType<typeof fromSave>>(null);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const clock = useRef(newClock());
  const hinted = useRef(false);
  const recorded = useRef(false);
  const game = history.present;
  const won = isWon(game);
  const running = status === 'playing' && focused && appActive && !won;

  // An effect event always sees the latest game, also when called from the clock's cleanup (a plain closure would
  // see the game from when the effect started). Nothing is saved once the game is won: the win deletes the save.
  const saveNow = useEffectEvent(() => {
    if (!won) writeSave(game, readClock(clock.current, Date.now()), hinted.current);
  });

  useEffect(() => {
    let alive = true;
    load(SAVE_KEY, SAVE_VERSION).then((data) => {
      if (!alive) return;
      const saved = fromSave(data);
      if (saved && hasProgress(saved.game)) {
        setPending(saved);
        setStatus('prompt');
      } else {
        setStatus('playing');
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
  }, [running]);

  // Save after every move. Not while loading or asking, or the saved game would be overwritten before the user chose.
  useEffect(() => {
    if (status === 'playing') saveNow();
  }, [game, status, won]);

  // The win is recorded once: `recorded` guards against the effect running again.
  useEffect(() => {
    if (!won || recorded.current) return;
    recorded.current = true;
    clock.current = stopClock(clock.current, Date.now());
    const ms = readClock(clock.current, Date.now());
    setElapsedMs(ms);
    recordWinStats(ms, hinted.current);
  }, [won]);

  // Starts a fresh clock at ms; if the old one was running, the new one must run too (the clock effect won't rerun).
  const resetClock = (ms: number) => {
    clock.current = running ? startClock(newClock(ms), Date.now()) : newClock(ms);
    setElapsedMs(ms);
  };

  const restart = () => {
    setHistory(start(newGame()));
    setSelected(null);
    setNotesMode(false);
    hinted.current = false;
    recorded.current = false;
    resetClock(0);
  };

  // v = 0 always erases, even in notes mode. push ignores actions that changed nothing.
  const enter = (v: number) => {
    if (selected === null) return;
    setHistory((h) => push(h, v !== 0 && notesMode ? toggleNote(h.present, selected, v) : setValue(h.present, selected, v)));
  };

  return {
    game,
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
    undo: () => setHistory(undoGame),
    redo: () => setHistory(redoGame),
    toggleNotes: () => setNotesMode((on) => !on),
    restart,
    // The prompt's two buttons.
    continueSaved: () => {
      if (!pending) return;
      setHistory(start(pending.game));
      hinted.current = pending.hinted;
      recorded.current = false;
      resetClock(pending.elapsedMs);
      setPending(null);
      setStatus('playing');
    },
    discardSaved: () => {
      remove(SAVE_KEY);
      setPending(null);
      restart();
      setStatus('playing');
    },
  };
}
