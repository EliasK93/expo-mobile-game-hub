import type { Grid } from './board';
import { applyStep, findStep, newState, type Level } from './techniques';
import { conflicts } from './validate';

// Solves the puzzle with the simplest technique that applies at every step, using nothing above maxLevel.
// The level is the highest level of any step it needed. Returns null when it gets stuck: the puzzle needs
// guessing or a technique beyond maxLevel (and a puzzle with a conflict or without a unique solution never finishes).
export function solveByLogic(puzzle: Grid, maxLevel: Level = 5): { level: Level; grid: Grid } | null {
  if (conflicts(puzzle).size > 0) return null;
  const state = newState(puzzle);
  let level: Level = 1;
  while (state.values.includes(0)) {
    const step = findStep(state.values, state.cands, maxLevel);
    if (!step) return null;
    applyStep(state, step);
    if (step.level > level) level = step.level;
  }
  return { level, grid: state.values };
}

export const rate = (puzzle: Grid, maxLevel: Level = 5): Level | null => solveByLogic(puzzle, maxLevel)?.level ?? null;
