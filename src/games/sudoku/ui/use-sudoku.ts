import { useState } from 'react';

import { isWon, newGame, redoGame, setValue, toggleNote, undoGame } from '../logic/game';
import { push, start } from '../logic/history';

export function useSudoku() {
  const [history, setHistory] = useState(() => start(newGame()));
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const game = history.present;

  // v = 0 always erases, even in notes mode. push ignores actions that changed nothing.
  const enter = (v: number) => {
    if (selected === null) return;
    setHistory((h) => push(h, v !== 0 && notesMode ? toggleNote(h.present, selected, v) : setValue(h.present, selected, v)));
  };

  return {
    game,
    selected,
    notesMode,
    won: isWon(game),
    // The win lock lives in undoGame/redoGame: if they would return the same history, the button is off.
    canUndo: undoGame(history) !== history,
    canRedo: redoGame(history) !== history,
    select: setSelected,
    enter,
    erase: () => enter(0),
    undo: () => setHistory(undoGame),
    redo: () => setHistory(redoGame),
    toggleNotes: () => setNotesMode((on) => !on),
    restart: () => {
      setHistory(start(newGame()));
      setSelected(null);
      setNotesMode(false);
    },
  };
}
