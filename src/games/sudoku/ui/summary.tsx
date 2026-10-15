import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { load } from '@/lib/storage';
import { average, type Stats } from '@/lib/stats';
import { formatTime } from '@/lib/timer';

import { STATS_BUCKET, STATS_KEY, STATS_VERSION } from '../logic/save';

// Shown under "Sudoku" on home. Reloads every time home gets focus, so a win shows up after coming back.
export function SudokuSummary() {
  const [text, setText] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let current = true;
      load<Stats>(STATS_KEY, STATS_VERSION).then((stats) => {
        const e = stats?.[STATS_BUCKET];
        if (!current) return;
        if (!e || e.solved === 0) return setText('No puzzles solved yet');
        const avg = average(e);
        setText(
          [`Solved ${e.solved}`, e.bestMs !== null && `Best ${formatTime(e.bestMs)}`, avg !== null && `Avg ${formatTime(avg)}`]
            .filter(Boolean)
            .join(' · '),
        );
      });
      return () => {
        current = false;
      };
    }, []),
  );

  return text === null ? null : <ThemedText type="small">{text}</ThemedText>;
}
