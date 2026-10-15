import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { load } from '@/lib/storage';
import { average, type Stats } from '@/lib/stats';
import { formatTime } from '@/lib/timer';

import { bucketOf, levelName, STATS_KEY, STATS_VERSION, type LevelId } from '../logic/save';
import { LEVELS } from '../logic/techniques';

const IDS: LevelId[] = [...LEVELS, 'classic'];

// One line per level that has wins, in level order, then Classic. A level with only hinted wins shows just its count.
function linesOf(stats: Stats | null): string[] {
  return IDS.flatMap((id) => {
    const e = stats?.[bucketOf(id)];
    if (!e || e.solved === 0) return [];
    const avg = average(e);
    return [
      [`${levelName(id)}: ${e.solved}`, e.bestMs !== null && `Best ${formatTime(e.bestMs)}`, avg !== null && `Avg ${formatTime(avg)}`]
        .filter(Boolean)
        .join(' · '),
    ];
  });
}

// Shown under "Sudoku" on home. Reloads every time home gets focus, so a win shows up after coming back.
export function SudokuSummary() {
  const [lines, setLines] = useState<string[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let current = true;
      load<Stats>(STATS_KEY, STATS_VERSION).then((stats) => {
        if (current) setLines(linesOf(stats));
      });
      return () => {
        current = false;
      };
    }, []),
  );

  if (lines === null) return null;
  if (lines.length === 0) return <ThemedText type="small">No puzzles solved yet</ThemedText>;
  return (
    <>
      {lines.map((line) => (
        <ThemedText key={line} type="small">
          {line}
        </ThemedText>
      ))}
    </>
  );
}
