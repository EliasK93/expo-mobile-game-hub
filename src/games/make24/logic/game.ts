import { equals, format, fracs, type Fraction } from './fraction';
import { SYMBOL, TARGET, apply, solution, type Op, type SolutionStep, type Step } from './solve';

export const LEVEL_IDS = ['easy', 'medium', 'hard'] as const;
export type Level = (typeof LEVEL_IDS)[number];

const PUZZLE_SIZE = 4; // numbers per puzzle, and cards on the board
const MAX_NUMBER = 13; // the numbers go from 1 to this
export const isPuzzle = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === PUZZLE_SIZE && v.every((n) => Number.isInteger(n) && n >= 1 && n <= MAX_NUMBER);

export type Status = 'playing' | 'solved' | 'gaveUp';
// What the message line shows besides the board; the next change clears it. A hint step of null means the cards can't make 24.
export type Note = { kind: 'divideByZero' } | { kind: 'hint'; step: SolutionStep | null };
// numbers = the puzzle, sorted ascending. cards = the four places, null once a card was combined away. steps = the
// combines so far, in card places. selected / operator = the pending combine. The time is not here: the UI's clock owns it.
export type Game = {
  level: Level;
  numbers: number[];
  cards: (Fraction | null)[];
  steps: Step[];
  selected: number | null;
  operator: Op | null;
  hints: number;
  note: Note | null;
  status: Status;
};

// Sorts a copy of the numbers; the cards start as those numbers.
export function newGame(level: Level, numbers: readonly number[]): Game {
  const sorted = [...numbers].sort((a, b) => a - b);
  return {
    level,
    numbers: sorted,
    cards: fracs(sorted),
    steps: [],
    selected: null,
    operator: null,
    hints: 0,
    note: null,
    status: 'playing',
  };
}

// The one place a combine happens (tapCard and replay both come here): first op second goes into second's place, first's
// place becomes empty, the result is selected, and one card left that is 24 solves the puzzle. null = not possible: a place
// that does not exist or is empty, the same place twice, or ÷ 0.
function combine(game: Game, { first, second, op }: Step): Game | null {
  const a = game.cards[first];
  const b = game.cards[second];
  if (!a || !b || first === second) return null;
  const result = apply(a, op, b);
  if (!result) return null;
  const cards = [...game.cards];
  cards[first] = null;
  cards[second] = result;
  const solved = cards.filter((c) => c !== null).length === 1 && equals(result, TARGET);
  return {
    ...game,
    cards,
    steps: [...game.steps, { first, second, op }],
    selected: second,
    operator: null,
    note: null,
    status: solved ? 'solved' : 'playing',
  };
}

// A tap on a card of a running game; anything else (an empty place, a finished game) returns the same game.
// Nothing selected: select it. The selected card: deselect it, and the operator goes too. Another card: with no
// operator the selection switches, with one the two combine (selected op tapped); ÷ 0 leaves the cards and the
// selection as they are and sets a note.
export function tapCard(game: Game, i: number): Game {
  if (game.status !== 'playing' || !game.cards[i]) return game;
  const { selected, operator } = game;
  if (selected === i) return { ...game, selected: null, operator: null, note: null };
  if (selected === null || operator === null) return { ...game, selected: i, note: null };
  return combine(game, { first: selected, second: i, op: operator }) ?? { ...game, note: { kind: 'divideByZero' } };
}

// Selects an operator while a card is selected, switches to another, and the same one again deselects it.
export function tapOperator(game: Game, op: Op): Game {
  if (game.status !== 'playing' || game.selected === null) return game;
  return { ...game, operator: game.operator === op ? null : op, note: null };
}

// The one way to rebuild a game from its steps (undo and the save use it): the steps go through the same combine as the
// taps, so the last result is selected as after a live combine. null for a step that does not work (see combine).
export function replay(level: Level, numbers: readonly number[], steps: readonly Step[]): Game | null {
  let game = newGame(level, numbers);
  for (const step of steps) {
    const next = combine(game, step);
    if (!next) return null;
    game = next;
  }
  return game;
}

// One step back, repeatable to the start; the hints stay counted, selection and operator are cleared. At the start or
// once the puzzle is over it returns the same game.
export function undo(game: Game): Game {
  if (game.status !== 'playing' || game.steps.length === 0) return game;
  const back = replay(game.level, game.numbers, game.steps.slice(0, -1));
  return back ? { ...back, selected: null, hints: game.hints } : game;
}

// Counts a hint and notes the next step of a solution from the current cards (null if they can't make 24).
export function hint(game: Game): Game {
  if (game.status !== 'playing') return game;
  return { ...game, hints: game.hints + 1, note: { kind: 'hint', step: solution(game.cards)?.[0] ?? null } };
}

export function giveUp(game: Game): Game {
  return game.status === 'playing' ? { ...game, status: 'gaveUp', note: null } : game;
}

// Started = at least one combine or one hint. Undoing back to the start without a hint makes the puzzle a free skip again.
export const isStarted = (game: Game) => game.steps.length > 0 || game.hints > 0;

export type Message = { text: string; error: boolean };

const stepText = ({ a, b, op }: SolutionStep) => `${format(a)} ${SYMBOL[op]} ${format(b)}`;

// Every in-play text. The "Solved in 0:42" line needs the time, so that one is the UI's.
export function message(game: Game): Message | null {
  if (game.status === 'gaveUp') {
    const steps = solution(fracs(game.numbers)); // never null for a pool puzzle, which is solvable by construction
    return steps && { text: steps.map((s) => `${stepText(s)} = ${format(s.result)}`).join(' · '), error: false };
  }
  if (game.status === 'solved') return null;
  const { note } = game;
  if (note?.kind === 'divideByZero') return { text: "Can't divide by 0", error: true };
  if (note?.kind === 'hint') {
    return { text: note.step ? `Try ${stepText(note.step)}` : "These cards can't make 24, undo a step", error: false };
  }
  const left = game.cards.filter((c) => c !== null);
  return left.length === 1 ? { text: `That's ${format(left[0])}, not 24`, error: true } : null;
}
