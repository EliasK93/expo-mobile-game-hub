import { fracs } from './fraction';
import { LEVEL_IDS, type Level } from './game';
import { needsFraction, solution, ways } from './solve';

// Builds data/puzzles.json, the pool of puzzles the app ships. Not a check: skipped in the gate, like Sudoku's build.
// Nothing random: the same code always writes the same file. PowerShell, from the repo root:
//
//   $env:MAKE24_BUILD = '1'; npx.cmd jest src/games/make24/logic/build-puzzles.test.ts; Remove-Item Env:MAKE24_BUILD
//
// The project has no @types/node, so the two fs calls used here are typed by hand. Paths are relative to the repo root.
const fs = jest.requireActual<{
  mkdirSync(path: string, options: { recursive: boolean }): void;
  writeFileSync(path: string, data: string): void;
}>('fs');
const MAX_NUMBER = 13;
const SOLVABLE = 1362; // the commonly cited count for these rules; anything else is a solver bug or a rule difference
const OUT_DIR = 'src/games/make24/data';
type Rated = { numbers: number[]; ways: number; fraction: boolean };

const build = process.env.MAKE24_BUILD === '1' ? describe : describe.skip;

// Every multiset a <= b <= c <= d from 1 to 13, the solvable ones, easiest first.
function ratedPool(): Rated[] {
  const pool: Rated[] = [];
  for (let a = 1; a <= MAX_NUMBER; a++)
    for (let b = a; b <= MAX_NUMBER; b++)
      for (let c = b; c <= MAX_NUMBER; c++)
        for (let d = c; d <= MAX_NUMBER; d++) {
          const numbers = [a, b, c, d];
          if (solution(fracs(numbers)) !== null)
            pool.push({ numbers, ways: ways(numbers), fraction: needsFraction(numbers) });
        }
  if (pool.length !== SOLVABLE) throw new Error(`${pool.length} solvable sets, expected ${SOLVABLE}`);
  const cmp = (x: Rated, y: Rated) => x.numbers.findIndex((n, i) => n !== y.numbers[i]);
  return pool.sort((x, y) => {
    if (x.fraction !== y.fraction) return x.fraction ? 1 : -1;
    if (x.ways !== y.ways) return y.ways - x.ways;
    const i = cmp(x, y);
    return i < 0 ? 0 : x.numbers[i] - y.numbers[i];
  });
}

build('build the puzzle pool', () => {
  it('writes data/puzzles.json', () => {
    const pool = ratedPool();
    const size = pool.length / LEVEL_IDS.length;
    const levels = Object.fromEntries(LEVEL_IDS.map((id, i) => [id, pool.slice(i * size, (i + 1) * size)])) as Record<
      Level,
      Rated[]
    >;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(
      `${OUT_DIR}/puzzles.json`,
      JSON.stringify(Object.fromEntries(LEVEL_IDS.map((id) => [id, levels[id].map((r) => r.numbers)]))),
    );

    const show = (r: Rated) => `${r.numbers.join(' ')} (${r.ways} ways${r.fraction ? ', fraction' : ''})`;
    const lines: string[] = [];
    for (const id of LEVEL_IDS) {
      const list = levels[id];
      const picks = [0, 0.25, 0.5, 0.75].map((f) => list[Math.floor(f * list.length)]).concat(list[list.length - 1]);
      lines.push(
        `${id}: ${list.length} puzzles, ways ${Math.max(...list.map((r) => r.ways))}..${Math.min(...list.map((r) => r.ways))}, ` +
          `${list.filter((r) => r.fraction).length} need fractions`,
        `  samples: ${picks.map(show).join(' | ')}`,
      );
    }
    for (const classic of [
      [3, 3, 8, 8],
      [1, 5, 5, 5],
      [3, 3, 7, 7],
      [4, 4, 7, 7],
    ]) {
      const id = LEVEL_IDS.find((l) => levels[l].some((r) => r.numbers.join() === classic.join()));
      lines.push(`${classic.join(' ')} is in ${id}`);
    }
    console.log(lines.join('\n'));
  }, 600_000);
});
