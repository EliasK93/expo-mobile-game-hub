import { MINUS, add, div, equals, frac, fracs, isWhole, mul, sub, type Fraction } from './fraction';

// The single home of the operators: the solver and the game both go through apply.
export const OPS = ['+', '-', '*', '/'] as const;
export type Op = (typeof OPS)[number];
export const SYMBOL: Record<Op, string> = { '+': '+', '-': MINUS, '*': '×', '/': '÷' };

// First op second, exact; null only for a division by 0.
export function apply(a: Fraction, op: Op, b: Fraction): Fraction | null {
  switch (op) {
    case '+':
      return add(a, b);
    case '-':
      return sub(a, b);
    case '*':
      return mul(a, b);
    case '/':
      return div(a, b);
  }
}

// One combine, in card PLACES (0..3): first op second, the result goes into second's place and first's place becomes
// empty. The game records exactly this, so a hint maps straight onto the cards.
export type Step = { first: number; second: number; op: Op };
// A step with the values it worked on, for showing "a op b = result".
export type SolutionStep = Step & { a: Fraction; b: Fraction; result: Fraction };

export const TARGET = frac(24);

// The one search behind ways, needsFraction and solution. From the filled places it tries every unordered pair with
// every operator (+ and × once, − and ÷ in both orders, ÷ 0 skipped) and recurses until one value is left. found gets
// the path of every sequence that ends at 24, in a fixed order; the first time it returns true the search stops and that
// path is returned (a copy), otherwise null. One filled place that is 24 is the empty path.
function search(
  start: readonly (Fraction | null)[],
  found: (path: readonly SolutionStep[]) => boolean,
): SolutionStep[] | null {
  const path: SolutionStep[] = [];

  const walk = (cards: readonly (Fraction | null)[], left: number): boolean => {
    if (left === 1) return equals(cards.find((c) => c !== null) as Fraction, TARGET) && found(path);

    const combine = (first: number, second: number, op: Op): boolean => {
      const a = cards[first] as Fraction;
      const b = cards[second] as Fraction;
      const result = apply(a, op, b);
      if (!result) return false;
      const next = cards.slice();
      next[first] = null;
      next[second] = result;
      path.push({ first, second, op, a, b, result });
      if (walk(next, left - 1)) return true;
      path.pop();
      return false;
    };

    for (let i = 0; i < cards.length; i++) {
      if (!cards[i]) continue;
      for (let j = i + 1; j < cards.length; j++) {
        if (!cards[j]) continue;
        for (const op of OPS) {
          if (combine(i, j, op)) return true;
          if ((op === '-' || op === '/') && combine(j, i, op)) return true;
        }
      }
    }
    return false;
  };

  return walk(start, start.filter((c) => c !== null).length) ? [...path] : null;
}

// How many combine paths end at exactly 24 (a + b and b + a count once, likewise ×).
export function ways(numbers: readonly number[]): number {
  let count = 0;
  search(fracs(numbers), () => {
    count++;
    return false;
  });
  return count;
}

// Solvable, but no path to 24 has only whole values in between (negative ones are fine).
export function needsFraction(numbers: readonly number[]): boolean {
  const cards = fracs(numbers);
  return search(cards, () => true) !== null && search(cards, (path) => path.every((s) => isWhole(s.result))) === null;
}

// The first path to 24 from these cards (null places are empty), or null. One card that is 24 gives [].
export const solution = (cards: readonly (Fraction | null)[]): SolutionStep[] | null => search(cards, () => true);
