import { generateLevel } from './generate';
import { mulberry32 } from '@/lib/random';
import { applyStep, findStep, LEVELS, LEVEL_NAMES, newState, type Level } from './techniques';

// Measures the generator that builds the pool. Skipped in the gate; run it with
//   $env:SUDOKU_MEASURE = '1'; npx jest src/games/sudoku/logic/measure.test.ts
// (PowerShell). Over 10 seeds per level it prints the time per puzzle, the retries (grids thrown away because the
// dug puzzle rated below the level) and the givens.
const measure = process.env.SUDOKU_MEASURE ? describe : describe.skip;
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

measure('generateLevel measurement', () => {
  it('prints the table', () => {
    const rows: string[] = [];
    for (const level of LEVELS) {
      const times: number[] = [];
      const givens: number[] = [];
      const retries: number[] = [];
      const hardest: Record<string, number> = {};
      for (const seed of SEEDS) {
        const t0 = performance.now();
        const r = generateLevel(level as Level, mulberry32(seed));
        times.push(performance.now() - t0);
        givens.push(r.puzzle.filter((v) => v !== 0).length);
        retries.push(r.attempts - 1);

        // which technique of the puzzle's level it needed
        const state = newState(r.puzzle);
        for (let s = findStep(state.values, state.cands); s; s = findStep(state.values, state.cands)) {
          if (s.level === level) hardest[s.technique] = (hardest[s.technique] ?? 0) + 1;
          applyStep(state, s);
        }
      }
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const used = Object.entries(hardest)
        .map(([k, v]) => `${k} x${v}`)
        .join(', ');
      rows.push(
        `| ${level} ${LEVEL_NAMES[level]} | ${avg.toFixed(0)} | ${Math.max(...times).toFixed(0)} | ${retries.reduce((a, b) => a + b, 0)} (max ${Math.max(...retries)}) | ${Math.min(...givens)} / ${Math.max(...givens)} | ${used} |`,
      );
    }
    process.stdout.write(
      "\n| level | avg ms | max ms | retries over 10 seeds | givens min / max | steps at the level's own level (all 10 puzzles) |\n|---|---|---|---|---|---|\n" +
        rows.join('\n') +
        '\n',
    );
  }, 1_800_000);
});
