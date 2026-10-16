import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { statsLine, type Stats } from '@/lib/stats';
import { load } from '@/lib/storage';

import { bucketOf, levelName, STATS_KEY, STATS_VERSION, type LevelId } from '../logic/save';
import { LEVELS } from '../logic/techniques';

const IDS: LevelId[] = [...LEVELS, 'classic'];

// One line per level that has wins, in level order, then Classic.
function linesOf(stats: Stats | null): string[] {
  return IDS.flatMap((id) => {
    const e = stats?.[bucketOf(id)];
    return e && e.solved > 0 ? [statsLine(levelName(id), e)] : [];
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
