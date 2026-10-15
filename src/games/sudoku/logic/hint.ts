import type { Grid } from './board';
import { applyStep, findStep, newState, type Step, type TechniqueName } from './techniques';

// One move the player can apply with a single setValue(game, cell, digit).
export type Hint = {
  technique: TechniqueName | 'wrong-digit'; // the technique that decides the move
  label: string;
  cell: number;
  digit: number; // 0 = erase the wrong digit in this cell
  cells: number[]; // cells to highlight: the move itself plus the cells of any elimination step it needed
  explanation: string;
};

// A wrong digit the player entered comes first; this is the one place where the solution is compared.
// Otherwise it runs the ladder on the real candidates (from the digits on the board, not the player's notes)
// until a technique places a digit, applying elimination steps internally on the way.
// Null when the board is complete or the ladder is stuck (the player's board is solvable by logic, so only
// a puzzle beyond Expert would get stuck).
export function nextHint(values: Grid, solution: Grid): Hint | null {
  const wrong = values.findIndex((v, i) => v !== 0 && v !== solution[i]);
  if (wrong !== -1) {
    return { technique: 'wrong-digit', label: 'Wrong digit', cell: wrong, digit: 0, cells: [wrong], explanation: `This ${values[wrong]} is wrong.` };
  }
  if (!values.includes(0)) return null;

  const state = newState(values);
  const prep: Step[] = [];
  for (let step = findStep(state.values, state.cands); step; step = findStep(state.values, state.cands)) {
    if (step.placements.length > 0) {
      const { cell, digit } = step.placements[0];
      const labels = [...new Set(prep.map((s) => s.label))];
      return {
        technique: step.technique,
        label: step.label,
        cell,
        digit,
        cells: [...new Set([...prep.flatMap((s) => s.cells), ...step.cells])],
        explanation: labels.length > 0 ? `${step.explanation} To see it, first use ${labels.join(', ')}.` : step.explanation,
      };
    }
    prep.push(step);
    applyStep(state, step);
  }
  return null;
}
