import { useRef, type ReactNode } from 'react';

import { useGameClock } from '@/hooks/use-game-clock';
import { addPlaytime } from '@/lib/playtime';

// Wraps a game's route file. Counts the time the screen is open while the app is in the foreground (menus included)
// and adds it to the game's playtime whenever the clock stops, so every game gets playtime the same way.
export function GameRoute({ id, children }: { id: string; children: ReactNode }) {
  const counted = useRef(0); // the part of the clock already added to the playtime
  useGameClock({
    enabled: true,
    onStop: (ms) => {
      addPlaytime(id, ms - counted.current);
      counted.current = ms;
    },
  });
  return <>{children}</>;
}
