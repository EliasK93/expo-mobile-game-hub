import { formatGrid } from './board';
import { generateLevel } from './generate';
import { mulberry32 } from '@/lib/random';
import { LEVELS, type Level } from './techniques';

// Builds data/puzzles.json, the pool of puzzles the app ships. Not a check: skipped in the gate, like measure.test.ts.
// Seed s of level L is generateLevel(L, mulberry32(s)), so the pool can be rebuilt exactly. PowerShell, from the repo root:
//
//   1. Generate part files, one process per slice (Hard is slow, so give it several), parts go outside the repo:
//        $env:SUDOKU_BUILD_OUT = '<temp folder>'
//        $env:SUDOKU_BUILD = '4:1-125'      # level:fromSeed-toSeed
//        npx.cmd jest src/games/sudoku/logic/build-puzzles.test.ts
//   2. Merge the parts (dedupes, seed order, first 1000 per level) into data/puzzles.json:
//        $env:SUDOKU_MERGE = '<temp folder>'
//        npx.cmd jest src/games/sudoku/logic/build-puzzles.test.ts
// The project has no @types/node, so the four fs calls used here are typed by hand. Paths are relative to the repo root.
const fs = jest.requireActual<{
  mkdirSync(path: string, options: { recursive: boolean }): void;
  writeFileSync(path: string, data: string): void;
  readFileSync(path: string, encoding: 'utf8'): string;
  readdirSync(path: string): string[];
}>('fs');
const POOL_SIZE = 1000;
const OUT_DIR = 'src/games/sudoku/data';
type Part = { level: Level; from: number; puzzles: string[] }; // puzzles[i] was made from seed from + i

const build = process.env.SUDOKU_BUILD ? describe : describe.skip;
const merge = process.env.SUDOKU_MERGE ? describe : describe.skip;

build('generate a slice of the pool', () => {
  it('writes one part file', () => {
    const [, level, from, to] = /^([1-5]):(\d+)-(\d+)$/.exec(process.env.SUDOKU_BUILD!) ?? [];
    const dir = process.env.SUDOKU_BUILD_OUT;
    if (!level || !dir) throw new Error('SUDOKU_BUILD=<level>:<from>-<to> and SUDOKU_BUILD_OUT=<folder> are both needed');
    const part: Part = { level: Number(level) as Level, from: Number(from), puzzles: [] };
    for (let seed = part.from; seed <= Number(to); seed++) {
      part.puzzles.push(formatGrid(generateLevel(part.level, mulberry32(seed)).puzzle));
    }
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/${level}-${from}-${to}.json`, JSON.stringify(part));
  }, 3_600_000);
});

merge('merge the part files', () => {
  it('writes data/puzzles.json', () => {
    const dir = process.env.SUDOKU_MERGE!;
    const parts = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')) as Part);
    const out: Record<number, string[]> = {};
    for (const level of LEVELS) {
      const ordered = parts.filter((p) => p.level === level).sort((a, b) => a.from - b.from).flatMap((p) => p.puzzles);
      out[level] = [...new Set(ordered)].slice(0, POOL_SIZE);
      if (out[level].length < POOL_SIZE) throw new Error(`level ${level}: only ${out[level].length} unique puzzles, build more seeds`);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(`${OUT_DIR}/puzzles.json`, JSON.stringify(out));
  });
});
