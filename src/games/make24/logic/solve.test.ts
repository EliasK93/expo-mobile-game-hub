import { equals, frac, fracs, type Fraction } from './fraction';
import { OPS, SYMBOL, apply, needsFraction, solution, ways, type SolutionStep } from './solve';

const cards = (...values: (number | null)[]) => values.map((v) => (v === null ? null : frac(v)));

// Replays a solution on the cards the way the game combines them (result into second's place, first's place empty),
// checking every step's own numbers on the way, and returns the one value left (null if more than one is left).
function run(start: readonly (Fraction | null)[], steps: readonly SolutionStep[]): Fraction | null {
  const c = [...start];
  for (const { first, second, op, a, b, result } of steps) {
    const x = c[first];
    const y = c[second];
    if (!x || !y || first === second) throw new Error(`step ${first} -> ${second} uses an empty place`);
    if (!equals(x, a) || !equals(y, b)) throw new Error('a step shows other values than the cards hold');
    const r = apply(x, op, y);
    if (!r || !equals(r, result)) throw new Error('a step shows another result than apply gives');
    c[first] = null;
    c[second] = r;
  }
  const left = c.filter((v) => v !== null);
  return left.length === 1 ? left[0] : null;
}

describe('operators', () => {
  it('has the four operators, + − × ÷, with the right symbols (U+2212, U+00D7, U+00F7)', () => {
    expect([...OPS]).toEqual(['+', '-', '*', '/']);
    expect(SYMBOL).toEqual({ '+': '+', '-': '−', '*': '×', '/': '÷' });
  });

  it('apply is first op second, exact', () => {
    expect(apply(frac(3), '+', frac(8))).toEqual(frac(11));
    expect(apply(frac(3), '-', frac(8))).toEqual(frac(-5));
    expect(apply(frac(8), '-', frac(3))).toEqual(frac(5));
    expect(apply(frac(3), '*', frac(8))).toEqual(frac(24));
    expect(apply(frac(8), '/', frac(3))).toEqual(frac(8, 3));
    expect(apply(frac(3), '/', frac(8))).toEqual(frac(3, 8));
  });

  it('apply is null only for a division by 0', () => {
    expect(apply(frac(8), '/', frac(0))).toBeNull();
    expect(apply(frac(0), '/', frac(8))).toEqual(frac(0));
    expect(apply(frac(8), '*', frac(0))).toEqual(frac(0));
  });
});

describe('ways', () => {
  it.each<[number[], number]>([
    [[24], 1], // nothing to combine: the empty path
    [[23], 0],
    [[12, 12], 1], // 12 + 12 once, not twice
    [[4, 6], 1], // 4 × 6 once
    [[6, 30], 1], // 30 − 6, the other order is tried too
    [[30, 6], 1],
    [[2, 48], 1], // 48 ÷ 2
    [[48, 2], 1],
    [[24, 0], 2], // 24 + 0 and 24 − 0; 24 ÷ 0 is skipped, 0 − 24 and 0 × 24 miss
    [[5, 5], 0],
  ])('%j has %i path(s) to 24', (numbers, count) => {
    expect(ways(numbers)).toBe(count);
  });

  it('1 1 1 1 has none', () => {
    expect(ways([1, 1, 1, 1])).toBe(0);
  });

  it('1 2 3 4 has more ways than the hard 3 3 8 8', () => {
    expect(ways([3, 3, 8, 8])).toBeGreaterThan(0);
    expect(ways([1, 2, 3, 4])).toBeGreaterThan(ways([3, 3, 8, 8]));
  });

  it('does not depend on the order the numbers are given in', () => {
    expect(ways([8, 3, 8, 3])).toBe(ways([3, 3, 8, 8]));
    expect(ways([4, 2, 3, 1])).toBe(ways([1, 2, 3, 4]));
  });
});

describe('needsFraction', () => {
  it.each([[[3, 3, 8, 8]], [[1, 5, 5, 5]], [[3, 3, 7, 7]], [[4, 4, 7, 7]], [[1, 3, 4, 6]]])(
    '%j is solvable but only through a fraction in between',
    (numbers) => {
      expect(ways(numbers)).toBeGreaterThan(0);
      expect(needsFraction(numbers)).toBe(true);
    },
  );

  it.each([[[1, 2, 3, 4]], [[6, 6, 6, 6]], [[4, 4, 4, 4]]])('%j has a solution with whole values only', (numbers) => {
    expect(ways(numbers)).toBeGreaterThan(0);
    expect(needsFraction(numbers)).toBe(false);
  });

  it('is false for a puzzle with no solution at all', () => {
    expect(needsFraction([1, 1, 1, 1])).toBe(false);
  });
});

describe('solution', () => {
  it('finds the classic 3 3 8 8: 8 ÷ 3, then 3 − 8/3, then 8 ÷ 1/3', () => {
    const steps = solution(cards(3, 3, 8, 8));
    expect(steps?.map(({ a, b, op, result }) => [a, op, b, result])).toEqual([
      [frac(8), '/', frac(3), frac(8, 3)],
      [frac(3), '-', frac(8, 3), frac(1, 3)],
      [frac(8), '/', frac(1, 3), frac(24)],
    ]);
  });

  it('puts the result in second and empties first: first op second', () => {
    expect(solution(cards(8, 32))).toEqual([
      { first: 1, second: 0, op: '-', a: frac(32), b: frac(8), result: frac(24) },
    ]);
    expect(solution(cards(48, 2))).toEqual([
      { first: 0, second: 1, op: '/', a: frac(48), b: frac(2), result: frac(24) },
    ]);
  });

  it('is null when there is no solution', () => {
    expect(solution(cards(1, 1, 1, 1))).toBeNull();
    expect(solution(cards(5, 5))).toBeNull();
  });

  it('one card: [] when it is 24, null when it is not, null with nothing filled', () => {
    expect(solution(cards(null, 24, null, null))).toEqual([]);
    expect(solution(cards(null, null, null, 20))).toBeNull();
    expect(solution(cards(null, null, null, null))).toBeNull();
  });

  it('works from a partial state with a fraction and empty places, using only the filled places', () => {
    const start = [frac(8, 3), null, frac(3), frac(8)];
    const steps = solution(start);
    expect(steps).toHaveLength(2);
    expect(run(start, steps as SolutionStep[])).toEqual(frac(24));
    for (const { first, second } of steps as SolutionStep[]) {
      expect(first).not.toBe(1);
      expect(second).not.toBe(1);
    }
  });

  it('is null from a partial state that cannot make 24 (3 + 3 first leaves 6 8 8)', () => {
    expect(solution([null, frac(6), frac(8), frac(8)])).toBeNull();
  });

  it('does not change the cards it is given', () => {
    const start = cards(3, null, 8, 8);
    const before = JSON.stringify(start);
    solution(start);
    expect(JSON.stringify(start)).toBe(before);
  });
});

describe('all sets of four numbers from 1 to 13', () => {
  it('exactly 1,362 of the 1,820 sets have a solution, and every solution replays to 24', () => {
    let sets = 0;
    let solvable = 0;
    const bad: string[] = [];
    for (let a = 1; a <= 13; a++)
      for (let b = a; b <= 13; b++)
        for (let c = b; c <= 13; c++)
          for (let d = c; d <= 13; d++) {
            sets++;
            const start = fracs([a, b, c, d]);
            const steps = solution(start);
            if (!steps) continue;
            solvable++;
            const left = run(start, steps);
            if (steps.length !== 3 || !left || !equals(left, frac(24))) bad.push(`${a} ${b} ${c} ${d}`);
          }
    expect(sets).toBe(1820);
    expect(bad).toEqual([]);
    expect(solvable).toBe(1362);
  }, 60_000);

  // Counting every path is the slow part (about 8 s for all 1,820 sets), so every 30th set is enough to compare.
  it('ways and solution agree on which sets are solvable (every 30th of the 1,820)', () => {
    let seen = 0;
    const disagree: string[] = [];
    for (let a = 1; a <= 13; a++)
      for (let b = a; b <= 13; b++)
        for (let c = b; c <= 13; c++)
          for (let d = c; d <= 13; d++) {
            if (seen++ % 30 !== 0) continue;
            const numbers = [a, b, c, d];
            if (ways(numbers) > 0 !== (solution(fracs(numbers)) !== null)) disagree.push(numbers.join(' '));
          }
    expect(disagree).toEqual([]);
  }, 60_000);
});
