import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { newClock, readClock, startClock, stopClock } from '@/lib/timer';

// The clock of a timed game screen. It runs only while `enabled` (the game's own conditions), the screen is focused
// and the app is in the foreground. Whenever it stops (also on unmount) it calls onStop with the time reached, so
// the game can save it. onStop may be a plain closure: it always runs with the latest props and state.
export function useGameClock({ enabled, onStop }: { enabled: boolean; onStop: (ms: number) => void }) {
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [round, setRound] = useState(0); // counts resets, so the clock effect restarts for a new game
  const clock = useRef(newClock());
  const running = enabled && focused && appActive;

  const stopped = useEffectEvent(onStop);

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

  // The clock runs only while running; stopping it (leaving the screen, app to background) also reports the time.
  useEffect(() => {
    if (!running) return;
    clock.current = startClock(clock.current, Date.now());
    const id = setInterval(() => setElapsedMs(readClock(clock.current, Date.now())), 250);
    return () => {
      clearInterval(id);
      clock.current = stopClock(clock.current, Date.now());
      const ms = readClock(clock.current, Date.now());
      setElapsedMs(ms);
      stopped(ms);
    };
  }, [running, round]);

  // The time right now, also while the clock runs.
  const read = useCallback(() => readClock(clock.current, Date.now()), []);

  // A new game: the clock stands at ms. The clock effect restarts because `round` changes.
  const reset = useCallback((ms = 0) => {
    clock.current = newClock(ms);
    setElapsedMs(ms);
    setRound((r) => r + 1);
  }, []);

  // Stops for good and returns the time (the win).
  const stop = useCallback(() => {
    clock.current = stopClock(clock.current, Date.now());
    const ms = readClock(clock.current, Date.now());
    setElapsedMs(ms);
    return ms;
  }, []);

  return { elapsedMs, read, reset, stop };
}
